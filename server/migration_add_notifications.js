const pool = require('./db');
require('dotenv').config();

const addNotificationsTable = async () => {
    try {
        // Create notifications table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log("Table 'notifications' created successfully!");
    } catch (err) {
        console.error("Error running migration:", err.message);
    } finally {
        pool.end();
    }
};

addNotificationsTable();
