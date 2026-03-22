const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const API_URL = 'http://localhost:3001/api/auth';
const TEST_EMAIL = 'emmanuel.ulloa@partido360.com'; // User in the DB
let validToken = '';

async function runTests() {
    console.log('--- PREPARING DB FOR TESTS ---');
    // Ensure user is unlocked and password is known for TEST_EMAIL
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('CorrectPassword123', salt);
    await pool.query(
        `UPDATE usuarios SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE email_login = $2`,
        [hash, TEST_EMAIL]
    );

    console.log('\n========================================');
    console.log('1) Login ok');
    console.log(`CURL: curl -X POST ${API_URL}/login -H "Content-Type: application/json" -d '{"login":"${TEST_EMAIL}","password":"CorrectPassword123"}'`);
    let res = await fetch(`${API_URL}/login`, { method: 'POST', body: JSON.stringify({ login: TEST_EMAIL, password: 'CorrectPassword123' }), headers: { 'Content-Type': 'application/json' } });
    console.log(`HTTP ${res.status}`);
    const loginOkData = await res.json();
    console.log(JSON.stringify(loginOkData));
    validToken = loginOkData.data.token;

    console.log('\n========================================');
    console.log('2) Login password incorrecto');
    console.log(`CURL: curl -X POST ${API_URL}/login -H "Content-Type: application/json" -d '{"login":"${TEST_EMAIL}","password":"WrongPassword"}'`);
    res = await fetch(`${API_URL}/login`, { method: 'POST', body: JSON.stringify({ login: TEST_EMAIL, password: 'WrongPassword' }), headers: { 'Content-Type': 'application/json' } });
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json()));

    console.log('\n========================================');
    console.log('3) Bloqueo por 5 intentos (Looping attempts 2 to 5)');
    console.log(`CURL: for i in {1..4}; do curl -X POST ${API_URL}/login -H "Content-Type: application/json" -d '{"login":"${TEST_EMAIL}","password":"WrongPassword"}'; done`);
    for (let i = 0; i < 4; i++) {
        res = await fetch(`${API_URL}/login`, { method: 'POST', body: JSON.stringify({ login: TEST_EMAIL, password: 'WrongPassword' }), headers: { 'Content-Type': 'application/json' } });
    }
    console.log(`Last attempt HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json()));

    console.log('\n========================================');
    console.log('4) Login durante bloqueo => 423');
    console.log(`CURL: curl -X POST ${API_URL}/login -H "Content-Type: application/json" -d '{"login":"${TEST_EMAIL}","password":"CorrectPassword123"}'`);
    res = await fetch(`${API_URL}/login`, { method: 'POST', body: JSON.stringify({ login: TEST_EMAIL, password: 'CorrectPassword123' }), headers: { 'Content-Type': 'application/json' } });
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json()));

    console.log('\n========================================');
    console.log('5) Forgot-password para usuario existente => 200 (sin revelar)');
    console.log(`CURL: curl -X POST ${API_URL}/forgot-password -H "Content-Type: application/json" -d '{"login":"${TEST_EMAIL}"}'`);
    res = await fetch(`${API_URL}/forgot-password`, { method: 'POST', body: JSON.stringify({ login: TEST_EMAIL }), headers: { 'Content-Type': 'application/json' } });
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json()));

    console.log('\n========================================');
    console.log('6) Forgot-password para usuario NO existente => 200 (igual)');
    console.log(`CURL: curl -X POST ${API_URL}/forgot-password -H "Content-Type: application/json" -d '{"login":"noexist_user@partido360.com"}'`);
    res = await fetch(`${API_URL}/forgot-password`, { method: 'POST', body: JSON.stringify({ login: 'noexist_user@partido360.com' }), headers: { 'Content-Type': 'application/json' } });
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json()));

    console.log('\n========================================');
    console.log('7) Reset-password con token inválido => 400');
    console.log(`CURL: curl -X POST ${API_URL}/reset-password -H "Content-Type: application/json" -d '{"token":"invalidtokenstring","new_password":"NewStrongPass1!"}'`);
    res = await fetch(`${API_URL}/reset-password`, { method: 'POST', body: JSON.stringify({ token: 'invalidtokenstring', new_password: 'NewStrongPass1!' }), headers: { 'Content-Type': 'application/json' } });
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json()));

    console.log('\n========================================');
    console.log('8) Reset-password con token expirado => 400');
    // Generate expired token in DB manually
    const expTokenStr = crypto.randomBytes(32).toString('hex');
    const expTokenHash = crypto.createHash('sha256').update(expTokenStr).digest('hex');
    const userRes = await pool.query('SELECT usuario_id FROM usuarios WHERE email_login = $1', [TEST_EMAIL]);
    const userId = userRes.rows[0].usuario_id;
    await pool.query(
        `INSERT INTO password_resets (usuario_id, token_hash, expires_at) VALUES ($1, $2, NOW() - INTERVAL '1 hour')`,
        [userId, expTokenHash]
    );
    console.log(`CURL: curl -X POST ${API_URL}/reset-password -H "Content-Type: application/json" -d '{"token":"${expTokenStr}","new_password":"NewStrongPass1!"}'`);
    res = await fetch(`${API_URL}/reset-password`, { method: 'POST', body: JSON.stringify({ token: expTokenStr, new_password: 'NewStrongPass1!' }), headers: { 'Content-Type': 'application/json' } });
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json()));

    console.log('\n========================================');
    // Retrieve the valid token from the previous forgot password (we assume it was created in step 5)
    const tokenRes = await pool.query(`SELECT token_hash FROM password_resets WHERE usuario_id = $1 AND expires_at > NOW() AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`, [userId]);
    // The problem is we don't know the plain token generated in step 5.
    // So let's generate a fresh valid token in DB manually for the test 9
    const freshTokenStr = crypto.randomBytes(32).toString('hex');
    const freshTokenHash = crypto.createHash('sha256').update(freshTokenStr).digest('hex');
    await pool.query(
        `INSERT INTO password_resets (usuario_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [userId, freshTokenHash]
    );

    console.log('9) Reset-password ok => 200 y token invalidado');
    console.log(`(Token hash stored in DB: ${freshTokenHash})`);
    console.log(`CURL: curl -X POST ${API_URL}/reset-password -H "Content-Type: application/json" -d '{"token":"${freshTokenStr}","new_password":"NewStrongPass1!"}'`);
    res = await fetch(`${API_URL}/reset-password`, { method: 'POST', body: JSON.stringify({ token: freshTokenStr, new_password: 'NewStrongPass1!' }), headers: { 'Content-Type': 'application/json' } });
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json()));

    // Verify token invalidated
    const chkToken = await pool.query('SELECT used_at FROM password_resets WHERE token_hash = $1', [freshTokenHash]);
    console.log(`>> Token invalidated in DB? ` + (chkToken.rows[0].used_at !== null ? 'YES (' + chkToken.rows[0].used_at + ')' : 'NO'));

    console.log('\n========================================');
    console.log('10) Verificar que password_hash nunca se devuelve (en login ni en /me)');
    console.log(`CURL /me: curl -X GET ${API_URL}/me -H "Authorization: Bearer <TOKEN>"`);
    res = await fetch(`${API_URL}/me`, { headers: { 'Authorization': `Bearer ${validToken}` } });
    const meData = await res.json();
    console.log(`HTTP ${res.status} Response:`);
    console.log(JSON.stringify(meData));

    console.log('\nVerifying login payload password absence:');
    console.log(`Has password_hash? ${loginOkData.data.user.password_hash !== undefined}`);
    console.log(`Has password? ${loginOkData.data.user.password !== undefined}`);

    process.exit(0);
}

runTests();
