import { Request, Response } from 'express';
import pool from '../config/db';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await pool.query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        res.json(result.rows);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
            [id, userId] // Ensure user owns notification
        );
        res.json({ message: "Marked as read" });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Notification not found" });
        }

        res.json({ message: "Notification deleted" });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
