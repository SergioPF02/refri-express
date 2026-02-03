const pool = require('./db');

async function migrate() {
    try {
        console.log("Checking for device_token column...");
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS device_token TEXT;
        `);
        console.log("Migration successful: device_token column added.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
