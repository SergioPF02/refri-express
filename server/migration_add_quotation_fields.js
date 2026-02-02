const { Client } = require('pg');
require('dotenv').config();

const DB_CONFIG = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function migrate() {
    const client = new Client(DB_CONFIG);
    try {
        await client.connect();
        console.log('Running migration...');

        await client.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS contact_method VARCHAR(50);
        `);

        console.log('Migration SUCCESSFUL: Added description and contact_method columns.');
    } catch (err) {
        console.error('Migration FAILED:', err);
    } finally {
        await client.end();
    }
}

migrate();
