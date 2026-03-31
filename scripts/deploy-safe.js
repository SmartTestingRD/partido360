/**
 * deploy-safe.js
 * Verificacion pre-deploy: asegura que la BD tiene todo lo necesario.
 * NUNCA borra datos. Solo verifica y crea lo que falte.
 *
 * Uso: node scripts/deploy-safe.js
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  console.log('=== Deploy Seguro Partido360 ===\n');

  // 0. Set search_path (el pooler de Neon no lo soporta en la URL)
  await p.query('SET search_path TO partido360, public');

  // 1. Verificar conexion
  const ver = await p.query('SELECT version()');
  console.log('1. BD conectada:', ver.rows[0].version.split(' ').slice(0, 2).join(' '));

  // 2. Verificar que el schema partido360 existe
  const schemaCheck = await p.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name='partido360'");
  if (schemaCheck.rows.length === 0) {
    console.error('   SCHEMA partido360 NO EXISTE.');
    console.error('   Ejecuta primero: node scripts/setup-schema.js');
    process.exit(1);
  }
  console.log('2. Schema partido360 existe');

  // 3. Verificar tablas criticas
  const tablasCriticas = ['usuarios', 'personas', 'lideres', 'candidatos', 'roles', 'sectores',
    'nivel_lider', 'estado_persona', 'estado_lider', 'estado_usuario', 'fuentes_captacion',
    'asignaciones', 'estado_asignacion', 'password_resets'];
  let tablasOk = true;
  for (const tabla of tablasCriticas) {
    try {
      const r = await p.query(`SELECT COUNT(*) as c FROM ${tabla}`);
      console.log(`   ${tabla}: ${r.rows[0].c} registros`);
    } catch (e) {
      console.error(`   TABLA FALTANTE: ${tabla}`);
      tablasOk = false;
    }
  }
  if (!tablasOk) {
    console.error('\n   Tablas faltantes. Ejecuta: node scripts/setup-schema.js');
    process.exit(1);
  }
  console.log('3. Todas las tablas criticas existen');

  // 4. Verificar Super Admin
  const admin = await p.query(`
    SELECT u.email_login, r.nombre as rol
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.rol_id
    WHERE r.nombre = 'Admin'
    LIMIT 1
  `);
  if (admin.rows.length > 0) {
    console.log('4. Super Admin existe:', admin.rows[0].email_login);
  } else {
    console.log('4. Super Admin NO existe - creando...');
    const hash = await bcrypt.hash('Admin123!', 10);
    const rolRes = await p.query("SELECT rol_id FROM roles WHERE nombre='Admin'");
    const estadoRes = await p.query("SELECT estado_usuario_id FROM estado_usuario WHERE nombre='Activo'");
    const estadoPRes = await p.query("SELECT estado_persona_id FROM estado_persona WHERE nombre='Activo'");
    const sectorRes = await p.query('SELECT sector_id FROM sectores LIMIT 1');

    // Candidato Super Admin
    await p.query("INSERT INTO candidatos (candidato_id,nombre,partido,activo) VALUES ('00000000-0000-0000-0000-000000000001','Super Admin','Sistema',true) ON CONFLICT DO NOTHING");

    // Persona
    const pCheck = await p.query("SELECT persona_id FROM personas WHERE cedula='00000000001'");
    let personaId;
    if (pCheck.rows.length === 0) {
      const pRes = await p.query(
        'INSERT INTO personas (nombres,apellidos,cedula,telefono,sector_id,estado_persona_id,candidato_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING persona_id',
        ['Admin', 'Sistema', '00000000001', '8090000001', sectorRes.rows[0].sector_id, estadoPRes.rows[0].estado_persona_id, '00000000-0000-0000-0000-000000000001']
      );
      personaId = pRes.rows[0].persona_id;
    } else {
      personaId = pCheck.rows[0].persona_id;
    }

    await p.query(
      'INSERT INTO usuarios (persona_id,username,email_login,password_hash,rol_id,estado_usuario_id,candidato_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [personaId, '00000000001', 'admin@partido360.com', hash, rolRes.rows[0].rol_id, estadoRes.rows[0].estado_usuario_id, '00000000-0000-0000-0000-000000000001']
    );
    console.log('   Super Admin creado: admin@partido360.com / Admin123!');
  }

  // 5. Verificar niveles (sin Cabeza)
  const niveles = await p.query('SELECT nombre FROM nivel_lider ORDER BY nombre');
  const nivelesNames = niveles.rows.map(r => r.nombre);
  console.log('5. Niveles lider:', nivelesNames.join(', '));
  if (nivelesNames.some(n => n.toLowerCase() === 'cabeza')) {
    // Migrar lideres de Cabeza a Sub-lider
    const subLider = await p.query("SELECT nivel_lider_id FROM nivel_lider WHERE LOWER(nombre) LIKE '%sub%' LIMIT 1");
    if (subLider.rows[0]) {
      await p.query("UPDATE lideres SET nivel_lider_id=$1 WHERE nivel_lider_id IN (SELECT nivel_lider_id FROM nivel_lider WHERE LOWER(nombre)='cabeza')", [subLider.rows[0].nivel_lider_id]);
    }
    await p.query("DELETE FROM nivel_lider WHERE LOWER(nombre)='cabeza'");
    console.log('   Nivel Cabeza eliminado');
  }

  // 6. Verificar roles
  const roles = await p.query('SELECT nombre FROM roles ORDER BY nombre');
  console.log('6. Roles:', roles.rows.map(r => r.nombre).join(', '));

  // 7. Conteos finales
  const counts = await p.query(`
    SELECT
      (SELECT COUNT(*) FROM usuarios) as usuarios,
      (SELECT COUNT(*) FROM personas) as personas,
      (SELECT COUNT(*) FROM lideres) as lideres,
      (SELECT COUNT(*) FROM candidatos) as candidatos
  `);
  const c = counts.rows[0];
  console.log(`7. Conteos: ${c.usuarios} usuarios, ${c.personas} personas, ${c.lideres} lideres, ${c.candidatos} candidatos`);

  console.log('\n=== SISTEMA LISTO PARA PRODUCCION ===');
  p.end();
})().catch(e => {
  console.error('ERROR CRITICO:', e.message);
  p.end();
  process.exit(1);
});
