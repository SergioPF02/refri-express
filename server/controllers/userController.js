const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.getProfile = async (req, res) => {
    try {
        const user = await pool.query("SELECT id, name, email, role, phone, bio, photo_url, default_address, default_lat, default_lng FROM users WHERE id = $1", [req.user.id]);
        if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, bio, default_address, default_lat, default_lng } = req.body;
        let photo_url = req.body.photo_url || null; // Fix undefined

        if (req.file) {
            // If new file uploaded, construct URL (assuming server runs on localhost:5000 or configure via env)
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            photo_url = `${baseUrl}/uploads/${req.file.filename}`;
        }

        const result = await pool.query(
            "UPDATE users SET name = $1, phone = $2, bio = $3, photo_url = $4, default_address = $5, default_lat = $6, default_lng = $7 WHERE id = $8 RETURNING id, name, email, role, phone, bio, photo_url, default_address, default_lat, default_lng",
            [name || '', phone || null, bio || '', photo_url, default_address || null, default_lat || null, default_lng || null, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Profile Update Error:", err.message);
        res.status(500).send("Server Error");
    }
};

exports.updateDeviceToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: "Missing token" });

        await pool.query("UPDATE users SET device_token = $1 WHERE id = $2", [token, req.user.id]);
        res.json({ message: "Token updated" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
