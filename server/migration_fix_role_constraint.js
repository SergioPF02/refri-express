const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db');

const fixConstraint = async () => {
    try {
        console.log("Updating users_role_check constraint...");

        // 1. Drop existing constraint
        await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");

        // 2. Add new constraint including 'admin'
        await pool.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('client', 'worker', 'admin'))");

        console.log("Constraint updated successfully.");
    } catch (err) {
        console.error("Error updating constraint:", err);
    } finally {
        pool.end();
    }
};

fixConstraint();
