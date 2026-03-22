const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Neon DB setup
});

async function checkUsers() {
    try {
        const res = await pool.query('SELECT email_login, username, password_hash, rol_id FROM usuarios LIMIT 1');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error fetching users:', err);
    } finally {
        await pool.end();
    }
}

checkUsers();
