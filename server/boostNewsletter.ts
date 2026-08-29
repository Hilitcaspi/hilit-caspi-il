const HILIT_PROFILE_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

export const BOOST_NEWSLETTER_SUBJECT = "ביקשתם יותר התאמות. עכשיו הבחירה גם בידיים שלכם 💛";
export const BOOST_NEWSLETTER_PREHEADER =
  "Boost נפתח לחברי המאגר: אישור קצר וללא תשלום פותח אפשרויות נוספות באזור האישי";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeHttpsUrl(value: string, fallback: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? escapeHtml(url.toString()) : fallback;
  } catch {
    return fallback;
  }
}

export function buildBoostEnrollmentNewsletter(input: {
  firstName?: string | null;
  enrollmentUrl: string;
  unsubscribeUrl: string;
}) {
  const firstName = escapeHtml(String(input.firstName || "").trim());
  const greeting = firstName ? `היי ${firstName},` : "היי,";
  const enrollmentUrl = safeHttpsUrl(input.enrollmentUrl, "https://hilitcaspi.com/match-boost");
  const unsubscribeUrl = safeHttpsUrl(input.unsubscribeUrl, "https://hilitcaspi.com/unsubscribe");
  const subject = BOOST_NEWSLETTER_SUBJECT;
  const preheader = BOOST_NEWSLETTER_PREHEADER;

  const htmlContent = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <style>
    @media only screen and (max-width:640px) {
      .email-shell { width:100% !important; border-radius:0 !important; }
      .mobile-pad { padding-right:20px !important; padding-left:20px !important; }
      .hero-title { font-size:30px !important; line-height:1.18 !important; }
      .step-copy { font-size:14px !important; }
      .cta { display:block !important; width:auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3ecdf;font-family:Arial,'Rubik',sans-serif;color:#24113f;direction:rtl;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3ecdf;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border-radius:30px;overflow:hidden;box-shadow:0 18px 48px rgba(42,16,70,.16);">
        <tr><td align="center" class="mobile-pad" style="background-color:#241153;background-image:linear-gradient(135deg,#191265 0%,#5f176c 58%,#b1247f 100%);padding:30px 32px 34px;">
          <img src="${HILIT_PROFILE_IMAGE}" width="78" height="78" alt="הילית כספי" style="display:block;width:78px;height:78px;border-radius:50%;object-fit:cover;border:3px solid #ffe27c;box-shadow:0 8px 24px rgba(0,0,0,.22);">
          <p style="margin:14px 0 0;color:#ffe27c;font-size:13px;font-weight:800;letter-spacing:.2px;">חדש לחברי המאגר</p>
          <h1 class="hero-title" style="margin:8px auto 0;max-width:500px;color:#ffffff;font-size:36px;line-height:1.2;font-weight:900;">ביקשתם יותר אפשרויות.<br>עכשיו הבחירה גם בידיים שלכם.</h1>
          <p style="margin:16px auto 0;max-width:470px;color:rgba(255,255,255,.86);font-size:16px;line-height:1.7;">הכירו את Boost, אפשרות חדשה שמתווספת להתאמות שאני ממשיכה לבחון ולשלוח.</p>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:30px 34px 12px;text-align:right;">
          <p style="margin:0 0 14px;color:#24113f;font-size:18px;font-weight:800;">${greeting}</p>
          <p style="margin:0 0 12px;color:#4b3a59;font-size:16px;line-height:1.8;">ביקשתם יותר התאמות, ואני מקשיבה. אחרי אישור קצר תוכלו לראות באזור האישי אפשרויות התאמה נוספות, כשהן זמינות, ולבחור בעצמכם אם לשלוח בקשת Boost.</p>
          <p style="margin:0;color:#4b3a59;font-size:16px;line-height:1.8;">ההצטרפות מיועדת למי שכבר רשומים ופעילים במאגר. אישור השירות עצמו אינו כרוך בתשלום.</p>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:14px 34px 8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f8f3fb;border:1px solid #eadcf1;border-radius:22px;">
            <tr><td style="padding:22px 20px 18px;">
              <p style="margin:0 0 16px;color:#6f176f;font-size:17px;font-weight:900;text-align:center;">איך זה עובד?</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="top" width="40" style="padding:0 0 14px 10px;"><div style="width:30px;height:30px;line-height:30px;border-radius:50%;background:#ffe27c;color:#191265;text-align:center;font-weight:900;">1</div></td>
                  <td class="step-copy" style="padding:2px 0 14px;color:#4b3a59;font-size:15px;line-height:1.65;"><strong style="color:#24113f;">מאשרים את שירות Boost</strong> ונכנסים לאזור האישי.</td>
                </tr>
                <tr>
                  <td valign="top" width="40" style="padding:0 0 14px 10px;"><div style="width:30px;height:30px;line-height:30px;border-radius:50%;background:#ffe27c;color:#191265;text-align:center;font-weight:900;">2</div></td>
                  <td class="step-copy" style="padding:2px 0 14px;color:#4b3a59;font-size:15px;line-height:1.65;"><strong style="color:#24113f;">רואים אפשרויות נוספות</strong> ובוחרים אם לשלוח בקשה.</td>
                </tr>
                <tr>
                  <td valign="top" width="40" style="padding:0 0 0 10px;"><div style="width:30px;height:30px;line-height:30px;border-radius:50%;background:#ffe27c;color:#191265;text-align:center;font-weight:900;">3</div></td>
                  <td class="step-copy" style="padding:2px 0 0;color:#4b3a59;font-size:15px;line-height:1.65;"><strong style="color:#24113f;">שני הצדדים מחליטים בעצמם.</strong> לאחר שליחה, כל צד מקבל את פרטי ההצעה במייל ובוחר אם לאשר.</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:16px 34px 4px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#2b155c;background-image:linear-gradient(135deg,#2a125d 0%,#6f176f 60%,#b1247f 100%);border-radius:22px;">
            <tr><td style="padding:22px 20px;text-align:center;">
              <p style="margin:0 0 8px;color:#ffe27c;font-size:15px;font-weight:900;">הבחירה נשארת אצלכם</p>
              <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.75;">הצעות Boost נוצרות לפי האלגוריתם ואינן נבדקות אישית על ידי הילית. פרטי קשר נחשפים רק לאחר ששני הצדדים אישרו את ההתאמה.</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" class="mobile-pad" style="padding:24px 34px 12px;">
          <a class="cta" href="${enrollmentUrl}" style="display:inline-block;background:#ffe27c;color:#191265;text-decoration:none;padding:17px 32px;border-radius:15px;font-size:18px;font-weight:900;box-shadow:0 8px 22px rgba(25,18,101,.2);">אני רוצה לפתוח את Boost</a>
          <p style="margin:12px 0 0;color:#7a6c82;font-size:12px;line-height:1.7;">הזינו את המייל שאיתו נרשמתם למאגר ותקבלו קישור אישי לאישור.</p>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:12px 34px 28px;text-align:right;">
          <p style="margin:0;color:#4b3a59;font-size:15px;line-height:1.8;">מחכה לראות אילו אפשרויות חדשות ייפתחו עבורכם,</p>
          <p style="margin:5px 0 0;color:#24113f;font-size:16px;font-weight:800;line-height:1.7;">באהבה,<br>הילית כספי</p>
        </td></tr>

        <tr><td align="center" style="background:#191265;padding:20px 24px;">
          <p style="margin:0;color:#ffe27c;font-size:13px;font-weight:800;">הילית כספי | מאמנת ומרצה למציאת זוגיות</p>
          <p style="margin:7px 0 0;color:rgba(255,255,255,.68);font-size:11px;line-height:1.6;">המייל נשלח לחברי המאגר. זמינות אפשרויות Boost תלויה בהתאמות הקיימות ובתנאי השירות.</p>
          <p style="margin:9px 0 0;font-size:11px;"><a href="${unsubscribeUrl}" style="color:rgba(255,255,255,.62);text-decoration:underline;">הסרה מרשימת התפוצה</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textContent = `${greeting}

ביקשתם יותר אפשרויות. עכשיו הבחירה גם בידיים שלכם.

Boost הוא שירות חדש לחברי המאגר שמתווסף להתאמות שהילית ממשיכה לבחון ולשלוח. אחרי אישור קצר תוכלו לראות באזור האישי אפשרויות התאמה נוספות, כשהן זמינות, ולבחור אם לשלוח בקשת Boost.

איך זה עובד?
1. מאשרים את שירות Boost ונכנסים לאזור האישי.
2. רואים אפשרויות נוספות ובוחרים אם לשלוח בקשה.
3. לאחר שליחה, שני הצדדים מקבלים את פרטי ההצעה במייל וכל אחד בוחר אם לאשר. פרטי קשר נחשפים רק לאחר ששניהם אישרו.

הצעות Boost נוצרות לפי האלגוריתם ואינן נבדקות אישית על ידי הילית. ההצטרפות ואישור השירות אינם כרוכים בתשלום.

לאישור Boost:
${enrollmentUrl}

באהבה,
הילית כספי

להסרה מרשימת התפוצה:
${unsubscribeUrl}`;

  return { subject, preheader, htmlContent, textContent };
}
