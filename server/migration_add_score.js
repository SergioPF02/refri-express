const pool = require('./db');

async function addScoreColumn() {
    try {
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 100;");
        console.log("Column 'score' added successfully");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

addScoreColumn();
