const pool = require('../config/db');
const { getIO } = require('../utils/socket');

// Create Booking
exports.createBooking = async (req, res) => {
    try {
        const { user_email, service, tonnage, price, date, time, address, lat, lng, name, phone, description, contact_method, quantity } = req.body;

        const newBooking = await pool.query(
            `INSERT INTO bookings (user_email, service, tonnage, price, date, time, address, lat, lng, name, phone, description, contact_method, quantity) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [user_email, service, tonnage, price, date, time, address, lat, lng, name, phone, description, contact_method, quantity || 1]
        );

        const io = getIO();
        const booking = newBooking.rows[0];

        // Broadcast new job to all connected clients (workers)
        io.emit('new_job', booking);

        // Detect Workers and Notify (Push)
        try {
            const workers = await pool.query("SELECT device_token FROM users WHERE role = 'worker' AND device_token IS NOT NULL");
            if (workers.rows.length > 0) {
                const { sendPushNotification } = require('../utils/fcmv1'); // Make sure fcmv1 is moved or accessible
                const message = `Nuevo servicio disponible: ${service}`;
                workers.rows.forEach(worker => {
                    sendPushNotification(worker.device_token, "¡Nuevo Trabajo!", message)
                        .catch(err => console.error("Error pushing to worker:", err));
                });
            }
        } catch (pushErr) {
            console.error("Worker Push Error:", pushErr);
        }

        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// Accept Booking
exports.acceptBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { technician_name } = req.body;
        const technician_id = req.user.id;

        const result = await pool.query(
            "UPDATE bookings SET status = 'Accepted', technician_id = $1, technician_name = $2 WHERE id = $3 AND status = 'Pending' RETURNING *",
            [technician_id, technician_name, id]
        );

        if (result.rows.length === 0) {
            return res.status(409).json({ error: "Este trabajo ya no está disponible." });
        }

        const io = getIO();
        io.emit('job_taken', result.rows[0]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// Release Booking
exports.releaseBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const technician_id = req.user.id;

        const result = await pool.query(
            "UPDATE bookings SET status = 'Pending', technician_id = NULL, technician_name = NULL WHERE id = $1 AND technician_id = $2 AND status = 'Accepted' RETURNING *",
            [id, technician_id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "No se puede liberar. Verifica que el trabajo esté asignado a ti y no haya iniciado." });
        }

        // Apply Penalty
        await pool.query("UPDATE users SET score = score - 10 WHERE id = $1", [technician_id]);

        const releasedJob = result.rows[0];
        const io = getIO();
        io.emit('job_update', releasedJob);

        res.json(releasedJob);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// Update Booking Status
const { generateReceiptPDF } = require('../utils/pdfGenerator');
const { sendCompletionEmail } = require('../utils/email');

exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { role, email, id: userId } = req.user;

        // Check ownership/permissions
        const bookingCheck = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({ error: "Booking not found" });
        }
        const currentBooking = bookingCheck.rows[0];

        // Authorization: Admin, Assigned Technician, or Owner (User)
        // Workers can usually only update status to generic things, but let's allow it if they are assigned.
        const isOwner = currentBooking.user_email === email;
        const isAssignedWorker = currentBooking.technician_id === userId;
        const isAdmin = role === 'admin';

        if (!isAdmin && !isOwner && !isAssignedWorker) {
            return res.status(403).json({ error: "No tienes permiso para modificar esta reserva." });
        }

        const result = await pool.query(
            "UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Booking not found" });
        }

        const booking = result.rows[0];
        const io = getIO();

        // Notification logic
        try {
            const message = `Tu servicio de ${booking.service} ha cambiado a: ${status === 'In Progress' ? 'En Curso 🛠️' : 'Finalizado ✅'}`;

            // Don't notify if the user themselves triggered the update (optional, but good UX)
            // But usually this logic is for notifying the CLIENT when WORKER updates it.

            await pool.query(
                "INSERT INTO notifications (user_id, message, type) VALUES ((SELECT id FROM users WHERE email = $1), $2, 'status_update')",
                [booking.user_email, message]
            );

            io.emit('notification', { user_email: booking.user_email, message });

            const userRes = await pool.query("SELECT device_token FROM users WHERE email = $1", [booking.user_email]);
            if (userRes.rows.length > 0 && userRes.rows[0].device_token) {
                const { sendPushNotification } = require('../utils/fcmv1');
                await sendPushNotification(userRes.rows[0].device_token, "Actualización de Servicio", message);
            }

            // --- JOB COMPLETION EMAIL LOGIC ---
            if (status === 'Finalizado' || status === 'Completed' || status === 'Terminado') {
                console.log(`Job ${booking.id} completed. Generating receipt...`);
                // Generate PDF
                const pdfBuffer = await generateReceiptPDF(booking);

                // Send Email
                await sendCompletionEmail(booking.user_email, pdfBuffer, booking.name, booking.service);
            }

        } catch (notifErr) {
            console.error("Notification/Email Error:", notifErr);
            // Non-blocking error
        }

        io.emit('job_update', booking);
        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// Update Booking Details
exports.updateBookingDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time, price, description, status } = req.body;
        const { role, email, id: userId } = req.user;

        // Verify Perms
        const check = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Booking not found" });
        const current = check.rows[0];

        const isOwner = current.user_email === email;
        const isAdmin = role === 'admin';
        // Workers shouldn't edit details like price/description, usually. But let's restrict to Admin/Owner for now.
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "No autorizado." });
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (date !== undefined) { fields.push(`date = $${idx++}`); values.push(date); }
        if (time !== undefined) { fields.push(`time = $${idx++}`); values.push(time); }
        if (price !== undefined) { fields.push(`price = $${idx++}`); values.push(price); }
        if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
        if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
        if (req.body.items !== undefined) {
            fields.push(`items = $${idx++}`);
            values.push(JSON.stringify(req.body.items));
        }

        if (fields.length === 0) return res.json({ message: "No changes" });

        values.push(id);
        const query = `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) return res.status(404).json({ error: "Booking not found" });

        const updatedJob = result.rows[0];
        const io = getIO();
        io.emit('job_update', updatedJob);
        res.json(updatedJob);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// Submit Review
exports.submitReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;

        const result = await pool.query(
            "UPDATE bookings SET rating = $1, review = $2 WHERE id = $3 RETURNING *",
            [rating, review, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// Get Availability
exports.getAvailability = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "Missing date parameter" });

        const result = await pool.query("SELECT time, service, tonnage FROM bookings WHERE date = $1 AND status != 'Cancelled'", [date]);
        const bookings = result.rows;

        const blockedSlots = new Set();
        const availableSlots = [];
        for (let h = 10; h <= 16; h += 0.5) {
            availableSlots.push(h);
        }

        bookings.forEach(booking => {
            const startHour = parseInt(booking.time.split(':')[0]);
            const startMin = parseInt(booking.time.split(':')[1]);
            const decimalStart = startHour + (startMin / 60);

            let serviceDuration = 1.5;

            if (booking.service === 'Reparación') {
                serviceDuration = 3.0;
            } else if (booking.tonnage >= 2) {
                serviceDuration = 3.0;
            } else {
                serviceDuration = 1.5;
            }

            const decimalEnd = decimalStart + serviceDuration;

            availableSlots.forEach(slot => {
                if (slot >= decimalStart && slot < decimalEnd) {
                    const hour = Math.floor(slot);
                    const min = (slot % 1) * 60;
                    const timeString = `${hour}:${min === 0 ? '00' : '30'}`;
                    blockedSlots.add(timeString);
                }
            });
        });

        res.json(Array.from(blockedSlots));
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// Get Monthly Stats
exports.getMonthlyStats = async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) return res.status(400).json({ error: "Missing year/month" });

        const pattern = `${year}-${month.toString().padStart(2, '0')}-%`;

        const result = await pool.query(
            "SELECT date::text as date_str, service, tonnage FROM bookings WHERE date::text LIKE $1 AND status != 'Cancelled'",
            [pattern]
        );

        const dailyLoad = {};

        result.rows.forEach(row => {
            const date = row.date_str;
            if (!dailyLoad[date]) dailyLoad[date] = 0;

            let duration = 1.5;
            if (row.service === 'Reparación' || row.tonnage >= 2) {
                duration = 3.0;
            }
            dailyLoad[date] += duration;
        });

        const stats = Object.keys(dailyLoad).map(date => {
            const load = dailyLoad[date];
            let level = 'high';
            if (load >= 5) level = 'none';
            else if (load >= 3) level = 'low';

            return { date, level, load };
        });

        res.json(stats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// Get All Bookings (Filtered by Role)
exports.getBookings = async (req, res) => {
    try {
        const { role, email } = req.user;
        let query = "SELECT * FROM bookings";
        let params = [];

        // Admins and Workers see all (Workers might need filtering later but for now we trust them to see available jobs)
        if (role === 'admin' || role === 'worker') {
            query += " ORDER BY created_at DESC";
        } else {
            // Clients see only their own
            query += " WHERE user_email = $1 ORDER BY created_at DESC";
            params.push(email);
        }

        const allBookings = await pool.query(query, params);
        res.json(allBookings.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
