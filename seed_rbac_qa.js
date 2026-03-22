/**
 * QA Seed — Datos de prueba RBAC
 * Crea jerarquía: Lider A (padre) → Lider B (hijo) → Lider C (nieto)
 * Personas: X asignada a C, Y asignada a A
 * Usuarios: admin_qa, operador_qa, lider_a_qa, lider_b_qa
 *
 * Ejecutar: node seed_rbac_qa.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── Índices de Performance ────────────────────────────────────────────
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lideres_lider_padre_id  ON lideres(lider_padre_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_asignaciones_lider_id   ON asignaciones(lider_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_asignaciones_persona_id ON asignaciones(persona_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_asignaciones_estado     ON asignaciones(estado_asignacion_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lideres_persona_id      ON lideres(persona_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_persona_id     ON usuarios(persona_id)`);
        console.log('✅ Índices aplicados');

        // ── Lookup catalogos ──────────────────────────────────────────────────
        const sectorRes = await client.query(`SELECT sector_id FROM sectores LIMIT 1`);
        const estPersRes = await client.query(`SELECT estado_persona_id FROM estado_persona WHERE nombre='Activo' LIMIT 1`);
        const estLidRes = await client.query(`SELECT estado_lider_id FROM estado_lider WHERE nombre='Activo' LIMIT 1`);
        const nivLidRes = await client.query(`SELECT nivel_lider_id FROM nivel_lider LIMIT 1`);
        const estAsigRes = await client.query(`SELECT estado_asignacion_id FROM estado_asignacion WHERE nombre='Activa' LIMIT 1`);
        const estURes = await client.query(`SELECT estado_usuario_id FROM estado_usuario WHERE nombre='Activo' LIMIT 1`);
        const rolAdminRes = await client.query(`SELECT rol_id FROM roles WHERE nombre='Admin' LIMIT 1`);
        const rolOperRes = await client.query(`SELECT rol_id FROM roles WHERE nombre='Operador' LIMIT 1`);
        const rolLiderRes = await client.query(`SELECT rol_id FROM roles WHERE nombre='Lider' LIMIT 1`);

        const sector_id = sectorRes.rows[0].sector_id;
        const estado_persona_id = estPersRes.rows[0].estado_persona_id;
        const estado_lider_id = estLidRes.rows[0].estado_lider_id;
        const nivel_lider_id = nivLidRes.rows[0].nivel_lider_id;
        const estado_asig_id = estAsigRes.rows[0].estado_asignacion_id;
        const estado_usuario_id = estURes.rows[0].estado_usuario_id;
        const rol_admin_id = rolAdminRes.rows[0].rol_id;
        const rol_oper_id = rolOperRes.rows[0].rol_id;
        const rol_lider_id = rolLiderRes.rows[0].rol_id;

        const pwHash = await bcrypt.hash('Test1234!', 12);

        // ── Helper: insert persona ────────────────────────────────────────────
        async function insertPersona(nombres, apellidos, telefono) {
            const r = await client.query(
                `INSERT INTO personas (nombres, apellidos, telefono, sector_id, estado_persona_id)
                 VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (telefono) DO UPDATE SET nombres=EXCLUDED.nombres
                 RETURNING persona_id`,
                [nombres, apellidos, telefono, sector_id, estado_persona_id]
            );
            return r.rows[0].persona_id;
        }

        async function insertLider(persona_id, codigo, padre_id = null) {
            const r = await client.query(
                `INSERT INTO lideres (persona_id, meta_cantidad, codigo_lider, estado_lider_id, nivel_lider_id, lider_padre_id)
                 VALUES ($1, 50, $2, $3, $4, $5)
                 ON CONFLICT (persona_id) DO UPDATE SET codigo_lider=EXCLUDED.codigo_lider
                 RETURNING lider_id`,
                [persona_id, codigo, estado_lider_id, nivel_lider_id, padre_id]
            );
            return r.rows[0].lider_id;
        }

        async function insertUsuario(persona_id, email, rol_id) {
            await client.query(
                `INSERT INTO usuarios (persona_id, email_login, password_hash, rol_id, estado_usuario_id)
                 VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (persona_id) DO UPDATE SET email_login=EXCLUDED.email_login`,
                [persona_id, email, pwHash, rol_id, estado_usuario_id]
            );
        }

        async function insertAsignacion(lider_id, persona_id) {
            await client.query(
                `INSERT INTO asignaciones (lider_id, persona_id, estado_asignacion_id)
                 VALUES ($1,$2,$3)
                 ON CONFLICT DO NOTHING`,
                [lider_id, persona_id, estado_asig_id]
            );
        }

        // ── Crear personas / líderes / jerarquía ──────────────────────────────
        const pA = await insertPersona('Ana', 'Ramirez', '+18095550001');
        const pB = await insertPersona('Benicio', 'Torres', '+18095550002');
        const pC = await insertPersona('Carlos', 'Medina', '+18095550003');
        const pX = await insertPersona('Ximena', 'Lara', '+18095550004'); // captada por C
        const pY = await insertPersona('Yadira', 'Flores', '+18095550005'); // captada por A

        const lA = await insertLider(pA, 'QA-LIDER-A');
        const lB = await insertLider(pB, 'QA-LIDER-B', lA);
        const lC = await insertLider(pC, 'QA-LIDER-C', lB);

        await insertAsignacion(lC, pX);
        await insertAsignacion(lA, pY);

        // ── Crear usuarios ────────────────────────────────────────────────────
        // Usuario admin_qa (persona separada)
        const pAdmin = await insertPersona('Admin', 'QA', '+18095550010');
        await insertUsuario(pAdmin, 'admin_qa@test.com', rol_admin_id);

        // Operador
        const pOper = await insertPersona('Operador', 'QA', '+18095550011');
        await insertUsuario(pOper, 'operador_qa@test.com', rol_oper_id);

        // Lider A → usa persona pA
        await insertUsuario(pA, 'lider_a_qa@test.com', rol_lider_id);

        // Lider B → usa persona pB
        await insertUsuario(pB, 'lider_b_qa@test.com', rol_lider_id);

        // Lider C → usa persona pC
        await insertUsuario(pC, 'lider_c_qa@test.com', rol_lider_id);

        await client.query('COMMIT');

        console.log('\n✅ Seed QA completado');
        console.log('─────────────────────────────────────');
        console.log(`Lider A ID: ${lA}  → Persona ID: ${pA}`);
        console.log(`Lider B ID: ${lB}  → Persona ID: ${pB}`);
        console.log(`Lider C ID: ${lC}  → Persona ID: ${pC}`);
        console.log('─────────────────────────────────────');
        console.log('Credenciales (password: Test1234! para todos):');
        console.log('  admin_qa@test.com     (Admin)');
        console.log('  operador_qa@test.com  (Operador)');
        console.log('  lider_a_qa@test.com   (Lider — árbol: A,B,C)');
        console.log('  lider_b_qa@test.com   (Lider — árbol: B,C)');
        console.log('  lider_c_qa@test.com   (Lider — árbol: C)');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

run();
