const pool = require('./db');

(async () => {
    try {
        console.log("Testing connection...");
        const res = await pool.query('SELECT NOW()');
        console.log("Connection SUCCESSFUL!", res.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error("Connection FAILED:", err.message);
        process.exit(1);
    }
})();
