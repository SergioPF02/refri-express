const pool = require('./db');

async function migrate() {
    try {
        console.log('Running migration...');

        await pool.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS contact_method VARCHAR(50);
        `);

        console.log('Migration SUCCESSFUL: Added description and contact_method columns.');
    } catch (err) {
        console.error('Migration FAILED:', err);
    } finally {
        pool.end();
    }
}

migrate();

migrate();
