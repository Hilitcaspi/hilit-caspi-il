import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE analytics_events ADD COLUMN metadata JSON DEFAULT NULL");
  console.log("Added metadata column to production DB");
} catch(e) {
  if (e.message.includes("Duplicate")) console.log("metadata column already exists in production DB");
  else console.log("Error:", e.message);
}
await conn.end();
