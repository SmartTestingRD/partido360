/**
 * Scope Helper — árbol de líderes (CTE recursivo)
 *
 * REGLA CRÍTICA: root_lider_id para SUB_LIDER SIEMPRE viene de req.user.lider_id
 * (resuelto en middleware/auth.js), NUNCA de un parámetro de request del cliente.
 *
 * Roles canónicos esperados en req.user.rol_nombre: 'ADMIN' | 'COORDINADOR' | 'SUB_LIDER'
 */
const { pool } = require('../config/db');

const SUPER_ADMIN_CANDIDATO_ID = '00000000-0000-0000-0000-000000000001';

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
 * Inyecta filtros de Jerarquía y Candidato (Multi-tenant).
 *
 * Reglas:
 *   ADMIN        → sin filtro (ve todo)
 *   COORDINADOR  → solo filtro por candidato_id (ve todo dentro de su candidato)
 *   SUB_LIDER    → filtro por árbol descendente de su lider_id
 */
async function buildLiderScope(req, values = [], paramCount = 1) {
    const role = req.user?.rol_nombre;
    const lider_id = req.user?.lider_id;
    const candidato_id = req.user?.candidato_id;

    let scopeClause = "";

    // 1. Filtrar por Candidato (todos los roles excepto Super Admin)
    if (candidato_id && candidato_id !== SUPER_ADMIN_CANDIDATO_ID) {
        scopeClause += ` AND l.candidato_id = $${paramCount}`;
        values.push(candidato_id);
        paramCount++;
    }

    // 2. Filtro de árbol jerárquico — solo para SUB_LIDER
    //    COORDINADOR ve todo su candidato sin restricción de árbol
    //    ADMIN no tiene ningún filtro adicional
    if (role === 'SUB_LIDER') {
        if (!lider_id) {
            scopeClause += ' AND 1=0'; // Sub-Líder sin lider_id asignado → no ve nada
        } else {
            const treeIds = await getScopeLeaderIds(lider_id);
            scopeClause += ` AND l.lider_id = ANY($${paramCount})`;
            values.push(treeIds);
            paramCount++;
        }
    } else if (role !== 'ADMIN' && role !== 'COORDINADOR') {
        // Rol desconocido no-admin: sin acceso
        scopeClause += ' AND 1=0';
    }

    return { scopeClause, values, paramCount };
}

/**
 * checkLiderInScope(lider_id_param, req, res)
 * Verifica que un lider_id concreto pertenezca al scope del usuario.
 * Devuelve true si pasa, false si envió 403 (caller debe hacer return).
 */
async function checkLiderInScope(lider_id_param, req, res) {
    const role = req.user?.rol_nombre;
    const user_lider_id = req.user?.lider_id;
    const candidato_id = req.user?.candidato_id;

    // Verificar candidato primero
    if (candidato_id) {
        const cCheck = await pool.query('SELECT candidato_id FROM lideres WHERE lider_id = $1', [lider_id_param]);
        if (cCheck.rows.length > 0 && cCheck.rows[0].candidato_id !== candidato_id) {
            res.status(403).json({ ok: false, code: 'FORBIDDEN_CANDIDATE', message: 'No tienes acceso a este candidato' });
            return false;
        }
    }

    if (role === 'ADMIN') return true;
    // COORDINADOR: accede a cualquier líder dentro de su candidato (ya verificado arriba)
    if (role === 'COORDINADOR') return true;

    // SUB_LIDER — verificar contra su árbol descendente
    if (!user_lider_id) {
        res.status(403).json({ ok: false, code: 'FORBIDDEN_SCOPE', message: 'No tienes acceso (sin lider_id)' });
        return false;
    }
    const treeIds = await getScopeLeaderIds(user_lider_id);
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
