/**
 * Authentication Middleware — JWT-based
 * Populates req.user with: { usuario_id, persona_id, rol_nombre, candidato_id, lider_id }
 *
 * rol_nombre is NORMALIZED to uppercase: 'ADMIN' | 'COORDINADOR' | 'LIDER'
 * so all scope checks can compare against these constants.
 *
 * Role mapping from DB values:
 *   'Admin'       → 'ADMIN'
 *   'Coordinador' → 'COORDINADOR'
 *   'Operador'    → 'COORDINADOR'  (legacy alias)
 *   'Lider'       → 'LIDER'
 */
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'partido360_dev_secret';

/** Normalize any DB role name to canonical uppercase constant */
function normalizeRole(dbRoleName) {
    const r = (dbRoleName || '').toLowerCase();
    if (r === 'admin') return 'ADMIN';
    if (r === 'coordinador' || r === 'operador') return 'COORDINADOR';
    if (r === 'lider') return 'LIDER';
    return dbRoleName.toUpperCase(); // fallback
}

/**
 * authenticate — verifica JWT, normaliza rol, y resuelve lider_id para LIDER.
 * Siempre pone req.user antes de llamar next().
 */
async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ ok: false, code: 'UNAUTHORIZED', message: 'Token requerido' });
    }

    const token = header.slice(7);
    let payload;
    try {
        payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ ok: false, code: 'TOKEN_INVALID', message: 'Token inválido o expirado' });
    }

    const rol_nombre = normalizeRole(payload.rol_nombre);

    req.user = {
        usuario_id:   payload.usuario_id,
        persona_id:   payload.persona_id,
        rol_nombre,                          // siempre 'ADMIN' | 'COORDINADOR' | 'LIDER'
        candidato_id: payload.candidato_id || null,
        lider_id:     null
    };

    // Para LIDER: resolver lider_id desde DB — NUNCA viene del cliente
    if (rol_nombre === 'LIDER') {
        try {
            const liderRes = await pool.query(
                'SELECT lider_id FROM lideres WHERE persona_id = $1 LIMIT 1',
                [payload.persona_id]
            );
            if (liderRes.rows.length === 0) {
                return res.status(403).json({
                    ok: false,
                    code: 'USER_NOT_LIDER',
                    message: 'Este usuario tiene rol LIDER pero no está registrado en la tabla lideres'
                });
            }
            req.user.lider_id = liderRes.rows[0].lider_id;
        } catch (err) {
            return next(err);
        }
    }

    next();
}

/**
 * requireRoles(['ADMIN','COORDINADOR']) — middleware factory.
 * Usa los nombres normalizados (uppercase).
 */
function requireRoles(allowed) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ ok: false, code: 'UNAUTHORIZED', message: 'No autenticado' });
        }
        if (!allowed.includes(req.user.rol_nombre)) {
            return res.status(403).json({
                ok: false,
                code: 'FORBIDDEN',
                message: `Rol '${req.user.rol_nombre}' no tiene acceso a esta acción`
            });
        }
        next();
    };
}

module.exports = { authenticate, requireRoles, normalizeRole, JWT_SECRET };
