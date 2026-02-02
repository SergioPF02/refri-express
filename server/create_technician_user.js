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

async function createTechnician() {
    const client = new Client(DB_CONFIG);

    try {
        await client.connect();

        const name = "Técnico Juan";
        const email = "tecnico@refriexpress.com";
        const plainPassword = "tecnico123";
        const role = "worker";

        // Check if exists
        const checkRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
            console.log('User already exists');
            // Update password just in case
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            await client.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
            console.log('Password updated.');
            return;
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const res = await client.query(
            `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
            [name, email, hashedPassword, role]
        );

        console.log('✅ Technician user created successfully:');
        console.log(res.rows[0]);
        console.log(`Email: ${email}`);
        console.log(`Password: ${plainPassword}`);

    } catch (err) {
        console.error('Error creating technician:', err);
    } finally {
        await client.end();
    }
}

createTechnician();
