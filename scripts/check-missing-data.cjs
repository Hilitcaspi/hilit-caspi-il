const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
  
  // Find all active paid users who are missing at least one critical field
  const [rows] = await conn.execute(`
    SELECT id, firstName, lastName, email, phone, age, height, city, photoUrl, 
           occupation, maritalStatus, hasChildren, wantsChildren
    FROM singles 
    WHERE isPaid = 1 AND isActive = 1
    AND (
      age IS NULL OR age = 0 OR
      height IS NULL OR height = 0 OR
      city IS NULL OR city = '' OR
      photoUrl IS NULL OR photoUrl = '' OR
      occupation IS NULL OR occupation = '' OR
      firstName IS NULL OR firstName = '' OR
      lastName IS NULL OR lastName = '' OR
      maritalStatus IS NULL OR maritalStatus = '' OR
      hasChildren IS NULL OR
      wantsChildren IS NULL OR wantsChildren = ''
    )
  `);
  
  console.log('Total users with missing data:', rows.length);
  console.log('---');
  
  rows.forEach(r => {
    const missing = [];
    if (!r.age || r.age === 0) missing.push('גיל');
    if (!r.height || r.height === 0) missing.push('גובה');
    if (!r.city || r.city === '') missing.push('מקום מגורים');
    if (!r.photoUrl || r.photoUrl === '') missing.push('תמונה');
    if (!r.occupation || r.occupation === '') missing.push('עיסוק');
    if (!r.firstName || r.firstName === '') missing.push('שם פרטי');
    if (!r.lastName || r.lastName === '') missing.push('שם משפחה');
    if (!r.maritalStatus || r.maritalStatus === '') missing.push('מצב משפחתי');
    if (r.hasChildren === null) missing.push('יש/אין ילדים');
    if (!r.wantsChildren || r.wantsChildren === '') missing.push('רוצה/לא רוצה ילדים');
    
    console.log(`${r.firstName || '?'} ${r.lastName || '?'} | ${r.email} | ${r.phone || ''} | חסר: ${missing.join(', ')}`);
  });
  
  // Summary by field
  console.log('\n--- סיכום לפי שדה ---');
  const [total] = await conn.execute("SELECT COUNT(*) as cnt FROM singles WHERE isPaid = 1 AND isActive = 1");
  console.log('סה"כ פעילים ששילמו:', total[0].cnt);
  
  const fields = [
    ['גיל', 'age IS NULL OR age = 0'],
    ['גובה', 'height IS NULL OR height = 0'],
    ['מקום מגורים', "city IS NULL OR city = ''"],
    ['תמונה', "photoUrl IS NULL OR photoUrl = ''"],
    ['עיסוק', "occupation IS NULL OR occupation = ''"],
    ['שם פרטי', "firstName IS NULL OR firstName = ''"],
    ['שם משפחה', "lastName IS NULL OR lastName = ''"],
    ['מצב משפחתי', "maritalStatus IS NULL OR maritalStatus = ''"],
    ['יש/אין ילדים', "hasChildren IS NULL"],
    ['רוצה/לא רוצה ילדים', "wantsChildren IS NULL OR wantsChildren = ''"],
  ];
  
  for (const [name, cond] of fields) {
    const [r] = await conn.execute(`SELECT COUNT(*) as cnt FROM singles WHERE isPaid = 1 AND isActive = 1 AND (${cond})`);
    console.log(`${name}: ${r[0].cnt} חסרים`);
  }
  
  await conn.end();
}

main().catch(e => console.error(e.message));
