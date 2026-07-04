import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);
const [cols] = await c.query(`SHOW COLUMNS FROM analytics_events LIKE 'metadata'`);
console.log("metadata column:", cols);
await c.end();
