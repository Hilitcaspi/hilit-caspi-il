import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);
// Check analytics events for guide-related clicks
const [events] = await c.query(`
  SELECT eventType, COUNT(*) as cnt 
  FROM analytics_events 
  WHERE eventType LIKE '%guide%' OR eventType LIKE '%scroll%' OR eventType LIKE '%download%'
  GROUP BY eventType ORDER BY cnt DESC
`);
console.log("Guide-related events:", JSON.stringify(events, null, 2));
// Check total free guide leads
const [leads] = await c.query(`SELECT COUNT(*) as cnt FROM crm_leads WHERE source = 'guide_form'`);
console.log("\nTotal free guide form submissions:", leads[0].cnt);
// Check if there are analytics for the guide section
const [guideClicks] = await c.query(`
  SELECT eventType, page, COUNT(*) as cnt 
  FROM analytics_events 
  WHERE page = '/' AND (eventType LIKE '%click%' OR eventType LIKE '%scroll%')
  GROUP BY eventType, page ORDER BY cnt DESC LIMIT 20
`);
console.log("\nHomepage click events:", JSON.stringify(guideClicks, null, 2));
await c.end();
