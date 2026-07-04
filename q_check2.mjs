import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);
// Try a direct insert to verify it works at SQL level
await c.query(`INSERT INTO analytics_events (eventType, page, metadata, userAgent, createdAt) VALUES ('button_click', '/test-direct', '{"direct":"yes"}', 'test', ?);`, [Date.now()]);
console.log("Direct insert succeeded!");
const [rows] = await c.query(`SELECT * FROM analytics_events WHERE page = '/test-direct' ORDER BY id DESC LIMIT 1`);
console.log("Row:", JSON.stringify(rows[0], null, 2));
await c.end();
