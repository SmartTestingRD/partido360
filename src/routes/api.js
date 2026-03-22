const express = require('express');
const router = express.Router();
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

            // For simple tables where filtering applies differently
            let personaQueryBase = `FROM personas`;
            let personaFilter = '';
            let liderFilter = '';
            let asignacionFilter = '';
            let filterValues = [];

            if (role === 'LIDER') {
                const treeIds = await getScopeLeaderIds(req.user.lider_id);
                personaQueryBase = `FROM personas JOIN asignaciones a ON personas.persona_id = a.persona_id`;
                personaFilter = ` WHERE a.lider_id = ANY($1)`;
                liderFilter = ` WHERE l.lider_id = ANY($1)`;
                asignacionFilter = ` WHERE l.lider_id = ANY($1)`;
                filterValues = [treeIds];
            }

            // 1. Total Captadas
            const capQuery = await client.query(`SELECT COUNT(DISTINCT personas.persona_id) as total ${personaQueryBase} ${personaFilter}`, filterValues);
            const totalCaptadas = parseInt(capQuery.rows[0].total) || 0;

            // 2. Nuevos Hoy
            const hoyQuery = await client.query(`
                SELECT COUNT(DISTINCT personas.persona_id) as total 
                ${personaQueryBase}
                ${personaFilter ? personaFilter + ' AND' : 'WHERE'} DATE(personas.fecha_registro) = CURRENT_DATE
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
                ${role === 'LIDER' ? 'JOIN asignaciones a ON p.persona_id = a.persona_id' : ''}
                ${personaFilter}
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

// GET /lideres
router.get('/lideres', async (req, res, next) => {
    try {
        const query = `
      SELECT l.lider_id, p.nombres || ' ' || p.apellidos AS nombre_completo, l.meta_cantidad
      FROM lideres l
      JOIN personas p ON l.persona_id = p.persona_id
      JOIN estado_lider el ON l.estado_lider_id = el.estado_lider_id
      WHERE el.nombre = 'Activo'
    `;
        const result = await pool.query(query);
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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Checking duplicados de teléfono
        const phoneCheck = await client.query('SELECT persona_id FROM personas WHERE telefono = $1', [telefono]);
        if (phoneCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                ok: false,
                code: 'DUPLICATE_PHONE',
                message: 'Ya existe una persona con este teléfono'
            });
        }

        // Checking duplicados de cédula
        if (cedula && cedula !== '') {
            const cedulaCheck = await client.query('SELECT persona_id FROM personas WHERE cedula = $1', [cedula]);
            if (cedulaCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    ok: false,
                    code: 'DUPLICATE_CEDULA',
                    message: 'Ya existe una persona con esta cédula'
                });
            }
        }

        // Traer ID de estado "Activo" para persona
        const estadoPersonaRes = await client.query("SELECT estado_persona_id FROM estado_persona WHERE nombre = 'Activo'");
        const estadoPersonaId = estadoPersonaRes.rows[0].estado_persona_id;

        // Crear la persona
        const personaQuery = `
      INSERT INTO personas (nombres, apellidos, cedula, telefono, email, sector_id, notas, estado_persona_id, mesa)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
        const personaValues = [nombres, apellidos, cedula || null, telefono, email || null, sector_id, notas || null, estadoPersonaId, mesa || null];
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

        res.status(201).json({
            ok: true,
            data: {
                persona: nuevaPersona,
                asignacion: nuevaAsignacion
            }
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
    try {
        const { search, sector, estado, nivel, page = 1, pageSize = 10 } = req.query;

        const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

        // basePath contains only FROM + JOINs + WHERE (no SELECT) so it can be
        // reused by both the count query and the data query.
        let basePath = `
            FROM lideres l
            JOIN personas p ON l.persona_id = p.persona_id
            JOIN sectores s ON p.sector_id = s.sector_id
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

        const countQuery = `SELECT COUNT(DISTINCT l.lider_id) ${basePath}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count, 10);

        const dataQuery = `
            SELECT 
                l.lider_id,
                p.nombres,
                p.apellidos,
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
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        const dataValues = [...values, parseInt(pageSize, 10), offset];
        const result = await pool.query(dataQuery, dataValues);

        res.json({
            ok: true,
            data: result.rows,
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

// GET /lideres-resumen/export
router.get('/lideres-resumen/export', authenticate, async (req, res, next) => {
    try {
        const { search, sector, estado, nivel } = req.query;

        let basePath = `
            FROM lideres l
            JOIN personas p ON l.persona_id = p.persona_id
            JOIN sectores s ON p.sector_id = s.sector_id
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
        next(err);
    }
});

