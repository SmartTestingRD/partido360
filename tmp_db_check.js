require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTriggers() {
  const res = await pool.query(`
    SELECT event_manipulation, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_table = 'personas'
  `);
  console.log('Triggers on "personas":', res.rows);
  await pool.end();
}
checkTriggers();
