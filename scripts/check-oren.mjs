import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);

// Find Oren in singles
const [singles] = await conn.execute("SELECT id, email, firstName, lastName FROM singles WHERE email = 'orenazubel@gmail.com'");
console.log("Singles:", JSON.stringify(singles));

if (singles.length > 0) {
  const orenId = singles[0].id;
  // Find recent matches
  const [matches] = await conn.execute(`
    SELECT id, singleAId, singleBId, status, createdAt, proposedAt, emailAOpenedAt, emailBOpenedAt
    FROM matches 
    WHERE (singleAId = ? OR singleBId = ?) 
    ORDER BY createdAt DESC LIMIT 5
  `, [orenId, orenId]);
  console.log("\nRecent matches:");
  for (const m of matches) {
    const side = m.singleAId === orenId ? 'A' : 'B';
    const opened = side === 'A' ? m.emailAOpenedAt : m.emailBOpenedAt;
    console.log(`  #${m.id} | side:${side} | status:${m.status} | proposed:${m.proposedAt ? new Date(m.proposedAt).toLocaleDateString('he-IL') : 'null'} | opened:${opened ? 'yes' : 'no'}`);
  }
}

// Check Brevo
const brevoKey = process.env.BREVO_API_KEY;
const res = await fetch(`https://api.brevo.com/v3/contacts/orenazubel@gmail.com`, {
  headers: { 'api-key': brevoKey }
});
const contact = await res.json();
console.log("\nBrevo contact:", "blacklisted:", contact.emailBlacklisted);

const res2 = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?email=orenazubel@gmail.com&limit=10&sort=desc`, {
  headers: { 'api-key': brevoKey }
});
const events = await res2.json();
console.log("\nBrevo events:");
if (events.events) {
  for (const e of events.events.slice(0, 10)) {
    console.log(`  ${e.date} | ${e.event} | "${e.subject}" ${e.reason || ''}`);
  }
}

await conn.end();
