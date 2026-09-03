const SITE_BASE = "https://hilitcaspi.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type NewYearBundleEmailInput = {
  firstName: string;
  email: string;
  courseUrl: string;
  guideUrl: string;
};

export function buildNewYearBundleAccessEmail({
  firstName,
  email,
  courseUrl,
  guideUrl,
}: NewYearBundleEmailInput) {
  const safeFirstName = escapeHtml(firstName.trim());
  const greeting = safeFirstName ? `שלום ${safeFirstName},` : "שלום,";
  const unsubscribeUrl = `${SITE_BASE}/unsubscribe?email=${encodeURIComponent(email)}`;

  const subject = "חבילת החג שלך מוכנה | הקורס והמדריך בפנים";
  const textContent = `${greeting}\n\nהרכישה הושלמה וכל חלקי חבילת החג מוכנים.\n\nאת הקישור האישי למאגר קיבלת במייל נפרד.\n\nקורס המסע לזוגיות: ${courseUrl}\n\nהמדריך לבחור נכון: ${guideUrl}\n\nמומלץ לשמור את המייל. הקישורים אישיים וזמינים לחזרה בכל עת.\n\nלשאלות: https://wa.me/972552442334\n\nבאהבה,\nהילית כספי`;

  const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2ece2;font-family:Arial,sans-serif;direction:rtl;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">הקורס ״המסע לזוגיות״ והמדריך ״לבחור נכון״ מחכים לכם בפנים</div>
  <div style="max-width:620px;margin:0 auto;padding:24px 12px;">
    <div style="background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 16px 50px rgba(45,27,18,0.12);">
      <div style="background:#2b1711;padding:42px 32px;text-align:center;">
        <p style="color:#d8b88e;font-size:13px;letter-spacing:1px;margin:0 0 12px;">הילית כספי | מומחית לזוגיות</p>
        <h1 style="color:#fff8ee;font-size:30px;line-height:1.25;margin:0 0 10px;">חבילת החג שלך מוכנה</h1>
        <p style="color:#eadac6;font-size:16px;margin:0;">הקורס והמדריך מחכים לכם</p>
      </div>
      <div style="padding:38px 30px;">
        <p style="font-size:19px;color:#2b1711;margin:0 0 18px;font-weight:700;">${greeting}</p>
        <p style="font-size:16px;color:#5f514a;line-height:1.8;margin:0 0 10px;">הרכישה הושלמה וכל חלקי חבילת החג מוכנים.</p>
        <p style="font-size:15px;color:#786a62;line-height:1.7;margin:0 0 28px;">את הקישור האישי לכניסה למאגר קיבלת במייל נפרד. כאן מחכים שני הכלים הדיגיטליים שלך.</p>

        <div style="background:#f7f1e8;border:1px solid #e7d5bd;border-radius:16px;padding:24px;margin:0 0 18px;">
          <p style="font-size:13px;color:#9a7652;margin:0 0 7px;font-weight:700;">הקורס הדיגיטלי</p>
          <h2 style="font-size:23px;color:#2b1711;margin:0 0 10px;">המסע לזוגיות</h2>
          <p style="font-size:15px;color:#5f514a;line-height:1.7;margin:0 0 20px;">חמישה מודולים מעשיים שיעזרו להבין דפוסים, לדייק בחירות ולבנות דרך ברורה יותר לזוגיות.</p>
          <div style="text-align:center;"><a href="${courseUrl}" style="display:inline-block;background:#2b1711;color:#fff8ee;font-size:17px;font-weight:700;padding:15px 34px;border-radius:12px;text-decoration:none;">כניסה לקורס</a></div>
        </div>

        <div style="background:#fffaf3;border:1px solid #e7d5bd;border-radius:16px;padding:24px;margin:0 0 24px;">
          <p style="font-size:13px;color:#9a7652;margin:0 0 7px;font-weight:700;">המדריך הדיגיטלי</p>
          <h2 style="font-size:23px;color:#2b1711;margin:0 0 10px;">לבחור נכון</h2>
          <p style="font-size:15px;color:#5f514a;line-height:1.7;margin:0 0 20px;">שאלות, תרגילים וכלים שיעזרו לבחון מחדש מה נכון לכם ומה עלול לגרום לפספס חיבור מתאים.</p>
          <div style="text-align:center;"><a href="${guideUrl}" style="display:inline-block;background:#c8a272;color:#21120d;font-size:17px;font-weight:700;padding:15px 34px;border-radius:12px;text-decoration:none;">פתיחת המדריך</a></div>
        </div>

        <div style="background:#f2ece2;border-radius:12px;padding:18px 20px;margin:0 0 24px;">
          <p style="font-size:14px;color:#5f514a;line-height:1.7;margin:0;">מומלץ לשמור את המייל. שני הקישורים אישיים וזמינים לחזרה בכל עת.</p>
        </div>

        <div style="text-align:center;margin:0 0 26px;"><a href="https://wa.me/972552442334" style="display:inline-block;border:2px solid #2b1711;color:#2b1711;font-size:15px;font-weight:700;padding:12px 26px;border-radius:10px;text-decoration:none;">שאלה? כתבו לי בוואטסאפ</a></div>
        <p style="font-size:15px;color:#2b1711;font-weight:700;margin:0;">באהבה,<br>הילית כספי</p>
      </div>
      <div style="background:#2b1711;padding:20px 28px;text-align:center;">
        <p style="color:rgba(255,248,238,0.6);font-size:12px;line-height:1.6;margin:0;">קיבלת את המייל כי רכשת את חבילת החג של הילית כספי.<br><a href="${unsubscribeUrl}" style="color:rgba(255,248,238,0.6);">הסרה מרשימת התפוצה</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, htmlContent, textContent };
}
