const express = require('express');
const router = express.Router();

// Helper: obtiene el candidato_id del usuario autenticado.
// Retorna null para Super Admin (ve todo), o el candidato_id para filtrar.
const SUPER_ADMIN_CANDIDATO_ID = '00000000-0000-0000-0000-000000000001';
async function getCandidatoId(req) {
  const cid = req.user?.candidato_id;
  if (req.user?.rol_nombre === 'ADMIN') {
    // Super Admin: candidato_id es el default → ve todo sin filtro
    if (!cid || cid === SUPER_ADMIN_CANDIDATO_ID) return null;
    // Admin de candidato: tiene un candidato_id específico → filtra por él
    return cid;
  }
  // Otros roles: filtrar por su candidato_id del JWT
  return cid || null;
}

const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authenticate, authorize, authorizeScope } = require('../middleware/auth');
const { buildLiderScope, getScopeLeaderIds, checkLiderInScope, getLiderTree } = require('../helpers/scope');
const { sendWelcomeEmail } = require('../services/emailService');
const { checkAndNotifyGoalAchievement } = require('../services/notificationService');

// ----- Helpers -----
function generateTempPassword() {
    // 12 caracteres URL-safe, sin ambigüedad visual
    return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

// GET /sectores
router.get('/sectores', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT sector_id, nombre FROM sectores WHERE activo = true');
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /sectores
router.post('/sectores', authenticate, async (req, res, next) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ ok: false, message: 'nombre es requerido' });
    const result = await pool.query(
      'INSERT INTO sectores (nombre, activo) VALUES ($1, true) RETURNING *',
      [nombre.trim()]
    );
    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /sectores/:id
router.put('/sectores/:id', authenticate, async (req, res, next) => {
  try {
    const { nombre, activo } = req.body;
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE sectores SET nombre = COALESCE($1, nombre), activo = COALESCE($2, activo) WHERE sector_id = $3 RETURNING *',
      [nombre?.trim() || null, activo ?? null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ ok: false, message: 'Sector no encontrado' });
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// DELETE /sectores/:id — eliminación real con validación
router.delete('/sectores/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
      'SELECT COUNT(*) FROM personas WHERE sector_id = $1',
      [id]
    );
    const count = parseInt(check.rows[0].count);
    if (count > 0) {
      return res.status(400).json({
        ok: false,
        message: `No se puede eliminar: hay ${count} persona${count === 1 ? '' : 's'} asignada${count === 1 ? '' : 's'} a este centro de votación`
      });
    }
    const del = await pool.query('DELETE FROM sectores WHERE sector_id = $1 RETURNING sector_id', [id]);
    if (del.rows.length === 0) return res.status(404).json({ ok: false, message: 'Centro de votación no encontrado' });
    res.json({ ok: true, message: 'Centro de votación eliminado correctamente' });
  } catch (err) { next(err); }
});

// GET /sectores/todos (incluyendo inactivos)
router.get('/sectores/todos', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT sector_id, nombre, activo FROM sectores ORDER BY nombre');
    res.json({ ok: true, data: result.rows });
  } catch (err) { next(err); }
});

// POST /fuentes
router.post('/fuentes', authenticate, async (req, res, next) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ ok: false, message: 'nombre es requerido' });
    const result = await pool.query(
      'INSERT INTO fuentes_captacion (nombre, activo) VALUES ($1, true) RETURNING *',
      [nombre.trim()]
    );
    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /fuentes/:id
router.put('/fuentes/:id', authenticate, async (req, res, next) => {
  try {
    const { nombre, activo } = req.body;
    const result = await pool.query(
      'UPDATE fuentes_captacion SET nombre = COALESCE($1, nombre), activo = COALESCE($2, activo) WHERE fuente_id = $3 RETURNING *',
      [nombre?.trim() || null, activo ?? null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ ok: false, message: 'Fuente no encontrada' });
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// DELETE /fuentes/:id — eliminación real con validación
router.delete('/fuentes/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
      'SELECT COUNT(*) FROM personas WHERE fuente_id = $1',
      [id]
    );
    const count = parseInt(check.rows[0].count);
    if (count > 0) {
      return res.status(400).json({
        ok: false,
        message: `No se puede eliminar: hay ${count} persona${count === 1 ? '' : 's'} con esta fuente de captación`
      });
    }
    const del = await pool.query('DELETE FROM fuentes_captacion WHERE fuente_id = $1 RETURNING fuente_id', [id]);
    if (del.rows.length === 0) return res.status(404).json({ ok: false, message: 'Fuente no encontrada' });
    res.json({ ok: true, message: 'Fuente eliminada correctamente' });
  } catch (err) { next(err); }
});

// GET /fuentes/todas
router.get('/fuentes/todas', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT fuente_id, nombre, activo FROM fuentes_captacion ORDER BY nombre');
    res.json({ ok: true, data: result.rows });
  } catch (err) { next(err); }
});

