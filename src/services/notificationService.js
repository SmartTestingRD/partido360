const { sendGoalAchievedEmail } = require('./emailService');

/**
 * Revisa el progreso del líder y envía correo si la meta acaba de ser lograda (count === meta)
 * @param {Object} pool Conexión a DB
 * @param {string} lider_id UUID del lider
 */
async function checkAndNotifyGoalAchievement(pool, liderId) {
    if (!liderId) return;

    try {
        // Query to get current leader progress and info
        const liderRes = await pool.query(
            `SELECT l.lider_id, l.meta_cantidad, l.lider_padre_id,
                    u.email_login, p.nombres || ' ' || p.apellidos AS nombre_completo,
                    (SELECT COUNT(*) FROM asignaciones a WHERE a.lider_id = l.lider_id AND a.estado_asignacion_id = (SELECT estado_asignacion_id FROM estado_asignacion WHERE nombre = 'Activa' LIMIT 1)) AS activos
             FROM lideres l
             JOIN personas p ON l.persona_id = p.persona_id
             LEFT JOIN usuarios u ON u.persona_id = p.persona_id
             WHERE l.lider_id = $1`,
            [liderId]
        );

        if (liderRes.rows.length === 0) return;

        const liderData = liderRes.rows[0];
        const meta = parseInt(liderData.meta_cantidad, 10);
        const count = parseInt(liderData.activos, 10);

        if (meta > 0 && count === meta) {
            const porcentaje = (count / meta) * 100;
            const emailsToNotify = [];

            // Add leader email if valid
            if (liderData.email_login) {
                emailsToNotify.push({ email: liderData.email_login, nombre: liderData.nombre_completo });
            }

            // check for leader parent
            if (liderData.lider_padre_id) {
                const padreRes = await pool.query(
                    `SELECT u.email_login, p.nombres || ' ' || p.apellidos AS nombre_completo
                     FROM lideres l
                     JOIN personas p ON l.persona_id = p.persona_id
                     LEFT JOIN usuarios u ON u.persona_id = p.persona_id
                     WHERE l.lider_id = $1`,
                    [liderData.lider_padre_id]
                );

                if (padreRes.rows.length > 0 && padreRes.rows[0].email_login) {
                    emailsToNotify.push({ email: padreRes.rows[0].email_login, nombre: padreRes.rows[0].nombre_completo });
                }
            }

            // Send emails concurrently
            for (const remitente of emailsToNotify) {
                // Fire and forget
                sendGoalAchievedEmail(remitente.email, remitente.nombre, porcentaje, meta).catch(e => console.error("Goal email failed:", e));
            }
        }
    } catch (err) {
        console.error('Error checking goal achievement:', err);
    }
}

module.exports = {
    checkAndNotifyGoalAchievement
};
