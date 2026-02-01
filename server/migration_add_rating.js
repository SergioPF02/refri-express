const pool = require('./db');
require('dotenv').config();

const addRatingColumns = async () => {
    try {
        // Add rating (1-5) and review (text)
        await pool.query("ALTER TABLE bookings ADD COLUMN rating INT DEFAULT 0, ADD COLUMN review TEXT DEFAULT ''");
        console.log("Columns 'rating' and 'review' added successfully!");
    } catch (err) {
        if (err.message.includes("already exists")) {
            console.log("Columns already exist, skipping.");
        } else {
            console.error("Error running migration:", err.message);
        }
    } finally {
        pool.end();
    }
};

addRatingColumns();
