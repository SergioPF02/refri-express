require('dotenv').config({ path: './server/.env' });
const pool = require('./db');

async function migrate() {
    try {
        console.log('Running migration...');
        // Add items column as JSONB (Postgres) or TEXT (if using lighter DB, but PG supports JSONB)
        // We will use JSONB for flexibility.
        await pool.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
        `);

        console.log('Migration SUCCESSFUL: Added items column.');
    } catch (err) {
        console.error('Migration FAILED:', err);
    } finally {
        pool.end();
    }
}

migrate();
