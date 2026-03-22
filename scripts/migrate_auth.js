const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Starting migration for Auth Flow...');
        await client.query('BEGIN');

        // 1. Agregar columnas a usuarios (si no existen)
        console.log('Adding columns to usuarios...');
        await client.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE NULL,
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE NULL;
        `);

        // 2. Crear tabla password_resets
        console.log('Creating password_resets table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                reset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                usuario_id UUID NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                used_at TIMESTAMP WITH TIME ZONE NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_password_resets_usuario ON password_resets(usuario_id);
            CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
