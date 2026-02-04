const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db');

const checkUser = async () => {
    try {
        const email = "admin@refri.com";
        const res = await pool.query("SELECT id, name, email, role FROM users WHERE email = $1", [email]);
        console.log("User in DB:", res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
};

checkUser();
