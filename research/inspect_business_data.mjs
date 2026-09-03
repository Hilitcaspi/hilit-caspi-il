import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';

const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
const output = {};

async function columns(table) {
  const [rows] = await conn.query({ sql: `SHOW COLUMNS FROM \`${table}\``, timeout: 10000 });
  return rows;
}

async function safeQuery(name, sql, params = []) {
  try {
    const [rows] = await conn.query({ sql, values: params, timeout: 12000 });
    output[name] = rows;
  } catch (error) {
    output[name] = { error: String(error?.message || error) };
  }
}

for (const table of ['payment_leads', 'crm_leads', 'singles']) {
  output[`${table}_columns`] = await columns(table);
}

await safeQuery('payment_leads_sample', 'SELECT * FROM payment_leads ORDER BY id DESC LIMIT 3');
await safeQuery('payment_leads_count', 'SELECT COUNT(*) AS total FROM payment_leads');
await safeQuery('crm_leads_count', 'SELECT COUNT(*) AS total FROM crm_leads');
await safeQuery('singles_count', 'SELECT COUNT(*) AS total, SUM(isActive=1) AS active, SUM(isPaid=1) AS paid FROM singles');

await fs.writeFile('/home/ubuntu/hilit-caspi-il/research/business_data_inventory.json', JSON.stringify(output, null, 2));
await conn.end();
