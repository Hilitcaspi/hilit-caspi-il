import {
  DATABASE_NOW_COUPON,
  DATABASE_NOW_MAX_USES,
  DATABASE_NOW_PRICE_ILS,
  DATABASE_REGULAR_PRICE_ILS,
} from "../shared/databaseHolidayNow";

const HILIT_HERO = "https://hilitcaspi.com/manus-storage/database-now-hilit-hero_cde5a6ed.jpg";
const HILIT_PHONE = "https://hilitcaspi.com/manus-storage/database-now-hilit-phone_26a5256f.jpg";
const HILIT_AUTHORITY = "https://hilitcaspi.com/manus-storage/database-now-hilit-authority_ce858975.jpg";
const COUPLE_CAFE = "https://hilitcaspi.com/manus-storage/database-now-couple-cafe_648c4aaf.jpg";
const COUPLE_WALK = "https://hilitcaspi.com/manus-storage/database-now-couple-walk_609920bc.jpg";

export const DATABASE_NOW_SUBJECT = "🎁 הבשורה לחג: ההתאמה הראשונה שלך בתוך 3 ימים";
export const DATABASE_NOW_PREHEADER = `עד ${DATABASE_NOW_MAX_USES} מימושים בסך הכול: הצעת התאמה ראשונה בתוך 3 ימים, עם הטבת הצטרפות מיוחדת ותשלום חד־פעמי.`;

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

