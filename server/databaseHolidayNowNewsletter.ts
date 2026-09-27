import {
  DATABASE_NOW_COUPON,
  DATABASE_NOW_MAX_USES,
  DATABASE_NOW_PRICE_ILS,
  DATABASE_REGULAR_PRICE_ILS,
} from "../shared/databaseHolidayNow";

const HERO_IMAGE = "https://hilitcaspi.com/manus-storage/database-now-hero_c48e5ac3.jpg";
const PORTRAIT_IMAGE = "https://hilitcaspi.com/manus-storage/plus-email-hilit-full_0acd266d.jpg";

export const DATABASE_NOW_SUBJECT = "נרשמת בעבר. היום אני פותחת לך את המאגר ב־149 ₪";
export const DATABASE_NOW_PREHEADER = "וגם: התאמה ראשונה בתוך 3 ימים מהשלמת הפרופיל והשאלון. קוד NOW, היום בלבד.";

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
  <title>${DATABASE_NOW_SUBJECT}</title>
  <style>
    @media only screen and (max-width:640px) {
      .shell { width:100% !important; border-radius:0 !important; }
      .pad { padding-right:22px !important; padding-left:22px !important; }
      .hero-title { font-size:38px !important; line-height:1.05 !important; }
      .offer-price { font-size:70px !important; }
      .stack, .stack-cell { display:block !important; width:100% !important; }
      .cta { display:block !important; width:auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eee6df;font-family:Arial,'Helvetica Neue',sans-serif;color:#241f2f;direction:rtl;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${DATABASE_NOW_PREHEADER}&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eee6df;">
    <tr><td align="center" style="padding:24px 10px;">
      <table role="presentation" class="shell" width="680" cellspacing="0" cellpadding="0" border="0" style="width:680px;max-width:680px;background:#fffdf9;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(37,25,45,.16);">
        <tr><td style="background:#18132e;padding:13px 24px;text-align:center;color:#ead49d;font-size:11px;letter-spacing:2.2px;font-weight:800;">HILIT CASPI · HOLIDAY EDIT</td></tr>
        <tr><td style="padding:0;background:#d6d2ca;">
          <img src="${HERO_IMAGE}" width="680" alt="הילית כספי" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>
        <tr><td class="pad" style="padding:34px 42px 38px;text-align:center;background:#f5d9de;">
          <p style="margin:0;color:#8a3150;font-size:12px;letter-spacing:1.8px;font-weight:900;">A HOLIDAY GIFT FOR LOVE</p>
          <h1 class="hero-title" style="margin:13px auto 0;max-width:580px;color:#18132e;font-family:Georgia,'Times New Roman',serif;font-size:48px;line-height:1.04;font-weight:500;">השנה מתחילים<br />לא רק בהחלטה.</h1>
          <p style="margin:18px auto 0;max-width:530px;color:#493f4d;font-size:18px;line-height:1.75;">נרשמת בעבר והתעניינת. היום אני פותחת עבורך את הדרך הקצרה להיכנס למאגר ולהתחיל לקבל הזדמנויות אמיתיות להיכרות.</p>
          <div style="margin-top:24px;"><a class="cta" href="${offerUrl}" style="display:inline-block;background:#18132e;color:#fff;text-decoration:none;padding:17px 34px;border-radius:4px;font-size:17px;font-weight:900;">אני רוצה להתחיל עכשיו</a></div>
        </td></tr>

        <tr><td class="pad" style="padding:34px 42px 10px;background:#fffdf9;text-align:right;">
          <p style="margin:0 0 13px;font-size:19px;font-weight:900;color:#18132e;">${greeting}</p>
          <p style="margin:0;color:#5c5361;font-size:16px;line-height:1.85;">אם שאלון ה־DNA, עמוד המאגר או אחת המודעות שלי גרמו לך לעצור ולחשוב שאולי הגיע הזמן לנסות דרך אחרת, זה בדיוק הרגע שחיכיתי לו.</p>
          <p style="margin:13px 0 0;color:#5c5361;font-size:16px;line-height:1.85;">המאגר שלי הוא לא אפליקציה שבה ממשיכים לגלול לבד. ממלאים פרופיל ושאלון מדעי, המערכת מחברת בין עשרות פרמטרים, ואני עוברת על האפשרויות ובודקת למי באמת יש סיבה להכיר.</p>
        </td></tr>

        <tr><td class="pad" style="padding:22px 42px 12px;background:#fffdf9;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#18132e;border-radius:24px;overflow:hidden;">
            <tr><td style="padding:29px 25px;text-align:center;">
              <p style="margin:0;color:#e8cf95;font-size:12px;letter-spacing:1.4px;font-weight:900;">ההבטחה שלי למצטרפים היום</p>
              <h2 style="margin:10px auto 0;max-width:500px;color:#fff;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.25;font-weight:500;">הצעת התאמה ראשונה<br />בתוך 3 ימים</h2>
              <p style="margin:13px auto 0;max-width:510px;color:#ded9e3;font-size:15px;line-height:1.75;">הספירה מתחילה מרגע שהפרופיל והשאלון הושלמו במלואם. אני נותנת גז, עוברת על הפרופיל ומכניסה אותו מיד לסבב ההתאמות.</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="pad" style="padding:24px 42px 8px;background:#fffdf9;text-align:center;">
          <p style="margin:0;color:#9a6b2f;font-size:12px;letter-spacing:1.4px;font-weight:900;">מה קורה אחרי ההצטרפות?</p>
          <h2 style="margin:9px 0 22px;color:#18132e;font-family:Georgia,'Times New Roman',serif;font-size:31px;font-weight:500;">פשוט. אישי. בלי לגלול.</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td class="stack-cell" width="33.33%" valign="top" style="padding:5px;"><div style="background:#f7f0ec;border:1px solid #eadbd1;border-radius:17px;padding:19px 13px;min-height:135px;"><div style="color:#b4476d;font-size:25px;font-weight:900;">01</div><strong style="display:block;margin-top:7px;color:#282035;font-size:16px;">משלימים פרופיל</strong><span style="display:block;margin-top:7px;color:#6a5f69;font-size:13px;line-height:1.6;">כמה דקות של פרטים ושאלון מדעי.</span></div></td>
              <td class="stack-cell" width="33.33%" valign="top" style="padding:5px;"><div style="background:#f7f0ec;border:1px solid #eadbd1;border-radius:17px;padding:19px 13px;min-height:135px;"><div style="color:#b4476d;font-size:25px;font-weight:900;">02</div><strong style="display:block;margin-top:7px;color:#282035;font-size:16px;">אני בודקת</strong><span style="display:block;margin-top:7px;color:#6a5f69;font-size:13px;line-height:1.6;">המערכת מסננת ואני עוברת על ההתאמות.</span></div></td>
              <td class="stack-cell" width="33.33%" valign="top" style="padding:5px;"><div style="background:#f7f0ec;border:1px solid #eadbd1;border-radius:17px;padding:19px 13px;min-height:135px;"><div style="color:#b4476d;font-size:25px;font-weight:900;">03</div><strong style="display:block;margin-top:7px;color:#282035;font-size:16px;">מקבלים הצעה</strong><span style="display:block;margin-top:7px;color:#6a5f69;font-size:13px;line-height:1.6;">רק אם שני הצדדים מאשרים, הפרטים נפתחים.</span></div></td>
            </tr>
          </table>
        </td></tr>

        <tr><td class="pad" style="padding:28px 42px 16px;background:#fffdf9;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3d4da;border-radius:24px;overflow:hidden;">
            <tr><td style="padding:30px 24px;text-align:center;">
              <span style="display:inline-block;background:#18132e;color:#ead49d;border-radius:999px;padding:7px 13px;font-size:11px;font-weight:900;">רק היום ול־${DATABASE_NOW_MAX_USES} הראשונים</span>
              <p style="margin:15px 0 0;color:#6b3247;font-size:14px;font-weight:900;">מחיר מיוחד עם הקוד ${DATABASE_NOW_COUPON}</p>
              <div class="offer-price" style="margin-top:2px;color:#18132e;font-family:Georgia,'Times New Roman',serif;font-size:84px;line-height:1;font-weight:700;">${DATABASE_NOW_PRICE_ILS}<span style="font-size:29px;"> ₪</span></div>
              <p style="margin:8px 0 0;color:#6d5d64;font-size:15px;"><span style="text-decoration:line-through;">${DATABASE_REGULAR_PRICE_ILS} ₪</span> · תשלום חד־פעמי · ללא מנוי</p>
              <div style="margin-top:23px;"><a class="cta" href="${offerUrl}" style="display:inline-block;background:#18132e;color:#fff;text-decoration:none;padding:18px 37px;border-radius:4px;font-size:18px;font-weight:900;">להצטרפות עם קוד NOW</a></div>
              <p style="margin:11px 0 0;color:#7f626d;font-size:12px;line-height:1.6;">הקוד יחכה בקישור ויופעל לאחר הזנת כתובת המייל. עד ${DATABASE_NOW_MAX_USES} מימושים.</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="pad" style="padding:25px 42px 36px;background:#fffdf9;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #eaded6;padding-top:22px;">
            <tr>
              <td width="86" valign="middle"><img src="${PORTRAIT_IMAGE}" width="72" height="72" alt="הילית כספי" style="display:block;width:72px;height:72px;object-fit:cover;object-position:50% 18%;border-radius:50%;border:3px solid #d6b36d;" /></td>
              <td valign="middle" style="padding-right:12px;color:#5c5361;font-size:15px;line-height:1.72;">אני פותחת את ההטבה לזמן קצר כדי שאוכל באמת לעמוד מאחורי הקצב שהבטחתי. אם חיכית לרגע להתחיל, זה הרגע.<br /><strong style="color:#8b3152;">באהבה, הילית</strong></td>
            </tr>
          </table>
          <p style="margin:21px 0 0;color:#827881;font-size:11px;line-height:1.7;">ההבטחה היא להצעת התאמה ראשונה שנבדקה ונשלחה בתוך שלושה ימים מהשלמת הפרופיל והשאלון. אישור הדדי, פגישה או זוגיות אינם מובטחים.</p>
        </td></tr>
        <tr><td align="center" style="background:#18132e;padding:20px 24px;color:#cfc7d0;font-size:11px;line-height:1.6;">המייל נשלח בעקבות התעניינות קודמת בשאלון או במאגר.<br /><a href="${unsubscribeUrl}" style="color:#d9c58e;text-decoration:underline;">הסרה מרשימת הדיוור</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textContent = `${greeting}

נרשמת בעבר והתעניינת במאגר. היום אני פותחת עבורך הטבת חג מיוחדת.

המאגר שלי אינו אפליקציה שבה ממשיכים לגלול לבד. ממלאים פרופיל ושאלון מדעי, המערכת מחברת בין עשרות פרמטרים, ואני עוברת על האפשרויות ובודקת למי באמת יש סיבה להכיר.

ההבטחה שלי למצטרפים היום:
הצעת התאמה ראשונה בתוך 3 ימים מרגע שהפרופיל והשאלון הושלמו במלואם.

המחיר היום ל־${DATABASE_NOW_MAX_USES} הראשונים: ${DATABASE_NOW_PRICE_ILS} ₪ במקום ${DATABASE_REGULAR_PRICE_ILS} ₪.
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
