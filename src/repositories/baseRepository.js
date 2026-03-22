const db = require('../config/db');

/**
 * Ejemplo estándar de un repositorio base bajo los principios 
 * de Arquitectura Limpia (Clean Architecture).
 *
 * Puedes heredarlo en tus demás repositorios, ej: SorteoRepository
 */
class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
    }

    async findAll() {
        const text = `SELECT * FROM ${this.tableName}`;
        const result = await db.query(text);
        return result.rows;
    }

    async findById(id) {
        const text = `SELECT * FROM ${this.tableName} WHERE id = $1`;
        const result = await db.query(text, [id]);
        return result.rows[0];
    }

    async create(columns, values) {
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const columnsString = columns.join(', ');

        const text = `
      INSERT INTO ${this.tableName} (${columnsString}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
        const result = await db.query(text, values);
        return result.rows[0];
    }
}

module.exports = BaseRepository;