// GET /ultimo-registro
router.get('/ultimo-registro', async (req, res, next) => {
    try {
        const query = `
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
            ORDER BY p.fecha_registro DESC
            LIMIT 1
        `;
        const result = await pool.query(query);
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
router.put('/lideres/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { meta_cantidad, estado_lider_id, nivel_lider_id, lider_padre_id, nombres, apellidos, telefono, sector_id } = req.body;

        await pool.query('BEGIN');

        // RBAC Check
        if (req.user.rol_nombre === 'LIDER') {
            if (id !== req.user.lider_id) {
                await pool.query('ROLLBACK');
                return res.status(403).json({ ok: false, code: 'FORBIDDEN_SCOPE', message: 'Solo puedes editar tu propio perfil' });
            }
            if (estado_lider_id || nivel_lider_id || lider_padre_id !== undefined) {
                await pool.query('ROLLBACK');
                return res.status(403).json({ ok: false, code: 'FORBIDDEN_ACTION', message: 'Como líder no puedes modificar campos de estructura' });
            }
        }

        // 1. Update Persona if fields provided
        const personaUpdates = [];
        const personaValues = [];
        let pParamCount = 1;

        if (nombres) { personaUpdates.push(`nombres = $${pParamCount}`); personaValues.push(nombres); pParamCount++; }
        if (apellidos) { personaUpdates.push(`apellidos = $${pParamCount}`); personaValues.push(apellidos); pParamCount++; }
        if (telefono) { personaUpdates.push(`telefono = $${pParamCount}`); personaValues.push(telefono); pParamCount++; }
        if (sector_id !== undefined) { personaUpdates.push(`sector_id = $${pParamCount}`); personaValues.push(sector_id); pParamCount++; }

        if (personaUpdates.length > 0) {
            personaValues.push(id); // Using lider_id to find persona via JOIN or subquery
            const updatePersonaQuery = `
                UPDATE personas
                SET ${personaUpdates.join(', ')}
                WHERE persona_id = (SELECT persona_id FROM lideres WHERE lider_id = $${pParamCount})
            `;
            await pool.query(updatePersonaQuery, personaValues);
        }

        // 2. Update Líder
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (meta_cantidad !== undefined) {
            if (meta_cantidad < 1) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'meta_cantidad debe ser >= 1' });
            }
            updates.push(`meta_cantidad = $${paramCount}`);
            values.push(meta_cantidad);
            paramCount++;
        }
        if (estado_lider_id) { updates.push(`estado_lider_id = $${paramCount}`); values.push(estado_lider_id); paramCount++; }
        if (nivel_lider_id) { updates.push(`nivel_lider_id = $${paramCount}`); values.push(nivel_lider_id); paramCount++; }
        if (lider_padre_id !== undefined) { updates.push(`lider_padre_id = $${paramCount}`); values.push(lider_padre_id); paramCount++; }

        if (updates.length > 0) {
            values.push(id);
            const query = `UPDATE lideres SET ${updates.join(', ')} WHERE lider_id = $${paramCount} RETURNING *`;
            await pool.query(query, values);
        }

        await pool.query('COMMIT');
        res.json({ ok: true, message: 'Líder actualizado correctamente' });

    } catch (err) {
        next(err);
    }
});

