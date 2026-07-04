import mysql from 'mysql2/promise';
const url = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL;
const c = await mysql.createConnection(url);
// Check free guide downloads from analytics
const [guideEvents] = await c.query(`SELECT eventType, COUNT(*) as cnt FROM analytics_events WHERE eventType IN ('guide_view', 'guide_download', 'free_guide_cta') GROUP BY eventType`);
console.log("Guide analytics events:", guideEvents);
// Check CRM leads from guide_form source
const [guideLeads] = await c.query(`SELECT source, COUNT(*) as cnt FROM crm_leads WHERE source = 'guide_form' GROUP BY source`);
console.log("CRM leads from guide_form:", guideLeads);
// Check how many total leads came from each source
const [sources] = await c.query(`SELECT source, COUNT(*) as cnt FROM crm_leads GROUP BY source ORDER BY cnt DESC`);
console.log("All lead sources:", sources);
await c.end();
