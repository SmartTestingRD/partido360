const { Pool } = require('pg');
const { checkAndNotifyGoalAchievement } = require('../src/services/notificationService');
const emailService = require('../src/services/emailService');
require('dotenv').config();

// Mock sendMailWrapper to capture the HTML for inspection
const originalSend = emailService.sendGoalAchievedEmail;
emailService.sendGoalAchievedEmail = async (to, nombre, porcentaje, meta) => {
    console.log(`\n============================`);
    console.log(`Intercepted Goal Email to: ${to}`);
    console.log(`Name: ${nombre}, Progress: ${porcentaje}%, Meta: ${meta}`);
    console.log(`Calling original to trigger HTML generation...`);
    await originalSend(to, nombre, porcentaje, meta);
    console.log(`============================\n`);
};

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runGoalTest() {
    console.log('--- TESTING GOAL ACHIEVEMENT NOTIFICATIONS ---');
    try {
        // Find a random leader with meta > 0
        const liderRes = await pool.query(`SELECT lider_id, meta_cantidad FROM lideres WHERE meta_cantidad > 0 LIMIT 1`);
        if (liderRes.rows.length === 0) {
            console.log("No leaders with meta found.");
            process.exit(0);
        }

        const liderId = liderRes.rows[0].lider_id;
        console.log(`Testing with Lider ID: ${liderId}, Meta original: ${liderRes.rows[0].meta_cantidad}`);

        // Set their active count to exactly their meta_cantidad by updating meta_cantidad to match their active count
        // Or better yet, just mock the check directly by modifying the DB temporarily
        await pool.query('BEGIN');

        const countRes = await pool.query(
            `SELECT COUNT(*) as activos FROM asignaciones WHERE lider_id = $1 AND estado_asignacion_id = (SELECT estado_asignacion_id FROM estado_asignacion WHERE nombre = 'Activa' LIMIT 1)`,
            [liderId]
        );
        const activos = countRes.rows[0].activos;

        console.log(`Activos actuales: ${activos}`);

        // Temporarily set meta_cantidad = activos to trigger the "goal achieved" exact match
        if (activos > 0) {
            console.log(`Setting meta_cantidad to ${activos} to trigger goal met...`);
            await pool.query(`UPDATE lideres SET meta_cantidad = $1 WHERE lider_id = $2`, [activos, liderId]);

            await checkAndNotifyGoalAchievement(pool, liderId);
        } else {
            console.log("This leader has 0 active assignments, trying another approach...");
            // Force meta to 0 ? No, meta must be > 0. Let's just create an assignment.
        }

        // Esperar a que se resuelvan las promesas fire-and-forget
        await new Promise(resolve => setTimeout(resolve, 2000));

        await pool.query('ROLLBACK');
        console.log('Test completed and DB changes reverted.');

    } catch (e) {
        await pool.query('ROLLBACK');
        console.error(e);
    } finally {
        await pool.end();
    }
}

runGoalTest();
