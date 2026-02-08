
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        }
        : {
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: 'refri_express'
        }
);

async function checkColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bookings'
        `);
        console.log('Columns in bookings table:');
        res.rows.forEach(row => console.log(`- ${row.column_name}`));
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        pool.end();
    }
}

checkColumns();
