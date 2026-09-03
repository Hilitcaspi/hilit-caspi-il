import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';

const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
const startMs = Date.parse('2026-04-01T00:00:00+03:00');
const output = { asOf: '2026-08-22', startMs };

async function q(name, sql, values = []) {
  try {
    const [rows] = await conn.query({ sql, values, timeout: 20000 });
    output[name] = rows;
  } catch (error) {
    output[name] = { error: String(error?.message || error) };
  }
}

await q('payments_by_month_product', `
  SELECT DATE_FORMAT(FROM_UNIXTIME(created_at / 1000), '%Y-%m') AS month,
         product, COUNT(*) AS purchases
  FROM payment_leads
  WHERE created_at >= ?
  GROUP BY month, product
  ORDER BY month, product`, [startMs]);

await q('payments_by_week', `
  SELECT DATE_FORMAT(FROM_UNIXTIME(created_at / 1000), '%x-W%v') AS week,
         COUNT(*) AS purchases
  FROM payment_leads
  WHERE created_at >= ?
  GROUP BY week
  ORDER BY week`, [startMs]);

await q('leads_by_month_source', `
  SELECT DATE_FORMAT(FROM_UNIXTIME(createdAt / 1000), '%Y-%m') AS month,
         COALESCE(source, 'unknown') AS source, COUNT(*) AS leads
  FROM crm_leads
  WHERE createdAt >= ?
  GROUP BY month, source
  ORDER BY month, leads DESC`, [startMs]);

await q('leads_by_week', `
  SELECT DATE_FORMAT(FROM_UNIXTIME(createdAt / 1000), '%x-W%v') AS week,
         COUNT(*) AS leads
  FROM crm_leads
  WHERE createdAt >= ?
  GROUP BY week
  ORDER BY week`, [startMs]);

await q('singles_by_month_gender', `
  SELECT DATE_FORMAT(FROM_UNIXTIME(createdAt / 1000), '%Y-%m') AS month,
         gender, COUNT(*) AS registrations,
         SUM(isPaid = 1) AS paid,
         SUM(isActive = 1) AS active
  FROM singles
  WHERE createdAt >= ? AND isSeed = 0
  GROUP BY month, gender
  ORDER BY month, gender`, [startMs]);

await q('singles_snapshot', `
  SELECT COUNT(*) AS total,
         SUM(isActive = 1) AS active,
         SUM(isPaid = 1) AS paid,
         SUM(gender = 'female' AND isActive = 1) AS activeWomen,
         SUM(gender = 'male' AND isActive = 1) AS activeMen,
         SUM(questionnaireCompletedAt IS NOT NULL AND isActive = 1) AS scientificComplete,
         SUM(photoUrl IS NOT NULL AND photoUrl <> '' AND isActive = 1) AS withPhoto
  FROM singles WHERE isSeed = 0`);

await q('payment_period', `
  SELECT MIN(created_at) AS firstPaymentAt, MAX(created_at) AS lastPaymentAt,
         COUNT(*) AS totalPurchases
  FROM payment_leads WHERE created_at >= ?`, [startMs]);

await q('lead_to_purchase_by_month', `
  SELECT DATE_FORMAT(FROM_UNIXTIME(cl.createdAt / 1000), '%Y-%m') AS leadMonth,
         COUNT(DISTINCT cl.id) AS leads,
         COUNT(DISTINCT pl.email) AS convertedEmails
  FROM crm_leads cl
  LEFT JOIN payment_leads pl ON LOWER(TRIM(pl.email)) = LOWER(TRIM(cl.email)) AND pl.created_at >= cl.createdAt
  WHERE cl.createdAt >= ?
  GROUP BY leadMonth
  ORDER BY leadMonth`, [startMs]);

await fs.writeFile('/home/ubuntu/hilit-caspi-il/research/business_performance_raw.json', JSON.stringify(output, null, 2));
await conn.destroy();
process.exit(0);
