const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config(); // Ensure dotenv is used for secret

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123'; // Logic for secret

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
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
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, bio, photo_url } = req.body;
        const result = await pool.query(
            "UPDATE users SET name = $1, phone = $2, bio = $3, photo_url = $4 WHERE id = $5 RETURNING id, name, email, role, phone, bio, photo_url",
            [name, phone, bio, photo_url, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// --- BOOKING ROUTES ---

// Create Booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { user_email, service, tonnage, price, date, time, address, lat, lng, name, phone } = req.body;

        const newBooking = await pool.query(
            `INSERT INTO bookings (user_email, service, tonnage, price, date, time, address, lat, lng, name, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [user_email, service, tonnage, price, date, time, address, lat, lng, name, phone]
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
app.get('/api/bookings/availability', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "Missing date parameter" });

        const bookings = await pool.query("SELECT time FROM bookings WHERE date = $1", [date]);
        const takenSlots = bookings.rows.map(b => b.time);

        res.json(takenSlots);
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

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
