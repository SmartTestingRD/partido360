const fs = require('fs');

console.log('Leyendo el archivo dump-neondb-202604061230.sql...');
let sql = fs.readFileSync('dump-neondb-202604061230.sql', 'utf8');

// 1. Cambiar owner de neondb_owner a postgres
sql = sql.replace(/OWNER TO neondb_owner/g, 'OWNER TO postgres');
sql = sql.replace(/Owner: neondb_owner/g, 'Owner: postgres');

// 2. Eliminar toda referencia, creacion y data de las tablas Asset*, PricingState y CanonicalAsset
const tablasExcluidas = [
  'AssetValuationSnapshot',
  'Asset',
  'PricingState',
  'CanonicalAsset'
];

tablasExcluidas.forEach(tabla => {
  // Regex para eliminar las sentencias CREATE TABLE y ALTER TABLE completas
  const createRegex = new RegExp(`CREATE TABLE (public\\.)?"?${tabla}"?[^;]+;`, 'g');
  const alterRegex = new RegExp(`ALTER TABLE (ONLY |public\\.)?"?${tabla}"?[^;]+;`, 'g');
  
  // Regex para eliminar bloques COPY de esa tabla (los datos puros) que van hasta la línea con "\\."
  const copyRegex = new RegExp(`COPY (public\\.)?"?${tabla}"?[\\s\\S]*?\\\\\\.`, 'g');

  sql = sql.replace(createRegex, `-- Tabla ${tabla} eliminada del backup`);
  sql = sql.replace(alterRegex, `-- Alter ${tabla} eliminado`);
  sql = sql.replace(copyRegex, `-- Datos de ${tabla} eliminados`);
});

// 3. Eliminar la FK que referencia public.WalletAccount 
sql = sql.replace(
  /ALTER TABLE ONLY partido360\."AssetValuationSnapshot"\s+ADD CONSTRAINT "AssetValuationSnapshot_walletAccountId_fkey"[^;]+;/gs,
  '-- FK removida: referencia a WalletAccount de otro proyecto'
);

// Extra: Por prevenir cualquier otra FK que apunte a las tablas eliminadas
sql = sql.replace(
  /ALTER TABLE ONLY [^;]+ADD CONSTRAINT [^;]+ REFERENCES (public\.)?"?(Asset|PricingState|CanonicalAsset)[^;]+;/g,
  '-- FK apuntando a tablas excluidas removida'
);

console.log('Escribiendo los cambios limpios en dump-partido360-clean.sql...');
fs.writeFileSync('dump-partido360-clean.sql', sql);
console.log('¡Proceso completado con éxito!');
