import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT code, product, fixedPrice, discountPercent, discountAmount, isActive, expiresAt FROM discount_codes WHERE isActive = 1');
console.table(rows);
await conn.end();
