require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedLideres() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("Recopilando catálogos...");

        // Fetch required IDs
        const sectorRes = await client.query('SELECT sector_id FROM sectores LIMIT 3');
        const sectores = sectorRes.rows;

        const estadoPersonaRes = await client.query("SELECT estado_persona_id FROM estado_persona WHERE nombre = 'Activo'");
        const estadoPersonaId = estadoPersonaRes.rows[0].estado_persona_id;

        const estadoLiderRes = await client.query("SELECT estado_lider_id, nombre FROM estado_lider");
        const estadosLider = estadoLiderRes.rows;
        const estadoLiderActivo = estadosLider.find(e => e.nombre === 'Activo')?.estado_lider_id || estadosLider[0].estado_lider_id;
        const estadoLiderPendiente = estadosLider.find(e => e.nombre === 'Pendiente')?.estado_lider_id || estadosLider[0].estado_lider_id;

        const nivelLiderRes = await client.query("SELECT nivel_lider_id, nombre FROM nivel_lider");
        const nivelesLider = nivelLiderRes.rows;

        const estadoAsignacionRes = await client.query("SELECT estado_asignacion_id FROM estado_asignacion WHERE nombre = 'Activa'");
        const estadoAsignacionId = estadoAsignacionRes.rows[0].estado_asignacion_id;

        const fuenteRes = await client.query("SELECT fuente_id FROM fuentes_captacion LIMIT 1");
        const fuenteId = fuenteRes.rows[0].fuente_id;

        // Mock data
        const nuevosLideres = [
            { nombres: 'Carlos', apellidos: 'Mendoza', cedula: '001-0000001-1', telefono: '809-555-1001', meta: 50, nivel: nivelesLider.find(n => n.nombre === 'Coordinador')?.nivel_lider_id || nivelesLider[0].nivel_lider_id, estado: estadoLiderActivo },
            { nombres: 'Laura', apellidos: 'Jiménez', cedula: '001-0000002-2', telefono: '829-555-1002', meta: 20, nivel: nivelesLider.find(n => n.nombre === 'Enlace')?.nivel_lider_id || nivelesLider[0].nivel_lider_id, estado: estadoLiderActivo },
            { nombres: 'Miguel', apellidos: 'Rosario', cedula: '001-0000003-3', telefono: '849-555-1003', meta: 100, nivel: nivelesLider.find(n => n.nombre === 'Coordinador')?.nivel_lider_id || nivelesLider[0].nivel_lider_id, estado: estadoLiderActivo },
            { nombres: 'Carmen', apellidos: 'Sánchez', cedula: '001-0000004-4', telefono: '809-555-1004', meta: 30, nivel: nivelesLider.find(n => n.nombre === 'Activista')?.nivel_lider_id || nivelesLider[0].nivel_lider_id, estado: estadoLiderPendiente },
            { nombres: 'Roberto', apellidos: 'Guzmán', cedula: '001-0000005-5', telefono: '829-555-1005', meta: 10, nivel: nivelesLider.find(n => n.nombre === 'Activista')?.nivel_lider_id || nivelesLider[0].nivel_lider_id, estado: estadoLiderActivo },
        ];

        console.log("Insertando líderes...");
        for (let i = 0; i < nuevosLideres.length; i++) {
            const data = nuevosLideres[i];
            const sectorId = sectores[i % sectores.length]?.sector_id || sectores[0].sector_id;

            // Insert Persona
            const personaRes = await client.query(`
                INSERT INTO personas (nombres, apellidos, cedula, telefono, sector_id, estado_persona_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (telefono) DO NOTHING
                RETURNING persona_id
            `, [data.nombres, data.apellidos, data.cedula, data.telefono, sectorId, estadoPersonaId]);

            if (personaRes.rows.length === 0) {
                console.log(`Lider ${data.telefono} ya existe, saltando...`);
                continue;
            }
            const personaId = personaRes.rows[0].persona_id;

            // Insert Lider
            const liderRes = await client.query(`
                INSERT INTO lideres (persona_id, meta_cantidad, estado_lider_id, nivel_lider_id)
                VALUES ($1, $2, $3, $4)
                RETURNING lider_id
            `, [personaId, data.meta, data.estado, data.nivel]);
            const liderId = liderRes.rows[0].lider_id;

            // Let's add some mock assignments to show progress bars in the UI
            // First leader: 110% (superada), Second: 45%, Third: 10%, Fourth: 0%, Fifth: 100%
            let assignCount = 0;
            if (i === 0) assignCount = 55; // 110% of 50
            if (i === 1) assignCount = 9;  // 45% of 20
            if (i === 2) assignCount = 10; // 10% of 100
            if (i === 3) assignCount = 0;  // 0% of 30
            if (i === 4) assignCount = 10; // 100% of 10

            console.log(`Generando ${assignCount} reclutamientos para ${data.nombres}...`);
            for (let j = 0; j < assignCount; j++) {
                // Insert random persona
                const rndSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const pRes = await client.query(`
                    INSERT INTO personas (nombres, apellidos, telefono, sector_id, estado_persona_id)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING persona_id
                `, [`Votante ${j}`, `De ${data.nombres}`, `000-${i}${j}-${rndSuffix}`, sectorId, estadoPersonaId]);

                await client.query(`
                    INSERT INTO asignaciones (lider_id, persona_id, fuente_id, estado_asignacion_id)
                    VALUES ($1, $2, $3, $4)
                 `, [liderId, pRes.rows[0].persona_id, fuenteId, estadoAsignacionId]);
            }
        }

        await client.query('COMMIT');
        console.log("✅ Datos de prueba insertados exitosamente.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Error insertando datos:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedLideres();
