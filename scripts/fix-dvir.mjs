import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);

// Fix seekingGender to female
await conn.query(`UPDATE singles SET seekingGender = 'female' WHERE id = 17850003`);
console.log('Updated seekingGender to female');

// Check and delete any matches with males
const [matches] = await conn.query(`
  SELECT m.id, m.singleAId, m.singleBId, sa.gender as genderA, sb.gender as genderB
  FROM matches m
  JOIN singles sa ON sa.id = m.singleAId
  JOIN singles sb ON sb.id = m.singleBId
  WHERE (m.singleAId = 17850003 OR m.singleBId = 17850003)
  AND m.returnedToPoolAt IS NULL
`);
console.log(`Found ${matches.length} active matches`);

for (const m of matches) {
  const partnerId = m.singleAId === 17850003 ? m.singleBId : m.singleAId;
  const partnerGender = m.singleAId === 17850003 ? m.genderB : m.genderA;
  if (partnerGender === 'male') {
    await conn.query(`UPDATE matches SET returnedToPoolAt = NOW(), status = 'cancelled' WHERE id = ?`, [m.id]);
    console.log(`Cancelled match ${m.id} with male partner ${partnerId}`);
  }
}

// Verify
const [result] = await conn.query(`SELECT seekingGender FROM singles WHERE id = 17850003`);
console.log(`\nVerified: seekingGender = ${result[0].seekingGender}`);

await conn.end();
