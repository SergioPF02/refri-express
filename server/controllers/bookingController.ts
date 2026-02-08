import { Request, Response } from 'express';
import pool from '../config/db';
import { getIO } from '../utils/socket';
import { sendPushNotification } from '../utils/fcmv1';
import { generateReceiptPDF } from '../utils/pdfGenerator';
import { sendCompletionEmail } from '../utils/email';

// Create Booking
export const createBooking = async (req: Request, res: Response) => {
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
                const message = `Nuevo servicio disponible: ${service}`;
                workers.rows.forEach((worker: any) => {
                    sendPushNotification(worker.device_token, "¡Nuevo Trabajo!", message)
                        .catch((err: any) => console.error("Error pushing to worker:", err));
                });
            }
        } catch (pushErr) {
            console.error("Worker Push Error:", pushErr);
        }

        res.json(booking);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

// Accept Booking
export const acceptBooking = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

// Release Booking
export const releaseBooking = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

// Update Booking Status
export const updateBookingStatus = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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
                await sendPushNotification(userRes.rows[0].device_token, "Actualización de Servicio", message);
            }

            // --- JOB COMPLETION EMAIL LOGIC ---
            if (status === 'Finalizado' || status === 'Completed' || status === 'Terminado') {
                console.log(`[DEBUG] Job ${booking.id} completed. Starting receipt generation...`);

                // Ensure items is an array (handle if it comes as string from DB)
                if (typeof booking.items === 'string') {
                    try {
                        booking.items = JSON.parse(booking.items);
                    } catch (e) {
                        console.error("[DEBUG] Error parsing booking items:", e);
                        booking.items = [];
                    }
                }

                try {
                    // Generate PDF
                    console.log("[DEBUG] Generating PDF...");
                    const pdfBuffer = await generateReceiptPDF(booking);
                    console.log(`[DEBUG] PDF Generated. Size: ${pdfBuffer.length} bytes`);

                    // Send Email
                    console.log(`[DEBUG] Sending email to ${booking.user_email}...`);
                    const emailSent = await sendCompletionEmail(booking.user_email, pdfBuffer, booking.name, booking.service);

                    if (emailSent) {
                        console.log("[DEBUG] Email sent successfully.");
                    } else {
                        console.error("[DEBUG] Email sending returned false.");
                    }
                } catch (pdfEmailErr) {
                    console.error("[DEBUG] Critical error in PDF/Email generation:", pdfEmailErr);
                }
            } else {
                console.log(`[DEBUG] Status update to '${status}' - No email triggering.`);
            }

        } catch (notifErr) {
            console.error("Notification/Email Error:", notifErr);
            // Non-blocking error
        }


        io.emit('job_update', booking);
        res.json(booking);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

// Update Booking Details
export const updateBookingDetails = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const { id } = req.params;
        const { date, time, price, description, status } = req.body;
        const { role, email, id: userId } = req.user;

        // Verify Perms
        const check = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Booking not found" });
        const current = check.rows[0];

        const isOwner = current.user_email === email;
        const isAdmin = role === 'admin';
        const isAssignedWorker = current.technician_id === userId;

        // Allow Admin, Owner, OR Assigned Worker to update details
        if (!isAdmin && !isOwner && !isAssignedWorker) {
            return res.status(403).json({ error: "No autorizado. Solo el técnico asignado o admin pueden modificar esto." });
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

    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

// Submit Review
export const submitReview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;

        const result = await pool.query(
            "UPDATE bookings SET rating = $1, review = $2 WHERE id = $3 RETURNING *",
            [rating, review, id]
        );

        res.json(result.rows[0]);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

// Get Availability
export const getAvailability = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "Missing date parameter" }); // Handle undefined date

        const result = await pool.query("SELECT time, service, tonnage FROM bookings WHERE date = $1 AND status != 'Cancelled'", [date]);
        const bookings = result.rows;

        const blockedSlots = new Set();
        const availableSlots: number[] = [];
        for (let h = 10; h <= 16; h += 0.5) {
            availableSlots.push(h);
        }

        bookings.forEach((booking: any) => {
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
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

// Get Monthly Stats
export const getMonthlyStats = async (req: Request, res: Response) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) return res.status(400).json({ error: "Missing year/month" });

        const pattern = `${year}-${month.toString().padStart(2, '0')}-%`;

        const result = await pool.query(
            "SELECT date::text as date_str, service, tonnage FROM bookings WHERE date::text LIKE $1 AND status != 'Cancelled'",
            [pattern]
        );

        const dailyLoad: Record<string, number> = {};

        result.rows.forEach((row: any) => {
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
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};

// Get All Bookings (Filtered by Role)
export const getBookings = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const { role, email } = req.user;
        console.log(`[DEBUG] getBookings for user: ${email} role: ${role}`);

        let query = "SELECT * FROM bookings";
        let params: any[] = [];

        // Admins and Workers see all (Workers might need filtering later but for now we trust them to see available jobs)
        if (role === 'admin' || role === 'worker') {
            query += " ORDER BY created_at DESC";
        } else {
            // Clients see only their own
            query += " WHERE user_email = $1 ORDER BY created_at DESC";
            params.push(email);
        }

        console.log(`[DEBUG] Executing Query: ${query} with params: ${JSON.stringify(params)}`);

        const allBookings = await pool.query(query, params);
        console.log(`[DEBUG] Found ${allBookings.rows.length} bookings.`);

        res.json(allBookings.rows);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
};
