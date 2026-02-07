const pool = require('../config/db');

exports.getNotifications = async (req, res) => {
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
};

exports.markAsRead = async (req, res) => {
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
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Notification not found" });
        }

        res.json({ message: "Notification deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
