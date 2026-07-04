import mysql from 'mysql2/promise';
const url = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL;
console.log("Using URL:", url ? url.substring(0, 40) + "..." : "NONE");
const c = await mysql.createConnection(url);
const [cols] = await c.query(`SHOW COLUMNS FROM analytics_events LIKE 'metadata'`);
console.log("metadata column exists:", cols.length > 0);
if (cols.length === 0) {
  console.log("Adding metadata column to LEGACY DB...");
  await c.query(`ALTER TABLE analytics_events ADD COLUMN metadata TEXT AFTER utmContent`);
  console.log("Done!");
}
// Also update the enum
const [enumCheck] = await c.query(`SHOW COLUMNS FROM analytics_events LIKE 'eventType'`);
console.log("eventType enum:", enumCheck[0]?.Type?.substring(0, 100));
await c.end();
