/**
 * Send a sample email with a REAL token to test address so the link actually works
 */
const mysql = require("mysql2/promise");
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BASE_URL = "https://hilitcaspi.com";
const TEST_EMAIL = "Shaharnat08@gmail.com";

async function sendEmail({ to, toName, subject, htmlContent }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "הילית כספי", email: "hilit@hilitcaspi.com" },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }
  return res.json();
}

function buildFewMissingEmail(firstName, missingFields, token) {
  const completeUrl = `${BASE_URL}/join/complete?token=${token}`;
  const unsubUrl = `${BASE_URL}/unsubscribe`;
  
  const FIELD_LABELS_HE = {
    age: "גיל",
    height: "גובה",
    city: "עיר מגורים",
    occupation: "עיסוק",
    photoUrl: "תמונת פרופיל",
    lastName: "שם משפחה",
  };

  const missingBullets = missingFields.map(f => `<li style="margin:4px 0;color:#191265;">${FIELD_LABELS_HE[f] || f}</li>`).join("");

  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
  <div style="background:#191265;padding:32px;text-align:center;">
    <h1 style="color:#ffe27c;font-size:20px;margin:0;">הילית כספי | מלווה לזוגיות</h1>
  </div>
  <div style="padding:32px;color:#191265;line-height:1.8;font-size:16px;">
    <h2 style="font-size:20px;margin-bottom:16px;">היי ${firstName}, חסרים לך כמה פרטים קטנים</h2>
    <p>שמתי לב שחסרים לך פרטים בפרופיל שלך במאגר:</p>
    <ul style="padding-right:20px;margin:16px 0;">
      ${missingBullets}
    </ul>
    <p>בלי הפרטים האלה קשה לי למצוא לך התאמות מדויקות.</p>
    <p><strong>אין צורך למלא את כל השאלון מחדש</strong>, רק את מה שחסר. לוקח פחות מדקה:</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${completeUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:17px;font-weight:bold;padding:14px 36px;border-radius:12px;text-decoration:none;">להשלמת הפרטים</a>
    </div>
    <p style="font-size:14px;color:#727272;">ברגע שתשלימו, אוכל להתחיל לחפש עבורכם התאמות טובות יותר.</p>
    <p style="margin-top:24px;">באהבה,<br><strong>הילית כספי</strong><br><span style="font-size:13px;color:#727272;">מלווה לזוגיות</span></p>
  </div>
  <div style="background:#191265;padding:20px;text-align:center;">
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0;">הילית כספי | מלווה לזוגיות</p>
    <p style="font-size:11px;margin-top:8px;"><a href="${unsubUrl}" style="color:rgba(255,255,255,0.4);">להסרה מרשימת התפוצה</a></p>
  </div>
</div>
</body></html>`;
}

async function main() {
  const conn = await mysql.createConnection(process.env.LEGACY_DATABASE_URL);
  
  // Get a real user with missing photo (שקד קיינן)
  const [rows] = await conn.execute(
    "SELECT firstName, questionnaireToken FROM singles WHERE email = 'Shakedkeynan@gmail.com'"
  );
  
  if (!rows.length) {
    console.error("User not found");
    await conn.end();
    return;
  }

  const { firstName, questionnaireToken } = rows[0];
  console.log(`Using real token for ${firstName}: ${questionnaireToken.substring(0, 16)}...`);

  // Send with real token
  await sendEmail({
    to: TEST_EMAIL,
    toName: "דוגמה עם token אמיתי",
    subject: `דוגמה (token אמיתי): ${firstName}, חסרים לך כמה פרטים קטנים בפרופיל`,
    htmlContent: buildFewMissingEmail(firstName, ["photoUrl"], questionnaireToken),
  });
  
  console.log(`✓ Sent to ${TEST_EMAIL} with real token for ${firstName}`);
  console.log(`Link will open: ${BASE_URL}/join/complete?token=${questionnaireToken.substring(0, 16)}...`);
  
  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
