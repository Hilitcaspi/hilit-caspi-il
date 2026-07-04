import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);
const [tables] = await c.query(`SHOW TABLES`);
const tableNames = tables.map(t => Object.values(t)[0]);
const journeyTables = tableNames.filter(t => t.includes('journey') || t.includes('email') || t.includes('queue'));
console.log("Relevant tables:", journeyTables);
// Check email_journey_queue
for (const t of journeyTables) {
  const [rows] = await c.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
  console.log(`  ${t}: ${rows[0].cnt} rows`);
}
// Check free guide specific
if (tableNames.includes('email_journey_queue')) {
  const [freeGuide] = await c.query(`SELECT * FROM email_journey_queue WHERE journeyKey LIKE '%free_guide%' LIMIT 5`);
  console.log("\nFree guide journeys:", JSON.stringify(freeGuide, null, 2));
}
await c.end();
