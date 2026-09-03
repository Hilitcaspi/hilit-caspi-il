const HILIT_PROFILE_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

export const HOLIDAY_BUNDLE_DNA_SUBJECT = "שאלון ה־DNA היה נקודת הפתיחה. יש לי 10% בשבילך";
export const HOLIDAY_BUNDLE_DNA_PREHEADER =
  "להפוך את התובנה לעבודה אמיתית עם שלושה כלים למציאת זוגיות, עכשיו ב־359 ₪ עם הקוד HOLIDAY10";

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

export function buildHolidayBundleDnaNewsletter(input: {
  firstName?: string | null;
  offerUrl: string;
  unsubscribeUrl: string;
}) {
  const firstName = escapeHtml(String(input.firstName || "").trim());
  const greeting = firstName ? `היי ${firstName},` : "היי,";
  const offerUrl = safeHttpsUrl(input.offerUrl, "https://hilitcaspi.com/new-year-love");
  const unsubscribeUrl = safeHttpsUrl(input.unsubscribeUrl, "https://hilitcaspi.com/unsubscribe");
  const subject = HOLIDAY_BUNDLE_DNA_SUBJECT;
  const preheader = HOLIDAY_BUNDLE_DNA_PREHEADER;

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
      .hero-title { font-size:30px !important; line-height:1.2 !important; }
      .cta { display:block !important; width:auto !important; }
      .tool-name { font-size:15px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eee5d9;font-family:Arial,'Rubik',sans-serif;color:#2b211b;direction:rtl;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eee5d9;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#fffdf9;border-radius:30px;overflow:hidden;box-shadow:0 18px 48px rgba(49,31,21,.16);">
        <tr><td align="center" class="mobile-pad" style="background-color:#24150f;background-image:linear-gradient(135deg,#17100c 0%,#4a2d1f 54%,#8a6244 100%);padding:30px 32px 36px;">
          <img src="${HILIT_PROFILE_IMAGE}" width="78" height="78" alt="הילית כספי" style="display:block;width:78px;height:78px;border-radius:50%;object-fit:cover;border:3px solid #f2d5ad;box-shadow:0 8px 24px rgba(0,0,0,.28);">
          <p style="margin:14px 0 0;color:#f1c58f;font-size:13px;font-weight:800;">במיוחד למי שהשלימו את שאלון ה־DNA</p>
          <h1 class="hero-title" style="margin:9px auto 0;max-width:520px;color:#fffaf3;font-size:36px;line-height:1.2;font-weight:900;">שאלון ה־DNA היה<br>נקודת הפתיחה.</h1>
          <p style="margin:14px auto 0;max-width:480px;color:rgba(255,250,243,.84);font-size:17px;line-height:1.7;">אהבתם והתחברתם לתוצאות? עכשיו הזמן להפוך את התובנה לעבודה אמיתית.</p>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:30px 34px 12px;text-align:right;">
          <p style="margin:0 0 14px;color:#2b211b;font-size:18px;font-weight:800;">${greeting}</p>
          <p style="margin:0 0 12px;color:#5e5047;font-size:16px;line-height:1.85;">שאלון ה־DNA עזר לזהות דפוסים, צרכים והעדפות שמנהלים את הבחירה הזוגית. אבל תובנה היא רק ההתחלה. השינוי מגיע כשמתרגמים אותה לשאלות נכונות, לתרגול, לבחירה אחרת ולהזדמנות אמיתית להכיר.</p>
          <p style="margin:0;color:#5e5047;font-size:16px;line-height:1.85;">לכבוד החגים חיברתי שלושה כלים שנולדו מתוך העבודה והשיטה שלי, למסלול אחד שאפשר לעבור גם באופן עצמאי.</p>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:14px 34px 8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5eee5;border:1px solid #e4d3c2;border-radius:22px;">
            <tr><td style="padding:22px 20px 8px;text-align:center;">
              <p style="margin:0;color:#7a4d30;font-size:17px;font-weight:900;">שלושה כלים. דרך אחת להתקדם.</p>
            </td></tr>
            <tr><td style="padding:8px 20px 22px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr><td style="padding:12px 0;border-bottom:1px solid #decdbd;color:#5e5047;font-size:14px;line-height:1.7;"><strong class="tool-name" style="display:block;color:#2b211b;font-size:16px;">המדריך ״לבחור נכון״</strong>לדייק מה באמת מתאים ולזהות מתי דפוס ישן מנהל את הבחירה.</td></tr>
                <tr><td style="padding:12px 0;border-bottom:1px solid #decdbd;color:#5e5047;font-size:14px;line-height:1.7;"><strong class="tool-name" style="display:block;color:#2b211b;font-size:16px;">הקורס ״המסע לזוגיות״</strong>להעמיק, לתרגל ולבנות מפה ברורה של הדרך לזוגיות שרוצים.</td></tr>
                <tr><td style="padding:12px 0 0;color:#5e5047;font-size:14px;line-height:1.7;"><strong class="tool-name" style="display:block;color:#2b211b;font-size:16px;">מאגר הרווקים החכם</strong>לחבר את ההבנה להזדמנות אמיתית להכיר אנשים שמחפשים קשר.</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:16px 34px 4px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#24150f;background-image:linear-gradient(135deg,#21130e 0%,#553321 100%);border-radius:22px;">
            <tr><td style="padding:24px 20px;text-align:center;">
              <p style="margin:0;color:#f2cfaa;font-size:14px;font-weight:800;">מתנה אישית ממני למי שהשלימו את השאלון</p>
              <p style="margin:9px 0 2px;color:#fffaf3;font-size:16px;line-height:1.6;">באנדל החג במחיר 399 ₪</p>
              <p style="margin:0;color:#f5c98f;font-size:32px;line-height:1.2;font-weight:900;">359 ₪ עם הקוד HOLIDAY10</p>
              <p style="margin:10px 0 0;color:rgba(255,250,243,.72);font-size:12px;line-height:1.6;">10% הנחה עד יום ראשון, 6.9 בשעה 23:59. תשלום חד־פעמי וללא מנוי.</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" class="mobile-pad" style="padding:24px 34px 12px;">
          <a class="cta" href="${offerUrl}" style="display:inline-block;background:#e8c08d;color:#291b13;text-decoration:none;padding:17px 32px;border-radius:15px;font-size:18px;font-weight:900;box-shadow:0 8px 22px rgba(72,42,26,.22);">אני רוצה להמשיך מהתובנה לאהבה</a>
          <p style="margin:12px 0 0;color:#7d6e64;font-size:12px;line-height:1.7;">הקוד כבר יחכה לך בעמוד. לאחר הזנת המייל הוא ייבדק אוטומטית לפני התשלום.</p>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:12px 34px 28px;text-align:right;">
          <p style="margin:0;color:#5e5047;font-size:15px;line-height:1.8;">אני באמת מאמינה שהכלים האלה יכולים לעזור להפוך הבנה לתנועה,</p>
          <p style="margin:5px 0 0;color:#2b211b;font-size:16px;font-weight:800;line-height:1.7;">באהבה,<br>הילית כספי</p>
        </td></tr>

        <tr><td align="center" style="background:#21130e;padding:20px 24px;">
          <p style="margin:0;color:#e8c08d;font-size:13px;font-weight:800;">הילית כספי | מאמנת ומרצה למציאת זוגיות</p>
          <p style="margin:7px 0 0;color:rgba(255,255,255,.66);font-size:11px;line-height:1.6;">המייל נשלח לאחר השלמת שאלון ה־DNA והסכמה לקבלת תוצאות ועדכונים בדואר אלקטרוני.</p>
          <p style="margin:9px 0 0;font-size:11px;"><a href="${unsubscribeUrl}" style="color:rgba(255,255,255,.62);text-decoration:underline;">הסרה מרשימת התפוצה</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textContent = `${greeting}

שאלון ה־DNA היה נקודת הפתיחה.

אהבתם והתחברתם לתוצאות? עכשיו הזמן להפוך את התובנה לעבודה אמיתית.

לכבוד החגים חיברתי שלושה כלים שנולדו מתוך העבודה והשיטה שלי:
המדריך ״לבחור נכון״
הקורס ״המסע לזוגיות״
מאגר הרווקים החכם

באנדל החג במחיר 399 ₪.
עם הקוד HOLIDAY10 המחיר הוא 359 ₪.
הקוד מעניק 10% הנחה ותקף עד יום ראשון, 6.9 בשעה 23:59.

להצטרפות:
${offerUrl}

באהבה,
הילית כספי

להסרה מרשימת התפוצה:
${unsubscribeUrl}`;

  return { subject, preheader, htmlContent, textContent };
}
