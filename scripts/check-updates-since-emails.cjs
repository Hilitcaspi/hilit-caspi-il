/**
 * Check if any users have updated their profiles since the emails were sent
 * Emails were sent around 2026-07-07 17:20 UTC
 */
const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);

  // Check for recent updates (updatedAt after emails were sent)
  const emailSentTime = "2026-07-07 17:20:00";
  
  // Check if there's an updatedAt column
  const [cols] = await conn.execute(`SHOW COLUMNS FROM singles LIKE 'updatedAt'`);
  
  if (cols.length > 0) {
    const [updated] = await conn.execute(`
      SELECT firstName, lastName, email, updatedAt, photoUrl, age, height, city, occupation
      FROM singles
      WHERE isPaid = 1 AND isActive = 1
        AND updatedAt > ?
      ORDER BY updatedAt DESC
    `, [emailSentTime]);
    
    console.log(`Users who updated their profile since emails were sent (${emailSentTime}):`);
    console.log(`Total: ${updated.length}\n`);
    
    for (const u of updated) {
      console.log(`  ${u.firstName} ${u.lastName || ''} <${u.email}>`);
      console.log(`    Updated: ${u.updatedAt}`);
      console.log(`    Photo: ${u.photoUrl ? 'YES' : 'NO'}, Age: ${u.age || 'missing'}, Height: ${u.height || 'missing'}, City: ${u.city || 'missing'}, Occupation: ${u.occupation || 'missing'}`);
      console.log('');
    }
  } else {
    console.log("No 'updatedAt' column found. Checking questionnaire completions...");
  }

  // Also check questionnaireCompletedAt for recent completions
  const [questCompleted] = await conn.execute(`
    SELECT firstName, lastName, email, questionnaireCompletedAt
    FROM singles
    WHERE isPaid = 1 AND isActive = 1
      AND questionnaireCompletedAt > ?
    ORDER BY questionnaireCompletedAt DESC
  `, [emailSentTime]);
  
  console.log(`\nUsers who completed questionnaire since emails were sent:`);
  console.log(`Total: ${questCompleted.length}`);
  for (const u of questCompleted) {
    console.log(`  ${u.firstName} ${u.lastName || ''} <${u.email}> - completed: ${u.questionnaireCompletedAt}`);
  }

  // Check the 87 users who got the /join/complete link - how many still have missing fields?
  const [stillMissing] = await conn.execute(`
    SELECT COUNT(*) as cnt FROM singles
    WHERE isPaid = 1 AND isActive = 1
      AND questionnaireToken IS NOT NULL
      AND email IS NOT NULL AND email != ''
      AND questionnaireCompletedAt IS NOT NULL
      AND (
        (photoUrl IS NULL OR photoUrl = '')
        OR (occupation IS NULL OR occupation = '')
        OR (lastName IS NULL OR lastName = '')
        OR (age IS NULL OR age = 0)
        OR (height IS NULL OR height = 0)
        OR (city IS NULL OR city = '')
      )
  `);
  
  const [noQuestStillMissing] = await conn.execute(`
    SELECT COUNT(*) as cnt FROM singles
    WHERE isPaid = 1 AND isActive = 1
      AND questionnaireToken IS NOT NULL
      AND email IS NOT NULL AND email != ''
      AND questionnaireCompletedAt IS NULL
      AND (
        (age IS NULL OR age = 0)
        AND (city IS NULL OR city = '')
      )
  `);

  console.log(`\n--- Current Status ---`);
  console.log(`Users with completed questionnaire but still missing fields: ${stillMissing[0].cnt}`);
  console.log(`Users who still haven't filled questionnaire (missing age+city): ${noQuestStillMissing[0].cnt}`);

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
