-- ============================================================
-- Partido360 — Schema completo
-- Generado: 2026-03-24
-- Orden de DROP inverso al de creación para respetar FKs
-- ============================================================

-- ==========================================
-- 0. LIMPIAR TABLAS EXISTENTES (orden inverso)
-- ==========================================
DROP TABLE IF EXISTS password_resets         CASCADE;
DROP TABLE IF EXISTS duplicados_detectados   CASCADE;
DROP TABLE IF EXISTS bitacora_cambios        CASCADE;
DROP TABLE IF EXISTS participacion_evento    CASCADE;
DROP TABLE IF EXISTS eventos                 CASCADE;
DROP TABLE IF EXISTS asignaciones            CASCADE;
DROP TABLE IF EXISTS lideres                 CASCADE;
DROP TABLE IF EXISTS usuarios                CASCADE;
DROP TABLE IF EXISTS personas                CASCADE;
DROP TABLE IF EXISTS fuentes_captacion       CASCADE;
DROP TABLE IF EXISTS estado_usuario          CASCADE;
DROP TABLE IF EXISTS estado_asignacion       CASCADE;
DROP TABLE IF EXISTS estado_evento           CASCADE;
DROP TABLE IF EXISTS nivel_lider             CASCADE;
DROP TABLE IF EXISTS estado_lider            CASCADE;
DROP TABLE IF EXISTS estado_persona          CASCADE;
DROP TABLE IF EXISTS sectores                CASCADE;
DROP TABLE IF EXISTS roles                   CASCADE;
DROP TABLE IF EXISTS candidatos              CASCADE;


-- ==========================================
-- 1. TABLAS RAÍZ (sin dependencias)
-- ==========================================

CREATE TABLE candidatos (
    candidato_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre         VARCHAR(150) NOT NULL,
    descripcion    TEXT,
    activo         BOOLEAN      DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    rol_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN     DEFAULT TRUE
);

CREATE TABLE sectores (
    sector_id UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre    VARCHAR(100) UNIQUE NOT NULL,
    activo    BOOLEAN      DEFAULT TRUE
);

CREATE TABLE nivel_lider (
    nivel_lider_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre         VARCHAR(50) UNIQUE NOT NULL,
    activo         BOOLEAN     DEFAULT TRUE
);

CREATE TABLE estado_lider (
    estado_lider_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(50) UNIQUE NOT NULL,
    activo          BOOLEAN     DEFAULT TRUE
);

CREATE TABLE estado_persona (
    estado_persona_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre            VARCHAR(50) UNIQUE NOT NULL,
    activo            BOOLEAN     DEFAULT TRUE
);

CREATE TABLE estado_asignacion (
    estado_asignacion_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre               VARCHAR(50) UNIQUE NOT NULL,
    activo               BOOLEAN     DEFAULT TRUE
);

CREATE TABLE estado_evento (
    estado_evento_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre           VARCHAR(50) UNIQUE NOT NULL,
    activo           BOOLEAN     DEFAULT TRUE
);

CREATE TABLE estado_usuario (
    estado_usuario_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre            VARCHAR(50) UNIQUE NOT NULL,
    activo            BOOLEAN     DEFAULT TRUE
);

CREATE TABLE fuentes_captacion (
    fuente_id UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre    VARCHAR(100) UNIQUE NOT NULL,
    activo    BOOLEAN      DEFAULT TRUE
);


-- ==========================================
-- 2. TABLAS CORE
-- ==========================================

CREATE TABLE personas (
    persona_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres           VARCHAR(100) NOT NULL,
    apellidos         VARCHAR(100) NOT NULL,
    cedula            VARCHAR(20)  UNIQUE,
    telefono          VARCHAR(20)  UNIQUE NOT NULL,
    email             VARCHAR(150),
    sector_id         UUID         NOT NULL REFERENCES sectores(sector_id)                ON DELETE RESTRICT,
    direccion         TEXT,
    fecha_registro    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado_persona_id UUID         NOT NULL REFERENCES estado_persona(estado_persona_id)  ON DELETE RESTRICT,
    notas             TEXT,
    mesa              VARCHAR(50),
    candidato_id      UUID         REFERENCES candidatos(candidato_id)                    ON DELETE RESTRICT
);

