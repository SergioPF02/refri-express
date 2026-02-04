const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db');

async function runMigration() {
    try {
        console.log("Checking if 'phone' column exists in 'users' table...");

        // check if column exists
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='phone';
        `);

        if (checkColumn.rows.length === 0) {
            console.log("Adding 'phone' column to 'users' table...");
            await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(50);");
            console.log("Migration successful: 'phone' column added.");
        } else {
            console.log("'phone' column already exists directly on 'users'. Skipping.");
        }

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        pool.end();
    }
}

runMigration();
