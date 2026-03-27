/**
 * setup-schema.js
 * Crea el schema 'partido360' dedicado en Neon para que NUNCA se pisen
 * con las tablas de otros proyectos (HR, saya_agro, etc.)
 *
 * Uso: node scripts/setup-schema.js
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('=== Setup Schema Partido360 ===\n');

  // 1. Crear schema
  await p.query('CREATE SCHEMA IF NOT EXISTS partido360');
  console.log('1. Schema "partido360" creado/verificado');

  // 2. Set search_path para esta sesion
  await p.query('SET search_path TO partido360');

  // 3. Crear tablas catalogo
  await p.query(`
    CREATE TABLE IF NOT EXISTS sectores (
      sector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(100) UNIQUE NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS fuentes_captacion (
      fuente_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(100) UNIQUE NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS estado_persona (
      estado_persona_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS estado_lider (
      estado_lider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS estado_asignacion (
      estado_asignacion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS nivel_lider (
      nivel_lider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS estado_evento (
      estado_evento_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS roles (
      rol_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      descripcion TEXT,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS estado_usuario (
      estado_usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(50) UNIQUE NOT NULL,
      activo BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS candidatos (
      candidato_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(100) NOT NULL,
      partido VARCHAR(100),
      activo BOOLEAN DEFAULT TRUE,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('2. Tablas catalogo creadas');

  // 4. Tablas core
  await p.query(`
    CREATE TABLE IF NOT EXISTS personas (
      persona_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombres VARCHAR(100) NOT NULL,
      apellidos VARCHAR(100) NOT NULL,
      cedula VARCHAR(20) UNIQUE,
      telefono VARCHAR(20) UNIQUE NOT NULL,
      email VARCHAR(150),
      sector_id UUID NOT NULL REFERENCES partido360.sectores(sector_id) ON DELETE RESTRICT,
      direccion TEXT,
      fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      estado_persona_id UUID NOT NULL REFERENCES partido360.estado_persona(estado_persona_id) ON DELETE RESTRICT,
      candidato_id UUID NOT NULL REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE,
      notas TEXT
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      persona_id UUID NOT NULL UNIQUE REFERENCES partido360.personas(persona_id) ON DELETE RESTRICT,
      username VARCHAR(100) UNIQUE,
      email_login VARCHAR(150) UNIQUE,
      password_hash VARCHAR(255),
      auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
      rol_id UUID NOT NULL REFERENCES partido360.roles(rol_id) ON DELETE RESTRICT,
      estado_usuario_id UUID NOT NULL REFERENCES partido360.estado_usuario(estado_usuario_id) ON DELETE RESTRICT,
      candidato_id UUID REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE,
      ultimo_login TIMESTAMP WITH TIME ZONE,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE,
      last_login_at TIMESTAMP WITH TIME ZONE
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS lideres (
      lider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      persona_id UUID NOT NULL UNIQUE REFERENCES partido360.personas(persona_id) ON DELETE RESTRICT,
      meta_cantidad INTEGER NOT NULL DEFAULT 10,
      codigo_lider VARCHAR(50) UNIQUE,
      fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      estado_lider_id UUID NOT NULL REFERENCES partido360.estado_lider(estado_lider_id) ON DELETE RESTRICT,
      nivel_lider_id UUID NOT NULL REFERENCES partido360.nivel_lider(nivel_lider_id) ON DELETE RESTRICT,
      lider_padre_id UUID REFERENCES partido360.lideres(lider_id) ON DELETE SET NULL,
      candidato_id UUID NOT NULL REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS asignaciones (
      asignacion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lider_id UUID NOT NULL REFERENCES partido360.lideres(lider_id) ON DELETE RESTRICT,
      persona_id UUID NOT NULL REFERENCES partido360.personas(persona_id) ON DELETE RESTRICT,
      fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fuente_id UUID REFERENCES partido360.fuentes_captacion(fuente_id) ON DELETE SET NULL,
      estado_asignacion_id UUID NOT NULL REFERENCES partido360.estado_asignacion(estado_asignacion_id) ON DELETE RESTRICT,
      CONSTRAINT unique_lider_persona_asignacion UNIQUE(lider_id, persona_id)
    );
  `);
  console.log('3. Tablas core creadas');

  // 5. Tablas operacion
  await p.query(`
    CREATE TABLE IF NOT EXISTS eventos (
      evento_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(150) NOT NULL,
      fecha TIMESTAMP WITH TIME ZONE NOT NULL,
      sector_id UUID NOT NULL REFERENCES partido360.sectores(sector_id) ON DELETE RESTRICT,
      descripcion TEXT,
      estado_evento_id UUID NOT NULL REFERENCES partido360.estado_evento(estado_evento_id) ON DELETE RESTRICT,
      creado_por_usuario_id UUID REFERENCES partido360.usuarios(usuario_id) ON DELETE SET NULL,
      candidato_id UUID NOT NULL REFERENCES partido360.candidatos(candidato_id) ON DELETE CASCADE,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS participacion_evento (
      participacion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      evento_id UUID NOT NULL REFERENCES partido360.eventos(evento_id) ON DELETE CASCADE,
      persona_id UUID NOT NULL REFERENCES partido360.personas(persona_id) ON DELETE CASCADE,
      asistio BOOLEAN DEFAULT FALSE,
      comentario TEXT,
      fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_evento_persona_participacion UNIQUE(evento_id, persona_id)
    );
  `);
  console.log('4. Tablas operacion creadas');

  // 6. Tablas auditoria
  await p.query(`
    CREATE TABLE IF NOT EXISTS bitacora_cambios (
      cambio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entidad VARCHAR(100) NOT NULL,
      entidad_id VARCHAR(50) NOT NULL,
      accion VARCHAR(50) NOT NULL,
      detalle TEXT,
      usuario_id UUID NOT NULL REFERENCES partido360.usuarios(usuario_id) ON DELETE RESTRICT,
      fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS duplicados_detectados (
      duplicado_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      persona_id UUID NOT NULL REFERENCES partido360.personas(persona_id) ON DELETE CASCADE,
      motivo VARCHAR(255) NOT NULL,
      fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      estado_revision VARCHAR(50) NOT NULL DEFAULT 'pendiente',
      resuelto_por_usuario_id UUID REFERENCES partido360.usuarios(usuario_id) ON DELETE SET NULL,
      fecha_resolucion TIMESTAMP WITH TIME ZONE,
      comentario_resolucion TEXT
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      reset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id UUID NOT NULL REFERENCES partido360.usuarios(usuario_id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('5. Tablas auditoria creadas');

  // 7. Indices
  await p.query(`
    CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON partido360.eventos(fecha);
    CREATE INDEX IF NOT EXISTS idx_eventos_sector ON partido360.eventos(sector_id);
    CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON partido360.bitacora_cambios(fecha);
    CREATE INDEX IF NOT EXISTS idx_bitacora_entidad ON partido360.bitacora_cambios(entidad);
    CREATE INDEX IF NOT EXISTS idx_duplicados_estado ON partido360.duplicados_detectados(estado_revision);
    CREATE INDEX IF NOT EXISTS idx_duplicados_fecha ON partido360.duplicados_detectados(fecha);
    CREATE INDEX IF NOT EXISTS idx_lideres_padre ON partido360.lideres(lider_padre_id);
    CREATE INDEX IF NOT EXISTS idx_asignaciones_lider ON partido360.asignaciones(lider_id);
    CREATE INDEX IF NOT EXISTS idx_asignaciones_persona ON partido360.asignaciones(persona_id);
    CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON partido360.usuarios(rol_id);
  `);
  console.log('6. Indices creados');

  // 8. Seed data
  await p.query(`INSERT INTO estado_persona (nombre) VALUES ('Activo'),('Validado'),('Duplicado'),('Inactivo') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO estado_lider (nombre) VALUES ('Activo'),('Inactivo'),('Suspendido') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO estado_asignacion (nombre) VALUES ('Activa'),('Reasignada'),('Anulada') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO fuentes_captacion (nombre) VALUES ('WhatsApp'),('Formulario'),('Evento'),('Llamada'),('Referido') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO nivel_lider (nombre) VALUES ('Sub-líder'),('Coordinador') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO sectores (nombre) VALUES ('Sector Centro'),('Ensanche Ozama'),('Villa Mella'),('Los Alcarrizos'),('Los Ríos') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO estado_evento (nombre) VALUES ('Programado'),('Realizado'),('Cancelado') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO roles (nombre, descripcion) VALUES ('Admin','Administrador total del sistema'),('Coordinador','Gestor de zona o sector'),('Sub-Líder','Líder de referidos territorial') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO estado_usuario (nombre) VALUES ('Activo'),('Inactivo'),('Bloqueado') ON CONFLICT DO NOTHING`);
  await p.query(`INSERT INTO candidatos (candidato_id, nombre, partido, activo) VALUES ('00000000-0000-0000-0000-000000000001','Super Admin','Sistema',true) ON CONFLICT DO NOTHING`);
  console.log('7. Datos seed insertados');

  // 9. Crear Super Admin
  const rolAdmin = await p.query("SELECT rol_id FROM roles WHERE nombre='Admin'");
  const estadoActivo = await p.query("SELECT estado_persona_id FROM estado_persona WHERE nombre='Activo'");
  const estadoUsuActivo = await p.query("SELECT estado_usuario_id FROM estado_usuario WHERE nombre='Activo'");
  const sectorCentro = await p.query("SELECT sector_id FROM sectores WHERE nombre='Sector Centro'");

  const pCheck = await p.query("SELECT persona_id FROM personas WHERE cedula='00000000001'");
  let personaId;
  if (pCheck.rows.length === 0) {
    const pRes = await p.query(
      `INSERT INTO personas (nombres,apellidos,cedula,telefono,sector_id,estado_persona_id,candidato_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING persona_id`,
      ['Admin','Sistema','00000000001','8090000001',sectorCentro.rows[0].sector_id,estadoActivo.rows[0].estado_persona_id,'00000000-0000-0000-0000-000000000001']
    );
    personaId = pRes.rows[0].persona_id;
  } else {
    personaId = pCheck.rows[0].persona_id;
  }

  const uCheck = await p.query("SELECT usuario_id FROM usuarios WHERE email_login='admin@partido360.com'");
  if (uCheck.rows.length === 0) {
    const hash = await bcrypt.hash('Admin123!', 10);
    await p.query(
      `INSERT INTO usuarios (persona_id,username,email_login,password_hash,rol_id,estado_usuario_id,candidato_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [personaId,'00000000001','admin@partido360.com',hash,rolAdmin.rows[0].rol_id,estadoUsuActivo.rows[0].estado_usuario_id,'00000000-0000-0000-0000-000000000001']
    );
    console.log('8. Super Admin creado: admin@partido360.com / Admin123!');
  } else {
    console.log('8. Super Admin ya existe');
  }

  // 10. Verificacion final
  const tablas = await p.query("SELECT tablename FROM pg_tables WHERE schemaname='partido360' ORDER BY tablename");
  console.log('\n=== RESULTADO FINAL ===');
  console.log('Tablas en schema partido360:', tablas.rows.map(r => r.tablename).join(', '));

  const usuarios = await p.query('SELECT u.email_login, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol_id=r.rol_id');
  console.log('Usuarios:', usuarios.rows.map(u => u.email_login + ' (' + u.rol + ')').join(', '));

  const niveles = await p.query('SELECT nombre FROM nivel_lider ORDER BY nombre');
  console.log('Niveles lider:', niveles.rows.map(r => r.nombre).join(', '));

  console.log('\n*** IMPORTANTE: Agrega esto al .env ***');
  console.log('Cambia DATABASE_URL para incluir search_path:');
  const baseUrl = process.env.DATABASE_URL;
  const separator = baseUrl.includes('?') ? '&' : '?';
  console.log(`DATABASE_URL=${baseUrl}${separator}options=-csearch_path%3Dpartido360,public`);

  p.end();
}

run().catch(e => { console.error('ERROR:', e.message); p.end(); process.exit(1); });
