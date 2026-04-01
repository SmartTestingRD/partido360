const { Pool } = require('pg');
require('dotenv').config();

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function cleanUp() {
  console.log('=== F5: Limpieza de Datos para Producción ===\n');
  const providerEmail = 'ejguerrero@smarttestingrd.com';
  
  try {
    await p.query('SET search_path TO partido360');

    // 1. Obtener IDs del usuario proveedor para protegerlos
    const userRes = await p.query('SELECT usuario_id, persona_id FROM usuarios WHERE email_login = $1', [providerEmail]);
    if (userRes.rows.length === 0) {
      console.error(`ERROR: No se encontró el usuario ${providerEmail}.`);
      return;
    }
    const providerUserId = userRes.rows[0].usuario_id;
    const providerPersonaId = userRes.rows[0].persona_id;

    console.log(`- Protegiendo usuario: ${providerEmail}`);

    // 2. Limpieza de tablas dependientes
    console.log('- Limpiando datos operativos y de prueba...');
    await p.query('DELETE FROM asignaciones');
    await p.query('DELETE FROM participacion_evento');
    await p.query('DELETE FROM eventos');
    await p.query('DELETE FROM duplicados_detectados');
    await p.query('DELETE FROM bitacora_cambios');
    await p.query('DELETE FROM password_resets');
    await p.query('DELETE FROM lideres');

    // 3. Limpieza de usuarios (excepto proveedor)
    console.log('- Eliminando otros usuarios...');
    await p.query('DELETE FROM usuarios WHERE usuario_id != $1', [providerUserId]);

    // 4. Limpieza de personas (excepto proveedor)
    console.log('- Eliminando otras personas...');
    await p.query('DELETE FROM personas WHERE persona_id != $1', [providerPersonaId]);

    // 5. Carga de nuevos sectores para mostrar
    console.log('- Agregando nuevos sectores...');
    const nuevosSectores = [
      'Naco', 'Piantini', 'Evaristo Morales', 'Bella Vista', 'Arroyo Hondo',
      'Haina', 'San Cristóbal Centro', 'Santiago de los Caballeros',
      'La Romana', 'Punta Cana', 'Bavaro', 'Boca Chica', 'San Isidro',
      'Herrera', 'Los Mina', 'San Carlos', 'Gazcue', 'Ciudad Nueva',
      'Zona Colonial', 'Gualey', 'Capotillo', 'Manganagua'
    ];

    for (const sector of nuevosSectores) {
      await p.query('INSERT INTO sectores (nombre) VALUES ($1) ON CONFLICT DO NOTHING', [sector]);
    }

    console.log('\n=== LIMPIEZA COMPLETADA CON ÉXITO ===');
    console.log(`Quedó activo: ${providerEmail}`);
    console.log(`Sectores cargados: ${nuevosSectores.length + 5} en total.`);

  } catch (e) {
    console.error('\nERROR DURANTE LA LIMPIEZA:', e.message);
  } finally {
    await p.end();
  }
}

cleanUp();
