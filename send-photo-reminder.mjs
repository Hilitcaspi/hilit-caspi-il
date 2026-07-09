import mysql from 'mysql2/promise';

const url = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SITE_URL = 'https://hilitcaspi.com';

const conn = await mysql.createConnection(url);

// Get the 49 paid members who completed questionnaire but have no photo
const [members] = await conn.execute(`
  SELECT id, firstName, email, questionnaireToken
  FROM singles 
  WHERE questionnaireCompletedAt IS NOT NULL 
    AND (photoUrl IS NULL OR photoUrl = '') 
    AND isPaid = 1
  ORDER BY questionnaireCompletedAt DESC
`);

console.log(`Found ${members.length} members missing photos who completed questionnaire`);

// Check if tokens exist
const withToken = members.filter(m => m.questionnaireToken);
const withoutToken = members.filter(m => !m.questionnaireToken);
console.log(`  With token: ${withToken.length}`);
console.log(`  Without token: ${withoutToken.length}`);

if (withoutToken.length > 0) {
  console.log('\nMembers WITHOUT token (need to generate):');
  withoutToken.forEach(m => console.log(`  ${m.id}: ${m.firstName} (${m.email})`));
}

// Build the email HTML
function buildEmailHtml(firstName, completeUrl) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#fdf8f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdf8f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%); padding: 30px 40px; text-align: center;">
              <p style="margin:0; color:#f5e6d3; font-size:14px; letter-spacing:1px;">הילית כספי | מאמנת למציאת זוגיות</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 36px;">
              <h1 style="margin:0 0 20px; color:#1a0a2e; font-size:22px; font-weight:600; text-align:right;">
                היי ${firstName} 👋
              </h1>
              
              <p style="margin:0 0 16px; color:#4a3728; font-size:16px; line-height:1.7; text-align:right;">
                שמתי לב שהפרופיל שלך במאגר עדיין בלי תמונה.
              </p>
              
              <p style="margin:0 0 16px; color:#4a3728; font-size:16px; line-height:1.7; text-align:right;">
                בלי תמונה, אני לא יכולה להציע אותך להתאמות — כי חלק חשוב מהתהליך הוא שהצד השני יראה אותך.
              </p>

              <p style="margin:0 0 28px; color:#4a3728; font-size:16px; line-height:1.7; text-align:right;">
                זה לוקח 10 שניות:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 28px;">
                    <a href="${completeUrl}" style="display:inline-block; background: linear-gradient(135deg, #d4a574 0%, #c4956a 100%); color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:30px; font-size:16px; font-weight:600; letter-spacing:0.5px;">
                      להעלות תמונה
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color:#fdf8f6; border-radius:10px; padding:16px 20px; margin-bottom:20px;">
                <p style="margin:0; color:#6b5344; font-size:14px; line-height:1.6; text-align:right;">
                  💡 <strong>טיפ:</strong> תמונה טובה = תמונה עדכנית, ברורה, שרואים בה את הפנים שלך. לא חייבים סטודיו — סלפי טוב מספיק.
                </p>
              </div>

              <p style="margin:20px 0 0; color:#4a3728; font-size:16px; text-align:right;">
                באהבה,<br>הילית 💜
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fdf8f6; padding: 20px 36px; text-align:center; border-top: 1px solid #f0e6e0;">
              <p style="margin:0; color:#9b8578; font-size:12px;">
                הילית כספי | מאמנת ומרצה למציאת זוגיות
              </p>
              <p style="margin:8px 0 0; color:#9b8578; font-size:11px;">
                <a href="${SITE_URL}" style="color:#9b8578; text-decoration:underline;">hilitcaspi.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Send test email to shaharnat08@gmail.com
const testEmail = 'shaharnat08@gmail.com';
const testFirstName = 'שחר';
// Use a real token from one of the members for the test link
const sampleToken = withToken.length > 0 ? withToken[0].questionnaireToken : 'test-token';
const completeUrl = `${SITE_URL}/join/complete?token=${sampleToken}`;

console.log(`\nSending test email to ${testEmail}...`);
console.log(`Complete URL: ${completeUrl}`);

const emailPayload = {
  sender: { name: "הילית כספי", email: "hilit@hilitcaspi.com" },
  to: [{ email: testEmail, name: testFirstName }],
  subject: "חסרה לנו תמונה שלך 📸",
  htmlContent: buildEmailHtml(testFirstName, completeUrl),
};

const response = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'api-key': BREVO_API_KEY,
    'content-type': 'application/json',
  },
  body: JSON.stringify(emailPayload),
});

const result = await response.json();
console.log('Brevo response:', response.status, JSON.stringify(result));

if (response.ok) {
  console.log('\n✅ Test email sent successfully!');
} else {
  console.log('\n❌ Failed to send email');
}

await conn.end();
process.exit(0);
