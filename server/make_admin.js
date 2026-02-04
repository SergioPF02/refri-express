require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const makeAdmin = async () => {
    try {
        const email = "admin@refri.com"; // Default admin email to create/update
        const name = "Admin Principal";
        const password = "adminpassword123"; // You might want to hash this if inserting new, but let's assume updating for now or simple insert
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if exists
        const check = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (check.rows.length > 0) {
            await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
            console.log(`User ${email} updated to ADMIN.`);
        } else {
            // Create
            await pool.query(
                "INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5)",
                [name, email, hashedPassword, 'admin', '5555555555']
            );
            console.log(`User ${email} created as ADMIN.`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
};

makeAdmin();
