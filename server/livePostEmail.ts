const SITE = "https://hilitcaspi.com";
const PHOTO = `${SITE}/manus-storage/plus-email-hilit-seated_52bbd335.jpg`;
const EXPIRES_LABEL = "עד מחר, 1.11, בשעה 23:59 שעון ישראל";
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
export type LivePostEmailVariant = "database" | "plus";

export function buildLivePostEmail(input: {
  firstName?: string;
  variant: LivePostEmailVariant;
  unsubscribeUrl: string;
  attended?: boolean;
  plusEmail?: string;
  plusToken?: string;
}) {
  const unsubscribe = new URL(input.unsubscribeUrl);
  if (unsubscribe.origin !== SITE || unsubscribe.pathname !== "/unsubscribe" || !unsubscribe.searchParams.get("token")) {
    throw new Error("A signed first-party unsubscribe link is required");
  }
  const firstName = input.firstName?.trim().slice(0, 100);
  const greeting = firstName ? `היי ${firstName},` : "היי,";
  const opening = input.attended === true
    ? "אני שמחה שהצטרפתם אליי ללייב הערב. היה לי חשוב שתראו לא רק את ההתאמות שמגיעות למייל, אלא גם את המחשבה, הבדיקה והעין האנושית שמאחוריהן."
    : "תודה שבחרתם להיות חלק מהלייב הערב. זו הייתה הזדמנות לפתוח את מאחורי הקלעים של ההתאמות שלי: מה אני בודקת, איך אני קוראת פרופיל ומה גורם לי לראות פוטנציאל בין שני אנשים.";
  const database = input.variant === "database";
  const params = new URLSearchParams({
    coupon: database ? "LIVE48" : "LIVEPLUS",
    utm_source: "live_email",
    utm_medium: "email",
    utm_campaign: "live_2026_10_31_after",
    utm_content: database ? "database_first_match_48h" : "plus_first_month_3",
  });
  if (!database) {
    const email = input.plusEmail?.trim().toLowerCase() || "";
    const token = input.plusToken?.trim() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 || !token || token.length > 512) {
      throw new Error("An existing account-bound Plus checkout link is required");
    }
    params.set("email", email);
    params.set("token", token);
  }
  const ctaUrl = `${SITE}/${database ? "join" : "database-plus"}?${params.toString()}`;
  const subject = database
    ? "עכשיו התור שלכם: התאמה ראשונה בתוך יומיים"
    : "מהלייב להיכרות הבאה: 3 התאמות ובוסט במתנה";
  const title = database ? "עכשיו, בואו נדבר על ההיכרות שלכם." : "יותר הזדמנויות להכיר. יותר תשומת לב לפרופיל שלכם.";
  const benefitTitle = database ? "הצעת התאמה ראשונה בתוך יומיים" : "3 הצעות התאמה בחודש הראשון";
  const benefitSubtitle = database
    ? "למצטרפים למאגר דרך הטבת הלייב"
    : "במקום 2, ובנוסף בוסט אחד בחינם";
  const body = database ? [
    opening,
    "כשאני מחברת בין שני אנשים, אני לא מסתפקת בגיל ובעיר. אני בודקת ערכים, קצב חיים, רצונות בזוגיות ואת הפרטים הקטנים שיכולים להפוך פרופיל מעניין להיכרות עם פוטנציאל.",
    "אם עדיין לא הצטרפתם למאגר, אני מזמינה אתכם לעשות את הצעד הבא. למלא את הפרופיל והשאלון הזוגי, לתת לי להכיר אתכם באמת ולהיחשף לאנשים שמחפשים קשר רציני.",
    "ולקראת ההיכרות שלכם הכנתי את הטבת הלייב: הצעת התאמה ראשונה שאני בודקת ושולחת בתוך יומיים בלבד מאישור התשלום והשלמת הפרופיל, התמונה והשאלונים.",
    "ההטבה זמינה " + EXPIRES_LABEL + ". קוד LIVE48 מופיע בקישור ההצטרפות. אין צורך לחפש אותו או לזכור להקליד אותו בנפרד.",
  ] : [
    opening,
    "אם אתם כבר במאגר ורוצים יותר קצב ויותר אפשרויות להיכרות, אני מזמינה אתכם להצטרף ל־Database Plus. זה לא מאגר אחר, אלא מסלול אישי בתוך המאגר הקיים, עם קדימות בבדיקת הפרופיל ובאיתור הצעות התאמה.",
    "במסגרת הטבת הלייב, בחודש הראשון תקבלו 3 הצעות התאמה שאני בודקת ושולחת בפועל, במקום 2. בנוסף תקבלו בוסט אחד בחינם, מעבר להצעות ההתאמה של פלוס.",
    "המחיר הוא 99 ₪ לחודש, בחיוב מתחדש עד לביטול. אחרי המחזור הראשון, המסלול כולל לפחות 2 הצעות התאמה בחודש פעיל ובוסט אחד בחינם.",
    "הטבת החודש הראשון זמינה " + EXPIRES_LABEL + ". קוד LIVEPLUS מופיע בקישור ההצטרפות. ההטבה מיועדת למצטרפים חדשים לפלוס, ולא משנה מנוי קיים.",
  ];
  const ctaLabel = database ? "להצטרפות למאגר עם הטבת הלייב" : "להצטרפות לפלוס עם הטבת הלייב";
  const terms = database
    ? "יומיים הם 48 שעות מאישור התשלום והשלמת פרופיל פעיל, תמונה ושאלונים. ההתחייבות היא להצעת התאמה, לא לאישור הדדי, לדייט או לזוגיות."
    : "3 הצעות התאמה במחזור השירות הראשון בלבד; לאחריו לפחות 2 בכל חודש פעיל. ההתחייבות היא להצעות שנבדקו ונשלחו, ולא לאישור הדדי, לפגישה או לזוגיות. חיוב חודשי מתחדש עד לביטול.";
  const textContent = `${greeting}\n\n${body.join("\n\n")}\n\n${ctaLabel}:\n${ctaUrl}\n\nבאהבה,\nהילית\n\n${terms}\n\nלהסרה מדיוור שיווקי: ${input.unsubscribeUrl}`;
  const htmlContent = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;padding:0;background:#f2e9e3;font-family:Rubik,Arial,sans-serif;color:#392239;direction:rtl"><div style="display:none;max-height:0;overflow:hidden;opacity:0">הטבת הלייב מחכה לכם עד מחר בחצות.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#fffaf3;border-radius:26px;overflow:hidden"><tr><td style="background:#331439;color:#ead09c;text-align:center;padding:17px;font-size:12px;letter-spacing:2px;font-weight:bold">HILIT CASPI · אחרי הלייב</td></tr><tr><td style="background:#6d245b;text-align:center;padding:34px 24px 28px"><p style="margin:0 0 12px;color:#f0dcb2;font-size:14px">מהלייב להיכרות שלכם</p><h1 style="margin:0;font-family:Georgia,serif;color:#fffaf3;font-size:31px;line-height:1.4;font-weight:normal">${escape(title)}</h1></td></tr><tr><td style="background:#e8d7ce;text-align:center"><img src="${PHOTO}" alt="הילית כספי" width="640" style="display:block;width:100%;max-width:640px;height:280px;object-fit:cover;object-position:center 28%;border:0"></td></tr><tr><td style="padding:28px 30px 8px;text-align:right"><p style="font-size:18px;line-height:1.8;margin:0 0 16px">${escape(greeting)}</p>${body.slice(0,3).map(p=>`<p style="font-size:17px;line-height:1.9;margin:0 0 18px">${escape(p)}</p>`).join("")}</td></tr><tr><td style="padding:8px 28px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#4e1b46;border-radius:21px"><tr><td style="padding:27px 22px;text-align:center"><p style="margin:0 0 10px;color:#ead09c;font-size:13px;font-weight:bold">הטבה אישית בעקבות הלייב</p><h2 style="color:#fffaf3;margin:0;font-size:27px;line-height:1.4">${escape(benefitTitle)}</h2><p style="color:#f0d9e7;margin:10px 0 0;font-size:18px;line-height:1.6">${escape(benefitSubtitle)}</p><p style="color:#ead09c;margin:16px 0 0;font-size:15px">${escape(EXPIRES_LABEL)}</p><p style="margin:22px 0 0"><a href="${escape(ctaUrl)}" style="display:inline-block;background:#ef9fb8;color:#391238;text-decoration:none;padding:16px 24px;border-radius:999px;font-size:17px;font-weight:bold">${escape(ctaLabel)}</a></p></td></tr></table></td></tr><tr><td style="padding:0 30px 28px;text-align:right">${body.slice(3).map(p=>`<p style="font-size:16px;line-height:1.85;margin:0 0 15px">${escape(p)}</p>`).join("")}<p style="font-size:17px;line-height:1.8;margin:20px 0 0">באהבה,<br><strong>הילית</strong></p><p style="color:#7a6678;font-size:12px;line-height:1.7;margin:23px 0 0">${escape(terms)}</p></td></tr><tr><td style="background:#ecdfd7;padding:20px;text-align:center;font-size:12px"><a href="${escape(input.unsubscribeUrl)}" style="color:#614057">להסרה מדיוור שיווקי</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, htmlContent, textContent, ctaUrl, variant: input.variant, campaignKey: "live_2026_10_31_after" };
}
