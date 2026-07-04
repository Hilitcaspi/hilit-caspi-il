import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);
// Check if there's a separate table for email journeys
const [tables] = await c.query(`SHOW TABLES LIKE '%journey%'`);
console.log("Journey tables:", tables);
// Check sources in crm_leads
const [sources] = await c.query(`SELECT source, COUNT(*) as cnt FROM crm_leads GROUP BY source ORDER BY cnt DESC`);
console.log("\nLead sources:", JSON.stringify(sources, null, 2));
// Check if there's a free guide source
const [freeGuide] = await c.query(`SELECT COUNT(*) as cnt FROM crm_leads WHERE source LIKE '%guide%' OR source LIKE '%free%'`);
console.log("\nFree guide leads:", freeGuide[0].cnt);
await c.end();
