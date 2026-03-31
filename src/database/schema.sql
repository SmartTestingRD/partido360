-- Limpiar tablas si existen
DROP TABLE IF EXISTS bitacora_cambios CASCADE;
DROP TABLE IF EXISTS duplicados_detectados CASCADE;
DROP TABLE IF EXISTS participacion_evento CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS asignaciones CASCADE;
DROP TABLE IF EXISTS lideres CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS personas CASCADE;
DROP TABLE IF EXISTS sectores CASCADE;
DROP TABLE IF EXISTS fuentes_captacion CASCADE;
DROP TABLE IF EXISTS estado_persona CASCADE;
DROP TABLE IF EXISTS estado_lider CASCADE;
DROP TABLE IF EXISTS estado_asignacion CASCADE;
DROP TABLE IF EXISTS nivel_lider CASCADE;
DROP TABLE IF EXISTS estado_evento CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS estado_usuario CASCADE;

-- ==========================================
-- 1. TABLAS CATÁLOGO
-- ==========================================

CREATE TABLE sectores (
    sector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE fuentes_captacion (
    fuente_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE estado_persona (
    estado_persona_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE estado_lider (
    estado_lider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE estado_asignacion (
    estado_asignacion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE nivel_lider (
    nivel_lider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE estado_evento (
    estado_evento_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE roles (
    rol_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE estado_usuario (
    estado_usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE candidatos (
    candidato_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    partido VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 2. TABLAS CORE
-- ==========================================

CREATE TABLE personas (
    persona_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) UNIQUE,
    telefono VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150),
    sector_id UUID NOT NULL REFERENCES sectores(sector_id) ON DELETE RESTRICT,
    direccion TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado_persona_id UUID NOT NULL REFERENCES estado_persona(estado_persona_id) ON DELETE RESTRICT,
    candidato_id UUID NOT NULL REFERENCES candidatos(candidato_id) ON DELETE CASCADE,
    notas TEXT
);

CREATE TABLE usuarios (
    usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL UNIQUE REFERENCES personas(persona_id) ON DELETE RESTRICT,
    username VARCHAR(100) UNIQUE,
    email_login VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    rol_id UUID NOT NULL REFERENCES roles(rol_id) ON DELETE RESTRICT,
    estado_usuario_id UUID NOT NULL REFERENCES estado_usuario(estado_usuario_id) ON DELETE RESTRICT,
    candidato_id UUID REFERENCES candidatos(candidato_id) ON DELETE CASCADE,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lideres (
    lider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL UNIQUE REFERENCES personas(persona_id) ON DELETE RESTRICT,
    meta_cantidad INTEGER NOT NULL DEFAULT 10,
    codigo_lider VARCHAR(50) UNIQUE,
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado_lider_id UUID NOT NULL REFERENCES estado_lider(estado_lider_id) ON DELETE RESTRICT,
    nivel_lider_id UUID NOT NULL REFERENCES nivel_lider(nivel_lider_id) ON DELETE RESTRICT,
    lider_padre_id UUID REFERENCES lideres(lider_id) ON DELETE SET NULL,
    candidato_id UUID NOT NULL REFERENCES candidatos(candidato_id) ON DELETE CASCADE
);

-- REGLA DE NEGOCIO (App Nivel): Una persona solo puede tener 1 asignación con estado_asignacion = 'Activa'.
-- Como la BD usa un catálogo con UUID para los estados, esta regla debe validarse en la lógica de
-- la aplicación (cuando se cree nueva asignación Activa, actualizar la anterior a Reasignada).
CREATE TABLE asignaciones (
    asignacion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lider_id UUID NOT NULL REFERENCES lideres(lider_id) ON DELETE RESTRICT,
    persona_id UUID NOT NULL REFERENCES personas(persona_id) ON DELETE RESTRICT,
    fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fuente_id UUID REFERENCES fuentes_captacion(fuente_id) ON DELETE SET NULL,
    estado_asignacion_id UUID NOT NULL REFERENCES estado_asignacion(estado_asignacion_id) ON DELETE RESTRICT,
    CONSTRAINT unique_lider_persona_asignacion UNIQUE(lider_id, persona_id)
);


-- ==========================================
-- 3. TABLAS DE OPERACIÓN / EVENTOS
-- ==========================================

CREATE TABLE eventos (
    evento_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    sector_id UUID NOT NULL REFERENCES sectores(sector_id) ON DELETE RESTRICT,
    descripcion TEXT,
    estado_evento_id UUID NOT NULL REFERENCES estado_evento(estado_evento_id) ON DELETE RESTRICT,
    creado_por_usuario_id UUID REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
    candidato_id UUID NOT NULL REFERENCES candidatos(candidato_id) ON DELETE CASCADE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para eventos
CREATE INDEX idx_eventos_fecha ON eventos(fecha);
CREATE INDEX idx_eventos_sector ON eventos(sector_id);

CREATE TABLE participacion_evento (
    participacion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES eventos(evento_id) ON DELETE CASCADE,
    persona_id UUID NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    asistio BOOLEAN DEFAULT FALSE,
    comentario TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_evento_persona_participacion UNIQUE(evento_id, persona_id)
);


-- ==========================================
-- 4. TABLAS DE AUDITORÍA / CALIDAD
-- ==========================================

CREATE TABLE bitacora_cambios (
    cambio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad VARCHAR(100) NOT NULL,
    entidad_id VARCHAR(50) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    detalle TEXT,
    usuario_id UUID NOT NULL REFERENCES usuarios(usuario_id) ON DELETE RESTRICT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bitacora_fecha ON bitacora_cambios(fecha);
CREATE INDEX idx_bitacora_entidad ON bitacora_cambios(entidad);

CREATE TABLE duplicados_detectados (
    duplicado_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    motivo VARCHAR(255) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado_revision VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    resuelto_por_usuario_id UUID REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    comentario_resolucion TEXT
);

CREATE INDEX idx_duplicados_estado ON duplicados_detectados(estado_revision);
CREATE INDEX idx_duplicados_fecha ON duplicados_detectados(fecha);


-- ==========================================
-- 5. DATOS INICIALES (SEED DATA)
-- ==========================================

-- Estados y Catálogos Anteriores
INSERT INTO estado_persona (nombre) VALUES ('Activo'), ('Validado'), ('Duplicado'), ('Inactivo');
INSERT INTO estado_lider (nombre) VALUES ('Activo'), ('Inactivo'), ('Suspendido');
INSERT INTO estado_asignacion (nombre) VALUES ('Activa'), ('Reasignada'), ('Anulada');
INSERT INTO fuentes_captacion (nombre) VALUES ('WhatsApp'), ('Formulario'), ('Evento'), ('Llamada'), ('Referido');
INSERT INTO nivel_lider (nombre) VALUES ('Cabeza'), ('Sub-líder'), ('Coordinador');
INSERT INTO sectores (nombre) VALUES ('Sector Centro'), ('Ensanche Ozama'), ('Villa Mella'), ('Los Alcarrizos'), ('Los Ríos');

-- Nuevos Catálogos
INSERT INTO estado_evento (nombre) VALUES ('Programado'), ('Realizado'), ('Cancelado');
INSERT INTO roles (nombre, descripcion) VALUES 
('Admin', 'Administrador total del sistema'), 
('Coordinador', 'Gestor de zona o sector con permisos de supervisión'), 
('Sub-Líder', 'Líder de referidos territorial con acceso a su red');
INSERT INTO estado_usuario (nombre) VALUES ('Activo'), ('Inactivo'), ('Bloqueado');

-- ==========================================
-- 6. INDICES DE PERFORMANCE
-- ==========================================

-- Claves Foráneas de Alta Concurrencia
CREATE INDEX IF NOT EXISTS idx_lideres_padre ON lideres(lider_padre_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_lider ON asignaciones(lider_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_persona ON asignaciones(persona_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol_id);