export function buildDatabaseHolidayNowNewsletter(input: {
  firstName?: string | null;
  offerUrl: string;
  unsubscribeUrl: string;
}) {
  const firstName = escapeHtml(String(input.firstName || "").trim());
  const greeting = firstName ? `היי ${firstName},` : "היי,";
  const offerUrl = safeHttpsUrl(input.offerUrl, "https://hilitcaspi.com/database");
  const unsubscribeUrl = safeHttpsUrl(input.unsubscribeUrl, "https://hilitcaspi.com/unsubscribe");

  const htmlContent = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <title>${DATABASE_NOW_SUBJECT}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap');
    body, table, td, p, a, span, h1, h2, h3 { font-family:'Rubik',Arial,'Helvetica Neue',sans-serif !important; }
    @media only screen and (max-width:640px) {
      .shell { width:100% !important; border-radius:0 !important; }
      .pad { padding-right:22px !important; padding-left:22px !important; }
      .hero-title { font-size:39px !important; line-height:1.06 !important; }
      .section-title { font-size:28px !important; line-height:1.18 !important; }
      .price { font-size:73px !important; }
      .stack-cell { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .stack-image { display:block !important; width:100% !important; }
      .cta { display:block !important; width:auto !important; }
      .quote-cell { display:block !important; width:100% !important; box-sizing:border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3eee9;color:#241d2b;direction:rtl;font-family:'Rubik',Arial,'Helvetica Neue',sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${DATABASE_NOW_PREHEADER}&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3eee9;font-family:'Rubik',Arial,'Helvetica Neue',sans-serif;">
    <tr><td align="center" style="padding:24px 10px;">
      <table role="presentation" class="shell" width="680" cellspacing="0" cellpadding="0" border="0" style="width:680px;max-width:680px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 68px rgba(82,48,65,.16);">
        <tr><td style="background:#fff;padding:14px 24px;text-align:center;color:#672541;font-size:11px;letter-spacing:2px;font-weight:700;border-bottom:1px solid #f1e7e9;">HILIT CASPI · LOVE CLUB HOLIDAY EDIT</td></tr>

        <tr><td style="padding:0;background:#eaded8;">
          <img src="${HILIT_HERO}" width="680" alt="הילית כספי" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>

        <tr><td class="pad" style="padding:36px 46px 42px;text-align:center;background:#f7dfe5;">
          <p style="margin:0;color:#a34366;font-size:12px;letter-spacing:1.6px;font-weight:700;">הבשורה הגדולה לחג</p>
          <h1 class="hero-title" style="margin:13px auto 0;max-width:590px;color:#2b1830;font-size:49px;line-height:1.04;font-weight:700;letter-spacing:-1.3px;">ההתאמה הראשונה שלך<br />בתוך 3 ימים</h1>
          <p style="margin:19px auto 0;max-width:550px;color:#594753;font-size:18px;line-height:1.72;">לעד ${DATABASE_NOW_MAX_USES} מימושים בסך הכול אני מתחייבת להצעת התאמה ראשונה בתוך 3 ימים מסיום הפרופיל והשאלון. בנוסף מחכה לך הטבת הצטרפות מיוחדת ותשלום חד־פעמי.</p>
          <div style="margin-top:25px;"><a class="cta" href="${offerUrl}" style="display:inline-block;background:#6f2345;color:#fff;text-decoration:none;padding:18px 35px;border-radius:999px;font-size:17px;font-weight:700;box-shadow:0 12px 28px rgba(111,35,69,.22);">אני רוצה להיכנס למאגר</a></div>
        </td></tr>

        <tr><td class="pad" style="padding:38px 46px 18px;background:#fff;text-align:right;">
          <p style="margin:0 0 13px;font-size:20px;font-weight:700;color:#2b1830;">${greeting}</p>
          <p style="margin:0;color:#615561;font-size:16px;line-height:1.9;">אם מילאת את שאלון ה־DNA, השארת פרטים או כמעט הצטרפת ואז עצרת, אני רוצה להגיד לך משהו פשוט: לא צריך לחזור לאפליקציות ולעשות הכול לבד.</p>
          <p style="margin:14px 0 0;color:#615561;font-size:16px;line-height:1.9;">במאגר שלי יש יותר מאלף חברים פעילים, ואלפי נרשמים כבר עברו דרך שאלון ה־DNA והמערכת. אני משלבת בין הנתונים, ההעדפות וה־DNA הזוגי לבין בדיקה אנושית שלי, כדי לחפש חיבור שיש לו סיבה אמיתית להתחיל.</p>
        </td></tr>

        <tr><td style="padding:18px 0 8px;background:#fff;">
          <img src="${COUPLE_WALK}" width="680" alt="זוג הולך יחד" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>

        <tr><td class="pad" style="padding:35px 46px 12px;background:#fff;text-align:center;">
          <p style="margin:0;color:#a34366;font-size:12px;letter-spacing:1.5px;font-weight:700;">מה מחכה בפנים?</p>
          <h2 class="section-title" style="margin:9px auto 22px;max-width:520px;color:#2b1830;font-size:34px;line-height:1.18;font-weight:700;">הרבה יותר מעוד רשימת פרופילים</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td class="stack-cell" width="50%" valign="top" style="padding:6px;"><div style="background:#fff7f8;border:1px solid #f0dfe4;border-radius:19px;padding:22px 18px;min-height:142px;text-align:right;"><div style="font-size:25px;">🧬</div><strong style="display:block;margin-top:9px;color:#2b1830;font-size:16px;">התאמות על בסיס DNA זוגי</strong><span style="display:block;margin-top:7px;color:#6d5e66;font-size:13px;line-height:1.65;">לא רק תמונה וגיל. המערכת מחברת בין עשרות פרמטרים ואני עוברת על האפשרויות בעצמי.</span></div></td>
              <td class="stack-cell" width="50%" valign="top" style="padding:6px;"><div style="background:#fff7f8;border:1px solid #f0dfe4;border-radius:19px;padding:22px 18px;min-height:142px;text-align:right;"><div style="font-size:25px;">💌</div><strong style="display:block;margin-top:9px;color:#2b1830;font-size:16px;">Boost לחברי המאגר</strong><span style="display:block;margin-top:7px;color:#6d5e66;font-size:13px;line-height:1.65;">רואים ומקבלים הצעות Boost בחינם. שולחים באופן יזום רק אם רוצים, בעלות 19.90 ₪.</span></div></td>
            </tr>
            <tr>
              <td class="stack-cell" width="50%" valign="top" style="padding:6px;"><div style="background:#fff7f8;border:1px solid #f0dfe4;border-radius:19px;padding:22px 18px;min-height:142px;text-align:right;"><div style="font-size:25px;">✨</div><strong style="display:block;margin-top:9px;color:#2b1830;font-size:16px;">אפשרות להופיע ברווק השבוע</strong><span style="display:block;margin-top:7px;color:#6d5e66;font-size:13px;line-height:1.65;">פינת החשיפה מיועדת לחברי המאגר ופותחת עוד דרך איכותית להכיר.</span></div></td>
              <td class="stack-cell" width="50%" valign="top" style="padding:6px;"><div style="background:#fff7f8;border:1px solid #f0dfe4;border-radius:19px;padding:22px 18px;min-height:142px;text-align:right;"><div style="font-size:25px;">🤍</div><strong style="display:block;margin-top:9px;color:#2b1830;font-size:16px;">פרטיות ואישור הדדי</strong><span style="display:block;margin-top:7px;color:#6d5e66;font-size:13px;line-height:1.65;">הפרטים נפתחים רק אחרי ששני הצדדים רוצים להמשיך. אין חשיפה אוטומטית.</span></div></td>
            </tr>
          </table>
        </td></tr>

        <tr><td class="pad" style="padding:25px 46px 12px;background:#fff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#6f2345;border-radius:24px;overflow:hidden;">
            <tr><td style="padding:31px 25px;text-align:center;">
              <p style="margin:0;color:#ffd9e5;font-size:12px;letter-spacing:1.4px;font-weight:700;">ההבטחה שלי ל־${DATABASE_NOW_MAX_USES} הראשונים</p>
              <h2 class="section-title" style="margin:10px auto 0;max-width:520px;color:#fff;font-size:36px;line-height:1.22;font-weight:700;">הצעת התאמה ראשונה<br />בתוך 3 ימים</h2>
              <p style="margin:14px auto 0;max-width:520px;color:#f8eaf0;font-size:15px;line-height:1.75;">הספירה מתחילה ברגע שהפרופיל והשאלון הושלמו במלואם. אני עוברת על הפרופיל ומכניסה אותו מיד לסבב ההתאמות.</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="pad" style="padding:29px 46px 16px;background:#fff;text-align:center;">
          <p style="margin:0;color:#a34366;font-size:12px;letter-spacing:1.4px;font-weight:700;">מה אומרים אחרי התאמות?</p>
          <h2 class="section-title" style="margin:8px 0 20px;color:#2b1830;font-size:31px;font-weight:700;">משובים אמיתיים של 5/5</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td class="quote-cell" width="50%" valign="top" style="padding:6px;"><div style="background:#f4ecf4;border-radius:19px;padding:21px 18px;text-align:right;min-height:125px;"><div style="color:#c18a2f;font-size:18px;letter-spacing:2px;">★★★★★</div><p style="margin:10px 0 0;color:#493b49;font-size:14px;line-height:1.75;">״היה ערב מהמם! נהנינו מאוד והרגשתי שיש חיבור טוב.״</p><p style="margin:9px 0 0;color:#9a6f82;font-size:11px;font-weight:700;">משוב אנונימי לאחר התאמה</p></div></td>
              <td class="quote-cell" width="50%" valign="top" style="padding:6px;"><div style="background:#f4ecf4;border-radius:19px;padding:21px 18px;text-align:right;min-height:125px;"><div style="color:#c18a2f;font-size:18px;letter-spacing:2px;">★★★★★</div><p style="margin:10px 0 0;color:#493b49;font-size:14px;line-height:1.75;">״היה מעולה. אפילו קבענו להיפגש שוב. תודה רבה!״</p><p style="margin:9px 0 0;color:#9a6f82;font-size:11px;font-weight:700;">משוב אנונימי לאחר התאמה</p></div></td>
            </tr>
            <tr><td colspan="2" style="padding:6px;"><div style="background:#fff7f8;border:1px solid #f0dfe4;border-radius:19px;padding:20px;text-align:center;"><div style="color:#c18a2f;font-size:18px;letter-spacing:2px;">★★★★★</div><p style="margin:9px auto 0;max-width:500px;color:#493b49;font-size:14px;line-height:1.75;">״הופתעתי לטובה. השיחה זרמה והייתה תחושה נעימה ומדויקת.״</p><p style="margin:8px 0 0;color:#9a6f82;font-size:11px;font-weight:700;">משוב אנונימי לאחר התאמה</p></div></td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:19px 0 8px;background:#fff;">
          <img src="${COUPLE_CAFE}" width="680" alt="זוג בדייט" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>

        <tr><td class="pad" style="padding:34px 46px 13px;background:#fff;text-align:center;">
          <p style="margin:0;color:#a34366;font-size:12px;letter-spacing:1.5px;font-weight:700;">הטבת חג · עד 1.10</p>
          <h2 class="section-title" style="margin:9px auto 13px;max-width:520px;color:#2b1830;font-size:33px;line-height:1.2;font-weight:700;">כניסה מלאה למאגר.<br />תשלום אחד. בלי מנוי.</h2>
          <div class="price" style="margin-top:4px;color:#6f2345;font-size:86px;line-height:1;font-weight:700;letter-spacing:-3px;">${DATABASE_NOW_PRICE_ILS}<span style="font-size:29px;letter-spacing:0;"> ₪</span></div>
          <p style="margin:9px 0 0;color:#786a73;font-size:15px;"><span style="text-decoration:line-through;">${DATABASE_REGULAR_PRICE_ILS} ₪</span> · תשלום חד־פעמי</p>
          <p style="margin:15px auto 0;max-width:520px;color:#5f515c;font-size:14px;line-height:1.72;">קוד ההטבה <strong style="color:#6f2345;">${DATABASE_NOW_COUPON}</strong> כבר מחכה בקישור. כך גם אדע שהצטרפת דרך הטבת שלושת הימים ואוכל לעקוב אחר ההבטחה במערכת.</p>
          <div style="margin-top:22px;"><a class="cta" href="${offerUrl}" style="display:inline-block;background:#6f2345;color:#fff;text-decoration:none;padding:18px 37px;border-radius:999px;font-size:18px;font-weight:700;box-shadow:0 12px 30px rgba(111,35,69,.2);">להצטרפות ב־299 ₪</a></div>
          <p style="margin:11px 0 0;color:#9c7c89;font-size:12px;line-height:1.6;">ל־${DATABASE_NOW_MAX_USES} המימושים הראשונים או עד 1.10, המוקדם מביניהם.</p>
        </td></tr>

        <tr><td class="pad" style="padding:28px 46px 14px;background:#fff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7dfe5;border-radius:22px;overflow:hidden;">
            <tr>
              <td class="stack-image" width="44%" valign="middle"><img src="${HILIT_PHONE}" width="260" alt="הילית כספי" style="display:block;width:100%;height:auto;border:0;" /></td>
              <td class="stack-cell" width="56%" valign="middle" style="padding:25px 24px;text-align:right;">
                <p style="margin:0;color:#6f2345;font-size:12px;font-weight:700;letter-spacing:1px;">למה דווקא עכשיו?</p>
                <p style="margin:9px 0 0;color:#3f3040;font-size:15px;line-height:1.78;">כי החגים מזכירים לנו מה אנחנו באמת רוצים לידנו. אני מגבילה את ההטבה כדי שאוכל לתת לכל מצטרף ומצטרפת את הדחיפה האישית שהבטחתי, ולא להפוך את זה לעוד קמפיין המוני.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td class="pad" style="padding:20px 46px 35px;background:#fff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #eadfe3;padding-top:22px;">
            <tr>
              <td width="92" valign="middle"><img src="${HILIT_AUTHORITY}" width="78" height="78" alt="הילית כספי" style="display:block;width:78px;height:78px;object-fit:cover;border-radius:50%;border:3px solid #d8a64b;" /></td>
              <td valign="middle" style="padding-right:13px;color:#5f515c;font-size:15px;line-height:1.72;">אני כאן כדי להפוך את החיפוש ממסע מתיש לתהליך מדויק, אנושי ומלא אפשרויות חדשות.<br /><strong style="color:#6f2345;">באהבה, הילית</strong></td>
            </tr>
          </table>
          <p style="margin:20px 0 0;color:#8d8188;font-size:11px;line-height:1.72;">ההבטחה היא להצעת התאמה ראשונה שנבדקה ונשלחה בתוך שלושה ימים מהשלמת הפרופיל והשאלון. אישור הדדי, פגישה או זוגיות אינם מובטחים.</p>
        </td></tr>

        <tr><td align="center" style="background:#2b1830;padding:21px 24px;color:#d6cbd2;font-size:11px;line-height:1.65;">המייל נשלח בעקבות התעניינות קודמת בשאלון או במאגר.<br /><a href="${unsubscribeUrl}" style="color:#f4c7d7;text-decoration:underline;">הסרה מרשימת הדיוור</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textContent = `${greeting}

נרשמת בעבר והתעניינת במאגר. לכבוד החג אני פותחת עבורך הצעה חדשה.

המאגר שלי אינו אפליקציה שבה ממשיכים לגלול לבד. יש בו יותר מאלף חברים פעילים, שאלון DNA זוגי, בדיקה אנושית שלי, פרטיות ואישור הדדי.

חברי המאגר יכולים לראות ולקבל הצעות Boost בחינם, לבחור אם לשלוח Boost בעלות 19.90 ₪ ולהשתתף בפינת רווק השבוע.

ההבטחה שלי ל־${DATABASE_NOW_MAX_USES} המצטרפים הראשונים:
הצעת התאמה ראשונה בתוך 3 ימים מרגע שהפרופיל והשאלון הושלמו במלואם.

המחיר: ${DATABASE_NOW_PRICE_ILS} ₪ במקום ${DATABASE_REGULAR_PRICE_ILS} ₪.
תשלום חד־פעמי, ללא מנוי.
קוד ההטבה: ${DATABASE_NOW_COUPON}

להצטרפות:
${offerUrl}

ההבטחה היא להצעת התאמה שנבדקה ונשלחה. אישור הדדי, פגישה או זוגיות אינם מובטחים.

באהבה,
הילית

להסרה:
${unsubscribeUrl}`;

  return {
    subject: DATABASE_NOW_SUBJECT,
    preheader: DATABASE_NOW_PREHEADER,
    htmlContent,
    textContent,
  };
}
