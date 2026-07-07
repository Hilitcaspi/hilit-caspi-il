const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
  
  const [rows] = await conn.execute("SELECT questionnaireToken FROM singles WHERE id = 11850001");
  const token = rows[0].questionnaireToken;
  
  const link = 'https://hilitcaspi.com/join/questionnaire?token=' + token;
  console.log('Correct link:', link);
  
  const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'הילית כספי', email: 'hilit@hilitcaspi.com' },
      to: [{ email: 'nitzanlisha@gmail.com', name: 'נועה' }],
      subject: 'נועה, הנה הקישור הנכון לשאלון',
      htmlContent: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6b21a8;">היי נועה!</h2>
        <p style="font-size: 16px; line-height: 1.8;">סליחה על הבלבול, הנה הקישור הנכון לשאלון המדעי:</p>
        <p style="font-size: 16px; line-height: 1.8;">כדי שאוכל להתחיל לחפש לך התאמות, צריך למלא את השאלון. זה לוקח כ-5 דקות וזה מה שעוזר לי למצוא לך את האדם הנכון.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #6b21a8; color: white; padding: 15px 40px; border-radius: 25px; text-decoration: none; font-size: 18px; font-weight: bold;">למילוי השאלון</a>
        </div>
        <p style="font-size: 14px; color: #666;">הקישור אישי ומאובטח. אפשר למלא מהטלפון או מהמחשב.</p>
        <p style="font-size: 16px;">מחכה לך,<br>הילית</p>
      </div>`
    })
  });
  console.log('Email status:', emailRes.status, await emailRes.text());
  
  await conn.end();
}

main().catch(e => console.error(e.message));
