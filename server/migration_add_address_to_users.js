const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db');

async function runMigration() {
    try {
        console.log("Checking for default address columns in 'users' table...");

        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='default_address';
        `);

        if (checkColumn.rows.length === 0) {
            console.log("Adding address columns to 'users' table...");
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN default_address TEXT,
                ADD COLUMN default_lat NUMERIC(10, 6) DEFAULT 24.809065,
                ADD COLUMN default_lng NUMERIC(10, 6) DEFAULT -107.394017;
            `);
            console.log("Migration successful: Columns added.");
        } else {
            console.log("Columns already exist. Skipping.");
        }

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        pool.end();
    }
}

runMigration();