// GET /dashboard
router.get('/dashboard', authenticate, async (req, res, next) => {
    try {
        const client = await pool.connect();
        try {
            // Scope for LIDER role (Admin/Coordinador have empty scopeClause)
            const scopeRes = await buildLiderScope(req, [], 1);
            const { scopeClause } = scopeRes;
            const values = scopeRes.values;
            const role = req.user?.rol_nombre;

            // ── Filtros de scope para el dashboard ───────────────────────────
            // ADMIN        → sin filtro de árbol (ve todo; candidato_id puede ser null)
            // COORDINADOR  → filtra por candidato_id (ve todo su candidato)
            // SUB_LIDER    → filtra por árbol de líderes bajo su lider_id
            let personaQueryBase = `FROM personas p WHERE p.candidato_id = $1`;
            let personaFilter = '';
            let liderFilter = ` WHERE l.candidato_id = $1`;
            let asignacionFilter = ` WHERE l.candidato_id = $1`;
            let filterValues = [req.user.candidato_id];

            if (role === 'SUB_LIDER') {
                const treeIds = await getScopeLeaderIds(req.user.lider_id || null);
                personaQueryBase = `FROM personas p JOIN asignaciones a ON p.persona_id = a.persona_id WHERE p.candidato_id = $1`;
                personaFilter = ` AND a.lider_id = ANY($2)`;
                liderFilter += ` AND l.lider_id = ANY($2)`;
                asignacionFilter += ` AND a.lider_id = ANY($2)`;
                filterValues = [req.user.candidato_id, treeIds];
            } else if (role !== 'ADMIN') {
                // COORDINADOR u otros no-ADMIN: solo filtra por candidato_id
                // personaQueryBase, liderFilter y filterValues ya apuntan a candidato_id=$1
                personaFilter = '';
            }

            // 1. Total Captadas
            const capQuery = await client.query(`SELECT COUNT(DISTINCT p.persona_id) as total ${personaQueryBase} ${personaFilter}`, filterValues);
            const totalCaptadas = parseInt(capQuery.rows[0].total) || 0;

            // 2. Nuevos Hoy
            const hoyQuery = await client.query(`
                SELECT COUNT(DISTINCT p.persona_id) as total 
                ${personaQueryBase}
                ${personaFilter} AND DATE(p.fecha_registro) = CURRENT_DATE
            `, filterValues);
            const nuevosHoy = parseInt(hoyQuery.rows[0].total) || 0;

            // 3. Líderes Activos
            const actLiderQuery = await client.query(`
                SELECT COUNT(l.lider_id) as total 
                FROM lideres l 
                JOIN estado_lider el ON l.estado_lider_id = el.estado_lider_id 
                WHERE el.nombre = 'Activo' ${scopeClause}
            `, values);
            const lideresActivos = parseInt(actLiderQuery.rows[0].total) || 0;

            // 4. Meta Global (Suma de metas vs Total Captadas)
            const globalQuery = await client.query(`
                SELECT SUM(meta_cantidad) as total_meta 
                FROM lideres l 
                JOIN estado_lider el ON l.estado_lider_id = el.estado_lider_id 
                WHERE el.nombre = 'Activo' ${scopeClause}
            `, values);
            const metaGlobalTotal = parseInt(globalQuery.rows[0]?.total_meta) || 1; // avoid / 0
            const metaGlobalPercent = Math.min(100, Math.round((totalCaptadas / metaGlobalTotal) * 100));

            // 5. Ranking Líderes (Top 5 por cantidad de captados)
            const rankingLideresQuery = await client.query(`
                SELECT 
                    l.lider_id as lider_id,
                    p.nombres || ' ' || p.apellidos as name, 
                    COUNT(DISTINCT a.persona_id) as count,
                    l.meta_cantidad,
                    CASE WHEN l.meta_cantidad > 0 THEN 
                        LEAST(100, ROUND((COUNT(DISTINCT a.persona_id)::numeric / l.meta_cantidad::numeric) * 100))
                    ELSE 0 END as percent
                FROM lideres l
                JOIN personas p ON l.persona_id = p.persona_id
                LEFT JOIN asignaciones a ON l.lider_id = a.lider_id
                WHERE 1=1 ${scopeClause}
                GROUP BY l.lider_id, p.nombres, p.apellidos, l.meta_cantidad
                ORDER BY count DESC
                LIMIT 5
            `, values);
            const rankingLideres = rankingLideresQuery.rows.map(row => ({
                lider_id: row.lider_id,
                name: row.name,
                count: parseInt(row.count),
                meta_cantidad: parseInt(row.meta_cantidad),
                percent: parseInt(row.percent)
            }));

            // 6. Ranking Sectores (Top 5 sectores con más personas)
            let sumTotalSectoresValues = filterValues;
            const rankingSectoresQuery = await client.query(`
                SELECT 
                    s.nombre as name, 
                    COUNT(DISTINCT p.persona_id) as count
                FROM sectores s
                JOIN personas p ON s.sector_id = p.sector_id
                ${role === 'SUB_LIDER' ? 'JOIN asignaciones a ON p.persona_id = a.persona_id' : ''}
                WHERE p.candidato_id = $1 ${personaFilter}
                GROUP BY s.sector_id, s.nombre
                ORDER BY count DESC
                LIMIT 5
            `, sumTotalSectoresValues);

            // Calculate percentage for sectors based on totalCaptadas
            const rankingSectores = rankingSectoresQuery.rows.map(sec => ({
                name: sec.name,
                count: parseInt(sec.count),
                percent: totalCaptadas > 0 ? Math.round((parseInt(sec.count) / totalCaptadas) * 100) : 0
            }));

            // 7. Actividad Reciente (Últimos 5 registros en asignaciones)
            const actividadQuery = await client.query(`
                SELECT 
                    a.fecha_asignacion as time_str,
                    p_simpatizante.nombres || ' ' || p_simpatizante.apellidos as target_name,
                    p_lider.nombres || ' ' || p_lider.apellidos as creator_name,
                    p_lider.nombres || ' ' || p_lider.apellidos as leader_name,
                    'registro' as type
                FROM asignaciones a
                JOIN personas p_simpatizante ON a.persona_id = p_simpatizante.persona_id
                JOIN lideres l ON a.lider_id = l.lider_id
                JOIN personas p_lider ON l.persona_id = p_lider.persona_id
                ${asignacionFilter}
                ORDER BY a.fecha_asignacion DESC
                LIMIT 5
            `, filterValues);

            const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
            const parseRelativeTime = (dateString) => {
                const diff = new Date() - new Date(dateString);
                const minutes = Math.floor(diff / 60000);
                if (minutes < 60) return formatter.format(-minutes, 'minute');
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return formatter.format(-hours, 'hour');
                return formatter.format(-Math.floor(hours / 24), 'day');
            };

            const actividadReciente = actividadQuery.rows.map(row => ({
                target_name: row.target_name,
                leader_name: row.leader_name,
                creator_name: row.leader_name,
                type: row.type,
                relative_time: parseRelativeTime(row.time_str)
            }));

            res.json({
                ok: true,
                data: {
                    kpis: {
                        total_captadas: totalCaptadas,
                        nuevos_hoy: nuevosHoy,
                        lideres_activos: lideresActivos,
                        meta_global_percent: metaGlobalPercent
                    },
                    ranking_lideres: rankingLideres,
                    ranking_sectores: rankingSectores,
                    actividad_reciente: actividadReciente
                }
            });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

// GET /dashboard/crecimiento
router.get('/dashboard/crecimiento', authenticate, async (req, res) => {
    try {
        const candidatoId = await getCandidatoId(req);
        let query, params;
        if (candidatoId) {
            query = `SELECT DATE_TRUNC('day', fecha_registro) as fecha, COUNT(*) as total
                     FROM personas WHERE candidato_id = $1
                     AND fecha_registro >= NOW() - INTERVAL '30 days'
                     GROUP BY DATE_TRUNC('day', fecha_registro)
                     ORDER BY fecha ASC`;
            params = [candidatoId];
        } else {
            query = `SELECT DATE_TRUNC('day', fecha_registro) as fecha, COUNT(*) as total
                     FROM personas
                     WHERE fecha_registro >= NOW() - INTERVAL '30 days'
                     GROUP BY DATE_TRUNC('day', fecha_registro)
                     ORDER BY fecha ASC`;
            params = [];
        }
        const result = await pool.query(query, params);
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        console.error('[GET /dashboard/crecimiento]', err.message);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// GET /lideres
router.get('/lideres', authenticate, async (req, res, next) => {
    try {
        const candidatoId = await getCandidatoId(req);
        let query = `
      SELECT l.lider_id, p.nombres || ' ' || p.apellidos AS nombre_completo, l.meta_cantidad
      FROM lideres l
      JOIN personas p ON l.persona_id = p.persona_id
      JOIN estado_lider el ON l.estado_lider_id = el.estado_lider_id
      WHERE el.nombre = 'Activo'
    `;
        const values = [];
        if (candidatoId) {
            query += ` AND l.candidato_id = $1`;
            values.push(candidatoId);
        }
        const result = await pool.query(query, values);
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /fuentes
router.get('/fuentes', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT fuente_id, nombre FROM fuentes_captacion WHERE activo = true');
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// --- Test Route ---
router.post('/test-route', authenticate, (req, res) => res.json({ ok: true, msg: 'API test route works' }));

// POST /registro
router.post('/registro', authenticate, async (req, res, next) => {
    // Normalización
    const nombres = req.body.nombres?.trim();
    const apellidos = req.body.apellidos?.trim();
    const telefono = req.body.telefono?.trim();
    const cedula = req.body.cedula?.trim();
    const email = req.body.email?.trim();
    const { sector_id, lider_id, fuente_id } = req.body;
    const notas = req.body.notas?.trim();
    const mesa = req.body.mesa?.trim();

    // Validaciones
    const missing = [];
    if (!nombres) missing.push('nombres');
    if (!apellidos) missing.push('apellidos');
    if (!telefono) missing.push('telefono');
    if (!sector_id) missing.push('sector_id');
    if (!lider_id) missing.push('lider_id');
    if (!fuente_id) missing.push('fuente_id');

    if (missing.length > 0) {
        return res.status(400).json({
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Faltan campos obligatorios',
            details: missing
        });
    }

    // New Validations: Only text for names
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
    if (!nameRegex.test(nombres)) {
        return res.status(400).json({ ok: false, code: 'INVALID_FORMAT', message: 'El nombre solo permite letras y espacios.' });
    }
    if (!nameRegex.test(apellidos)) {
        return res.status(400).json({ ok: false, code: 'INVALID_FORMAT', message: 'El apellido solo permite letras y espacios.' });
    }

    // Email validation if present
    if (email && email !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
             return res.status(400).json({ ok: false, code: 'INVALID_FORMAT', message: 'El formato del email es inválido.' });
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Checking duplicados de teléfono dentro del ámbito del candidato
        const phoneCheck = await client.query('SELECT persona_id FROM personas WHERE telefono = $1 AND candidato_id = $2', [telefono, req.user.candidato_id]);
        if (phoneCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                ok: false,
                code: 'DUPLICATE_PHONE',
                message: 'Ya existe una persona con este teléfono bajo este candidato'
            });
        }

        // Checking duplicados de cédula dentro del ámbito del candidato
        if (cedula && cedula !== '') {
            const cedulaCheck = await client.query('SELECT persona_id FROM personas WHERE cedula = $1 AND candidato_id = $2', [cedula, req.user.candidato_id]);
            if (cedulaCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    ok: false,
                    code: 'DUPLICATE_CEDULA',
                    message: 'Ya existe una persona con esta cédula bajo este candidato'
                });
            }
        }

        // Traer ID de estado "Activo" para persona
        const estadoPersonaRes = await client.query("SELECT estado_persona_id FROM estado_persona WHERE nombre = 'Activo'");
        const estadoPersonaId = estadoPersonaRes.rows[0].estado_persona_id;

        // Crear la persona
        const personaQuery = `
      INSERT INTO personas (nombres, apellidos, cedula, telefono, email, sector_id, notas, estado_persona_id, mesa, candidato_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
        const personaValues = [nombres, apellidos, cedula || null, telefono, email || null, sector_id, notas || null, estadoPersonaId, mesa || null, req.user.candidato_id];
        const personaRes = await client.query(personaQuery, personaValues);
        const nuevaPersona = personaRes.rows[0];

        // Traer ID de estado "Activa" para asignación
        const estadoAsignacionRes = await client.query("SELECT estado_asignacion_id FROM estado_asignacion WHERE nombre = 'Activa'");
        const estadoAsignacionId = estadoAsignacionRes.rows[0].estado_asignacion_id;

        // Crear la asignación
        const asignacionQuery = `
      INSERT INTO asignaciones (lider_id, persona_id, fuente_id, estado_asignacion_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const asignacionValues = [lider_id, nuevaPersona.persona_id, fuente_id, estadoAsignacionId];
        const asignacionRes = await client.query(asignacionQuery, asignacionValues);
        const nuevaAsignacion = asignacionRes.rows[0];

        await client.query('COMMIT');

        // Disparar validación de meta lograda (asíncrono)
        checkAndNotifyGoalAchievement(pool, lider_id).catch(err => console.error("Error al notificar meta:", err));

        // Obtener datos combinados para el "Ultimo Registro" del frontend (Permisivo para evitar fallos de renderizado)
        const fullPersonaRes = await client.query(`
            SELECT 
                p.nombres, p.apellidos, p.telefono,
                p.fecha_registro, p.mesa,
                s.nombre AS sector_nombre,
                l_p.nombres || ' ' || l_p.apellidos AS lider_nombre
            FROM personas p
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            LEFT JOIN asignaciones a ON p.persona_id = a.persona_id
            LEFT JOIN lideres l ON a.lider_id = l.lider_id
            LEFT JOIN personas l_p ON l.persona_id = l_p.persona_id
            WHERE p.persona_id = $1
            ORDER BY a.fecha_asignacion DESC
            LIMIT 1
        `, [nuevaPersona.persona_id]);

        if (fullPersonaRes.rows.length === 0) {
            console.error("[ERROR] No se pudo recuperar la persona recién creada con JOINs:", nuevaPersona.persona_id);
        }

        res.status(201).json({
            ok: true,
            data: {
                ...nuevaPersona,
                sector_nombre: fullPersonaRes.rows[0]?.sector_nombre || 'Centro no definido',
                lider_nombre: fullPersonaRes.rows[0]?.lider_nombre || 'Sin líder asignado',
                // Asegurar que nombres y apellidos estén presentes para evitar el crash del frontend
                nombres: nuevaPersona.nombres || nombres,
                apellidos: nuevaPersona.apellidos || apellidos,
                telefono: nuevaPersona.telefono || telefono,
                fecha_registro: nuevaPersona.fecha_registro || new Date().toISOString()
            },
            message: 'Registro creado y asignado exitosamente.'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// GET /lideres-resumen
router.get('/lideres-resumen', authenticate, async (req, res, next) => {
    console.log('[DEBUG /lideres-resumen] User State:', {
        email: req.user.email,
        rol: req.user.rol_nombre,
        candidato_id: req.user.candidato_id,
        lider_id: req.user.lider_id
    });
    try {
        const { search, sector, estado, nivel, page = 1, pageSize = 10 } = req.query;
        const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(pageSize, 10);

        // --- SCOPE & CANDIDATO ---
        const cid = await getCandidatoId(req); // null para Super Admin
        const scope = await buildLiderScope(req); // cláusualas de jerarquía
        
        // Base query conditions
        let whereClause = 'WHERE 1=1';
        let values = [];
        let paramCount = 1;

        if (cid) {
            whereClause += ` AND l.candidato_id = $${paramCount}`;
            values.push(cid);
            paramCount++;
        }

        if (scope.scopeClause) {
            // Unimos la cláusula del scope (ej. AND l.lider_id = ANY($2))
            // Ojo: buildLiderScope asume que empieza desde paramCount 1 si no se le pasa nada.
            // Para evitar errores de parámetros, regeneramos el scope pasando paramCount actual.
            const fixedScope = await buildLiderScope(req, values, paramCount);
            whereClause += fixedScope.scopeClause;
            values = fixedScope.values;
            paramCount = fixedScope.paramCount;
        }

        // --- FILTERS ---
        if (search && search.trim()) {
            whereClause += ` AND (p.nombres ILIKE $${paramCount} OR p.apellidos ILIKE $${paramCount} OR p.telefono ILIKE $${paramCount})`;
            values.push(`%${search.trim()}%`);
            paramCount++;
        }
        if (sector) {
            whereClause += ` AND (p.sector_id = $${paramCount} OR s.sector_id = $${paramCount})`;
            values.push(sector);
            paramCount++;
        }
        if (estado) {
            whereClause += ` AND l.estado_lider_id = $${paramCount}`;
            values.push(estado);
            paramCount++;
        }
        if (nivel) {
            whereClause += ` AND l.nivel_lider_id = $${paramCount}`;
            values.push(nivel);
            paramCount++;
        }

        const countQuery = `
            SELECT COUNT(DISTINCT l.lider_id) as total
            FROM lideres l
            JOIN personas p ON l.persona_id = p.persona_id
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            ${whereClause}
        `;
        const countRes = await pool.query(countQuery, values);
        const total = parseInt(countRes.rows[0].total, 10);

        const dataQuery = `
            SELECT
                l.lider_id, l.lider_padre_id, l.meta_cantidad, l.codigo_lider,
                p.nombres, p.apellidos, p.nombres || ' ' || p.apellidos AS nombre_completo,
                p.telefono, p.cedula, s.nombre AS sector_nombre, s.sector_id,
                COALESCE(el.nombre, 'Desconocido') AS estado_nombre, el.estado_lider_id,
                COALESCE(nl.nombre, 'Sin Nivel') AS nivel_nombre, nl.nivel_lider_id,
                (SELECT COUNT(*) FROM asignaciones a2 
                 JOIN estado_asignacion ea2 ON a2.estado_asignacion_id = ea2.estado_asignacion_id 
                 WHERE a2.lider_id = l.lider_id AND ea2.nombre = 'Activa') as total_reclutados
            FROM lideres l
            JOIN personas p ON l.persona_id = p.persona_id
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            LEFT JOIN estado_lider el ON l.estado_lider_id = el.estado_lider_id
            LEFT JOIN nivel_lider nl ON l.nivel_lider_id = nl.nivel_lider_id
            ${whereClause}
            ORDER BY total_reclutados DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        const dataValues = [...values, parseInt(pageSize, 10), offset];
        const result = await pool.query(dataQuery, dataValues);

        // Attach calculated field (since we did it in subquery for simplicity/safety)
        const finalRows = result.rows.map(r => ({
            ...r,
            total_reclutados: parseInt(r.total_reclutados || 0, 10),
            porcentaje_cumplimiento: r.meta_cantidad > 0 
                ? Math.round((parseInt(r.total_reclutados || 0, 10) / r.meta_cantidad) * 100) 
                : 0
        }));

        res.json({
            ok: true,
            data: finalRows,
            pagination: {
                total,
                page: parseInt(page, 10),
                pageSize: parseInt(pageSize, 10),
                totalPages: Math.ceil(total / parseInt(pageSize, 10)) || 1
            }
        });
    } catch (err) {
        console.error('[GET /lideres-resumen] Error:', err.message, err.stack);
        next(err);
    }
});

// GET /lideres-resumen/export
router.get('/lideres-resumen/export', authenticate, async (req, res, next) => {
    try {
        const { search, sector, estado, nivel } = req.query;

        let basePath = `
            FROM lideres l
            JOIN personas p ON l.persona_id = p.persona_id
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            JOIN estado_lider el ON l.estado_lider_id = el.estado_lider_id
            JOIN nivel_lider nl ON l.nivel_lider_id = nl.nivel_lider_id
            LEFT JOIN (
                asignaciones a
                JOIN estado_asignacion ea ON a.estado_asignacion_id = ea.estado_asignacion_id AND ea.nombre = 'Activa'
            ) ON l.lider_id = a.lider_id
            WHERE 1=1
        `;

        let values = [];
        let paramCount = 1;

        // ── RBAC Scope ───────────────────────────────────────────────────────
        const scope = await buildLiderScope(req, values, paramCount);
        basePath += scope.scopeClause;
        values = scope.values;
        paramCount = scope.paramCount;

        if (search) {
            basePath += ` AND (p.nombres ILIKE $${paramCount} OR p.apellidos ILIKE $${paramCount} OR p.telefono ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }
        if (sector) {
            basePath += ` AND s.sector_id = $${paramCount}`;
            values.push(sector);
            paramCount++;
        }
        if (estado) {
            basePath += ` AND el.estado_lider_id = $${paramCount}`;
            values.push(estado);
            paramCount++;
        }
        if (nivel) {
            basePath += ` AND nl.nivel_lider_id = $${paramCount}`;
            values.push(nivel);
            paramCount++;
        }

        const dataQuery = `
            SELECT 
                p.nombres || ' ' || p.apellidos AS nombre_completo,
                p.telefono,
                s.nombre AS sector_nombre,
                l.meta_cantidad,
                COUNT(a.asignacion_id) as total_reclutados,
                CASE 
                    WHEN l.meta_cantidad > 0 THEN ROUND((COUNT(a.asignacion_id)::numeric / l.meta_cantidad::numeric) * 100, 2)
                    ELSE 0 
                END AS porcentaje_cumplimiento,
                el.nombre AS estado_nombre,
                nl.nombre AS nivel_nombre
            ${basePath}
            GROUP BY 
                l.lider_id, p.nombres, p.apellidos, p.telefono, s.nombre, l.meta_cantidad, el.nombre, nl.nombre
            ORDER BY total_reclutados DESC
        `;

        const result = await pool.query(dataQuery, values);

        // Build CSV
        const rows = result.rows;
        const headers = ['Nombre Completo', 'Teléfono', 'Sector', 'Nivel', 'Estado', 'Meta', 'Reclutados', '% Cumplimiento'];

        const enc = (val) => val === null || val === undefined ? '' : `"${String(val).replace(/"/g, '""')}"`;

        const csvContent = [
            headers.join(','),
            ...rows.map(r => [
                enc(r.nombre_completo),
                enc(r.telefono),
                enc(r.sector_nombre),
                enc(r.nivel_nombre),
                enc(r.estado_nombre),
                r.meta_cantidad,
                r.total_reclutados,
                r.porcentaje_cumplimiento
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="lideres.csv"');
        res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8')); // Add BOM for Excel
    } catch (err) {
        console.error('[GET /lideres-resumen/export] Error:', err.message, err.stack);
        next(err);
    }
});

// GET /ultimo-registro
router.get('/ultimo-registro', authenticate, async (req, res, next) => {
    try {
        const { scopeClause, values } = await buildLiderScope(req);
        const query = `
            SELECT 
                p.nombres, p.apellidos, p.telefono,
                p.fecha_registro, p.mesa,
                s.nombre AS sector_nombre,
                l_p.nombres || ' ' || l_p.apellidos AS lider_nombre
            FROM personas p
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            JOIN asignaciones a ON p.persona_id = a.persona_id
            JOIN lideres l ON a.lider_id = l.lider_id
            LEFT JOIN personas l_p ON l.persona_id = l_p.persona_id
            WHERE 1=1 ${scopeClause}
            ORDER BY p.fecha_registro DESC
            LIMIT 1
        `;
        const result = await pool.query(query, values);
        res.json({ ok: true, data: result.rows[0] || null });
    } catch (err) {
        next(err);
    }
});

// GET /estados-persona
router.get('/estados-persona', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT estado_persona_id, nombre FROM estado_persona ORDER BY nombre');
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /nivel-lider
router.get('/nivel-lider', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT nivel_lider_id, nombre FROM nivel_lider ORDER BY nombre');
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /estado-lider
router.get('/estado-lider', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT estado_lider_id, nombre FROM estado_lider ORDER BY nombre');
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /lideres/:id
router.get('/lideres/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;

        // ── RBAC Scope ───────────────────────────────────────────────────────
        const allowed = await checkLiderInScope(id, req, res);
        if (!allowed) return;

        const liderQuery = `
            SELECT 
                l.lider_id, l.persona_id, l.meta_cantidad, l.codigo_lider, l.lider_padre_id,
                pp.nombres || ' ' || pp.apellidos AS lider_padre_nombre,
                p.nombres, p.apellidos,
                p.nombres || ' ' || p.apellidos AS nombre_completo, p.telefono,
                p.sector_id, s.nombre AS sector_nombre,
                el.estado_lider_id, el.nombre AS estado_lider_nombre,
                nl.nivel_lider_id, nl.nombre AS nivel_lider_nombre
            FROM lideres l
            JOIN personas p ON l.persona_id = p.persona_id
            LEFT JOIN lideres lp ON l.lider_padre_id = lp.lider_id
            LEFT JOIN personas pp ON lp.persona_id = pp.persona_id
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            JOIN estado_lider el ON l.estado_lider_id = el.estado_lider_id
            JOIN nivel_lider nl ON l.nivel_lider_id = nl.nivel_lider_id
            WHERE l.lider_id = $1
        `;
        const liderRes = await pool.query(liderQuery, [id]);

        if (liderRes.rows.length === 0) {
            return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Líder no encontrado' });
        }

        const l = liderRes.rows[0];

        const metricasQuery = `
            SELECT
                SUM(CASE WHEN ea.nombre = 'Activa' THEN 1 ELSE 0 END) AS total_registrados_activos,
                COUNT(a.asignacion_id) AS total_registrados_historico
            FROM asignaciones a
            JOIN estado_asignacion ea ON a.estado_asignacion_id = ea.estado_asignacion_id
            WHERE a.lider_id = $1
        `;
        const metricasRes = await pool.query(metricasQuery, [id]);

        let activos = parseInt(metricasRes.rows[0].total_registrados_activos || 0, 10);
        let historico = parseInt(metricasRes.rows[0].total_registrados_historico || 0, 10);

        let porcentaje_cumplimiento = 0;
        if (l.meta_cantidad > 0) {
            porcentaje_cumplimiento = parseFloat(((activos / l.meta_cantidad) * 100).toFixed(2));
        }

        res.json({
            ok: true,
            data: {
                lider: {
                    lider_id: l.lider_id,
                    persona_id: l.persona_id,
                    nombres: l.nombres,
                    apellidos: l.apellidos,
                    nombre_completo: l.nombre_completo,
                    telefono: l.telefono,
                    sector_id: l.sector_id,
                    sector_nombre: l.sector_nombre,
                    meta_cantidad: l.meta_cantidad,
                    estado_lider: { id: l.estado_lider_id, nombre: l.estado_lider_nombre },
                    nivel_lider: { id: l.nivel_lider_id, nombre: l.nivel_lider_nombre },
                    codigo_lider: l.codigo_lider,
                    lider_padre_id: l.lider_padre_id,
                    lider_padre_nombre: l.lider_padre_nombre
                },
                metricas: {
                    total_registrados_activos: activos,
                    porcentaje_cumplimiento: porcentaje_cumplimiento,
                    total_registrados_historico: historico
                }
            }
        });

    } catch (err) {
        next(err);
    }
});

// GET /lideres/:id/personas
router.get('/lideres/:id/personas', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { q, estado_persona_id, sector_id, fuente_id, desde, hasta, incluir_historial, page = 1, pageSize = 10 } = req.query;

        // ── RBAC Scope ───────────────────────────────────────────────────────
        const allowed = await checkLiderInScope(id, req, res);
        if (!allowed) return;

        const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
        const values = [id];
        let paramCount = 2;

        let basePath = `
            FROM asignaciones a
            JOIN personas p ON a.persona_id = p.persona_id
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            JOIN estado_persona ep ON p.estado_persona_id = ep.estado_persona_id
            JOIN estado_asignacion ea ON a.estado_asignacion_id = ea.estado_asignacion_id
            LEFT JOIN fuentes_captacion f ON a.fuente_id = f.fuente_id
            WHERE a.lider_id = $1
        `;

        if (incluir_historial !== 'true') {
            basePath += ` AND ea.nombre = 'Activa'`;
        }

        if (q) {
            basePath += ` AND (p.nombres ILIKE $${paramCount} OR p.apellidos ILIKE $${paramCount} OR p.cedula ILIKE $${paramCount} OR p.telefono ILIKE $${paramCount})`;
            values.push(`%${q}%`);
            paramCount++;
        }
        if (estado_persona_id) {
            basePath += ` AND p.estado_persona_id = $${paramCount}`;
            values.push(estado_persona_id);
            paramCount++;
        }
        if (sector_id) {
            basePath += ` AND p.sector_id = $${paramCount}`;
            values.push(sector_id);
            paramCount++;
        }
        if (fuente_id) {
            basePath += ` AND a.fuente_id = $${paramCount}`;
            values.push(fuente_id);
            paramCount++;
        }
        if (desde) {
            basePath += ` AND a.fecha_asignacion >= $${paramCount}`;
            values.push(desde);
            paramCount++;
        }
        if (hasta) {
            basePath += ` AND a.fecha_asignacion <= $${paramCount}`;
            values.push(hasta);
            paramCount++;
        }

        const countQuery = `SELECT COUNT(*) ` + basePath;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count, 10);

        const dataQuery = `
            SELECT 
                p.persona_id, p.nombres || ' ' || p.apellidos AS nombre_completo, p.telefono, p.cedula, p.mesa,
                s.nombre AS sector_nombre,
                ep.estado_persona_id, ep.nombre AS estado_persona_nombre,
                f.fuente_id, COALESCE(f.nombre, 'Sistema') AS fuente_nombre,
                p.fecha_registro, a.fecha_asignacion,
                ea.estado_asignacion_id, ea.nombre AS estado_asignacion_nombre
            ${basePath}
            ORDER BY a.fecha_asignacion DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        const dataValues = [...values, parseInt(pageSize, 10), offset];
        const dataResult = await pool.query(dataQuery, dataValues);

        res.json({
            ok: true,
            data: dataResult.rows.map(row => ({
                persona_id: row.persona_id,
                nombre_completo: row.nombre_completo,
                telefono: row.telefono,
                cedula: row.cedula,
                mesa: row.mesa,
                sector_nombre: row.sector_nombre,
                estado_persona: { id: row.estado_persona_id, nombre: row.estado_persona_nombre },
                fuente_captacion: { id: row.fuente_id, nombre: row.fuente_nombre },
                fecha_registro: row.fecha_registro,
                fecha_asignacion: row.fecha_asignacion,
                estado_asignacion: { id: row.estado_asignacion_id, nombre: row.estado_asignacion_nombre }
            })),
            pagination: {
                total,
                page: parseInt(page, 10),
                pageSize: parseInt(pageSize, 10),
                totalPages: Math.ceil(total / parseInt(pageSize, 10)) || 1
            }
        });

    } catch (err) {
        next(err);
    }
});

// PUT /lideres/:id
router.put('/lideres/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const rolRaw = req.user?.rol_nombre || '';
    const rolNorm = rolRaw.toUpperCase().replace(/[-_\s]/g, '');
    const esAdmin = rolNorm === 'ADMIN' || rolNorm === 'SUPERADMIN';
    const esCoord = rolNorm === 'COORDINADOR';
    const esSubLider = rolNorm.includes('LIDER') || rolNorm.includes('SUBLIDER');
    if (!esAdmin && !esCoord && !esSubLider) {
      return res.status(403).json({ ok: false, message: 'Sin permisos' });
    }
    if (!esAdmin && !esCoord) {
      const miLiderId = req.user.lider_id;
      if (miLiderId) {
        const targetRes = await pool.query(
          'SELECT lider_id, lider_padre_id FROM lideres WHERE lider_id = $1',
          [id]
        );
        const target = targetRes.rows[0];
        const esPropio = target?.lider_id === miLiderId;
        const esSubordinado = target?.lider_padre_id === miLiderId;
        if (!esPropio && !esSubordinado) {
          return res.status(403).json({ ok: false, message: 'Solo puedes editar líderes bajo tu cargo' });
        }
      }
    }
    const {
      nombres, apellidos, telefono, sector_id,
      meta_cantidad, estado_lider_id, nivel_lider_id
    } = req.body;

    // Actualizar persona (nombres, apellidos, telefono, sector_id viven en personas)
    const personaUpdates = [];
    const personaValues = [];
    let pIdx = 1;
    if (nombres    !== undefined) { personaUpdates.push(`nombres = $${pIdx++}`);   personaValues.push(nombres); }
    if (apellidos  !== undefined) { personaUpdates.push(`apellidos = $${pIdx++}`); personaValues.push(apellidos); }
    if (telefono   !== undefined) { personaUpdates.push(`telefono = $${pIdx++}`);  personaValues.push(telefono); }
    if (sector_id  !== undefined) { personaUpdates.push(`sector_id = $${pIdx++}`); personaValues.push(sector_id); }
    if (personaUpdates.length > 0) {
      personaValues.push(id);
      await pool.query(
        `UPDATE personas SET ${personaUpdates.join(', ')}
         WHERE persona_id = (SELECT persona_id FROM lideres WHERE lider_id = $${pIdx})`,
        personaValues
      );
    }

    // Actualizar lideres (meta_cantidad, estado_lider_id, nivel_lider_id)
    const liderUpdates = [];
    const liderValues = [];
    let lIdx = 1;
    if (meta_cantidad    !== undefined) { liderUpdates.push(`meta_cantidad = $${lIdx++}`);    liderValues.push(meta_cantidad); }
    if (estado_lider_id  !== undefined) { liderUpdates.push(`estado_lider_id = $${lIdx++}`);  liderValues.push(estado_lider_id); }
    if (nivel_lider_id   !== undefined) { liderUpdates.push(`nivel_lider_id = $${lIdx++}`);   liderValues.push(nivel_lider_id); }

    let liderRow = null;
    if (liderUpdates.length > 0) {
      liderValues.push(id);
      const liderRes = await pool.query(
        `UPDATE lideres SET ${liderUpdates.join(', ')} WHERE lider_id = $${lIdx} RETURNING *`,
        liderValues
      );
      liderRow = liderRes.rows[0] || null;
    } else {
      const r = await pool.query('SELECT * FROM lideres WHERE lider_id = $1', [id]);
      liderRow = r.rows[0] || null;
    }

    if (!liderRow) {
      return res.status(404).json({ ok: false, message: 'Líder no encontrado' });
    }

    res.json({ ok: true, data: liderRow, message: 'Líder actualizado correctamente' });
  } catch (err) {
    console.error('[PUT /lideres/:id] error:', err.message);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /lideres/:id — Solo Super Admin
router.delete('/lideres/:id', authenticate, async (req, res) => {
    // 1. Verificar Super Admin
    const callerCandidatoId = req.user?.candidato_id;
    const callerEmail = req.user?.email;
    const isSuperAdminCaller =
        callerCandidatoId === SUPER_ADMIN_CANDIDATO_ID ||
        callerEmail === 'ejguerrero@smarttestingrd.com';

    if (!isSuperAdminCaller) {
        return res.status(403).json({ ok: false, message: 'Acceso denegado. Solo Super Admin puede eliminar líderes.' });
    }

    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SET search_path TO partido360');

        // 2. Obtener persona_id del líder
        const liderRes = await client.query(
            'SELECT persona_id FROM lideres WHERE lider_id = $1',
            [id]
        );
        if (liderRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, message: 'Líder no encontrado.' });
        }
        const personaId = liderRes.rows[0].persona_id;

        // 3. Desasociar líderes hijos (evita FK violation en lider_padre_id)
        await client.query(
            'UPDATE lideres SET lider_padre_id = NULL WHERE lider_padre_id = $1',
            [id]
        );

        // 4. Eliminar asignaciones del líder
        await client.query('DELETE FROM asignaciones WHERE lider_id = $1', [id]);

        // 5. Eliminar el registro de líder
        await client.query('DELETE FROM lideres WHERE lider_id = $1', [id]);

        // 6. Eliminar usuario vinculado a la persona
        await client.query('DELETE FROM usuarios WHERE persona_id = $1', [personaId]);

        // 7. Eliminar la persona
        await client.query('DELETE FROM personas WHERE persona_id = $1', [personaId]);

        await client.query('COMMIT');
        res.json({ ok: true, message: 'Líder eliminado correctamente.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DELETE /lideres/:id] Error:', err.message, '\nStack:', err.stack);
        res.status(500).json({ ok: false, message: 'Error al eliminar el líder.', error: err.message });
    } finally {
        client.release();
    }
});

// GET /personas/buscar
router.get('/personas/buscar', authenticate, async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) return res.json({ ok: true, data: [] });

        const cid = await getCandidatoId(req);
        let query = `
            SELECT persona_id, nombres, apellidos, cedula, telefono 
            FROM personas 
            WHERE (nombres ILIKE $1 OR apellidos ILIKE $1 OR cedula ILIKE $1 OR telefono ILIKE $1)
        `;
        const values = [`%${q.trim()}%`];
        if (cid) {
            query += ` AND candidato_id = $2`;
            values.push(cid);
        }
        query += ` LIMIT 10`;

        const result = await pool.query(query, values);
        res.json({ ok: true, data: result.rows });
    } catch (err) { next(err); }
});

// GET /personas/:id
router.get('/personas/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const cid = await getCandidatoId(req);
        
        let query = `
            SELECT p.*, s.nombre as sector_nombre, ep.nombre as estado_nombre,
                   f.nombre as fuente_nombre,
                   l_p.nombres || ' ' || l_p.apellidos as lider_nombre
            FROM personas p
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            LEFT JOIN estado_persona ep ON p.estado_persona_id = ep.estado_persona_id
            LEFT JOIN (
                asignaciones a 
                JOIN estado_asignacion ea ON a.estado_asignacion_id = ea.estado_asignacion_id AND ea.nombre = 'Activa'
                JOIN lideres l ON a.lider_id = l.lider_id
                JOIN personas l_p ON l.persona_id = l_p.persona_id
            ) ON p.persona_id = a.persona_id
            LEFT JOIN fuentes_captacion f ON a.fuente_id = f.fuente_id
            WHERE p.persona_id = $1
        `;
        const values = [id];
        if (cid) {
            query += ` AND p.candidato_id = $2`;
            values.push(cid);
        }

        const result = await pool.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({ ok: false, message: 'Persona no encontrada' });
        
        res.json({ ok: true, data: result.rows[0] });
    } catch (err) { next(err); }
});

// La ruta PUT /personas/:id ha sido consolidada más abajo (línea ~2000) por temas de control RBAC y concurrencia.

// DELETE /personas/:id
router.delete('/personas/:id', authenticate, async (req, res, next) => {
    // Solo Super Admin
    const isSuperAdminCaller =
        req.user?.candidato_id === SUPER_ADMIN_CANDIDATO_ID ||
        req.user?.email === 'ejguerrero@smarttestingrd.com';

    if (!isSuperAdminCaller) {
        return res.status(403).json({ ok: false, message: 'Acceso denegado. Solo Super Admin puede borrar registros permanentemente.' });
    }

    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Eliminar bitacora_reclutamiento
        await client.query('DELETE FROM bitacora_reclutamiento WHERE persona_id = $1', [id]);
        
        // 2. Eliminar asignaciones (para que no bloqueen)
        await client.query('DELETE FROM asignaciones WHERE persona_id = $1', [id]);

        // 3. Si es un líder, limpiar sus huellas
        const ldrRes = await client.query('SELECT lider_id FROM lideres WHERE persona_id = $1', [id]);
        if (ldrRes.rows.length > 0) {
            const lid = ldrRes.rows[0].lider_id;
            await client.query('UPDATE lideres SET lider_padre_id = NULL WHERE lider_padre_id = $1', [lid]);
            await client.query('DELETE FROM asignaciones WHERE lider_id = $1', [lid]); // borra a sus reclutados (desvincula)
            await client.query('DELETE FROM lideres WHERE lider_id = $1', [lid]);
        }

        // 4. Eliminar usuarios
        await client.query('DELETE FROM usuarios WHERE persona_id = $1', [id]);

        // 5. Finalmente eliminar la persona
        const result = await client.query('DELETE FROM personas WHERE persona_id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, message: 'Persona no encontrada' });
        }

        await client.query('COMMIT');
        res.json({ ok: true, message: 'Registro eliminado permanentemente con éxito.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DELETE /personas/:id] Error:', err.message);
        res.status(500).json({ ok: false, message: 'Error al eliminar el registro.' });
    } finally {
        client.release();
    }
});


// POST /lideres
router.post('/lideres', authenticate, async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { persona_id, meta_cantidad, nivel_lider_id, estado_lider_id, lider_padre_id } = req.body;

        if (!persona_id || !meta_cantidad || !nivel_lider_id || !estado_lider_id) {
            return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'Faltan campos obligatorios' });
        }

        await client.query('BEGIN');

        // Verify if already a leader
        const checkRes = await client.query('SELECT lider_id FROM lideres WHERE persona_id = $1', [persona_id]);
        if (checkRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ ok: false, code: 'ALREADY_LIDER', message: 'La persona ya es líder' });
        }

        const codigoLider = `LDR-${Date.now().toString().slice(-6)}`;

        const insertQuery = `
            INSERT INTO lideres (persona_id, meta_cantidad, nivel_lider_id, estado_lider_id, lider_padre_id, codigo_lider)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [persona_id, meta_cantidad, nivel_lider_id, estado_lider_id, lider_padre_id || null, codigoLider];
        const insertRes = await client.query(insertQuery, values);

        await client.query('COMMIT');

        res.status(201).json({ ok: true, data: insertRes.rows[0], message: 'Líder creado exitosamente' });

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// GET /personas (Paginado + Filtros)
router.get('/personas', authenticate, async (req, res, next) => {
    try {
        const { q, sector_id, lider_id, estado_persona_id, page = 1, pageSize = 10 } = req.query;

        const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
        let values = [];
        let paramCount = 1;

        let basePath = `
            FROM personas p
            LEFT JOIN sectores s ON p.sector_id = s.sector_id
            LEFT JOIN (
                asignaciones a
                JOIN estado_asignacion ea ON a.estado_asignacion_id = ea.estado_asignacion_id AND ea.nombre = 'Activa'
            ) ON p.persona_id = a.persona_id
            LEFT JOIN lideres l ON a.lider_id = l.lider_id
            LEFT JOIN personas l_p ON l.persona_id = l_p.persona_id
            LEFT JOIN fuentes_captacion f ON a.fuente_id = f.fuente_id
            LEFT JOIN estado_persona ep ON p.estado_persona_id = ep.estado_persona_id
            WHERE 1=1
            AND p.cedula != '00000000001'
            AND p.persona_id != '00000000-0000-0000-0000-000000000001'
        `;

        // ── Multi-tenant: filtro por candidato_id ────────────────────────────
        // Super Admin (candidato_id nulo) → ve todo
        // Admin de candidato y demás roles → filtra por su candidato
        const candidatoIdPersonas = await getCandidatoId(req);
        if (candidatoIdPersonas) {
            basePath += ` AND p.candidato_id = $${paramCount}`;
            values.push(candidatoIdPersonas);
            paramCount++;
        }

        // ── RBAC Scope ────────────────────────────────────────────────────────
        // ADMIN        → sin filtro adicional (ya filtrado por candidato si aplica)
        // COORDINADOR  → ve todas las personas de su candidato (sin filtro de árbol)
        // SUB_LIDER    → solo personas asignadas a su árbol de líderes
        const rolePersonas = req.user.rol_nombre;
        if (rolePersonas === 'SUB_LIDER') {
            if (!req.user.lider_id) {
                basePath += ' AND 1=0'; // Sin lider_id asignado → no ve nada
            } else {
                const treeIds = await getLiderTree(req.user.lider_id);
                basePath += ` AND a.lider_id = ANY($${paramCount})`;
                values.push(treeIds);
                paramCount++;
            }
        } else if (rolePersonas !== 'ADMIN' && rolePersonas !== 'COORDINADOR') {
            // Rol no reconocido: sin acceso
            basePath += ' AND 1=0';
        }

        if (q) {
            basePath += ` AND (p.nombres ILIKE $${paramCount} OR p.apellidos ILIKE $${paramCount} OR p.cedula ILIKE $${paramCount} OR p.telefono ILIKE $${paramCount})`;
            values.push(`%${q}%`);
            paramCount++;
        }
        if (sector_id) {
            basePath += ` AND p.sector_id = $${paramCount}`;
            values.push(sector_id);
            paramCount++;
        }
        if (lider_id) {
            // further narrow by specific lider_id (but must still be in scope)
            basePath += ` AND a.lider_id = $${paramCount}`;
            values.push(lider_id);
            paramCount++;
        }
        if (estado_persona_id) {
            basePath += ` AND p.estado_persona_id = $${paramCount}`;
            values.push(estado_persona_id);
            paramCount++;
        }

        const countQuery = `SELECT COUNT(DISTINCT p.persona_id) ` + basePath;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count, 10);

        const dataQuery = `
            SELECT
                p.persona_id, p.nombres, p.apellidos, p.cedula, p.telefono, p.email AS email_contacto, p.mesa,
                p.fecha_registro,
                s.nombre AS sector_nombre,
                l_p.nombres || ' ' || l_p.apellidos AS lider_nombre,
                COALESCE(f.nombre, 'Sistema') AS fuente_nombre,
                ep.estado_persona_id, ep.nombre AS estado_nombre
            ${basePath}
            ORDER BY p.fecha_registro DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        const dataValues = [...values, parseInt(pageSize, 10), offset];
        const dataResult = await pool.query(dataQuery, dataValues);

        res.json({
            ok: true,
            data: dataResult.rows,
            pagination: {
                total,
                page: parseInt(page, 10),
                pageSize: parseInt(pageSize, 10),
                totalPages: Math.ceil(total / parseInt(pageSize, 10)) || 1
            }
        });

    } catch (err) {
        next(err);
    }
});

// POST /lideres/crear (Transaccional — Modo EXISTENTE | NUEVO)
router.post('/lideres/crear', authenticate, async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { modo, persona_existente, persona_nueva, lider, usuario, candidato_id: bodyCandidata } = req.body;

        // ── 0. Resolver candidato_id ──────────────────────────────────────────
        const rolNormCaller = (req.user?.rol_nombre || '').toUpperCase().replace(/[-_\s]/g, '');
        const esAdminCaller = rolNormCaller === 'ADMIN' || rolNormCaller === 'SUPERADMIN';
        let resolvedCandidatoId;
        if (esAdminCaller) {
            if (!bodyCandidata) {
                return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'candidato_id es requerido' });
            }
            resolvedCandidatoId = bodyCandidata;
        } else {
            resolvedCandidatoId = req.user?.candidato_id || SUPER_ADMIN_CANDIDATO_ID;
        }

        // ── 1. Validar modo ───────────────────────────────────────────────────
        if (!modo || !['EXISTENTE', 'NUEVO'].includes(modo)) {
            return res.status(400).json({
                ok: false, code: 'VALIDATION_ERROR',
                message: 'El campo modo debe ser EXISTENTE o NUEVO'
            });
        }

        // ── 2. Validar campos según el modo ───────────────────────────────────
        if (modo === 'EXISTENTE') {
            if (!persona_existente?.persona_id) {
                return res.status(400).json({
                    ok: false, code: 'VALIDATION_ERROR',
                    message: 'persona_existente.persona_id es requerido en modo EXISTENTE',
                    details: ['persona_existente.persona_id']
                });
            }
        } else { // NUEVO
            const missing = [];
            if (!persona_nueva?.nombres) missing.push('persona_nueva.nombres');
            if (!persona_nueva?.apellidos) missing.push('persona_nueva.apellidos');
            if (!persona_nueva?.telefono) missing.push('persona_nueva.telefono');
            if (!persona_nueva?.sector_id) missing.push('persona_nueva.sector_id');
            if (missing.length > 0) {
                return res.status(400).json({
                    ok: false, code: 'VALIDATION_ERROR',
                    message: 'Faltan campos obligatorios de la persona nueva',
                    details: missing
                });
            }
        }

        // ── 3. Validar líder ──────────────────────────────────────────────────
        if (!lider?.nivel_lider_id || !lider?.estado_lider_id) {
            return res.status(400).json({
                ok: false, code: 'VALIDATION_ERROR',
                message: 'nivel_lider_id y estado_lider_id son requeridos',
                details: [...(!lider?.nivel_lider_id ? ['lider.nivel_lider_id'] : []), ...(!lider?.estado_lider_id ? ['lider.estado_lider_id'] : [])]
            });
        }
        const metaCantidad = (lider.meta_cantidad == null || lider.meta_cantidad < 1) ? 10 : lider.meta_cantidad;

        // ── 4. Validar usuario (si aplica) ────────────────────────────────────
        if (usuario?.crear) {
            const rolParaLogin = usuario.rol_nombre || 'Sub-Líder';
            // 'Sub-Líder' (con acento) y sus variantes usan cédula como login
            const usaCedula = ['Lider', 'Sub-Lider', 'Sub-Líder', 'SUB_LIDER', 'SUBLIDER'].includes(rolParaLogin)
                || rolParaLogin.toUpperCase().replace(/[-_\s]/g,'').includes('LIDER');
            if (!usuario.email_login && !usuario.username && !usaCedula) {
                return res.status(400).json({
                    ok: false, code: 'VALIDATION_ERROR',
                    message: 'Debe proveer email_login o username para crear el usuario'
                });
            }
        }

        await client.query('BEGIN');

        let personaData; // { persona_id, nombres, apellidos, ... }

        if (modo === 'EXISTENTE') {
            // ── 5A. Verificar que la persona existe y pertenece al candidato ──
            const personaCheck = await client.query(
                `SELECT p.persona_id, p.nombres, p.apellidos, p.cedula, p.telefono, p.email,
                        p.sector_id, p.notas, p.fecha_registro, p.estado_persona_id, p.mesa
                 FROM personas p WHERE p.persona_id = $1 AND p.candidato_id = $2`,
                [persona_existente.persona_id, resolvedCandidatoId]
            );
            if (personaCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    ok: false, code: 'PERSONA_NOT_FOUND',
                    message: 'La persona no existe en su registro de candidato'
                });
            }
            personaData = personaCheck.rows[0];

        } else { // NUEVO
            // ── 5B. Verificar duplicados (teléfono / cédula) dentro del candidato ──
            let dupQ = 'SELECT telefono, cedula FROM personas WHERE (telefono = $1';
            let dupVals = [persona_nueva.telefono];
            if (persona_nueva.cedula) {
                dupQ += ' OR (cedula IS NOT NULL AND cedula = $2)';
                dupVals.push(persona_nueva.cedula);
            }
            dupQ += ') AND candidato_id = $' + (dupVals.length + 1);
            dupVals.push(resolvedCandidatoId);
            
            const dupRes = await client.query(dupQ, dupVals);
            if (dupRes.rows.length > 0) {
                await client.query('ROLLBACK');
                const hasPhone = dupRes.rows.some(r => r.telefono === persona_nueva.telefono);
                const hasCedula = persona_nueva.cedula && dupRes.rows.some(r => r.cedula === persona_nueva.cedula);
                if (hasPhone) return res.status(409).json({ ok: false, code: 'DUPLICATE_PHONE', message: 'El teléfono ya está registrado ante este candidato' });
                if (hasCedula) return res.status(409).json({ ok: false, code: 'DUPLICATE_CEDULA', message: 'La cédula ya está registrada ante este candidato' });
            }

            // ── 5C. Insertar persona nueva vinculada al candidato ──────────────
            const estPersRes = await client.query(
                "SELECT estado_persona_id FROM estado_persona WHERE nombre = 'Activo' LIMIT 1"
            );
            const estadoPersonaId = estPersRes.rows[0]?.estado_persona_id;

            const personaIns = await client.query(
                `INSERT INTO personas (nombres, apellidos, cedula, telefono, email, sector_id, notas, estado_persona_id, mesa, candidato_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [
                    persona_nueva.nombres, persona_nueva.apellidos,
                    persona_nueva.cedula || null, persona_nueva.telefono,
                    persona_nueva.email || null, persona_nueva.sector_id,
                    persona_nueva.notas || null, estadoPersonaId, persona_nueva.mesa || null,
                    resolvedCandidatoId
                ]
            );
            personaData = personaIns.rows[0];
        }

        // ── 6. Verificar que la persona NO sea ya un líder ────────────────────
        const liderCheck = await client.query(
            'SELECT lider_id FROM lideres WHERE persona_id = $1', [personaData.persona_id]
        );
        if (liderCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                ok: false, code: 'ALREADY_LIDER',
                message: 'Esta persona ya es líder'
            });
        }

        // ── 7. Insertar en lideres ────────────────────────────────────────────
        const codigoLider = lider.codigo_lider || `LDR-${Date.now().toString().slice(-6)}`;
        const candidatoId = resolvedCandidatoId;
        const liderIns = await client.query(
            `INSERT INTO lideres (persona_id, meta_cantidad, nivel_lider_id, estado_lider_id, lider_padre_id, codigo_lider, candidato_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                personaData.persona_id, metaCantidad,
                lider.nivel_lider_id, lider.estado_lider_id,
                lider.lider_padre_id || null, codigoLider, candidatoId
            ]
        );
        const liderCreated = liderIns.rows[0];

        // ── 8. (Opcional) Crear usuario ───────────────────────────────────────
        let usuarioCreated = null;
        let password_temporal = null;

        if (usuario?.crear) {
            // Verificar que la persona no tenga ya un usuario
            const userCheck = await client.query(
                'SELECT usuario_id FROM usuarios WHERE persona_id = $1', [personaData.persona_id]
            );
            if (userCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    ok: false, code: 'USER_ALREADY_EXISTS',
                    message: 'Esta persona ya tiene un acceso de usuario'
                });
            }

            // Lookup rol — tolerante a acentos y variantes (Sub-Líder / Sub-Lider)
            const rolNombre = usuario.rol_nombre || 'Sub-Líder';
            const rolRes = await client.query(
                `SELECT rol_id FROM roles
                 WHERE nombre = $1
                    OR nombre ILIKE $2
                    OR LOWER(REPLACE(REPLACE(nombre,'í','i'),'é','e')) = LOWER(REPLACE(REPLACE($1,'í','i'),'é','e'))
                 LIMIT 1`,
                [rolNombre, 'Sub-L_der']
            );
            if (rolRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ ok: false, code: 'ROL_NOT_FOUND', message: `Rol "${rolNombre}" no encontrado` });
            }

            // Lookup estado_usuario
            const estadoNombre = usuario.estado_usuario_nombre || 'Activo';
            const estadoURes = await client.query(
                'SELECT estado_usuario_id FROM estado_usuario WHERE nombre = $1 LIMIT 1', [estadoNombre]
            );
            if (estadoURes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ ok: false, code: 'ESTADO_NOT_FOUND', message: `Estado "${estadoNombre}" no encontrado` });
            }

            // Password — si no se provee ninguno, usar 'Clave1234!' como defecto
            let plainPassword = usuario.password || null;
            if (usuario.generar_password_temporal) {
                password_temporal = generateTempPassword();
                plainPassword = password_temporal;
            }
            if (!plainPassword) {
                plainPassword = 'Clave1234!';
            }
            const password_hash = await bcrypt.hash(plainPassword, 12);

            // Para Sub-Lider: login = cédula (como username), no email_login
            // Esto evita colisiones con el campo email_login único
            const esRolCedula = ['Sub-Líder', 'Sub-Lider', 'Lider', 'SUB_LIDER', 'SUBLIDER'].includes(rolNombre)
                || rolNombre.toUpperCase().replace(/[-_\s]/g,'').includes('LIDER');
            let emailLoginFinal = null;
            let usernameFinal = usuario.username || null;

            if (esRolCedula) {
                // Sub-Líder usa cédula como username — no email_login
                if (!personaData.cedula && !usernameFinal) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        ok: false, code: 'VALIDATION_ERROR',
                        message: 'No se pudo determinar el login: la persona no tiene cédula registrada y no se proveyó username'
                    });
                }
                usernameFinal = usernameFinal || personaData.cedula;
            } else {
                emailLoginFinal = usuario.email_login || null;
                if (!emailLoginFinal && !usernameFinal) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        ok: false, code: 'VALIDATION_ERROR',
                        message: 'Debe proveer email_login o username para crear el acceso de usuario'
                    });
                }
            }

            // Verificar que el login no esté en uso
            const loginCheck = await client.query(
                'SELECT usuario_id FROM usuarios WHERE (username = $1 AND $1 IS NOT NULL) OR (email_login = $2 AND $2 IS NOT NULL) LIMIT 1',
                [usernameFinal, emailLoginFinal]
            );
            if (loginCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    ok: false, code: 'DUPLICATE_LOGIN',
                    message: esRolCedula
                        ? `Ya existe un usuario con la cédula "${usernameFinal}" como login`
                        : `El email o username "${emailLoginFinal || usernameFinal}" ya está en uso`
                });
            }

            const candidatoIdForUser = resolvedCandidatoId;
            const userIns = await client.query(
                `INSERT INTO usuarios (persona_id, email_login, username, password_hash, rol_id, estado_usuario_id, candidato_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING usuario_id, persona_id, email_login, username`,
                [
                    personaData.persona_id,
                    emailLoginFinal,
                    usernameFinal,
                    password_hash,
                    rolRes.rows[0].rol_id,
                    estadoURes.rows[0].estado_usuario_id,
                    candidatoIdForUser
                ]
            );
            usuarioCreated = userIns.rows[0];
        }

        await client.query('COMMIT');

        // Enviar correo de bienvenida si se generó contraseña temporal
        if (usuarioCreated && usuarioCreated.email_login && password_temporal) {
            sendWelcomeEmail(usuarioCreated.email_login, personaData.nombres, password_temporal)
                .catch(err => console.error("Error enviando welcome email:", err));
        }

        const responseData = {
            modo,
            persona_id: personaData.persona_id,
            lider_id: liderCreated.lider_id,
            usuario_id: usuarioCreated?.usuario_id || null,
            persona: personaData,
            lider: liderCreated
        };
        if (usuarioCreated) {
            responseData.usuario = {
                usuario_id: usuarioCreated.usuario_id,
                email_login: usuarioCreated.email_login,
                username: usuarioCreated.username
            };
            if (password_temporal) responseData.usuario.password_temporal = password_temporal;
        }

        return res.status(201).json({ ok: true, data: responseData, message: 'Líder creado exitosamente' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[POST /lideres/crear] Error:', err.message, '\nStack:', err.stack);
        if (err.code === '23505') {
            // Determinar qué campo está duplicado por el nombre del constraint
            let dupMessage = 'El email_login o username ya está en uso';
            if (err.constraint?.includes('telefono')) dupMessage = 'El teléfono ya está registrado';
            else if (err.constraint?.includes('cedula')) dupMessage = 'La cédula ya está registrada';
            return res.status(409).json({ ok: false, code: 'DUPLICATE', message: dupMessage });
        }
        if (err.code === '23502') {
            // NOT NULL constraint — campo faltante
            return res.status(400).json({ ok: false, code: 'MISSING_FIELD', message: `Campo requerido faltante en la base de datos: ${err.column || err.message}` });
        }
        return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: err.message });
    } finally {
        client.release();
    }
});

// GET /personas/buscar?q= — Búsqueda rápida
router.get('/personas/buscar', authenticate, async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length === 0) {
            return res.json({ ok: true, data: [] });
        }
        const term = `%${q.trim()}%`;
        
        let scopeClause = '';
        let scopeValues = [];
        if (req.user.rol_nombre !== 'ADMIN') {
            const treeIds = await getLiderTree(req.user.lider_id);
            scopeClause = ' AND (EXISTS (SELECT 1 FROM asignaciones a2 WHERE a2.persona_id = p.persona_id AND a2.lider_id = ANY($3)))';
            scopeValues = [treeIds];
        }

        const result = await pool.query(
            `SELECT
                p.persona_id,
                p.nombres || ' ' || p.apellidos AS nombre_completo,
                p.telefono,
                p.cedula,
                s.nombre AS sector_nombre,
                EXISTS (SELECT 1 FROM lideres l WHERE l.persona_id = p.persona_id) AS is_lider
             FROM personas p
             LEFT JOIN sectores s ON p.sector_id = s.sector_id
             WHERE
                (p.nombres    ILIKE $1 OR
                p.apellidos  ILIKE $1 OR
                (p.nombres || ' ' || p.apellidos) ILIKE $1 OR
                p.telefono   ILIKE $1 OR
                p.cedula     ILIKE $1)
                ${scopeClause}
             ORDER BY
                CASE
                    WHEN (p.nombres || ' ' || p.apellidos) ILIKE $2 THEN 0
                    WHEN p.telefono  ILIKE $2 THEN 1
                    WHEN p.cedula    ILIKE $2 THEN 2
                    ELSE 3
                END,
                p.nombres, p.apellidos
             LIMIT 20`,
            [term, q.trim(), ...scopeValues]
        );
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

router.get('/personas/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;

        // ── RBAC Scope ────────────────────────────────────────────────────
        const rolNormP = (req.user?.rol_nombre || '').toUpperCase().replace(/[-_\s]/g, '');

        if (rolNormP === 'COORDINADOR') {
            // Coordinador: solo personas de su candidato
            const candidatoScope = await getCandidatoId(req);
            if (candidatoScope) {
                const check = await pool.query(
                    'SELECT 1 FROM personas WHERE persona_id = $1 AND candidato_id = $2 LIMIT 1',
                    [id, candidatoScope]
                );
                if (check.rows.length === 0) {
                    return res.status(403).json({ ok: false, code: 'FORBIDDEN_SCOPE', message: 'No tienes acceso a esta persona' });
                }
            }
        } else if (rolNormP !== 'ADMIN') {
            // Sub-Líder: verificar árbol de líderes
            const treeIds = await getLiderTree(req.user.lider_id);
            const assignCheck = await pool.query(
                `SELECT 1 FROM asignaciones a
                 WHERE a.persona_id = $1 AND a.lider_id = ANY($2)
                 LIMIT 1`,
                [id, treeIds]
            );
            if (assignCheck.rows.length === 0) {
                return res.status(403).json({
                    ok: false, code: 'FORBIDDEN_SCOPE',
                    message: 'No tienes acceso a esta persona'
                });
            }
        }
        // ADMIN: sin filtro

        // ── 1. Persona base (sin joins que dupliquen filas) ──────────────────
        const personaQuery = `
            SELECT 
                p.persona_id, p.nombres, p.apellidos, p.cedula, p.telefono,
                p.email AS email_contacto, p.fecha_registro, p.notas,
                p.sector_id,
                s.nombre AS sector_nombre,
                ep.estado_persona_id, ep.nombre AS estado_nombre
            FROM personas p
            LEFT JOIN sectores s  ON p.sector_id       = s.sector_id
            LEFT JOIN estado_persona ep ON p.estado_persona_id = ep.estado_persona_id
            WHERE p.persona_id = $1
        `;
        const personaResult = await pool.query(personaQuery, [id]);

        if (personaResult.rows.length === 0) {
            return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Persona no encontrada' });
        }
        const persona = personaResult.rows[0];

        // ── 2. Líder relacionado (si existe) ─────────────────────────────────
        const liderQuery = `
            SELECT
                l.lider_id, l.meta_cantidad, l.codigo_lider, l.lider_padre_id,
                el.estado_lider_id, el.nombre AS estado_lider_nombre,
                nl.nivel_lider_id, nl.nombre AS nivel_lider_nombre
            FROM lideres l
            JOIN estado_lider el ON l.estado_lider_id = el.estado_lider_id
            JOIN nivel_lider  nl ON l.nivel_lider_id  = nl.nivel_lider_id
            WHERE l.persona_id = $1
            LIMIT 1
        `;
        const liderResult = await pool.query(liderQuery, [id]);
        const liderRow = liderResult.rows[0] || null;
        const liderData = liderRow ? {
            lider_id: liderRow.lider_id,
            meta_cantidad: liderRow.meta_cantidad,
            codigo_lider: liderRow.codigo_lider,
            lider_padre_id: liderRow.lider_padre_id,
            estado_lider: { id: liderRow.estado_lider_id, nombre: liderRow.estado_lider_nombre },
            nivel_lider: { id: liderRow.nivel_lider_id, nombre: liderRow.nivel_lider_nombre }
        } : null;

        // ── 3. Usuario relacionado (si existe) ───────────────────────────────
        const usuarioQuery = `
            SELECT
                u.usuario_id, u.username, u.email_login,
                r.rol_id, r.nombre AS rol_nombre,
                eu.estado_usuario_id, eu.nombre AS estado_usuario_nombre
            FROM usuarios u
            JOIN roles         r  ON u.rol_id           = r.rol_id
            JOIN estado_usuario eu ON u.estado_usuario_id = eu.estado_usuario_id
            WHERE u.persona_id = $1
            LIMIT 1
        `;
        const usuarioResult = await pool.query(usuarioQuery, [id]);
        const usuarioRow = usuarioResult.rows[0] || null;
        const usuarioData = usuarioRow ? {
            usuario_id: usuarioRow.usuario_id,
            username: usuarioRow.username,
            email_login: usuarioRow.email_login,
            rol: { id: usuarioRow.rol_id, nombre: usuarioRow.rol_nombre },
            estado_usuario: { id: usuarioRow.estado_usuario_id, nombre: usuarioRow.estado_usuario_nombre }
        } : null;

        // ── 4. Asignación activa ─────────────────────────────────────────────
        const activeAssignmentQuery = `
            SELECT 
                a.asignacion_id, a.fecha_asignacion,
                l_p.nombres || ' ' || l_p.apellidos AS lider_nombre,
                f.nombre AS fuente_nombre
            FROM asignaciones a
            JOIN estado_asignacion ea ON a.estado_asignacion_id = ea.estado_asignacion_id
                AND ea.nombre = 'Activa'
            JOIN lideres l ON a.lider_id = l.lider_id
            JOIN personas l_p ON l.persona_id = l_p.persona_id
            LEFT JOIN fuentes_captacion f ON a.fuente_id = f.fuente_id
            WHERE a.persona_id = $1
            LIMIT 1
        `;
        const activeResult = await pool.query(activeAssignmentQuery, [id]);
        const asignacion_activa = activeResult.rows[0] || null;

        // ── 5. Historial de asignaciones ─────────────────────────────────────
        const historyQuery = `
            SELECT 
                a.asignacion_id, a.fecha_asignacion,
                l_p.nombres || ' ' || l_p.apellidos AS lider_nombre,
                ea.nombre AS estado_asignacion_nombre,
                f.nombre AS fuente_nombre
            FROM asignaciones a
            JOIN estado_asignacion ea ON a.estado_asignacion_id = ea.estado_asignacion_id
            JOIN lideres l ON a.lider_id = l.lider_id
            JOIN personas l_p ON l.persona_id = l_p.persona_id
            LEFT JOIN fuentes_captacion f ON a.fuente_id = f.fuente_id
            WHERE a.persona_id = $1
            ORDER BY a.fecha_asignacion DESC
        `;
        const historyResult = await pool.query(historyQuery, [id]);

        res.json({
            ok: true,
            data: {
                persona,
                flags: {
                    is_lider: liderData !== null,
                    is_usuario: usuarioData !== null
                },
                lider: liderData,
                usuario: usuarioData,
                asignacion_activa,
                historial_asignaciones: historyResult.rows
            }
        });
    } catch (err) {
        next(err);
    }
});

// PUT /personas/:id
router.put('/personas/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const rolNorm = (req.user?.rol_nombre || '').toUpperCase().replace(/[-_\s]/g, '');

        // ── RBAC Scope ────────────────────────────────────────────────────
        if (rolNorm === 'COORDINADOR') {
            const candidatoScope = await getCandidatoId(req);
            if (candidatoScope) {
                const check = await pool.query(
                    'SELECT 1 FROM personas WHERE persona_id = $1 AND candidato_id = $2 LIMIT 1',
                    [id, candidatoScope]
                );
                if (check.rows.length === 0) {
                    return res.status(403).json({ ok: false, code: 'FORBIDDEN_SCOPE', message: 'No tienes acceso a esta persona' });
                }
            }
        } else if (rolNorm !== 'ADMIN' && rolNorm !== 'SUPERADMIN') {
            const treeIds = await getLiderTree(req.user.lider_id);
            const assignCheck = await pool.query(
                `SELECT 1 FROM asignaciones a
                 WHERE a.persona_id = $1 AND a.lider_id = ANY($2) LIMIT 1`,
                [id, treeIds]
            );
            if (assignCheck.rows.length === 0) {
                return res.status(403).json({ ok: false, code: 'FORBIDDEN_SCOPE', message: 'No tienes acceso a esta persona' });
            }
        }

        // ── Verificar que la persona existe ───────────────────────────────
        const exists = await pool.query('SELECT persona_id FROM personas WHERE persona_id = $1', [id]);
        if (exists.rows.length === 0) {
            return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Persona no encontrada' });
        }

        // ── Construir UPDATE dinámico ─────────────────────────────────────
        const { nombres, apellidos, cedula, telefono, email, sector_id, mesa, notas, estado_persona_id } = req.body;
        
        const updates = [];
        const values = [];
        let idx = 1;

        if (nombres    !== undefined) { updates.push(`nombres = $${idx++}`);    values.push(nombres.trim()); }
        if (apellidos  !== undefined) { updates.push(`apellidos = $${idx++}`);  values.push(apellidos.trim()); }
        if (cedula     !== undefined) { updates.push(`cedula = $${idx++}`);     values.push(cedula?.trim() || null); }
        if (telefono   !== undefined) { updates.push(`telefono = $${idx++}`);   values.push(telefono.trim()); }
        if (email      !== undefined) { updates.push(`email = $${idx++}`);      values.push(email?.trim() || null); }
        if (sector_id  !== undefined) { updates.push(`sector_id = $${idx++}`);  values.push(sector_id || null); }
        if (mesa       !== undefined) { updates.push(`mesa = $${idx++}`);       values.push(mesa?.trim() || null); }
        if (notas      !== undefined) { updates.push(`notas = $${idx++}`);      values.push(notas?.trim() || null); }
        if (estado_persona_id !== undefined) { updates.push(`estado_persona_id = $${idx++}`); values.push(estado_persona_id); }

        if (updates.length === 0) {
            return res.status(400).json({ ok: false, message: 'No se enviaron campos para actualizar' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE personas SET ${updates.join(', ')} WHERE persona_id = $${idx} RETURNING *`,
            values
        );

        return res.json({ ok: true, data: result.rows[0], message: 'Persona actualizada correctamente' });
    } catch (err) {
        console.error('[PUT /personas/:id] error:', err.message);
        // Unique constraint: teléfono o cédula duplicados
        if (err.code === '23505') {
            const field = err.constraint?.includes('telefono') ? 'teléfono' : 'cédula';
            return res.status(409).json({ ok: false, code: 'DUPLICATE', message: `El ${field} ya está registrado por otra persona` });
        }
        return res.status(500).json({ ok: false, message: err.message });
    }
});

// POST /personas/:id/convertir-lider
router.post('/personas/:id/convertir-lider', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { meta_cantidad, sector_id, nivel_lider_id, lider_padre_id } = req.body;
        const candidatoId = await getCandidatoId(req);

        const personaRes = await pool.query('SELECT * FROM personas WHERE persona_id = $1', [id]);
        if (!personaRes.rows[0]) {
            return res.status(404).json({ ok: false, message: 'Persona no encontrada' });
        }
        const persona = personaRes.rows[0];

        const existeLider = await pool.query('SELECT lider_id FROM lideres WHERE persona_id = $1', [id]);
        if (existeLider.rows[0]) {
            return res.status(400).json({ ok: false, message: 'Esta persona ya es líder' });
        }

        const estadoRes = await pool.query(
            "SELECT estado_lider_id FROM estado_lider WHERE LOWER(nombre) ILIKE '%activo%' LIMIT 1"
        );
        const estadoLiderId = estadoRes.rows[0]?.estado_lider_id;

        let nivelId = nivel_lider_id;
        if (!nivelId) {
            const nivelRes = await pool.query('SELECT nivel_lider_id FROM nivel_lider ORDER BY nivel_lider_id LIMIT 1');
            nivelId = nivelRes.rows[0]?.nivel_lider_id;
        }

        const codigoLider = `LDR-${Date.now().toString().slice(-6)}`;
        const liderRes = await pool.query(
            `INSERT INTO lideres (persona_id, meta_cantidad, codigo_lider, estado_lider_id, nivel_lider_id, lider_padre_id, fecha_inicio, candidato_id)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
             RETURNING *`,
            [id, meta_cantidad || 10, codigoLider,
             estadoLiderId, nivelId, lider_padre_id || null,
             candidatoId || '00000000-0000-0000-0000-000000000001']
        );

        res.json({
            ok: true,
            data: liderRes.rows[0],
            message: `${persona.nombres} ${persona.apellidos} ahora es líder`
        });
    } catch (err) {
        console.error('[POST /personas/:id/convertir-lider]', err.message);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── MILITANCIA ────────────────────────────────────────────────────────────────
router.get('/militancia', authenticate, async (req, res) => {
    try {
        const candidatoId = await getCandidatoId(req);
        const { search, estado, page = 1, pageSize = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        let conditions = [];
        let params = [];
        let i = 1;
        if (candidatoId) { conditions.push(`m.candidato_id = $${i++}`); params.push(candidatoId); }
        if (search) { conditions.push(`(p.nombres ILIKE $${i} OR p.apellidos ILIKE $${i} OR p.cedula ILIKE $${i})`); params.push(`%${search}%`); i++; }
        if (estado) { conditions.push(`m.estado = $${i++}`); params.push(estado); }
        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const query = `SELECT m.*, p.nombres||' '||p.apellidos as nombre_completo, p.cedula, p.telefono, s.nombre as sector
                       FROM militancia m
                       JOIN personas p ON m.persona_id = p.persona_id
                       LEFT JOIN sectores s ON p.sector_id = s.sector_id
                       ${where} ORDER BY m.fecha_afiliacion DESC
                       LIMIT $${i} OFFSET $${i+1}`;
        params.push(parseInt(pageSize), offset);
        const countQuery = `SELECT COUNT(*) FROM militancia m JOIN personas p ON m.persona_id = p.persona_id ${where}`;
        const [result, count] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, params.slice(0, -2))
        ]);
        res.json({ ok: true, data: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), pageSize: parseInt(pageSize) });
    } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
});

router.post('/militancia', authenticate, async (req, res) => {
    try {
        const { persona_id, estado = 'Activo', numero_carnet, fecha_afiliacion, observaciones } = req.body;
        const candidatoId = await getCandidatoId(req) || '00000000-0000-0000-0000-000000000001';
        const existe = await pool.query('SELECT militancia_id FROM militancia WHERE persona_id = $1', [persona_id]);
        if (existe.rows[0]) return res.status(400).json({ ok: false, message: 'Esta persona ya está registrada en militancia' });
        const result = await pool.query(
            'INSERT INTO militancia (persona_id, candidato_id, estado, numero_carnet, fecha_afiliacion, observaciones) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [persona_id, candidatoId, estado, numero_carnet || null, fecha_afiliacion || new Date().toISOString().split('T')[0], observaciones || null]
        );
        res.json({ ok: true, data: result.rows[0] });
    } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
});

router.put('/militancia/:id', authenticate, async (req, res) => {
    try {
        const { estado, numero_carnet, observaciones } = req.body;
        const result = await pool.query(
            'UPDATE militancia SET estado=$1, numero_carnet=$2, observaciones=$3 WHERE militancia_id=$4 RETURNING *',
            [estado, numero_carnet, observaciones, req.params.id]
        );
        res.json({ ok: true, data: result.rows[0] });
    } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
});

router.delete('/militancia/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM militancia WHERE militancia_id = $1', [req.params.id]);
        res.json({ ok: true, message: 'Registro eliminado' });
    } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
});

// GET /usuarios/lista
router.get('/usuarios/lista', authenticate, async (req, res) => {
    try {
        const isSuperAdmin = req.user?.candidato_id === '00000000-0000-0000-0000-000000000001';
        let query, params;
        if (isSuperAdmin) {
            query = `SELECT u.usuario_id, p.nombres||' '||p.apellidos as nombre_completo,
                     p.cedula, u.email_login, u.username, r.nombre as rol_nombre,
                     c.nombre as candidato,
                     CASE WHEN eu.nombre ILIKE '%activo%' THEN true ELSE false END as activo
                     FROM usuarios u
                     JOIN personas p ON u.persona_id = p.persona_id
                     JOIN roles r ON u.rol_id = r.rol_id
                     LEFT JOIN candidatos c ON u.candidato_id = c.candidato_id
                     LEFT JOIN estado_usuario eu ON u.estado_usuario_id = eu.estado_usuario_id
                     ORDER BY c.nombre, r.nombre, p.apellidos`;
            params = [];
        } else {
            query = `SELECT u.usuario_id, p.nombres||' '||p.apellidos as nombre_completo,
                     p.cedula, u.email_login, u.username, r.nombre as rol_nombre,
                     c.nombre as candidato,
                     CASE WHEN eu.nombre ILIKE '%activo%' THEN true ELSE false END as activo
                     FROM usuarios u
                     JOIN personas p ON u.persona_id = p.persona_id
                     JOIN roles r ON u.rol_id = r.rol_id
                     LEFT JOIN candidatos c ON u.candidato_id = c.candidato_id
                     LEFT JOIN estado_usuario eu ON u.estado_usuario_id = eu.estado_usuario_id
                     WHERE u.candidato_id = $1
                     ORDER BY r.nombre, p.apellidos`;
            params = [req.user.candidato_id];
        }
        const result = await pool.query(query, params);
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        console.error('[GET /usuarios/lista]', err.message);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// POST /api/usuarios — Crear acceso (usuario) para una persona
router.post('/usuarios', async (req, res, next) => {
    const client = await pool.connect();
    try {
        const {
            persona_id,
            email_login,
            username,
            password,
            generar_password_temporal = false,
            rol_nombre,
            estado_usuario_nombre = 'Activo'
        } = req.body;

        // ── Validaciones ────────────────────────────────────────────────────
        if (!persona_id) {
            return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'persona_id es obligatorio' });
        }
        if (!rol_nombre) {
            return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'rol_nombre es obligatorio' });
        }
        const esRolCedula = ['Lider', 'Sub-Lider', 'Sub-Líder', 'Coordinador'].includes(rol_nombre) || rol_nombre?.toUpperCase().includes('LIDER') || rol_nombre?.toUpperCase().includes('COORD');
        if (!email_login && !username && !esRolCedula) {
            return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'Debe proveer al menos email_login o username' });
        }

        await client.query('BEGIN');

        // ── Verificar que la persona existe ──────────────────────────────────
        const personaCheck = await client.query(
            'SELECT persona_id, cedula FROM personas WHERE persona_id = $1', [persona_id]
        );
        if (personaCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, code: 'PERSONA_NOT_FOUND', message: 'La persona no existe' });
        }
        const personaCedula = personaCheck.rows[0].cedula;

        // ── Verificar que no existe ya un usuario para esta persona ──────────
        const userCheck = await client.query(
            'SELECT usuario_id FROM usuarios WHERE persona_id = $1', [persona_id]
        );
        if (userCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ ok: false, code: 'USER_ALREADY_EXISTS', message: 'Esta persona ya tiene un acceso de usuario' });
        }

        // ── Lookup rol ──────────────────────────────────────────────────────
        const rolRes = await client.query(
            'SELECT rol_id, nombre FROM roles WHERE nombre = $1 LIMIT 1', [rol_nombre]
        );
        if (rolRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ ok: false, code: 'ROL_NOT_FOUND', message: `Rol "${rol_nombre}" no encontrado` });
        }
        const { rol_id, nombre: rolNombre } = rolRes.rows[0];

        // ── Lookup estado_usuario ────────────────────────────────────────────
        const estadoRes = await client.query(
            'SELECT estado_usuario_id, nombre FROM estado_usuario WHERE nombre = $1 LIMIT 1', [estado_usuario_nombre]
        );
        if (estadoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ ok: false, code: 'ESTADO_NOT_FOUND', message: `Estado "${estado_usuario_nombre}" no encontrado` });
        }
        const { estado_usuario_id, nombre: estadoNombre } = estadoRes.rows[0];

        // ── Password ────────────────────────────────────────────────────────
        let password_temporal = null;
        let plainPassword = password || null;

        if (generar_password_temporal) {
            password_temporal = generateTempPassword();
            plainPassword = password_temporal;
        }

        if (!plainPassword) plainPassword = 'Clave1234!';
        const password_hash = await bcrypt.hash(plainPassword, 10);

        // Para Lider/Sub-Lider sin email_login ni username, usar cédula como login
        const emailLoginFinal = email_login || (esRolCedula ? personaCedula : null);
        if (!emailLoginFinal && !username) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                ok: false, code: 'VALIDATION_ERROR',
                message: 'No se pudo determinar el login: la persona no tiene cédula registrada'
            });
        }

        // ── Insertar usuario ────────────────────────────────────────────────
        const candidatoId = await getCandidatoId(req);
        const insertQuery = `
            INSERT INTO usuarios
                (persona_id, email_login, username, password_hash, rol_id, estado_usuario_id, candidato_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING usuario_id, persona_id, email_login, username
        `;
        const insertRes = await client.query(insertQuery, [
            persona_id,
            emailLoginFinal,
            username || null,
            password_hash,
            rol_id,
            estado_usuario_id,
            candidatoId
        ]);
        const creado = insertRes.rows[0];

        await client.query('COMMIT');

        const responseData = {
            usuario_id: creado.usuario_id,
            persona_id: creado.persona_id,
            login: creado.email_login || creado.username,
            rol: { nombre: rolNombre },
            estado_usuario: { nombre: estadoNombre }
        };
        if (password_temporal) {
            responseData.password_temporal = password_temporal;
        }

        return res.status(201).json({ ok: true, data: responseData });

    } catch (err) {
        await client.query('ROLLBACK');
        // Unique constraint on email_login / username
        if (err.code === '23505') {
            return res.status(409).json({ ok: false, code: 'DUPLICATE_LOGIN', message: 'El email_login o username ya está en uso' });
        }
        next(err);
    } finally {
        client.release();
    }
});

