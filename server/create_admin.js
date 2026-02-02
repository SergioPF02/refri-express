const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DB_CONFIG = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function createAdmin() {
    const client = new Client(DB_CONFIG);

    try {
        await client.connect();

        const name = "Admin User";
        const email = "admin@refriexpress.com";
        const plainPassword = "admin123"; // Reset this immediately!
        const role = "worker"; // Admin role in this app is 'worker'

        // Check if exists
        const checkRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
            console.log('User already exists');
            return;
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const res = await client.query(
            `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
            [name, email, hashedPassword, role]
        );

        console.log('✅ Admin user created successfully:');
        console.log(res.rows[0]);
        console.log(`Password: ${plainPassword}`);

    } catch (err) {
        console.error('Error creating admin:', err);
    } finally {
        await client.end();
    }
}

createAdmin();
