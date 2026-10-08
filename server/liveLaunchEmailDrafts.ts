const SITE = "https://hilitcaspi.com";
const PORTRAIT = `${SITE}/manus-storage/hilit-smiling-portrait_cddd0dfc.jpg`;
const AUDIENCE = `${SITE}/manus-storage/hilit-speaking-to-audience_38bd148d.jpg`;
export type LiveLaunchAudience = "cold" | "database" | "plus";
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const utm = (path: string, content: string) => `${SITE}${path}?utm_source=newsletter&utm_medium=email&utm_campaign=live_oct2026&utm_content=${content}`;

/** Content only: no provider calls, audience queries, queue inserts or automatic sending. */
export function buildLiveLaunchEmailDraft(input: { audience: LiveLaunchAudience; firstName?: string; rsvpUrl?: string; unsubscribeUrl: string }) {
  const plus = input.audience === "plus";
  const cold = input.audience === "cold";
  const greeting = input.firstName ? `היי ${escape(input.firstName.trim().split(/\s+/)[0])},` : "היי,";
  const offerUrl = utm(cold ? "/live/database" : "/live", cold ? "launch_cold_database" : "launch_database_members");
  if (plus) {
    const rsvp = new URL(input.rsvpUrl || "");
    if (rsvp.origin !== SITE || rsvp.pathname !== "/live/question" || !new URLSearchParams(rsvp.hash.slice(1)).get("q")) {
      throw new Error("A personalized signed ticket RSVP URL is required for Plus");
    }
  }
  const removeUrl = new URL(input.unsubscribeUrl);
  if (removeUrl.protocol !== "https:" || removeUrl.origin !== SITE || !["/unsubscribe", "/u"].includes(removeUrl.pathname)) throw new Error("Invalid unsubscribe URL");
  const subject = cold ? "🎁 מצטרפים למאגר, ונפגשים איתי בלייב במתנה" : plus ? "💛 חברי Plus, הכרטיס ללייב עליי. נפגשים?" : "לראשונה: סודות ההתאמה המושלמת, לייב איתי ב־49 ₪ לחברי המאגר";
  const preheader = cold ? "מאגר ב־299 ₪ בתשלום חד־פעמי, וכרטיס אחד ללייב ב־31.10 בשעה 20:30 במתנה." : plus ? "הטבה של מועדון החברים הסגור שלי. כניסה ללא עלות נוספת, ואישור הגעה בלחיצה." : "מאחורי הקלעים של ההתאמות, הפרופילים שעובדים והשאלות שלכם. קוד FRIENDS.";
  const title = cold ? "הגיע הזמן להכיר אחרת.<br>ולהיפגש איתי, באמת." : plus ? "אתם בפנים.<br>הכרטיס ללייב עליי." : "מה באמת קורה<br>מאחורי ההתאמות?";
  const lead = cold ? "מצטרפים עכשיו למאגר הרווקים והרווקות שלי ב־299 ₪, ומקבלים כרטיס אחד במתנה ללייב \"סודות ההתאמה המושלמת\", בשווי 149 ₪." : plus ? "כחלק ממועדון החברים הסגור שלי, שמור לכם כרטיס ללא עלות נוספת ללייב \"סודות ההתאמה המושלמת\". אני ממש אשמח לראות אתכם שם." : "אתם כבר חלק מהמאגר שלי. עכשיו אני רוצה להזמין אתכם להכיר גם את מה שלא רואים מהצד השני של המסך.";
  const body = cold ? [
    "אם כבר ניסית אפליקציות, התרגשת משיחה ואז גילית שאין ממש לאן להתקדם, אני רוצה להציע דרך אחרת. לא עוד גלילה לבד, אלא תהליך שמשלב את ה־DNA הזוגי, מה שחשוב לך באמת בזוגיות, ובדיקה אישית שלי.",
    "ממלאים שאלון, יוצרים פרופיל ומקבלים הצעות התאמה שנבדקות לפני שהן נשלחות. פרטי הקשר נפתחים רק כששני הצדדים רוצים להמשיך. ובאזור האישי אפשר גם להכיר את שירות Boost ולבחור אם לקחת צעד יזום נוסף.",
    "ולכבוד ההצטרפות דרך עמוד ההטבה, אני מזמינה אותך גם למפגש לייב איתי. ערב שבו אפשר להבין מה עומד מאחורי ההתאמות, איך לבנות פרופיל שמספר את הסיפור שלך, ולשאול את מה שבדרך כלל נשאר בראש."
  ] : plus ? [
    "כשבניתי את Plus רציתי לתת לכם יותר מהצעות התאמה. רציתי ליצור מקום קרוב יותר, עם הזדמנויות, תוכן והטבות ששמורות לחברים שלי.",
    "לכן הכניסה ללייב הזה כלולה במנוי Plus פעיל. לא צריך לרכוש כרטיס, לא צריך להזין קופון, ולא צריך להירשם מחדש לזום.",
    "כדי שאוכל להיערך למפגש, אשמח שתאשרו הגעה דרך הכפתור. הוא פותח את הכרטיס שלכם ישירות, בלי בקשת קישור נוסף למייל. אפשר גם לשלוח לי שם שאלה מראש.",
    "כרטיס עם קישור הכניסה לזום יישלח בנפרד לקראת האירוע. אישור ההגעה כאן הוא להיערכות למפגש, ולא שולח כעת קישור כניסה."
  ] : [
    "לא פעם שואלים אותי: איך בחרת דווקא את ההתאמה הזו? מה באמת אומר אחוז ההתאמה? והאם הפרופיל שלי מראה את מי שאני?",
    "לראשונה אני פותחת את מאחורי הקלעים בלייב בזום. אספר איך נולד המאגר, מה אני רואה בפרופילים שעובדים, ואיך אפשר לתת לחיבור טוב יותר סיכוי להתחיל. נקדיש מקום גם לשאלות שלכם.",
    "לחברי המאגר הכרטיס הוא ב־49 ₪ במקום 149 ₪. מזינים FRIENDS ואת כתובת המייל הרשומה במאגר ומבצעים אימות באמצעות הקישור האישי, כדי שההטבה תהיה שמורה לחברים שלנו.",
    "אם המנוי שלך ל־Plus פעיל, אין צורך לקנות כרטיס: הכניסה כלולה ללא עלות נוספת. אישור הגעה יגיע בהזמנה נפרדת לחברי Plus."
  ];
  const primaryUrl = plus ? input.rsvpUrl! : offerUrl;
  const primaryLabel = cold ? "להצטרפות למאגר ולקבלת כרטיס מתנה" : plus ? "אני רוצה לאשר הגעה ללייב" : "לכרטיס חברי מאגר ב־49 ₪";
  const offerTitle = cold ? "המאגר + כרטיס ללייב במתנה" : plus ? "הטבה לחברי Plus פעילים" : "כרטיס לחברי המאגר";
  const price = cold ? "299 ₪" : plus ? "ללא עלות נוספת" : "49 ₪";
  const condition = cold ? "תשלום חד־פעמי למאגר. כרטיס אחד ללייב למצטרפים חדשים דרך עמוד ההטבה. קוד LIVE נוסף אוטומטית." : plus ? "הכרטיס כלול במנוי Plus פעיל. אישור הגעה נעשה רק בלחיצה מפורשת בתוך העמוד." : "קוד FRIENDS, עם אימות חברות במאגר. מחיר רגיל לכרטיס: 149 ₪.";
  const button = (label: string, href: string) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:22px 0"><a href="${escape(href)}" style="display:inline-block;background:#191265;color:#fff;text-decoration:none;border-radius:99px;padding:17px 27px;font-weight:700;font-size:16px;line-height:1.5">${label}</a></td></tr></table>`;
  const htmlContent = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');body,table,td,p,a,h1,h2{font-family:Rubik,Arial,sans-serif!important;}@media(max-width:620px){.pad{padding-left:22px!important;padding-right:22px!important}.title{font-size:35px!important}.cell{display:block!important;width:100%!important;box-sizing:border-box!important}}</style><title>${escape(subject)}</title></head>
<body style="margin:0;background:#f0eadc;color:#191265;direction:rtl"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(preheader)}</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:22px 10px"><table role="presentation" cellpadding="0" cellspacing="0" width="640" style="width:100%;max-width:640px;border-radius:26px;overflow:hidden;background:#fffaf1">
<tr><td style="background:#191265;color:#ffe27c;text-align:center;letter-spacing:2px;font-weight:700;font-size:12px;padding:22px">HILIT CASPI · ${plus ? "PLUS MEMBERS CLUB" : "LIVE OCTOBER"}</td></tr>
<tr><td style="padding:0"><img src="${PORTRAIT}" width="640" alt="הילית כספי" style="display:block;width:100%;height:300px;object-fit:cover;object-position:center 31%;border:0"></td></tr>
<tr><td class="pad" style="padding:32px 38px 0;text-align:center"><p style="font-size:12px;color:#9b772e;font-weight:700;letter-spacing:1px;margin:0 0 13px">${plus ? "מתנה של מועדון החברים שלי" : "לראשונה, לייב איתי בזום"}</p><h1 class="title" style="font-size:42px;line-height:1.16;letter-spacing:-1px;margin:0;color:#191265">${title}</h1><p style="margin:20px 0 0;font-size:17px;line-height:1.8;color:#625c79">${lead}</p>${button(primaryLabel, primaryUrl)}</td></tr>
<tr><td class="pad" style="padding:12px 38px 24px"><p style="font-size:18px;font-weight:700;margin:0 0 14px">${greeting}</p>${body.map(p => `<p style="font-size:16px;line-height:1.85;color:#59546c;margin:0 0 15px">${p}</p>`).join("")}</td></tr>
<tr><td class="pad" style="padding:4px 38px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:2px solid #d4b867;border-radius:23px;background:#fff3ce"><tr><td style="text-align:center;padding:25px 18px"><p style="font-size:12px;letter-spacing:2px;margin:0 0 10px;color:#8a6c2d">הכרטיס שלך ללייב</p><h2 style="font-size:27px;line-height:1.3;margin:0 0 14px">סודות ההתאמה המושלמת</h2><p style="font-size:17px;line-height:1.6;margin:0">שבת 31.10.2026 · 20:30 שעון ישראל<br>אונליין ב־Zoom</p></td></tr></table></td></tr>
<tr><td style="padding:0"><img src="${AUDIENCE}" alt="הילית בשיחה עם קהל" width="640" style="display:block;width:100%;height:auto;border:0"></td></tr>
<tr><td class="pad" style="padding:30px 38px 25px"><h2 style="font-size:28px;margin:0 0 20px;text-align:center">על מה נדבר?</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="cell" width="50%" valign="top" style="padding:8px"><p style="font-size:17px;font-weight:700;margin:0 0 8px">מאחורי ההתאמות</p><p style="font-size:14px;line-height:1.75;color:#625c79;margin:0">מה ה־DNA הזוגי מספר, ומה אני בודקת מעבר לנתונים.</p></td><td class="cell" width="50%" valign="top" style="padding:8px"><p style="font-size:17px;font-weight:700;margin:0 0 8px">פרופיל שעובד</p><p style="font-size:14px;line-height:1.75;color:#625c79;margin:0">מה כדאי להראות ולכתוב כדי שיראו את מי שאתם.</p></td></tr><tr><td class="cell" width="50%" valign="top" style="padding:15px 8px"><p style="font-size:17px;font-weight:700;margin:0 0 8px">סיפורים מהמאגר</p><p style="font-size:14px;line-height:1.75;color:#625c79;margin:0">איך נולד המאגר ומה אפשר ללמוד מחיבורים שהצליחו.</p></td><td class="cell" width="50%" valign="top" style="padding:15px 8px"><p style="font-size:17px;font-weight:700;margin:0 0 8px">השאלות שלכם</p><p style="font-size:14px;line-height:1.75;color:#625c79;margin:0">אפשר להעביר שאלה מראש דרך הכרטיס ולתת לה מקום בלייב.</p></td></tr></table></td></tr>
<tr><td class="pad" style="padding:27px 38px 22px;background:#191265;text-align:center;color:#fff"><p style="margin:0 0 13px;color:#ffe27c;font-size:14px">${offerTitle}</p><p style="font-size:${plus ? 31 : 60}px;font-weight:800;margin:0 0 12px">${price}</p><p style="color:#eee9fa;font-size:14px;line-height:1.75;margin:0">${condition}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:22px 0 5px"><a href="${escape(primaryUrl)}" style="display:inline-block;background:#ffe27c;color:#191265;text-decoration:none;border-radius:99px;padding:16px 24px;font-weight:700;font-size:16px">${primaryLabel}</a></td></tr></table></td></tr>
<tr><td class="pad" style="padding:29px 38px 30px"><p style="font-size:16px;line-height:1.85;color:#59546c;margin:0">${plus ? "מחכה להיפגש, לשמוע אתכם ולתת עוד קצת מקום לשאלות שלכם." : "מחכה לנו ערב אישי, מסקרן ומלא דברים שאפשר לקחת איתכם להיכרות הבאה."}<br><strong style="color:#191265">באהבה, הילית</strong></p>${cold ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#7e7689">מעדיפים להצטרף רק ללייב? <a href="${escape(utm("/live", "launch_cold_live_alternative"))}" style="color:#191265">אפשר גם כרטיס ב־149 ₪</a>.</p>` : ""}</td></tr>
<tr><td style="padding:20px 30px;text-align:center;background:#e9e0cd;font-size:11px;line-height:1.7;color:#68617b">הילית כספי · ${plus ? "עדכון על הטבה של מנוי Plus" : "פרסומת · הזמנה בעקבות התעניינות קודמת"}<br><a href="${escape(input.unsubscribeUrl)}" style="color:#191265;text-decoration:underline">הסרה מרשימת הדיוור</a></td></tr>
</table></td></tr></table></body></html>`;
  const textContent = `${greeting}\n\n${lead}\n\n${body.join("\n\n")}\n\nסודות ההתאמה המושלמת\nשבת 31.10.2026, 20:30 שעון ישראל. אונליין בזום.\n\n${offerTitle}: ${price}\n${condition}\n\n${primaryLabel}:\n${primaryUrl}\n\nבאהבה, הילית\nלהסרה:\n${input.unsubscribeUrl}`;
  return { subject, preheader, htmlContent, textContent };
}
