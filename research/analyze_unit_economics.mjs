import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';

const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
const startMs = Date.parse('2026-04-01T00:00:00+03:00');
const [payments] = await conn.query({
  sql: `SELECT LOWER(TRIM(email)) AS email, product, created_at AS createdAt
        FROM payment_leads WHERE created_at >= ? ORDER BY created_at`,
  values: [startMs], timeout: 20000,
});

const byEmail = new Map();
for (const row of payments) {
  const list = byEmail.get(row.email) || [];
  list.push({ product: row.product, createdAt: Number(row.createdAt) });
  byEmail.set(row.email, list);
}

const repeatBuyers = [...byEmail.values()].filter((list) => list.length > 1);
const productCustomers = {};
const crossSell = {};
for (const [email, list] of byEmail.entries()) {
  const products = [...new Set(list.map((x) => x.product))];
  for (const p of products) {
    productCustomers[p] ||= new Set();
    productCustomers[p].add(email);
  }
  for (const a of products) for (const b of products) {
    if (a === b) continue;
    const key = `${a}->${b}`;
    crossSell[key] = (crossSell[key] || 0) + 1;
  }
}

const [matchSummary] = await conn.query({
  sql: `SELECT COUNT(*) AS totalMatches,
               SUM(status = 'matched') AS matchedStatus,
               SUM(status = 'rejected') AS rejectedStatus,
               SUM(status IN ('pending','proposed')) AS pendingStatus,
               SUM((singleAConsent = 1 AND singleBConsent = 1) OR (approvedByA = 1 AND approvedByB = 1)) AS doubleApproved,
               SUM(emailAOpenedAt IS NOT NULL OR emailBOpenedAt IS NOT NULL) AS atLeastOneEmailOpened
        FROM matches WHERE COALESCE(proposedAt, 0) >= ?`,
  values: [startMs], timeout: 20000,
});

const [matchesByMonth] = await conn.query({
  sql: `SELECT DATE_FORMAT(FROM_UNIXTIME(COALESCE(proposedAt,0) / 1000), '%Y-%m') AS month,
               COUNT(*) AS matches,
               SUM(status = 'matched') AS matched,
               SUM(status = 'rejected') AS rejected,
               SUM((singleAConsent = 1 AND singleBConsent = 1) OR (approvedByA = 1 AND approvedByB = 1)) AS doubleApproved
        FROM matches WHERE COALESCE(proposedAt,0) >= ?
        GROUP BY month ORDER BY month`,
  values: [startMs], timeout: 20000,
});

const [emailSummary] = await conn.query({
  sql: `SELECT journeyKey, COUNT(*) AS emails,
               SUM(status = 'sent') AS sent,
               SUM(status = 'failed') AS failed,
               SUM(openedAt IS NOT NULL) AS opened,
               SUM(clickedAt IS NOT NULL) AS clicked
        FROM email_log WHERE createdAt >= ?
        GROUP BY journeyKey ORDER BY emails DESC`,
  values: [startMs], timeout: 20000,
});

const output = {
  asOf: '2026-08-22',
  uniqueBuyers: byEmail.size,
  totalPurchaseRows: payments.length,
  repeatBuyerCount: repeatBuyers.length,
  repeatBuyerRate: byEmail.size ? repeatBuyers.length / byEmail.size : 0,
  productCustomerCounts: Object.fromEntries(Object.entries(productCustomers).map(([k, v]) => [k, v.size])),
  crossSell,
  matchSummary: matchSummary[0],
  matchesByMonth,
  emailSummary,
};

await fs.writeFile('/home/ubuntu/hilit-caspi-il/research/unit_economics_raw.json', JSON.stringify(output, null, 2));
await conn.destroy();
