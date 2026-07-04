import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
try {
  const [cols] = await conn.execute("SHOW COLUMNS FROM analytics_events LIKE 'metadata'");
  if (cols.length > 0) {
    console.log("metadata column exists in legacy DB:", cols[0]);
  } else {
    await conn.execute("ALTER TABLE analytics_events ADD COLUMN metadata JSON DEFAULT NULL");
    console.log("Added metadata column to legacy DB");
  }
} catch(e) {
  console.log("Error:", e.message);
}
await conn.end();
