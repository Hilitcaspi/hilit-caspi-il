const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
  const [rows] = await conn.execute(`
    SELECT firstName, lastName, email, age, height, city, occupation, photoUrl, questionnaireCompletedAt
    FROM singles
    WHERE isPaid = 1 AND isActive = 1 AND questionnaireToken IS NOT NULL AND email IS NOT NULL AND email != ''
      AND questionnaireCompletedAt IS NULL
  `);
  let onlyOne = 0, two = 0, three = 0, fourPlus = 0;
  for (const r of rows) {
    let m = 0;
    if (r.age === null || r.age === 0) m++;
    if (r.height === null) m++;
    if (r.city === null || r.city === '') m++;
    if (r.occupation === null || r.occupation === '') m++;
    if (r.photoUrl === null || r.photoUrl === '') m++;
    if (r.lastName === null || r.lastName === '') m++;
    if (m === 0) continue;
    if (m === 1) onlyOne++;
    else if (m === 2) two++;
    else if (m === 3) three++;
    else fourPlus++;
  }
  console.log('No questionnaire completed, breakdown by missing field count:');
  console.log('  1 missing:', onlyOne, '(will get /join/complete)');
  console.log('  2 missing:', two, '(will get /join/complete)');
  console.log('  3 missing:', three, '(will get /join/complete)');
  console.log('  4+ missing:', fourPlus, '(will get /join/questionnaire)');
  await conn.end();
}
main();
