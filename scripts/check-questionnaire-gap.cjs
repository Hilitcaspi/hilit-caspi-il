const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);

  // Users who have ALL 5 critical fields missing (age, height, city, photo, occupation)
  // These are the ones most likely to have never filled the questionnaire
  const [allMissing] = await conn.execute(`
    SELECT id, firstName, lastName, email, phone, questionnaireCompletedAt, questionnaireToken,
           age, height, city, photoUrl, occupation, createdAt
    FROM singles
    WHERE isPaid = 1 AND isActive = 1
      AND (age IS NULL OR age = 0)
      AND (height IS NULL OR height = 0)
      AND (city IS NULL OR city = '')
      AND (photoUrl IS NULL OR photoUrl = '')
      AND (occupation IS NULL OR occupation = '')
    ORDER BY createdAt DESC
  `);

  console.log('=== אנשים שחסרים להם כל 5 השדות הקריטיים (גיל, גובה, עיר, תמונה, עיסוק) ===');
  console.log(`סה"כ: ${allMissing.length}\n`);

  // Split by questionnaireCompleted status
  const notCompleted = allMissing.filter(u => !u.questionnaireCompletedAt);
  const completed = allMissing.filter(u => !!u.questionnaireCompletedAt);

  console.log(`--- לא מילאו שאלון (questionnaireCompleted = 0 או NULL): ${notCompleted.length} ---`);
  for (const u of notCompleted) {
    console.log(`  ${u.firstName} ${u.lastName || '?'} | ${u.email} | ${u.phone || 'ללא טלפון'} | qCompletedAt=${u.questionnaireCompletedAt || 'NULL'} | token=${u.questionnaireToken ? 'יש' : 'אין'} | נרשם: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : '?'}`);
  }

  console.log(`\n--- מילאו שאלון (questionnaireCompleted = 1) אבל עדיין חסרים כל 5 השדות: ${completed.length} ---`);
  for (const u of completed) {
    console.log(`  ${u.firstName} ${u.lastName || '?'} | ${u.email} | ${u.phone || 'ללא טלפון'} | נרשם: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : '?'}`);
  }

  // Now check ALL 120 users with any missing field
  console.log('\n\n=== סיכום כללי: כל 120 המשתמשים עם שדות חסרים ===');
  const [allWithMissing] = await conn.execute(`
    SELECT id, firstName, lastName, email, questionnaireCompletedAt,
           age, height, city, photoUrl, occupation
    FROM singles
    WHERE isPaid = 1 AND isActive = 1
      AND (
        age IS NULL OR age = 0 OR
        height IS NULL OR height = 0 OR
        city IS NULL OR city = '' OR
        photoUrl IS NULL OR photoUrl = '' OR
        occupation IS NULL OR occupation = '' OR
        lastName IS NULL OR lastName = ''
      )
  `);

  const qNotDone = allWithMissing.filter(u => !u.questionnaireCompletedAt);
  const qDone = allWithMissing.filter(u => !!u.questionnaireCompletedAt);

  console.log(`סה"כ עם שדות חסרים: ${allWithMissing.length}`);
  console.log(`  - לא מילאו שאלון (questionnaireCompleted=0/NULL): ${qNotDone.length}`);
  console.log(`  - מילאו שאלון (questionnaireCompleted=1): ${qDone.length}`);

  // For those who completed questionnaire but still missing fields - what's missing?
  console.log(`\n--- מילאו שאלון אבל עדיין חסרים שדות (${qDone.length} אנשים): ---`);
  for (const u of qDone) {
    const missing = [];
    if (!u.age || u.age === 0) missing.push('גיל');
    if (!u.height || u.height === 0) missing.push('גובה');
    if (!u.city || u.city === '') missing.push('עיר');
    if (!u.photoUrl || u.photoUrl === '') missing.push('תמונה');
    if (!u.occupation || u.occupation === '') missing.push('עיסוק');
    if (!u.lastName || u.lastName === '') missing.push('שם משפחה');
    console.log(`  ${u.firstName} ${u.lastName || '?'} | ${u.email} | חסר: ${missing.join(', ')}`);
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