CREATE TABLE usuarios (
    usuario_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id            UUID         NOT NULL UNIQUE REFERENCES personas(persona_id)         ON DELETE RESTRICT,
    username              VARCHAR(100) UNIQUE,
    email_login           VARCHAR(150) UNIQUE,
    password_hash         VARCHAR(255),
    auth_provider         VARCHAR(50)  NOT NULL DEFAULT 'local',
    rol_id                UUID         NOT NULL REFERENCES roles(rol_id)                       ON DELETE RESTRICT,
    estado_usuario_id     UUID         NOT NULL REFERENCES estado_usuario(estado_usuario_id)   ON DELETE RESTRICT,
    candidato_id          UUID         REFERENCES candidatos(candidato_id)                     ON DELETE RESTRICT,
    failed_login_attempts INTEGER      NOT NULL DEFAULT 0,
    locked_until          TIMESTAMP WITH TIME ZONE,
    last_login_at         TIMESTAMP WITH TIME ZONE,
    ultimo_login          TIMESTAMP WITH TIME ZONE,
    fecha_creacion        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lideres (
    lider_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id      UUID        NOT NULL UNIQUE REFERENCES personas(persona_id)   ON DELETE RESTRICT,
    meta_cantidad   INTEGER     NOT NULL DEFAULT 10,
    codigo_lider    VARCHAR(50) UNIQUE,
    fecha_inicio    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado_lider_id UUID        NOT NULL REFERENCES estado_lider(estado_lider_id) ON DELETE RESTRICT,
    nivel_lider_id  UUID        NOT NULL REFERENCES nivel_lider(nivel_lider_id)   ON DELETE RESTRICT,
    lider_padre_id  UUID        REFERENCES lideres(lider_id)                      ON DELETE SET NULL,
    candidato_id    UUID        REFERENCES candidatos(candidato_id)               ON DELETE RESTRICT
);

-- Regla de negocio: una persona solo puede tener 1 asignación activa a la vez.
-- Validar en lógica de aplicación al crear nueva asignación (marcar anterior como Reasignada).
CREATE TABLE asignaciones (
    asignacion_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lider_id             UUID NOT NULL REFERENCES lideres(lider_id)                           ON DELETE RESTRICT,
    persona_id           UUID NOT NULL REFERENCES personas(persona_id)                        ON DELETE RESTRICT,
    fecha_asignacion     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fuente_id            UUID REFERENCES fuentes_captacion(fuente_id)                         ON DELETE SET NULL,
    estado_asignacion_id UUID NOT NULL REFERENCES estado_asignacion(estado_asignacion_id)     ON DELETE RESTRICT,
    CONSTRAINT unique_lider_persona_asignacion UNIQUE(lider_id, persona_id)
);


-- ==========================================
-- 3. TABLAS DE OPERACIÓN / EVENTOS
-- ==========================================

CREATE TABLE eventos (
    evento_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre                VARCHAR(150) NOT NULL,
    fecha                 TIMESTAMP WITH TIME ZONE NOT NULL,
    sector_id             UUID         NOT NULL REFERENCES sectores(sector_id)              ON DELETE RESTRICT,
    descripcion           TEXT,
    estado_evento_id      UUID         NOT NULL REFERENCES estado_evento(estado_evento_id)  ON DELETE RESTRICT,
    creado_por_usuario_id UUID         REFERENCES usuarios(usuario_id)                      ON DELETE SET NULL,
    fecha_creacion        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eventos_fecha   ON eventos(fecha);
CREATE INDEX idx_eventos_sector  ON eventos(sector_id);

CREATE TABLE participacion_evento (
    participacion_id UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id        UUID    NOT NULL REFERENCES eventos(evento_id)   ON DELETE CASCADE,
    persona_id       UUID    NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    asistio          BOOLEAN DEFAULT FALSE,
    comentario       TEXT,
    fecha_registro   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_evento_persona_participacion UNIQUE(evento_id, persona_id)
);


-- ==========================================
-- 4. AUDITORÍA / SEGURIDAD
-- ==========================================

CREATE TABLE bitacora_cambios (
    cambio_id  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad    VARCHAR(100) NOT NULL,
    entidad_id VARCHAR(50)  NOT NULL,
    accion     VARCHAR(50)  NOT NULL,
    detalle    TEXT,
    usuario_id UUID         NOT NULL REFERENCES usuarios(usuario_id) ON DELETE RESTRICT,
    fecha      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bitacora_fecha   ON bitacora_cambios(fecha);
CREATE INDEX idx_bitacora_entidad ON bitacora_cambios(entidad);

CREATE TABLE duplicados_detectados (
    duplicado_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id              UUID         NOT NULL REFERENCES personas(persona_id)  ON DELETE CASCADE,
    motivo                  VARCHAR(255) NOT NULL,
    fecha                   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado_revision         VARCHAR(50)  NOT NULL DEFAULT 'pendiente',
    resuelto_por_usuario_id UUID         REFERENCES usuarios(usuario_id)           ON DELETE SET NULL,
    fecha_resolucion        TIMESTAMP WITH TIME ZONE,
    comentario_resolucion   TEXT
);

CREATE INDEX idx_duplicados_estado ON duplicados_detectados(estado_revision);
CREATE INDEX idx_duplicados_fecha  ON duplicados_detectados(fecha);

CREATE TABLE password_resets (
    reset_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID        NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at    TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_resets_token ON password_resets(token_hash);


-- ==========================================
-- 5. ÍNDICES DE PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_lideres_padre        ON lideres(lider_padre_id);
CREATE INDEX IF NOT EXISTS idx_lideres_candidato    ON lideres(candidato_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_lider   ON asignaciones(lider_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_persona ON asignaciones(persona_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado  ON asignaciones(estado_asignacion_id);
CREATE INDEX IF NOT EXISTS idx_lideres_persona_id   ON lideres(persona_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol         ON usuarios(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_candidato   ON usuarios(candidato_id);
CREATE INDEX IF NOT EXISTS idx_personas_candidato   ON personas(candidato_id);


-- ==========================================
-- 6. SEED DATA (catálogos y valores iniciales)
-- ==========================================

-- Candidato principal (UUID fijo para referencias en scripts)
INSERT INTO candidatos (candidato_id, nombre, descripcion)
VALUES ('00000000-0000-0000-0000-000000000001', 'Candidato Principal', 'Candidato por defecto del sistema')
ON CONFLICT DO NOTHING;

-- Roles del sistema
INSERT INTO roles (nombre, descripcion) VALUES
    ('Admin',       'Administrador total del sistema'),
    ('Coordinador', 'Usuario con permisos de gestión pero sin administración de roles/configuración'),
    ('Sub-Líder',   'Líder de referidos con acceso solo a su red de personas')
ON CONFLICT (nombre) DO NOTHING;

-- Sectores geográficos por defecto
INSERT INTO sectores (nombre) VALUES
    ('Sector Centro'),
    ('Ensanche Ozama'),
    ('Villa Mella'),
    ('Los Alcarrizos'),
    ('Los Ríos')
ON CONFLICT (nombre) DO NOTHING;

-- Niveles de líder
INSERT INTO nivel_lider (nombre) VALUES
    ('Cabeza'),
    ('Sub-líder'),
    ('Coordinador')
ON CONFLICT (nombre) DO NOTHING;

-- Estados de líder
INSERT INTO estado_lider (nombre) VALUES
    ('Activo'),
    ('Inactivo'),
    ('Suspendido')
ON CONFLICT (nombre) DO NOTHING;

-- Estados de persona
INSERT INTO estado_persona (nombre) VALUES
    ('Activo'),
    ('Validado'),
    ('Duplicado'),
    ('Inactivo')
ON CONFLICT (nombre) DO NOTHING;

-- Estados de asignación
INSERT INTO estado_asignacion (nombre) VALUES
    ('Activa'),
    ('Reasignada'),
    ('Anulada')
ON CONFLICT (nombre) DO NOTHING;

-- Estados de evento
INSERT INTO estado_evento (nombre) VALUES
    ('Programado'),
    ('Realizado'),
    ('Cancelado')
ON CONFLICT (nombre) DO NOTHING;

-- Estados de usuario
INSERT INTO estado_usuario (nombre) VALUES
    ('Activo'),
    ('Inactivo'),
    ('Bloqueado')
ON CONFLICT (nombre) DO NOTHING;

-- Fuentes de captación
INSERT INTO fuentes_captacion (nombre) VALUES
    ('WhatsApp'),
    ('Formulario'),
    ('Evento'),
    ('Llamada'),
    ('Referido')
ON CONFLICT (nombre) DO NOTHING;
