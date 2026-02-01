const pool = require('./db');
require('dotenv').config();

const addUserProfileColumns = async () => {
    try {
        // Add profile columns
        await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20), ADD COLUMN bio TEXT, ADD COLUMN photo_url TEXT");
        console.log("Columns 'phone', 'bio', 'photo_url' added successfully!");
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

addUserProfileColumns();
