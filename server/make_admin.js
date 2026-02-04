const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db');

const makeAdmin = async () => {
    try {
        const email = "admin@refri.com"; // Default admin email to create/update
        const name = "Admin Principal";
        const password = "adminpassword123";
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log("Connecting to DB...");

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
        console.error("Error creating admin:", err);
    } finally {
        pool.end();
    }
};

makeAdmin();
