/**
 * Scope Helper — árbol de líderes (CTE recursivo)
 *
 * REGLA CRÍTICA: root_lider_id para LIDER SIEMPRE viene de req.user.lider_id
 * (resuelto en middleware/auth.js), NUNCA de un parámetro de request del cliente.
 *
 * Roles canónicos esperados en req.user.rol_nombre: 'ADMIN' | 'COORDINADOR' | 'LIDER'
 */
const { pool } = require('../config/db');

const LIDER_TREE_CTE = `
WITH RECURSIVE lider_tree AS (
    SELECT lider_id
    FROM lideres
    WHERE lider_id = $1
    UNION ALL
    SELECT l.lider_id
    FROM lideres l
    JOIN lider_tree lt ON l.lider_padre_id = lt.lider_id
)
SELECT lider_id FROM lider_tree
`;

/**
 * getScopeLeaderIds(root_lider_id, clientOrPool?)
 * Alias semántico de getLiderTree — nombre que el spec usa.
 * Devuelve string[] con todos los lider_id del árbol descendente (incluye root).
 */
async function getScopeLeaderIds(root_lider_id, clientOrPool = pool) {
    const result = await clientOrPool.query(LIDER_TREE_CTE, [root_lider_id]);
    return result.rows.map(r => r.lider_id);
}

// Alias para compatibilidad con código existente
const getLiderTree = getScopeLeaderIds;

/**
 * buildLiderScope(req, values, paramCount)
 * Inyecta un filtro " AND l.lider_id = ANY($N)" para rol LIDER.
 * Para ADMIN y COORDINADOR devuelve scopeClause vacío (ven todo).
 *
 * Usa req.user.lider_id (resuelto en auth middleware — no del cliente).
 */
async function buildLiderScope(req, values = [], paramCount = 1) {
    const role = req.user?.rol_nombre; // 'ADMIN' | 'COORDINADOR' | 'LIDER'

    if (role === 'ADMIN' || role === 'COORDINADOR') {
        return { scopeClause: '', values, paramCount, treeIds: null };
    }

    // LIDER — root_lider_id siempre de req.user, nunca del request
    const treeIds = await getScopeLeaderIds(req.user.lider_id);
    const scopeClause = ` AND l.lider_id = ANY($${paramCount})`;
    values.push(treeIds);
    paramCount++;

    return { scopeClause, values, paramCount, treeIds };
}

/**
 * checkLiderInScope(lider_id_param, req, res)
 * Verifica que un lider_id concreto pertenezca al scope del usuario.
 * Devuelve true si pasa, false si envió 403 (caller debe hacer return).
 */
async function checkLiderInScope(lider_id_param, req, res) {
    const role = req.user?.rol_nombre;
    if (role === 'ADMIN' || role === 'COORDINADOR') return true;

    // LIDER — verificar contra su árbol
    const treeIds = await getScopeLeaderIds(req.user.lider_id);
    if (!treeIds.includes(lider_id_param)) {
        res.status(403).json({
            ok: false,
            code: 'FORBIDDEN_SCOPE',
            message: 'No tienes acceso a este líder'
        });
        return false;
    }
    return true;
}

module.exports = { getScopeLeaderIds, getLiderTree, buildLiderScope, checkLiderInScope };
