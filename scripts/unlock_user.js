const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query(`UPDATE usuarios SET failed_login_attempts = 0, locked_until = NULL WHERE email_login = 'emmanuel.ulloa@partido360.com'`);
        console.log('User unlocked');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
