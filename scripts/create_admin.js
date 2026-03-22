const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const email = 'ejguerrero@smarttestingrd.com';
        const rawPassword = 'Password123!';

        // 1. Check if user already exists
        const checkUser = await client.query('SELECT usuario_id FROM usuarios WHERE email_login = $1', [email]);
        if (checkUser.rows.length > 0) {
            console.log(`User ${email} already exists.`);
            await client.query('ROLLBACK');
            return;
        }

        // 2. Get Role ID for Admin
        const roleRes = await client.query("SELECT rol_id FROM roles WHERE nombre = 'Admin' LIMIT 1");
        if (roleRes.rows.length === 0) throw new Error("Role Admin not found in database.");
        const rolId = roleRes.rows[0].rol_id;

        // 3. Get Status ID for Activo
        const statusRes = await client.query("SELECT estado_usuario_id FROM estado_usuario WHERE nombre = 'Activo' LIMIT 1");
        if (statusRes.rows.length === 0) throw new Error("Status Activo not found in database.");
        const estadoUsuarioId = statusRes.rows[0].estado_usuario_id;

        // 3a. Get Status ID for Persona
        const estadoPersonaRes = await client.query("SELECT estado_persona_id FROM estado_persona LIMIT 1");
        const estadoPersonaId = estadoPersonaRes.rows[0].estado_persona_id;

        // 3b. Get a valid sector_id
        const sectorRes = await client.query("SELECT sector_id FROM sectores LIMIT 1");
        const sectorId = sectorRes.rows[0].sector_id;

        // 4. Create Persona
        const personaRes = await client.query(
            `INSERT INTO personas (nombres, apellidos, telefono, sector_id, estado_persona_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING persona_id`,
            ['Erick', 'Guerrero', '0000000000', sectorId, estadoPersonaId]
        );
        const personaId = personaRes.rows[0].persona_id;

        // 5. Create Usuario
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(rawPassword, salt);

        await client.query(
            `INSERT INTO usuarios (persona_id, email_login, username, password_hash, rol_id, estado_usuario_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [personaId, email, 'ejguerrero_admin', passwordHash, rolId, estadoUsuarioId]
        );

        await client.query('COMMIT');
        console.log(`Successfully created ADMIN user!`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${rawPassword}`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error creating admin user:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

createAdmin();
