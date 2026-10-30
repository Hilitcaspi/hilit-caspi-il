const SITE = "https://hilitcaspi.com";
const CTA = `${SITE}/join?utm_source=newsletter&utm_medium=email&utm_campaign=live_open_registration&utm_content=after_live`;
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Content only. No audience, provider, database, schedule or entitlement side effects.
 * A separate approved campaign must re-check explicit consent, opt-outs and actual paid membership.
 * A number supplied here is a draft variant, not an activation of a customer promise.
 */
export function buildAfterLiveOpenRegistrationDraft(input: {
  firstName?: string;
  unsubscribeUrl: string;
  proposalBusinessDays: 2 | 3 | null;
}) {
  const unsubscribe = new URL(input.unsubscribeUrl);
  if (unsubscribe.origin !== SITE || unsubscribe.pathname !== "/unsubscribe" || !unsubscribe.searchParams.get("token")) {
    throw new Error("A first-party signed unsubscribe link is required");
  }
  const firstName = input.firstName?.trim().slice(0, 100) || "";
  const greeting = firstName ? `היי ${firstName},` : "היי,";
  const subject = "אחרי הלייב: בואו נהפוך את הפרופיל שלכם להזדמנות להיכרות";
  const promise = input.proposalBusinessDays
    ? `במסגרת ההצעה, תישלח אליכם הצעת התאמה ראשונה בתוך ${input.proposalBusinessDays} ימי עסקים מאישור התשלום והשלמת הפרופיל, התמונה והשאלונים. זו התחייבות להצעת התאמה, לא לדייט, לאישור הדדי או לזוגיות.`
    : "";
  const paragraphs = [
    "בלייב פתחתי את מאחורי הקלעים של ההתאמות שלי. דיברנו על מה שאני מחפשת מעבר לגיל ולעיר, ועל הדרך שבה תמונה, תשובות לשאלון והפרטים שבחרתם לכתוב עוזרים לי להכיר את האדם שמאחורי הפרופיל.",
    "פרופיל טוב לא אמור לגרום לכולם לרצות אתכם. הוא אמור לעזור לאנשים המתאימים להבין מי אתם, ולתת להיכרות הנכונה סיבה להתחיל.",
    "אם עדיין לא הצטרפתם למאגר שלי, אני מזמינה אתכם לעשות את הצעד הבא: למלא את הפרופיל והשאלון הזוגי, לספר מה באמת חשוב לכם בקשר ולתת לי לבחון אפשרויות להיכרות. אני עוברת על ההצעות לפני שהן נשלחות. ההחלטה אם להמשיך להיכרות נשארת תמיד שלכם.",
    ...(promise ? [promise] : []),
    "אם כבר הצטרפתם למאגר מאז ההרשמה ללייב, אין צורך לרכוש שוב. נתראה בהיכרות הבאה, הילית.",
  ];
  const textContent = `${greeting}\n\n${paragraphs.join("\n\n")}\n\nלהצטרפות למאגר: ${CTA}\n\nלהסרה מדיוור שיווקי: ${input.unsubscribeUrl}`;
  const htmlContent = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f0eadc;font-family:Arial,sans-serif;color:#191265;direction:rtl"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" style="max-width:600px;width:100%;background:#fffaf1;border-radius:24px;overflow:hidden"><tr><td style="padding:22px;background:#191265;color:#ffe27c;text-align:center;font-weight:bold">HILIT CASPI · אחרי הלייב</td></tr><tr><td><img src="${SITE}/manus-storage/hilit-smiling-portrait_cddd0dfc.jpg" alt="הילית כספי" width="600" style="display:block;width:100%;height:230px;object-fit:cover;object-position:center 30%"></td></tr><tr><td style="padding:30px;text-align:right"><p style="line-height:1.8">${escape(greeting)}</p><h1 style="font-size:28px;line-height:1.4">עכשיו, בואו נדבר על ההיכרות שלכם.</h1>${paragraphs.map(p => `<p style="font-size:16px;line-height:1.9">${escape(p)}</p>`).join("")}<p style="text-align:center;padding:16px 0"><a href="${escape(CTA)}" style="display:inline-block;background:#191265;color:#fff;text-decoration:none;padding:16px 28px;border-radius:30px;font-weight:bold">להצטרפות למאגר של הילית</a></p></td></tr><tr><td style="padding:20px;text-align:center;font-size:12px;background:#eee5d4"><a href="${escape(input.unsubscribeUrl)}" style="color:#191265">להסרה מדיוור שיווקי</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, htmlContent, textContent, campaignKey: "after_live_open_registration_v1", readyToSchedule: false as const, approvalRequired: true as const };
}