// POST /api/usuarios/:usuario_id/reset-password
router.post('/usuarios/:usuario_id/reset-password', async (req, res, next) => {
    try {
        const { usuario_id } = req.params;
        const { generar_password_temporal = true } = req.body;

        if (!generar_password_temporal) {
            return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'generar_password_temporal debe ser true' });
        }

        // Verificar que el usuario existe
        const checkRes = await pool.query(
            'SELECT usuario_id FROM usuarios WHERE usuario_id = $1', [usuario_id]
        );
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Usuario no encontrado' });
        }

        const password_temporal = generateTempPassword();
        const password_hash = await bcrypt.hash(password_temporal, 12);

        await pool.query(
            'UPDATE usuarios SET password_hash = $1 WHERE usuario_id = $2',
            [password_hash, usuario_id]
        );

        return res.json({
            ok: true,
            data: { usuario_id, password_temporal }
        });

    } catch (err) {
        next(err);
    }
});

// POST /api/usuarios/reset-by-cedula  — Reset contraseña buscando por cédula de persona
router.post('/usuarios/reset-by-cedula', authenticate, async (req, res, next) => {
    try {
        const rolNorm = (req.user?.rol_nombre || '').toUpperCase().replace(/[-_\s]/g, '');
        if (rolNorm !== 'ADMIN') {
            return res.status(403).json({ ok: false, message: 'Solo el administrador puede resetear contraseñas' });
        }

        const { cedula } = req.body;
        if (!cedula || !cedula.trim()) {
            return res.status(400).json({ ok: false, message: 'La cédula es requerida' });
        }

        const userRes = await pool.query(
            `SELECT u.usuario_id FROM usuarios u
             JOIN personas p ON u.persona_id = p.persona_id
             JOIN estado_usuario eu ON u.estado_usuario_id = eu.estado_usuario_id
             WHERE p.cedula = $1 AND LOWER(eu.nombre) = 'activo'
             LIMIT 1`,
            [cedula.trim()]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ ok: false, message: 'No existe usuario activo con esa cédula' });
        }

        const usuario_id = userRes.rows[0].usuario_id;
        const password_default = 'Clave1234!';
        const password_hash = await bcrypt.hash(password_default, 10);

        await pool.query(
            'UPDATE usuarios SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE usuario_id = $2',
            [password_hash, usuario_id]
        );

        return res.json({ ok: true, message: 'Contraseña restablecida a Clave1234!' });

    } catch (err) {
        next(err);
    }
});

