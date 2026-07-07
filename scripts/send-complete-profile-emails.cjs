/**
 * Send personalized emails to users with missing profile data.
 * Two templates:
 * 1. Users with few missing fields (1-3) → link to /join/complete?token=X
 * 2. Users who never filled questionnaire (4+ missing) → link to /join/questionnaire?token=X
 * 
 * Run: node scripts/send-complete-profile-emails.cjs
 */
const mysql = require("mysql2/promise");

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BASE_URL = "https://hilitcaspi.com";

// Critical fields we check
const CRITICAL_FIELDS = ["age", "height", "city", "occupation", "photoUrl", "lastName"];

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

function getMissingFields(row) {
  const missing = [];
  if (!row.age || row.age === 0) missing.push("age");
  if (!row.height) missing.push("height");
  if (!row.city || row.city === "") missing.push("city");
  if (!row.occupation || row.occupation === "") missing.push("occupation");
  if (!row.photoUrl || row.photoUrl === "") missing.push("photoUrl");
  if (!row.lastName || row.lastName === "") missing.push("lastName");
  return missing;
}

const FIELD_LABELS_HE = {
  age: "גיל",
  height: "גובה",
  city: "עיר מגורים",
  occupation: "עיסוק",
  photoUrl: "תמונת פרופיל",
  lastName: "שם משפחה",
};

function buildFewMissingEmail(firstName, missingFields, token) {
  const completeUrl = `${BASE_URL}/join/complete?token=${token}`;
  const unsubUrl = `${BASE_URL}/unsubscribe`;
  
  const missingList = missingFields.map(f => FIELD_LABELS_HE[f] || f).join(", ");
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

function buildQuestionnaireEmail(firstName, token) {
  const questionnaireUrl = `${BASE_URL}/join/questionnaire?token=${token}`;
  const unsubUrl = `${BASE_URL}/unsubscribe`;

  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
  <div style="background:#191265;padding:32px;text-align:center;">
    <h1 style="color:#ffe27c;font-size:20px;margin:0;">הילית כספי | מלווה לזוגיות</h1>
  </div>
  <div style="padding:32px;color:#191265;line-height:1.8;font-size:16px;">
    <h2 style="font-size:20px;margin-bottom:16px;">היי ${firstName}, עוד לא הספקת למלא?</h2>
    <p>שמתי לב שעדיין לא מילאת את השאלון שלנו. בלי השאלון אני לא יכולה להתחיל לחפש לך התאמות.</p>
    <p>זה לוקח כ-3 דקות ואפשר למלא מהטלפון:</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${questionnaireUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:17px;font-weight:bold;padding:14px 36px;border-radius:12px;text-decoration:none;">למילוי השאלון</a>
    </div>
    <p style="font-size:14px;color:#727272;">ברגע שתמלאו, אתחיל לחפש עבורכם.</p>
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

  // Get all paid+active singles with tokens and check missing fields
  const [rows] = await conn.execute(`
    SELECT id, firstName, lastName, email, questionnaireToken, questionnaireCompletedAt,
           age, height, city, occupation, photoUrl
    FROM singles
    WHERE isPaid = 1 AND isActive = 1
      AND questionnaireToken IS NOT NULL
      AND email IS NOT NULL AND email != ''
  `);

  console.log(`Total paid+active singles with tokens: ${rows.length}`);

  const fewMissing = []; // 1-3 missing fields, already completed questionnaire
  const manyMissing = []; // 4+ missing fields OR never completed questionnaire

  for (const row of rows) {
    const missing = getMissingFields(row);
    if (missing.length === 0) continue;

    // Decision: if they have 4+ missing fields AND never completed questionnaire → send to full questionnaire
    // Otherwise (1-3 missing, or completed questionnaire but still missing some) → send to /join/complete
    if (missing.length >= 4 && !row.questionnaireCompletedAt) {
      manyMissing.push({ ...row, missingFields: missing });
    } else {
      fewMissing.push({ ...row, missingFields: missing });
    }
  }

  console.log(`\nUsers with 1-3 missing fields (→ /join/complete): ${fewMissing.length}`);
  console.log(`Users with 4+ missing / no questionnaire (→ /join/questionnaire): ${manyMissing.length}`);
  console.log(`Total emails to send: ${fewMissing.length + manyMissing.length}`);

  // DRY RUN mode - just show what would be sent
  const DRY_RUN = process.argv.includes("--dry-run");
  if (DRY_RUN) {
    console.log("\n=== DRY RUN - Not sending emails ===\n");
    console.log("--- Few missing (complete page) ---");
    for (const u of fewMissing.slice(0, 5)) {
      console.log(`  ${u.firstName} ${u.lastName || ''} <${u.email}> - missing: ${u.missingFields.join(", ")}`);
    }
    if (fewMissing.length > 5) console.log(`  ... and ${fewMissing.length - 5} more`);
    
    console.log("\n--- Many missing (questionnaire) ---");
    for (const u of manyMissing.slice(0, 5)) {
      console.log(`  ${u.firstName} ${u.lastName || ''} <${u.email}> - missing: ${u.missingFields.join(", ")} ${u.questionnaireCompletedAt ? '(completed questionnaire)' : '(NO questionnaire)'}`);
    }
    if (manyMissing.length > 5) console.log(`  ... and ${manyMissing.length - 5} more`);
    
    await conn.end();
    return;
  }

  // SEND EMAILS
  let sent = 0;
  let errors = 0;

  // Send "few missing" emails
  for (const user of fewMissing) {
    try {
      const html = buildFewMissingEmail(user.firstName, user.missingFields, user.questionnaireToken);
      await sendEmail({
        to: user.email,
        toName: `${user.firstName} ${user.lastName || ""}`.trim(),
        subject: `${user.firstName}, חסרים לך כמה פרטים קטנים בפרופיל`,
        htmlContent: html,
      });
      sent++;
      console.log(`✓ [${sent}] ${user.firstName} <${user.email}> - missing: ${user.missingFields.join(", ")}`);
      // 1 second delay between emails
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      errors++;
      console.error(`✗ ${user.firstName} <${user.email}>: ${err.message}`);
    }
  }

  // Send "questionnaire" emails
  for (const user of manyMissing) {
    try {
      const html = buildQuestionnaireEmail(user.firstName, user.questionnaireToken);
      await sendEmail({
        to: user.email,
        toName: `${user.firstName} ${user.lastName || ""}`.trim(),
        subject: `${user.firstName}, עוד לא הספקת למלא? הנה הקישור`,
        htmlContent: html,
      });
      sent++;
      console.log(`✓ [${sent}] ${user.firstName} <${user.email}> - QUESTIONNAIRE (missing: ${user.missingFields.join(", ")})`);
      // 1 second delay between emails
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      errors++;
      console.error(`✗ ${user.firstName} <${user.email}>: ${err.message}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Sent: ${sent}, Errors: ${errors}`);
  
  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
