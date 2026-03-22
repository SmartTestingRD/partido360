require('dotenv').config();
const { Pool } = require('pg');

// Configuración recomendada para Neon DB usando pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función utilitaria para probar que la conexión funciona
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conexión a la base de datos Neon (PostgreSQL) establecida correctamente.");
    
    // Opcional: mostrar la versión de postgres a la que nos conectamos
    const res = await client.query('SELECT version()');
    console.log("ℹ️ Versión:", res.rows[0].version);
    
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