// POST /lideres/hierarchy
// Crea un nuevo líder bajo un padre, validando la profundidad jerárquica
router.post('/lideres/hierarchy', authenticate, async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { 
            modo = 'NUEVO', // 'NUEVO' | 'EXISTENTE'
            persona_existente,
            persona_nueva,
            lider_padre_id, 
            meta_cantidad = 10,
            usuario
        } = req.body;

        // 1. Validaciones básicas de jerarquía
        if (!lider_padre_id) {
            return res.status(400).json({ ok: false, message: 'lider_padre_id es obligatorio' });
        }

        // ── RBAC Scope ───────────────────────────────────────────────────────
        const allowed = await checkLiderInScope(lider_padre_id, req, res);
        if (!allowed) return;

        await client.query('BEGIN');

        // 2. Determinar Nivel — siempre Sub-Líder al crear por jerarquía
        const subLiderLevelRes = await client.query(
            "SELECT nivel_lider_id FROM nivel_lider WHERE LOWER(nombre) ILIKE '%sub%' ORDER BY nombre LIMIT 1"
        );
        if (!subLiderLevelRes.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(500).json({ ok: false, message: 'Nivel Sub-Líder no encontrado en catálogo' });
        }
        const nextLevel = subLiderLevelRes.rows[0];

        let persona_id;
        let nombres_notif = '';

        if (modo === 'EXISTENTE') {
            if (!persona_existente?.persona_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ ok: false, message: 'persona_id requerido para EXISTENTE' });
            }
            persona_id = persona_existente.persona_id;
            const pCheck = await client.query('SELECT nombres FROM personas WHERE persona_id = $1 AND candidato_id = $2', [persona_id, req.user.candidato_id]);
            if (pCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ ok: false, message: 'Persona no existe' });
            }
            nombres_notif = pCheck.rows[0].nombres;
        } else {
            // NUEVO
            if (!persona_nueva?.nombres || !persona_nueva?.telefono || !persona_nueva?.sector_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ ok: false, message: 'Faltan campos de la persona' });
            }
            // Dup check within candidate scope
            const dRes = await client.query('SELECT persona_id FROM personas WHERE (telefono = $1 OR (cedula IS NOT NULL AND cedula = $2)) AND candidato_id = $3', [persona_nueva.telefono, persona_nueva.cedula || '', req.user.candidato_id]);
            if (dRes.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ ok: false, message: 'Persona duplicada para este candidato' });
            }

            const estPRes = await client.query("SELECT estado_persona_id FROM estado_persona WHERE nombre = 'Activo' LIMIT 1");
            const insP = await client.query(
                `INSERT INTO personas (nombres, apellidos, cedula, telefono, email, sector_id, estado_persona_id, fecha_registro, candidato_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8) RETURNING persona_id`,
                [persona_nueva.nombres, persona_nueva.apellidos, persona_nueva.cedula || null, persona_nueva.telefono, persona_nueva.email || null, persona_nueva.sector_id, estPRes.rows[0].estado_persona_id, req.user.candidato_id]
            );
            persona_id = insP.rows[0].persona_id;
            nombres_notif = persona_nueva.nombres;
        }

        // 5. Crear el Líder vinculado
        const estLidRes = await client.query("SELECT estado_lider_id FROM estado_lider WHERE nombre = 'Activo' LIMIT 1");
        const codigoLider = `LDR-${Date.now().toString().slice(-6)}`;
        
        const liderRes = await client.query(
            `INSERT INTO lideres (persona_id, meta_cantidad, codigo_lider, estado_lider_id, nivel_lider_id, lider_padre_id, fecha_inicio, candidato_id)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7) RETURNING *`,
            [persona_id, meta_cantidad, codigoLider, estLidRes.rows[0].estado_lider_id, nextLevel.nivel_lider_id, lider_padre_id, req.user.candidato_id]
        );
        
        const liderCreated = liderRes.rows[0];

        // 6. (Opcional) Crear usuario ───────────────────────────────────────
        let usuarioCreated = null;

        if (usuario?.crear) {
            // Verificar que no tenga ya un usuario
            const userCheck = await client.query(
                'SELECT usuario_id FROM usuarios WHERE persona_id = $1', [persona_id]
            );
            if (userCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    ok: false, code: 'USER_ALREADY_EXISTS',
                    message: 'Esta persona ya tiene acceso al sistema'
                });
            }

            // Obtener cédula de la persona para usarla como login
            const cedRes = await client.query(
                'SELECT cedula FROM personas WHERE persona_id = $1', [persona_id]
            );
            const cedula = cedRes.rows[0]?.cedula;
            if (!cedula) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    ok: false, code: 'NO_CEDULA',
                    message: 'La persona no tiene cédula registrada — no se puede crear el acceso. Registra la cédula primero.'
                });
            }

            // Normalizar cédula: quitar guiones y espacios para usar como username
            const cedulaLogin = cedula.replace(/[-\s]/g, '');

            // Verificar que la cédula no esté ya en uso como username
            const loginCheck = await client.query(
                'SELECT usuario_id FROM usuarios WHERE username = $1 LIMIT 1', [cedulaLogin]
            );
            if (loginCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    ok: false, code: 'DUPLICATE_LOGIN',
                    message: `Ya existe un usuario con la cédula "${cedulaLogin}" como login`
                });
            }

            // Lookup rol
            const rolNombre = usuario.rol_nombre || 'Sub-Líder';
            const rolRes = await client.query(
                "SELECT rol_id FROM roles WHERE nombre = $1 OR nombre = 'Sub-Líder' LIMIT 1", [rolNombre]
            );
            if (rolRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ ok: false, code: 'ROL_NOT_FOUND', message: `Rol "${rolNombre}" no encontrado` });
            }

            // Lookup estado_usuario
            const estadoURes = await client.query(
                "SELECT estado_usuario_id FROM estado_usuario WHERE nombre = 'Activo' LIMIT 1"
            );
            if (estadoURes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ ok: false, code: 'ESTADO_NOT_FOUND', message: 'Estado Activo no encontrado' });
            }

            // Contraseña inicial fija
            const password_hash = await bcrypt.hash('Clave1234!', 10);

            const userIns = await client.query(
                `INSERT INTO usuarios (persona_id, email_login, username, password_hash, rol_id, estado_usuario_id, candidato_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING usuario_id, persona_id, username`,
                [
                    persona_id,
                    null,           // email_login vacío — login es por cédula (username)
                    cedulaLogin,    // username = cédula sin guiones ni espacios
                    password_hash,
                    rolRes.rows[0].rol_id,
                    estadoURes.rows[0].estado_usuario_id,
                    req.user.candidato_id
                ]
            );
            usuarioCreated = userIns.rows[0];
        }

        await client.query('COMMIT');

        const resData = {
            ok: true,
            data: {
                lider_id: liderCreated.lider_id,
                persona_id: persona_id,
                usuario: usuarioCreated ? {
                    usuario_id: usuarioCreated.usuario_id,
                    username: usuarioCreated.username
                } : null
            },
            message: `Nuevo líder creado exitosamente. Nivel asignado: ${nextLevel.nombre}`
        };

        res.status(201).json(resData);

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
});

