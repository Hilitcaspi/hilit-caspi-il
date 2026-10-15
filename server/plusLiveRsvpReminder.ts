const SITE = "https://hilitcaspi.com";
export const PLUS_LIVE_RSVP_REMINDER = {
  campaign: "plus_live_rsvp_2026_10_17",
  proposedSendAt: "2026-10-17T20:30:00+03:00",
  expiresAt: "2026-10-17T22:00:00+03:00",
  subject: "🎁 מחכה לך מתנה ממני. הכרטיס שלך כבר בפנים",
  preheader: "כרטיס מתנה ללייב שלי לחברי Plus. נשאר רק לאשר הגעה ולשלוח לי שאלה מראש.",
} as const;
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Pure content only. No audience lookup, scheduling, ticket creation, send or RSVP mutation. */
export function buildPlusLiveRsvpReminder(input: {
  firstName?: string;
  voucherCode: string;
  rsvpUrl: string;
  unsubscribeUrl: string;
}) {
  const link = new URL(input.rsvpUrl);
  const hash = new URLSearchParams(link.hash.slice(1));
  if (link.origin !== SITE || link.pathname !== "/live/question" || link.username || link.password
      || !hash.get("q") || hash.get("rsvp") !== "1") throw new Error("Personal ticket RSVP link required");
  const remove = new URL(input.unsubscribeUrl);
  if (remove.origin !== SITE || remove.username || remove.password || !["/unsubscribe", "/u"].includes(remove.pathname)) {
    throw new Error("Valid unsubscribe URL required");
  }
  if (!/^HC31-[A-F0-9]{12}$/.test(input.voucherCode)) throw new Error("Existing live voucher required");
  link.searchParams.set("utm_source", "newsletter");
  link.searchParams.set("utm_medium", "email");
  link.searchParams.set("utm_campaign", PLUS_LIVE_RSVP_REMINDER.campaign);
  link.searchParams.set("utm_content", "gift_ticket_rsvp");
  const primaryUrl = link.href;
  const greeting = input.firstName?.trim() ? `היי ${input.firstName.trim().split(/\s+/)[0]},` : "היי,";
  const paragraphs = [
    "יש הטבות שאני שומרת רק לחברי Plus, וזו אחת האהובות עליי: כרטיס במתנה ללייב איתי, \"סודות ההתאמה המושלמת\".",
    "אני מזמינה אותך לערב שבו אשתף מה אני בודקת מאחורי הקלעים של ההתאמות, איך לבנות פרופיל שמספר את הסיפור שלך ופותח יותר אפשרויות להיכרות, ומה אפשר ללמוד מחיבורים שהצליחו.",
    "תהיה גם הזדמנות לשאול אותי את מה שמעניין אותך. אפשר כבר עכשיו לשלוח שאלה מראש דרך הכרטיס.",
    "הכרטיס כלול במנוי Plus פעיל, ללא תשלום נוסף. כדי שאוכל להיערך ולדעת שנפגשים, צריך לפתוח את הכרטיס ולאשר הגעה בעמוד.",
  ];
  const buttonLabel = "לפתיחת הכרטיס ולאישור הגעה";
  const followup = "קישור הכניסה האישי לזום יישלח בנפרד לקראת האירוע. המייל הזה הוא הזמנה ואישור הגעה, ולא קישור כניסה לזום.";
  const button = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 8px"><a href="${esc(primaryUrl)}" style="display:inline-block;background:#191265;color:#fff;text-decoration:none;border-radius:999px;padding:17px 25px;font-size:17px;font-weight:700;line-height:1.5">${buttonLabel}</a></td></tr></table>`;
  const htmlContent = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(PLUS_LIVE_RSVP_REMINDER.subject)}</title><style>body,table,td,p,a,h1,h2{font-family:Rubik,Arial,sans-serif}@media(max-width:620px){.pad{padding-left:22px!important;padding-right:22px!important}.title{font-size:34px!important}}</style></head>
