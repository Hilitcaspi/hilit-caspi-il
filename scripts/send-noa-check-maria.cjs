const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function main() {
  const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
  
  // 1. Send questionnaire to Noa
  const [noaRows] = await conn.execute("SELECT questionnaireToken FROM singles WHERE id = 11850001");
  let token = noaRows[0].questionnaireToken;
  
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    await conn.execute("UPDATE singles SET questionnaireToken = ? WHERE id = 11850001", [token]);
    console.log('Generated new token for Noa');
  }
  
  const link = 'https://hilitcaspi.com/questionnaire?token=' + token;
  console.log('Noa questionnaire link:', link);
  
  const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'הילית כספי', email: 'hilit@hilitcaspi.com' },
      to: [{ email: 'nitzanlisha@gmail.com', name: 'נועה' }],
      subject: 'נועה, השאלון שלך מחכה!',
      htmlContent: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6b21a8;">היי נועה!</h2>
        <p style="font-size: 16px; line-height: 1.8;">שמחה שהצטרפת למאגר הרווקים שלי!</p>
        <p style="font-size: 16px; line-height: 1.8;">כדי שאוכל להתחיל לחפש לך התאמות, צריך למלא את השאלון המדעי. זה לוקח כ-5 דקות וזה מה שעוזר לי למצוא לך את האדם הנכון.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #6b21a8; color: white; padding: 15px 40px; border-radius: 25px; text-decoration: none; font-size: 18px; font-weight: bold;">למילוי השאלון</a>
        </div>
        <p style="font-size: 14px; color: #666;">הקישור אישי ומאובטח. אפשר למלא מהטלפון או מהמחשב.</p>
        <p style="font-size: 16px;">מחכה לך,<br>הילית</p>
      </div>`
    })
  });
  console.log('Noa email status:', emailRes.status, await emailRes.text());
  
  // 2. Check Maria Salama
  const [maria] = await conn.execute("SELECT id, firstName, lastName, email, phone, gender, age, city, height, education, religiosity, occupation, about, photoUrl, dnaType, maritalStatus, seekingGender, partnerDescription, isPaid, isActive, questionnaireCompletedAt, wantsChildren, hasChildren, minAgePreference, maxAgePreference, smokingStatus, birthDate FROM singles WHERE email LIKE '%mariasalama%' OR email LIKE '%Mariasalama%'");
  console.log('\n--- Maria Salama ---');
  console.log('Found:', maria.length);
  if (maria.length > 0) {
    maria.forEach(r => console.log(JSON.stringify(r, null, 2)));
  } else {
    // Try by name
    const [byName] = await conn.execute("SELECT id, firstName, lastName, email, phone, gender, isPaid, isActive, questionnaireCompletedAt FROM singles WHERE firstName LIKE '%מריה%' OR lastName LIKE '%סלמה%'");
    console.log('By name:', byName.length);
    if (byName.length > 0) byName.forEach(r => console.log(JSON.stringify(r, null, 2)));
  }
  
  await conn.end();
}

main().catch(e => console.error(e.message));
