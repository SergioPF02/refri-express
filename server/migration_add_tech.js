const pool = require('./db');

(async () => {
    try {
        console.log("Running migration...");
        await pool.query(`
      ALTER TABLE bookings 
      ADD COLUMN technician_id INTEGER REFERENCES users(id),
      ADD COLUMN technician_name VARCHAR(255);
    `);
        console.log("Migration SUCCESSFUL: Added technician_id and technician_name columns.");
        process.exit(0);
    } catch (err) {
        if (err.code === '42701') {
            console.log("Columns already exist, skipping.");
            process.exit(0);
        }
        console.error("Migration FAILED:", err.message);
        process.exit(1);
    }
})();
