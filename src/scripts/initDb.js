require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runSchema() {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log(`Leyendo script SQL de: ${schemaPath}`);

    try {
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Ejecutando script en la base de datos Neon...');
        await pool.query(sql);
        console.log('✅ Estructura de tablas (personas, lideres, asignaciones) creada correctamente.');
    } catch (error) {
        console.error('❌ Error al ejecutar el schema:', error);
    } finally {
        await pool.end();
    }
}

runSchema();