// POST /lideres
router.post('/lideres', async (req, res, next) => {
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
        `;

        // ── RBAC Scope — para LIDER: solo personas de su árbol ──────────────
        if (req.user.rol_nombre === 'LIDER') {
            const treeIds = await getLiderTree(req.user.lider_id);
            basePath += ` AND a.lider_id = ANY($${paramCount})`;
            values.push(treeIds);
            paramCount++;
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
                ep.nombre AS estado_nombre
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
router.post('/lideres/crear', async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { modo, persona_existente, persona_nueva, lider, usuario } = req.body;

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
            if (!usuario.email_login && !usuario.username) {
                return res.status(400).json({
                    ok: false, code: 'VALIDATION_ERROR',
                    message: 'Debe proveer email_login o username para crear el usuario'
                });
            }
        }

        await client.query('BEGIN');

        let personaData; // { persona_id, nombres, apellidos, ... }

        if (modo === 'EXISTENTE') {
            // ── 5A. Verificar que la persona existe ───────────────────────────
            const personaCheck = await client.query(
                `SELECT p.persona_id, p.nombres, p.apellidos, p.cedula, p.telefono, p.email,
                        p.sector_id, p.notas, p.fecha_registro, p.estado_persona_id, p.mesa
                 FROM personas p WHERE p.persona_id = $1`,
                [persona_existente.persona_id]
            );
            if (personaCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    ok: false, code: 'PERSONA_NOT_FOUND',
                    message: 'La persona no existe'
                });
            }
            personaData = personaCheck.rows[0];

        } else { // NUEVO
            // ── 5B. Verificar duplicados (teléfono / cédula) ──────────────────
            let dupQ = 'SELECT telefono, cedula FROM personas WHERE telefono = $1';
            let dupVals = [persona_nueva.telefono];
            if (persona_nueva.cedula) {
                dupQ += ' OR (cedula IS NOT NULL AND cedula = $2)';
                dupVals.push(persona_nueva.cedula);
            }
            const dupRes = await client.query(dupQ, dupVals);
            if (dupRes.rows.length > 0) {
                await client.query('ROLLBACK');
                const hasPhone = dupRes.rows.some(r => r.telefono === persona_nueva.telefono);
                const hasCedula = persona_nueva.cedula && dupRes.rows.some(r => r.cedula === persona_nueva.cedula);
                if (hasPhone) return res.status(409).json({ ok: false, code: 'DUPLICATE_PHONE', message: 'El teléfono ya está registrado' });
                if (hasCedula) return res.status(409).json({ ok: false, code: 'DUPLICATE_CEDULA', message: 'La cédula ya está registrada' });
            }

            // ── 5C. Insertar persona nueva ────────────────────────────────────
            const estPersRes = await client.query(
                "SELECT estado_persona_id FROM estado_persona WHERE nombre = 'Activo' LIMIT 1"
            );
            const estadoPersonaId = estPersRes.rows[0]?.estado_persona_id;

            const personaIns = await client.query(
                `INSERT INTO personas (nombres, apellidos, cedula, telefono, email, sector_id, notas, estado_persona_id, mesa)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [
                    persona_nueva.nombres, persona_nueva.apellidos,
                    persona_nueva.cedula || null, persona_nueva.telefono,
                    persona_nueva.email || null, persona_nueva.sector_id,
                    persona_nueva.notas || null, estadoPersonaId, persona_nueva.mesa || null
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
        const liderIns = await client.query(
            `INSERT INTO lideres (persona_id, meta_cantidad, nivel_lider_id, estado_lider_id, lider_padre_id, codigo_lider)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                personaData.persona_id, metaCantidad,
                lider.nivel_lider_id, lider.estado_lider_id,
                lider.lider_padre_id || null, codigoLider
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

            // Lookup rol
            const rolNombre = usuario.rol_nombre || 'Lider';
            const rolRes = await client.query(
                'SELECT rol_id FROM roles WHERE nombre = $1 LIMIT 1', [rolNombre]
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

            // Password
            let plainPassword = usuario.password || null;
            if (usuario.generar_password_temporal) {
                password_temporal = generateTempPassword();
                plainPassword = password_temporal;
            }
            const password_hash = plainPassword ? await bcrypt.hash(plainPassword, 12) : null;

            const userIns = await client.query(
                `INSERT INTO usuarios (persona_id, email_login, username, password_hash, rol_id, estado_usuario_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING usuario_id, persona_id, email_login, username`,
                [
                    personaData.persona_id,
                    usuario.email_login || null,
                    usuario.username || null,
                    password_hash,
                    rolRes.rows[0].rol_id,
                    estadoURes.rows[0].estado_usuario_id
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
        if (err.code === '23505') {
            return res.status(409).json({ ok: false, code: 'DUPLICATE_LOGIN', message: 'El email_login o username ya está en uso' });
        }
        next(err);
    } finally {
        client.release();
    }
});

// GET /personas/buscar?q= — Búsqueda rápida (va ANTES de /personas/:id)
router.get('/personas/buscar', async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length === 0) {
            return res.json({ ok: true, data: [] });
        }
        const term = `%${q.trim()}%`;
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
                p.nombres    ILIKE $1 OR
                p.apellidos  ILIKE $1 OR
                (p.nombres || ' ' || p.apellidos) ILIKE $1 OR
                p.telefono   ILIKE $1 OR
                p.cedula     ILIKE $1
             ORDER BY
                CASE
                    WHEN (p.nombres || ' ' || p.apellidos) ILIKE $2 THEN 0
                    WHEN p.telefono  ILIKE $2 THEN 1
                    WHEN p.cedula    ILIKE $2 THEN 2
                    ELSE 3
                END,
                p.nombres, p.apellidos
             LIMIT 20`,
            [term, q.trim()]
        );
        res.json({ ok: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

router.get('/personas/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;

        // ── RBAC Scope — para LIDER: verificar que la persona está en su árbol
        if (req.user.rol_nombre === 'LIDER') {
            const treeIds = await getLiderTree(req.user.lider_id);
            const assignCheck = await pool.query(
                `SELECT 1 FROM asignaciones a
                 JOIN estado_asignacion ea ON a.estado_asignacion_id = ea.estado_asignacion_id
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
        if (!email_login && !username) {
            return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'Debe proveer al menos email_login o username' });
        }
        if (!rol_nombre) {
            return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: 'rol_nombre es obligatorio' });
        }

        await client.query('BEGIN');

        // ── Verificar que la persona existe ──────────────────────────────────
        const personaCheck = await client.query(
            'SELECT persona_id FROM personas WHERE persona_id = $1', [persona_id]
        );
        if (personaCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, code: 'PERSONA_NOT_FOUND', message: 'La persona no existe' });
        }

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

        let password_hash = null;
        if (plainPassword) {
            password_hash = await bcrypt.hash(plainPassword, 12);
        }

        // ── Insertar usuario ────────────────────────────────────────────────
        const insertQuery = `
            INSERT INTO usuarios
                (persona_id, email_login, username, password_hash, rol_id, estado_usuario_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING usuario_id, persona_id, email_login, username
        `;
        const insertRes = await client.query(insertQuery, [
            persona_id,
            email_login || null,
            username || null,
            password_hash,
            rol_id,
            estado_usuario_id
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

module.exports = router;
