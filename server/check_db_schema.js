const pool = require('./db');

async function checkSchema() {
    try {
        const tables = ['users', 'bookings', 'notifications'];
        for (const table of tables) {
            const res = await pool.query(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                [table]
            );
            console.log(`\nTable: ${table}`);
            if (res.rows.length === 0) {
                console.log("  (Table not found)");
            } else {
                res.rows.forEach(row => {
                    console.log(`  - ${row.column_name} (${row.data_type})`);
                });
            }
        }
    } catch (err) {
        console.error("Error querying schema:", err);
    } finally {
        pool.end();
    }
}

checkSchema();
