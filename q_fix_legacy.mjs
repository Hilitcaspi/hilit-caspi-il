import mysql from 'mysql2/promise';
const url = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL;
const c = await mysql.createConnection(url);
// The legacy DB uses varchar(100) for eventType, so no enum update needed - it accepts any string
// Just verify metadata column is there now
const [cols] = await c.query(`SHOW COLUMNS FROM analytics_events WHERE Field = 'metadata'`);
console.log("metadata column:", cols.length > 0 ? "EXISTS" : "MISSING");
// Test insert
await c.query(`INSERT INTO analytics_events (eventType, page, metadata, userAgent, createdAt) VALUES ('button_click', '/test-legacy', '{"legacy":"yes"}', 'test', ?)`, [Date.now()]);
console.log("Insert succeeded!");
await c.end();
