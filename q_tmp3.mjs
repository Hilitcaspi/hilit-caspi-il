import mysql from 'mysql2/promise';
const c = await mysql.createConnection(process.env.DATABASE_URL);
// Check email_log for free guide
const [emails] = await c.query(`SELECT * FROM email_log WHERE subject LIKE '%מדריך%' OR subject LIKE '%guide%' LIMIT 10`);
console.log("Free guide emails sent:", emails.length);
if (emails.length > 0) console.log(JSON.stringify(emails.slice(0,3), null, 2));
// Check analytics events for guide button clicks
const [tables] = await c.query(`SHOW TABLES LIKE '%analytics%'`);
console.log("\nAnalytics tables:", tables.map(t => Object.values(t)[0]));
const [events] = await c.query(`SHOW TABLES LIKE '%event%'`);
console.log("Event tables:", events.map(t => Object.values(t)[0]));
await c.end();
