const pool = require('./db');
require('dotenv').config();

const addQuantityColumn = async () => {
    try {
        // Add quantity column, default to 1
        await pool.query("ALTER TABLE bookings ADD COLUMN quantity INT DEFAULT 1");
        console.log("Column 'quantity' added successfully!");
    } catch (err) {
        if (err.message.includes("already exists")) {
            console.log("Column 'quantity' already exists, skipping.");
        } else {
            console.error("Error running migration:", err.message);
        }
    } finally {
        pool.end();
    }
};

addQuantityColumn();
