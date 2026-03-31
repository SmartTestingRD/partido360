require('dotenv').config();
const { Pool } = require('pg');

// Configuración recomendada para Neon DB usando pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ── Schema dedicado ──────────────────────────────────────────────────────────
// Partido360 usa su propio schema para no pisar tablas de otros proyectos
// que comparten la misma BD de Neon (HR, saya_agro, etc.)
// El pooler de Neon no soporta search_path en la URL, así que lo seteamos aquí.
pool.on('connect', (client) => {
  client.query('SET search_path TO partido360, public');
});

// Función utilitaria para probar que la conexión funciona
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conexión a la base de datos Neon (PostgreSQL) establecida correctamente.");

    // Verificar schema
    const spRes = await client.query('SHOW search_path');
    console.log("📂 Schema:", spRes.rows[0].search_path);

    // Opcional: mostrar la versión de postgres
    const res = await client.query('SELECT version()');
    console.log("ℹ️ Versión:", res.rows[0].version);

    // Verificar que las tablas de Partido360 existen
    const tablas = await client.query("SELECT COUNT(*) as c FROM pg_tables WHERE schemaname='partido360'");
    console.log(`📊 Tablas en schema partido360: ${tablas.rows[0].c}`);

    client.release();
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos Neon:", error.message);
  }
};

// Se ejecuta para validar cada vez que inicias el servidor (eliminar en prod si no es deseado)
testConnection();

module.exports = {
  pool,
  // Wrapper para las consultas directas
  query: (text, params) => pool.query(text, params),
};