<body style="margin:0;background:#f0eadc;color:#191265;direction:rtl"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(PLUS_LIVE_RSVP_REMINDER.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:22px 10px"><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#fffaf1;border-radius:25px;overflow:hidden">
<tr><td style="background:#191265;color:#ffe27c;text-align:center;letter-spacing:2px;font-size:12px;font-weight:700;padding:22px">HILIT CASPI · PLUS MEMBERS CLUB</td></tr>
<tr><td><img src="${SITE}/manus-storage/hilit-smiling-portrait_cddd0dfc.jpg" alt="הילית כספי" width="640" style="display:block;width:100%;height:auto;border:0"></td></tr>
<tr><td class="pad" style="padding:30px 38px 8px;text-align:center"><p style="font-size:12px;letter-spacing:1px;color:#8a6c2d;margin:0 0 12px;font-weight:700">מתנה ששמורה לחברי Plus</p><h1 class="title" style="font-size:42px;line-height:1.18;margin:0">מחכה לך מתנה ממני.<br>והיא מתחילה במפגש שלנו.</h1></td></tr>
<tr><td class="pad" style="padding:24px 38px 10px"><p style="font-size:18px;font-weight:700;margin:0 0 16px">${esc(greeting)}</p>${paragraphs.map(p => `<p style="font-size:16px;line-height:1.85;color:#59546c;margin:0 0 16px">${esc(p)}</p>`).join("")}</td></tr>
<tr><td class="pad" style="padding:10px 38px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff3ce;border:2px solid #d4b867;border-radius:22px"><tr><td style="padding:26px 18px;text-align:center"><p style="font-size:12px;letter-spacing:2px;color:#8a6c2d;margin:0 0 12px">הכרטיס שלך במתנה</p><h2 style="font-size:28px;line-height:1.3;margin:0 0 15px">סודות ההתאמה המושלמת</h2><p style="font-size:17px;line-height:1.8;margin:0">שבת 31.10.2026 · 20:30 שעון ישראל<br>מפגש אונליין איתי ב־Zoom</p><p style="font-size:14px;margin:17px 0 8px">שווי הכרטיס: 149 ₪ · לחברי Plus ללא עלות נוספת</p><p style="font-size:12px;line-height:1.8;color:#625c79;margin:14px 0 0">השובר האישי שלך<br><strong dir="ltr" style="font-size:16px;letter-spacing:1px;color:#191265">${esc(input.voucherCode)}</strong><br>אין צורך להזין קוד, הכפתור פותח את הכרטיס שלך.</p></td></tr></table>${button}</td></tr>
<tr><td class="pad" style="padding:4px 38px 28px"><p style="font-size:13px;line-height:1.8;color:#625c79;margin:0 0 20px">${esc(followup)}</p><p style="font-size:17px;line-height:1.8;margin:0">מחכה להיפגש ולתת מקום גם לשאלות שלך.<br><strong>באהבה, הילית</strong></p></td></tr>
<tr><td style="padding:20px 25px;text-align:center;background:#e9e0cd;font-size:11px;line-height:1.8;color:#68617b">הילית כספי · עדכון על הטבה לחברי Plus<br><a href="${esc(input.unsubscribeUrl)}" style="color:#191265;text-decoration:underline">הסרה מרשימת הדיוור</a></td></tr>
</table></td></tr></table></body></html>`;
  const textContent = `${greeting}\n\n${paragraphs.join("\n\n")}\n\nהכרטיס שלך במתנה: סודות ההתאמה המושלמת\nשבת 31.10.2026 בשעה 20:30 שעון ישראל. אונליין ב־Zoom.\nשווי הכרטיס: 149 ₪. לחברי Plus ללא עלות נוספת.\nהשובר האישי: ${input.voucherCode}\nאין צורך להזין קוד.\n\n${buttonLabel}:\n${primaryUrl}\n\n${followup}\n\nמחכה להיפגש ולתת מקום גם לשאלות שלך.\nבאהבה, הילית\n\nהסרה מרשימת הדיוור:\n${input.unsubscribeUrl}`;
  return { subject: PLUS_LIVE_RSVP_REMINDER.subject, preheader: PLUS_LIVE_RSVP_REMINDER.preheader, htmlContent, textContent };
}
