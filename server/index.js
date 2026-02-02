require('dotenv').config(); // Load env vars first

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123'; // Logic for secret

app.use(cors());
app.use(express.json());

// file upload setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})

const upload = multer({ storage: storage });

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for mobile/production flexibility
        methods: ["GET", "POST", "PUT"]
    }
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Relay technician location
    socket.on('technician_location_update', (data) => {
        // data: { jobId, lat, lng }
        // Broadcast to all (for now) or room
        io.emit('technician_location_update', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!email || !password || !role) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, role]
        );

        // Generate Token
        const user = newUser.rows[0];
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ ...user, token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        // Compare password
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const { id, name, role } = user.rows[0];

        // Generate Token
        const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ id, name, email, role, token });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get Profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query("SELECT id, name, email, role, phone, bio, photo_url FROM users WHERE id = $1", [req.user.id]);
        if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update Profile
app.put('/api/users/profile', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const { name, phone, bio } = req.body;
        let photo_url = req.body.photo_url || null; // Fix undefined

        if (req.file) {
            // If new file uploaded, construct URL (assuming server runs on localhost:5000)
            photo_url = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        const result = await pool.query(
            "UPDATE users SET name = $1, phone = $2, bio = $3, photo_url = $4 WHERE id = $5 RETURNING id, name, email, role, phone, bio, photo_url",
            [name || '', phone || null, bio || '', photo_url, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Profile Update Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// Update Booking Details (Technician)
app.put('/api/bookings/:id/details', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time, price, description, status } = req.body;

        // Build query dynamically
        const fields = [];
        const values = [];
        let idx = 1;

        if (date !== undefined) { fields.push(`date = $${idx++}`); values.push(date); }
        if (time !== undefined) { fields.push(`time = $${idx++}`); values.push(time); }
        if (price !== undefined) { fields.push(`price = $${idx++}`); values.push(price); }
        if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
        if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }

        if (fields.length === 0) return res.json({ message: "No changes" });

        values.push(id);
        const query = `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) return res.status(404).json({ error: "Booking not found" });

        const updatedJob = result.rows[0];
        io.emit('job_update', updatedJob); // Notify clients
        res.json(updatedJob);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});
// --- BOOKING ROUTES ---

// Create Booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { user_email, service, tonnage, price, date, time, address, lat, lng, name, phone, description, contact_method, quantity } = req.body;

        const newBooking = await pool.query(
            `INSERT INTO bookings (user_email, service, tonnage, price, date, time, address, lat, lng, name, phone, description, contact_method, quantity) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [user_email, service, tonnage, price, date, time, address, lat, lng, name, phone, description, contact_method, quantity || 1]
        );

        // Broadcast new job to all connected clients (workers)
        io.emit('new_job', newBooking.rows[0]);

        res.json(newBooking.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Accept Booking (Protected & Atomic)
app.put('/api/bookings/:id/accept', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { technician_name } = req.body;
        const technician_id = req.user.id; // Get ID from verified token, secure!

        // ATOMIC UPDATE: Only update if status is 'Pending'
        const result = await pool.query(
            "UPDATE bookings SET status = 'Accepted', technician_id = $1, technician_name = $2 WHERE id = $3 AND status = 'Pending' RETURNING *",
            [technician_id, technician_name, id]
        );

        if (result.rows.length === 0) {
            // Either booking doesn't exist OR it was already taken (status != Pending)
            return res.status(409).json({ error: "Este trabajo ya no está disponible." });
        }

        io.emit('job_taken', result.rows[0]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Release Booking (Technician cancels BEFORE start - Penalty)
app.put('/api/bookings/:id/release', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const technician_id = req.user.id;

        // Atomic update: Only if accepted by this technician
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

        // Notify others that a job is available again (reuse new_job or specific event)
        io.emit('new_job', releasedJob); // Re-broadcast as if new? Or just update.
        // Better: emit job_update to clear it from technician view, and new_job to add to others?
        // Ideally clients handle this. 'job_update' with Pending might not trigger "Available" add in frontend logic if it filters by 'new_job' event only appending.
        // If we emit 'job_update' with Pending, it will update in lists. But 'Available' list in Dashboard relies on 'Pending' status.
        // We should emit 'job_update' so everyone updates the status.
        io.emit('job_update', releasedJob);

        res.json(releasedJob);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update Booking Status (In Progress, Completed)
app.put('/api/bookings/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'In Progress', 'Completed'

        const result = await pool.query(
            "UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Booking not found" });
        }

        const booking = result.rows[0];

        // Create Notification for Client
        try {
            const message = `Tu servicio de ${booking.service} ha cambiado a: ${status === 'In Progress' ? 'En Curso 🛠️' : 'Finalizado ✅'}`;
            await pool.query(
                "INSERT INTO notifications (user_id, message, type) VALUES ((SELECT id FROM users WHERE email = $1), $2, 'status_update')",
                [booking.user_email, message]
            );

            // Notify via socket
            io.emit('notification', { user_email: booking.user_email, message });
        } catch (notifErr) {
            console.error("Notification Error:", notifErr);
        }

        // Notify purely for real-time updates if needed (e.g. admin dashboard)
        io.emit('job_update', booking);

        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Submit Review
app.put('/api/bookings/:id/review', authenticateToken, async (req, res) => {
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
});

// Get Availability
// Get Availability with Blocking Logic
app.get('/api/bookings/availability', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "Missing date parameter" });

        const result = await pool.query("SELECT time, service, tonnage FROM bookings WHERE date = $1 AND status != 'Cancelled'", [date]);
        const bookings = result.rows;

        const blockedSlots = new Set();
        // Generate available slots (10:00 to 16:00 in 30 min intervals)
        const availableSlots = [];
        for (let h = 10; h <= 16; h += 0.5) {
            availableSlots.push(h);
        }

        bookings.forEach(booking => {
            const startHour = parseInt(booking.time.split(':')[0]);
            const startMin = parseInt(booking.time.split(':')[1]);
            const decimalStart = startHour + (startMin / 60);

            let serviceDuration = 1.5; // Default < 2 tons

            // Determine duration based on rules
            // User requested:
            // < 2 tons: Block 1.5h (Free at +1.5h) e.g. 10 -> 11:30 free
            // >= 2 tons: Block 3.0h (Free at +3.0h) e.g. 10 -> 13:00 free (blocks 12:30)

            if (booking.service === 'Reparación') {
                serviceDuration = 3.0; // Assume large block for repair safety
            } else if (booking.tonnage >= 2) {
                serviceDuration = 3.0;
            } else {
                serviceDuration = 1.5; // < 2 tons
            }

            // Note: User logic implies strict overlap checks WITHOUT extra travel buffer for the blocking calculation itself,
            // or rather, the durations 1.5 and 3.0 ALREADY account for what the user wants to block.
            // Example 1: 10:00 + 1.5 = 11:30. 11:30 is free. (Logic: slot < end)
            // Example 2: 10:00 + 3.0 = 13:00. 13:00 is free. (Logic: slot < end) includes 12:30 block.

            const decimalEnd = decimalStart + serviceDuration;

            availableSlots.forEach(slot => {
                // If the slot starts before the job ends, it's blocked.
                // Strict inequality because if slot == end, it's the start of the next one.
                if (slot >= decimalStart && slot < decimalEnd) {
                    // Format slot back to HH:MM
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
});

// Get Notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Mark Notification as Read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
            [id, req.user.id] // Ensure user owns notification
        );
        res.json({ message: "Marked as read" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get Bookings (Worker)
app.get('/api/bookings', async (req, res) => {
    try {
        // Return jobs that are Pending OR belonging to this specific worker would be better
        // For now, return all so they can see history or available
        const allBookings = await pool.query("SELECT * FROM bookings ORDER BY created_at DESC");
        res.json(allBookings.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
