const pool = require('../config/db');

// Stats
exports.getStats = async (req, res) => {
    try {
        const userCount = await pool.query("SELECT COUNT(*) FROM users");
        const activeJobs = await pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'In Progress'");
        const pendingJobs = await pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'Pending'");
        const revenue = await pool.query("SELECT SUM(price) FROM bookings WHERE status = 'Completed'");

        res.json({
            users: parseInt(userCount.rows[0].count),
            active_jobs: parseInt(activeJobs.rows[0].count),
            pending_jobs: parseInt(pendingJobs.rows[0].count),
            revenue: revenue.rows[0].sum || 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// Users Management
exports.getUsers = async (req, res) => {
    try {
        const users = await pool.query("SELECT id, name, email, role, phone, created_at FROM users ORDER BY id ASC");
        res.json(users.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['client', 'worker', 'admin'].includes(role)) {
            return res.status(400).json({ error: "Rol inválido" });
        }

        const update = await pool.query("UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, role", [role, id]);

        if (update.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        res.json(update.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// Bookings Overview
exports.getBookings = async (req, res) => {
    try {
        const bookings = await pool.query(`
            SELECT b.*, u.name as client_name, u.email as client_email 
            FROM bookings b 
            JOIN users u ON b.user_id = u.id 
            ORDER BY b.created_at DESC
        `);
        res.json(bookings.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};
