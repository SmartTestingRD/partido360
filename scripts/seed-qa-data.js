/**
 * seed-qa-data.js — Crea usuarios, líderes y personas de prueba para QA
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  await p.query('SET search_path TO partido360, public');
  console.log('=== Seed QA Data ===\n');

  const adminHash = await bcrypt.hash('Password123!', 10);
  const claveHash = await bcrypt.hash('Clave1234!', 10);

  const rolAdmin = (await p.query("SELECT rol_id FROM roles WHERE LOWER(nombre)='admin' LIMIT 1")).rows[0];
  const rolCoord = (await p.query("SELECT rol_id FROM roles WHERE LOWER(nombre)='coordinador' LIMIT 1")).rows[0];
  const rolSub = (await p.query("SELECT rol_id FROM roles WHERE nombre='Sub-Líder' LIMIT 1")).rows[0];
  const estadoUsu = (await p.query("SELECT estado_usuario_id FROM estado_usuario WHERE LOWER(nombre) LIKE '%activo%' LIMIT 1")).rows[0];
  const estadoPer = (await p.query("SELECT estado_persona_id FROM estado_persona WHERE LOWER(nombre)='activo' LIMIT 1")).rows[0];
  const estadoLider = (await p.query("SELECT estado_lider_id FROM estado_lider WHERE LOWER(nombre) LIKE '%activo%' LIMIT 1")).rows[0];
  const nivelSub = (await p.query("SELECT nivel_lider_id FROM nivel_lider WHERE LOWER(nombre) LIKE '%sub%' LIMIT 1")).rows[0];
  const nivelCoord = (await p.query("SELECT nivel_lider_id FROM nivel_lider WHERE LOWER(nombre) LIKE '%coord%' LIMIT 1")).rows[0];
  const sector = (await p.query('SELECT sector_id FROM sectores LIMIT 1')).rows[0];
  const fuente = (await p.query('SELECT fuente_id FROM fuentes_captacion LIMIT 1')).rows[0];
  const estadoAsig = (await p.query('SELECT estado_asignacion_id FROM estado_asignacion LIMIT 1')).rows[0];

  const candidatoId = '00000000-0000-0000-0000-000000000001';
  const sectorId = sector.sector_id;
  const estadoPersonaId = estadoPer.estado_persona_id;
  const fuenteId = fuente.fuente_id;

  console.log('IDs encontrados:', {
    rolAdmin: !!rolAdmin, rolCoord: !!rolCoord, rolSub: !!rolSub,
    estadoUsu: !!estadoUsu, estadoPer: !!estadoPer, estadoLider: !!estadoLider,
    nivelSub: !!nivelSub, nivelCoord: !!nivelCoord
  });

  // Helper: crear persona + usuario
  async function crearUsuario(nombres, apellidos, cedula, telefono, email, password, rolId) {
    const perRes = await p.query(
      `INSERT INTO personas (nombres, apellidos, cedula, telefono, sector_id, candidato_id, estado_persona_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(cedula) DO UPDATE SET nombres=EXCLUDED.nombres
       RETURNING persona_id`,
      [nombres, apellidos, cedula, telefono, sectorId, candidatoId, estadoPersonaId]
    );
    const personaId = perRes.rows[0].persona_id;

    if (email) {
      await p.query(
        `INSERT INTO usuarios (persona_id, email_login, username, password_hash, rol_id, estado_usuario_id, candidato_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(persona_id) DO UPDATE SET password_hash=EXCLUDED.password_hash, email_login=EXCLUDED.email_login`,
        [personaId, email, cedula, password, rolId, estadoUsu.estado_usuario_id, candidatoId]
      );
    } else {
      await p.query(
        `INSERT INTO usuarios (persona_id, username, password_hash, rol_id, estado_usuario_id, candidato_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT(persona_id) DO UPDATE SET password_hash=EXCLUDED.password_hash, username=EXCLUDED.username`,
        [personaId, cedula, password, rolId, estadoUsu.estado_usuario_id, candidatoId]
      );
    }
    return personaId;
  }

  // Helper: get or create lider
  async function getOrCreateLider(personaId, meta, codigo, nivelId, padreId) {
    const res = await p.query(
      `INSERT INTO lideres (persona_id, meta_cantidad, codigo_lider, estado_lider_id, nivel_lider_id, lider_padre_id, candidato_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(persona_id) DO NOTHING RETURNING lider_id`,
      [personaId, meta, codigo, estadoLider.estado_lider_id, nivelId, padreId, candidatoId]
    );
    if (res.rows[0]) return res.rows[0].lider_id;
    const ex = await p.query('SELECT lider_id FROM lideres WHERE persona_id=$1', [personaId]);
    return ex.rows[0]?.lider_id;
  }

  // 1. Super Admin
  await crearUsuario('Erick', 'Guerrero', '00000000001', '8099999999', 'ejguerrero@smarttestingrd.com', adminHash, rolAdmin.rol_id);
  console.log('1. Super Admin: ejguerrero@smarttestingrd.com / Password123!');

  // 2. Coordinador (Ana) — también es líder nivel Coordinador
  const coordPersonaId = await crearUsuario('Ana', 'Coordinadora', '40211223345', '8091234561', null, claveHash, rolCoord.rol_id);
  const coordLiderId = await getOrCreateLider(coordPersonaId, 50, 'LDR-COORD01', nivelCoord.nivel_lider_id, null);
  console.log('2. Coordinador: 40211223345 / Clave1234!  lider_id:', coordLiderId?.substring(0, 8));

  // 3. Sub-Líder 1 (Pedro) — bajo Ana
  const sub1PersonaId = await crearUsuario('Pedro', 'SubLider', '40211223346', '8091234562', null, claveHash, rolSub.rol_id);
  const sub1LiderId = await getOrCreateLider(sub1PersonaId, 15, 'LDR-SUB001', nivelSub.nivel_lider_id, coordLiderId);
  console.log('3. Sub-Líder Pedro: 40211223346 / Clave1234!  lider_id:', sub1LiderId?.substring(0, 8));

  // 4. Sub-Líder 2 (Carmen) — bajo Ana
  const sub2PersonaId = await crearUsuario('Carmen', 'SubLider2', '40211223347', '8091234563', null, claveHash, rolSub.rol_id);
  await getOrCreateLider(sub2PersonaId, 15, 'LDR-SUB002', nivelSub.nivel_lider_id, coordLiderId);
  console.log('4. Sub-Líder Carmen: 40211223347 / Clave1234!');

  // 5. Crear 3 personas (votantes) asignadas a Pedro
  for (let i = 1; i <= 3; i++) {
    const perRes = await p.query(
      `INSERT INTO personas (nombres, apellidos, cedula, telefono, sector_id, candidato_id, estado_persona_id, fuente_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(cedula) DO NOTHING RETURNING persona_id`,
      ['Votante' + i, 'Prueba', '4021122335' + i, '80912345' + (63 + i), sectorId, candidatoId, estadoPersonaId, fuenteId]
    );
    if (perRes.rows[0]?.persona_id && sub1LiderId) {
      await p.query(
        `INSERT INTO asignaciones (lider_id, persona_id, fuente_id, estado_asignacion_id)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [sub1LiderId, perRes.rows[0].persona_id, fuenteId, estadoAsig.estado_asignacion_id]
      );
    }
  }
  console.log('5. 3 votantes creados bajo Pedro');

  // === RESUMEN ===
  const users = await p.query(
    `SELECT u.email_login, u.username, r.nombre as rol
     FROM usuarios u JOIN roles r ON u.rol_id=r.rol_id ORDER BY r.nombre`
  );
  const personas = await p.query('SELECT COUNT(*) as c FROM personas');
  const lideres = await p.query(
    `SELECT p.nombres, nl.nombre as nivel, l.lider_padre_id
     FROM lideres l JOIN personas p ON l.persona_id=p.persona_id
     JOIN nivel_lider nl ON l.nivel_lider_id=nl.nivel_lider_id ORDER BY nl.nombre`
  );
  const asigs = await p.query('SELECT COUNT(*) as c FROM asignaciones');

  console.log('\n=== RESUMEN FINAL ===');
  console.log('Usuarios:');
  users.rows.forEach(r => console.log('  ' + (r.email_login || r.username) + ' -> ' + r.rol));
  console.log('Personas:', personas.rows[0].c);
  console.log('Líderes:');
  lideres.rows.forEach(r => console.log('  ' + r.nombres + ' -> ' + r.nivel + (r.lider_padre_id ? ' (subordinado)' : ' (top)')));
  console.log('Asignaciones:', asigs.rows[0].c);

  p.end();
}

run().catch(e => { console.error('ERROR:', e.message); p.end(); process.exit(1); });