// ─── CANDIDATOS ───────────────────────────────────────────────────────────────
// GET /candidatos - Lista todos los candidatos (solo ADMIN ve todos)
router.get('/candidatos', authenticate, async (req, res, next) => {
  try {
    const SUPER_ADMIN_CANDIDATO_ID = '00000000-0000-0000-0000-000000000001';
    const isSuperAdmin = req.user?.candidato_id === SUPER_ADMIN_CANDIDATO_ID;
    let query, values;
    if (isSuperAdmin) {
      // Super Admin ve TODOS los candidatos
      query = 'SELECT candidato_id, nombre, descripcion, activo, fecha_creacion FROM candidatos ORDER BY fecha_creacion';
      values = [];
    } else {
      // Admin de candidato específico ve SOLO su candidato
      query = 'SELECT candidato_id, nombre, descripcion, activo, fecha_creacion FROM candidatos WHERE candidato_id = $1';
      values = [req.user.candidato_id];
    }
    const result = await pool.query(query, values);
    res.json({ ok: true, data: result.rows });
  } catch (err) { next(err); }
});

// POST /candidatos - Crear candidato (solo ADMIN)
router.post('/candidatos', authenticate, async (req, res, next) => {
  try {
    if (req.user?.rol_nombre !== 'ADMIN') {
      return res.status(403).json({ ok: false, code: 'FORBIDDEN', message: 'Solo el Admin puede crear candidatos' });
    }
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ ok: false, message: 'nombre es requerido' });
    const result = await pool.query(
      'INSERT INTO candidatos (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), descripcion?.trim() || null]
    );
    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /candidatos/:id - Editar candidato (solo ADMIN)
router.put('/candidatos/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user?.rol_nombre !== 'ADMIN') {
      return res.status(403).json({ ok: false, code: 'FORBIDDEN', message: 'Solo el Admin puede editar candidatos' });
    }
    const { nombre, descripcion, activo } = req.body;
    const result = await pool.query(
      `UPDATE candidatos SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        activo = COALESCE($3, activo)
       WHERE candidato_id = $4 RETURNING *`,
      [nombre?.trim() || null, descripcion?.trim() || null, activo ?? null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ ok: false, message: 'Candidato no encontrado' });
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /candidatos/:id/admin - Crear usuario admin para un candidato (solo SUPER ADMIN)
router.post('/candidatos/:id/admin', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (req.user?.rol_nombre !== 'ADMIN') {
      return res.status(403).json({ ok: false, code: 'FORBIDDEN', message: 'Solo el Admin puede crear admins de candidato' });
    }
    const { nombres, apellidos, cedula, telefono, email_login, password } = req.body;
    if (!nombres || !apellidos || !telefono || !email_login || !password) {
      return res.status(400).json({ ok: false, message: 'nombres, apellidos, telefono, email_login y password son requeridos' });
    }
    await client.query('BEGIN');
    // Verificar que el candidato existe
    const candCheck = await client.query('SELECT candidato_id FROM candidatos WHERE candidato_id = $1', [req.params.id]);
    if (candCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Candidato no encontrado' });
    }
    // Obtener sector y estado por defecto
    const sectorRes = await client.query('SELECT sector_id FROM sectores LIMIT 1');
    const estadoPersonaRes = await client.query("SELECT estado_persona_id FROM estado_persona WHERE nombre = 'Activo' LIMIT 1");
    const rolRes = await client.query("SELECT rol_id FROM roles WHERE nombre = 'Admin' LIMIT 1");
    const estadoUsuarioRes = await client.query("SELECT estado_usuario_id FROM estado_usuario WHERE nombre = 'Activo' LIMIT 1");
    // Crear persona vinculada al candidato
    const personaRes = await client.query(
      `INSERT INTO personas (nombres, apellidos, cedula, telefono, sector_id, estado_persona_id, candidato_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombres, apellidos, cedula || null, telefono, sectorRes.rows[0].sector_id, estadoPersonaRes.rows[0].estado_persona_id, req.params.id]
    );
    const persona = personaRes.rows[0];
    // Crear usuario admin con candidato_id
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 12);
    const usuarioRes = await client.query(
      `INSERT INTO usuarios (persona_id, email_login, password_hash, rol_id, estado_usuario_id, candidato_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING usuario_id, email_login`,
      [persona.persona_id, email_login, hash, rolRes.rows[0].rol_id, estadoUsuarioRes.rows[0].estado_usuario_id, req.params.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ ok: true, data: { usuario: usuarioRes.rows[0], persona } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /roles — retorna solo los roles asignables a líderes (Coordinador y Sub-Lider)
router.get('/roles', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (nombre) rol_id, nombre FROM roles
       WHERE nombre IN ('Coordinador', 'Sub-Lider')
       ORDER BY nombre, rol_id`
    );
    res.json({ ok: true, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
