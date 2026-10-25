// Draft content only. This module does not send messages, access a database, or schedule work.
import {
  purchaseRecoveryOfferUrl,
  recoveryOfferCode,
  RECOVERY_CAMPAIGN,
  RECOVERY_OFFER_EXPIRES_AT,
  RECOVERY_BUSINESS_WHATSAPP_URL,
} from "../shared/purchaseRecoveryLinks";

export type PurchaseRecoveryProduct = "database" | "session" | "plus";
export type PurchaseRecoveryNewsletterInput = {
  product: PurchaseRecoveryProduct;
  unsubscribeUrl: string;
  offerUrl: string;
  firstName?: string;
};

const SITE = "https://hilitcaspi.com";
const HERO = `${SITE}/manus-storage/database-now-hilit-hero_cde5a6ed.jpg`;
const EXPIRY_TEXT = "26.10.2026 בשעה 23:59, שעון ישראל";
const EXPECTED_EXPIRY_TIME = Date.parse("2026-10-26T23:59:59+02:00");
const SENSITIVE_QUERY_KEY = /^(email|e|token|auth|authorization|first_?name|last_?name|name|phone|mobile|recipient|user|customer|lead|contact|identity|pii)$/i;
const PLUS_PERSONAL_QUERY_KEYS = new Set(["email", "token"]);

const PRODUCT_PATHS: Record<PurchaseRecoveryProduct, string> = {
  database: "/join",
  session: "/single-session",
  plus: "/database-plus",
};

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

function firstName(value?: string) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function checkedExpiryText() {
  if (new Date(RECOVERY_OFFER_EXPIRES_AT).getTime() !== EXPECTED_EXPIRY_TIME) {
    throw new Error("Unexpected purchase recovery expiry");
  }
  return EXPIRY_TEXT;
}

function checkedUnsubscribeUrl(value: string) {
  const url = new URL(value);
  const isAllowedPath = url.pathname === "/unsubscribe" || url.pathname === "/u";
  const entries = Array.from(url.searchParams.entries());
  const isSyntheticPreview = entries.length === 1 && entries[0][0] === "preview" && entries[0][1] === "1";
  const hasOnlyOneSignedToken = entries.length === 1
    && ["token", "sig", "signature"].includes(entries[0][0])
    && Boolean(entries[0][1]);

  if (
    url.origin !== SITE
    || url.protocol !== "https:"
    || url.username
    || url.password
    || !isAllowedPath
    || url.hash
    || (!isSyntheticPreview && !hasOnlyOneSignedToken)
  ) {
    throw new Error("Invalid unsubscribe URL");
  }

  return url.href;
}

function checkedOfferUrl(product: PurchaseRecoveryProduct, channel: "email" | "sms", value: string) {
  const url = new URL(value, SITE);
  const expected = new URL(purchaseRecoveryOfferUrl(product, channel), SITE);
  const expectedCode = recoveryOfferCode(product);
  const expectedParams = Array.from(expected.searchParams.entries());
  const hasCanonicalParams = expectedParams.every(([key, expectedValue]) => (
    url.searchParams.getAll(key).length === 1 && url.searchParams.get(key) === expectedValue
  ));
  const personalPlusKeys = Array.from(url.searchParams.keys()).filter(key => PLUS_PERSONAL_QUERY_KEYS.has(key));
  const hasPairedPlusIdentity = personalPlusKeys.length === 2
    && new Set(personalPlusKeys).size === 2
    && Boolean(url.searchParams.get("email"))
    && Boolean(url.searchParams.get("token"));
  const hasOnlyAllowedKeys = Array.from(url.searchParams.keys()).every(key => {
    const isCanonical = expected.searchParams.has(key);
    return isCanonical || (product === "plus" && PLUS_PERSONAL_QUERY_KEYS.has(key));
  });

  if (
    url.origin !== SITE
    || url.protocol !== "https:"
    || url.username
    || url.password
    || url.hash
    || url.pathname !== PRODUCT_PATHS[product]
    || url.pathname !== expected.pathname
    || url.searchParams.get("coupon") !== expectedCode
    || url.searchParams.get("utm_campaign") !== RECOVERY_CAMPAIGN
    || (product === "database" && url.searchParams.get("source") !== "database")
    || !hasCanonicalParams
    || !hasOnlyAllowedKeys
    || (product !== "plus" && Array.from(url.searchParams.keys()).some(key => SENSITIVE_QUERY_KEY.test(key)))
    || (product === "plus" && personalPlusKeys.length > 0 && !hasPairedPlusIdentity)
  ) {
    throw new Error("Invalid purchase recovery offer URL");
  }

  // The shared helper owns the campaign parameters. Only Plus may carry the
  // paired, freshly generated personal checkout credentials at send time.
  if (product !== "plus" && url.href !== expected.href) {
    throw new Error("Unexpected purchase recovery offer URL");
  }

  return url.href;
}

type ProductCopy = {
  subject: string;
  preheader: string;
  eyebrow: string;
  heroTitle: string;
  recoveryIntro: string;
  lead: string;
  price: string;
  priceDetail: string;
  code: string;
  cta: string;
  features: Array<[string, string, string]>;
  reassurance: string;
  terms: string;
};

function productCopy(product: PurchaseRecoveryProduct, expiresAt: string): ProductCopy {
  const code = recoveryOfferCode(product);

  if (product === "database") {
    return {
      subject: "🎁 התעניינת במאגר שלי? שמרתי לך הטבה מיוחדת",
      preheader: `10% הנחה למאגר של הילית כספי עם ${code}, עד ${expiresAt}.`,
      eyebrow: "HILIT CASPI · מאגר ההיכרויות",
      heroTitle: "אפשר שוב להצטרף.<br>ההטבה שלך מחכה.",
      recoveryIntro: "אתמול לא ניתן היה להשלים רכישות באתר. כעת אפשר שוב, ושמרתי לך 10% הנחה על ההצטרפות למאגר. זו ההזמנה שלי לעשות את הצעד הבא עם הטבה מיוחדת שמחכה לך כאן.",
      lead: "אני הילית כספי, מאמנת למציאת זוגיות. בניתי את מאגר ההיכרויות שלי כדי שלא יהיה צריך להתחיל כל היכרות מאפס. שאלון DNA, פרופיל אישי ובדיקה אנושית עוזרים לנו להבין מי יכול להתאים לך באמת, מעבר לתמונה ולגיל.",
      price: "269.10 ₪",
      priceDetail: "במקום 299 ₪ · תשלום חד פעמי",
      code,
      cta: "להצטרפות למאגר עם MATCH10",
      features: [
        ["01", "שאלון DNA ופרופיל אישי", "ממלאים שאלון עומק, מוסיפים פרופיל והעדפות, ויוצרים נקודת פתיחה מדויקת יותר להיכרות."],
        ["02", "נתונים ובדיקה אנושית", "המערכת מזהה אפשרויות, והילית בוחנת את הפרופילים ותנאי הסף לפני שליחת הצעה."],
        ["03", "פרטיות והסכמה הדדית", "פרטי קשר נחשפים רק כאשר יש אישור הדדי להתקדם לשיחה."],
      ],
      reassurance: "המאגר הוא לא אפליקציה. הוא תהליך היכרות שמשלב נתונים עם שיקול דעת אנושי.",
      terms: `קוד ${code} מעניק 10% הנחה על המחיר הנוכחי של 299 ₪, למחיר של 269.10 ₪. ההטבה בתוקף עד ${expiresAt}. אין התחייבות לתדירות הצעות, לדייט או לזוגיות.`,
    };
  }

  if (product === "session") {
    return {
      subject: "🎁 התעניינת בפגישה? ההטבה שלך כבר מחכה כאן",
      preheader: `פגישה של 60 דקות ב־450 ₪ עם ${code}, עד ${expiresAt}.`,
      eyebrow: "HILIT CASPI · פגישה אישית",
      heroTitle: "אפשר שוב לקבוע פגישה.<br>עם הטבה ממני.",
      recoveryIntro: "אתמול לא ניתן היה להשלים רכישות באתר. כעת אפשר שוב, ושמרתי לך 10% הנחה על פגישה אישית של 60 דקות. אפשר להשלים את הרכישה עכשיו עם ההטבה שמחכה לך כאן.",
      lead: "אני הילית כספי, מאמנת למציאת זוגיות. לפעמים מה שחסר הוא לא עוד עצה, אלא שעה שבה מסתכלים ברצינות על הסיפור שלך: מה חוזר בקשרים, איפה יש תקיעות ומה נכון לעשות אחרת. אפשר לקיים את הפגישה בזום או בקליניקה, עם הילית או עם איש צוות מקצועי שהוכשר ועובד בליווי צמוד שלי.",
      price: "450 ₪",
      priceDetail: "במקום 500 ₪ · פגישה אחת של 60 דקות",
      code,
      cta: "להשלמת הרכישה לפגישה עם LOVE10DAY",
      features: [
        ["01", "מיפוי אישי", "בפגישה בוחנים את הסיפור, הדפוסים שחוזרים והדברים שחשוב לדייק עכשיו."],
        ["02", "זום או קליניקה", "אפשר לבחור בין זום לבין קליניקה ברמת השרון או בתל אביב, לפי מה שנוח."],
        ["03", "צעד הבא ברור", "הפגישה נועדה לתת כיוון מעשי להמשך, בלי הבטחה לתוצאה מסוימת."],
      ],
      reassurance: "זו פגישה אחת של 60 דקות. לא צריך להתחייב לתהליך ארוך כדי לקבל בהירות.",
      terms: `קוד ${code} מעניק 10% הנחה על המחיר הנוכחי של 500 ₪, למחיר של 450 ₪. ההטבה בתוקף עד ${expiresAt}. הפגישה אינה הבטחה לדייט, לזוגיות או לתוצאה מסוימת.`,
    };
  }

  return {
    subject: "🎁 התעניינת ב־Plus? מחכה לך עוד בוסט במתנה",
    preheader: `Plus ב־99 ₪ לחודש עם ${code}: בוסט מתנה נוסף בהצטרפות ראשונה, עד ${expiresAt}.`,
    eyebrow: "HILIT CASPI · DATABASE PLUS",
    heroTitle: "אפשר שוב להצטרף.<br>עם בוסט במתנה.",
    recoveryIntro: "אתמול לא ניתן היה להשלים רכישות באתר. כעת אפשר שוב, ובהצטרפות ראשונה ל־Plus שמרתי לך בוסט נוסף במתנה, מעבר לבוסט שכבר כלול במסלול. ההטבה מחכה לך כאן, לחברי מאגר פעילים בלבד.",
    lead: "אני הילית כספי. אם כבר הצטרפת למאגר ורצית יותר תשומת לב לפרופיל ויותר הזדמנויות להיכרות, בשביל זה יצרתי את Plus. זהו שירות חודשי שבו אני בודקת אישית הצעות התאמה ומקדמת את התהליך שלך.",
    price: "99 ₪",
    priceDetail: "לחודש · חיוב חודשי מתחדש עד לביטול",
    code,
    cta: "להצטרפות ל־Plus עם PLUSGIFT",
    features: [
      ["01", "שתי הצעות התאמה בכל מחזור", "בכל מחזור פעיל של 30 ימים נשלחות שתי הצעות התאמה. הצעות אינן הבטחה לדייט או לזוגיות."],
      ["02", "בוסט רגיל כלול", "Plus כולל בוסט אחד ללא תשלום בכל מחזור פעיל. הבוסט נוסף להצעות ההתאמה ואינו בא במקומן."],
      ["03", "מתנת הצטרפות ראשונה", "עם PLUSGIFT נוסף בוסט מתנה אחד בהצטרפות ראשונה בלבד. הוא נוסף לבוסט הרגיל, בלי איפוס מכסה ובלי שינוי במספר ההצעות."],
    ],
    reassurance: "Plus מוסיף הזדמנויות בתוך תהליך ההיכרות. הוא לא מבטיח דייט או זוגיות.",
    terms: `קוד ${code} תקף בהצטרפות ראשונה ל־Plus בלבד ומוסיף בוסט מתנה אחד. 99 ₪ לחודש בחיוב חודשי מתחדש עד לביטול. ההטבה בתוקף עד ${expiresAt}. אין שינוי במכסה של שתי הצעות ההתאמה בכל מחזור פעיל של 30 ימים.`,
  };
}

function button(label: string, href: string, light = false) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:22px 0 4px"><a class="cta" href="${escapeHtml(href)}" style="display:inline-block;background:${light ? "#f4d7df" : "#6b2946"};color:${light ? "#301c2c" : "#ffffff"};padding:16px 25px;border-radius:4px;text-decoration:none;font-size:16px;line-height:1.55;font-weight:700">${label}</a></td></tr></table>`;
}

export function buildPurchaseRecoveryNewsletter(input: PurchaseRecoveryNewsletterInput) {
  const expiresAt = checkedExpiryText();
  const copy = productCopy(input.product, expiresAt);
  const offerUrl = checkedOfferUrl(input.product, "email", input.offerUrl);
  const unsubscribeUrl = checkedUnsubscribeUrl(input.unsubscribeUrl);
  const name = firstName(input.firstName);
  const greeting = name ? `היי ${escapeHtml(name)},` : "היי,";
  const rows = copy.features.map(([number, title, body]) => `<tr><td class="pad" style="padding:25px 42px;border-bottom:1px solid #eadde1;background:#fbf5f1"><p style="margin:0;color:#ae718b;font-size:12px;letter-spacing:2px;font-weight:700">${number}</p><h2 style="margin:8px 0 9px;color:#301c2c;font-size:23px;line-height:1.35">${title}</h2><p style="margin:0;color:#66565e;font-size:16px;line-height:1.82">${body}</p></td></tr>`).join("");

  const htmlContent = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(copy.subject)}</title><link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>body,table,td,p,a,h1,h2{font-family:Rubik,Arial,sans-serif!important}table{border-collapse:collapse}@media(max-width:640px){.shell{width:100%!important}.pad{padding-left:24px!important;padding-right:24px!important}.title{font-size:42px!important}.cta{display:block!important}}@media(prefers-color-scheme:dark){.shell{color-scheme:light}}</style></head><body style="margin:0;background:#e8e0dd;color:#301c2c;direction:rtl"><div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(copy.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 8px"><table role="presentation" class="shell" width="640" style="width:640px;max-width:640px;background:#fbf5f1" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:21px 18px;background:#251724;color:#f4d7df;font-size:13px;letter-spacing:2.7px;font-weight:700">${copy.eyebrow}</td></tr><tr><td style="padding:0"><img src="${HERO}" width="640" alt="הילית כספי" style="display:block;width:100%;height:auto;border:0"></td></tr><tr><td class="pad" align="center" style="padding:31px 42px;background:#eecfd8"><p style="margin:0 0 13px;color:#803b59;font-size:12px;font-weight:700">הטבה בעקבות התעניינות קודמת</p><h1 class="title" style="margin:0;color:#301c2c;font-size:53px;line-height:1.05;letter-spacing:-1.1px">${copy.heroTitle}</h1><p style="margin:18px 0 0;color:#6b2946;font-size:18px;line-height:1.65;font-weight:700">${copy.priceDetail}</p>${button(copy.cta, offerUrl)}</td></tr><tr><td class="pad" style="padding:28px 42px;background:#fbf5f1"><p style="margin:0 0 12px;color:#301c2c;font-size:18px;font-weight:700">${greeting}</p><p style="margin:0;color:#66565e;font-size:16px;line-height:1.85">${copy.recoveryIntro}</p><p style="margin:18px 0 0;color:#66565e;font-size:16px;line-height:1.85">${copy.lead}</p></td></tr>${rows}<tr><td class="pad" align="center" style="padding:35px 42px;background:#251724;color:#ffffff"><p style="margin:0 0 10px;color:#efb9cc;font-size:13px;font-weight:700">קוד ההטבה שלך</p><p style="margin:0;color:#f4d7df;font-size:35px;line-height:1;font-weight:800;letter-spacing:1px">${copy.code}</p><p style="margin:16px 0 0;color:#ffffff;font-size:47px;line-height:1;font-weight:800">${copy.price}</p><p style="margin:12px 0 0;color:#ead5dd;font-size:15px;line-height:1.7">${copy.priceDetail}</p>${button(copy.cta, offerUrl, true)}<p style="margin:17px 0 0;color:#dbc8d1;font-size:12px;line-height:1.8">${copy.terms}</p></td></tr><tr><td class="pad" style="padding:26px 42px;background:#ede3e6"><h2 style="margin:0 0 10px;color:#301c2c;font-size:21px;line-height:1.35">מה חשוב לדעת</h2><p style="margin:0;color:#59434f;font-size:15px;line-height:1.82">${copy.reassurance}</p><p style="margin:18px 0 8px;color:#59434f;font-size:15px;line-height:1.82">יש שאלה לפני הרכישה, או משהו שלא ברור בתהליך? אפשר לפנות אלינו בווטסאפ העסקי ונעזור לבחור את הצעד המתאים.</p><a href="${escapeHtml(RECOVERY_BUSINESS_WHATSAPP_URL)}" style="display:inline-block;color:#6b2946;border:1px solid #ae718b;padding:11px 18px;border-radius:4px;font-size:15px;font-weight:700;text-decoration:none">לעזרה בווטסאפ העסקי</a></td></tr><tr><td class="pad" style="padding:29px 42px;background:#fbf5f1"><p style="margin:0;color:#66565e;font-size:16px;line-height:1.8">באהבה,<br><strong style="color:#6b2946">הילית כספי</strong></p></td></tr><tr><td align="center" style="padding:21px 24px;background:#d9c9cf;color:#64515c;font-size:11px;line-height:1.7">הילית כספי · בעקבות התעניינות קודמת<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#49283b;text-decoration:underline">הסרה מרשימת הדיוור</a></td></tr></table></td></tr></table></body></html>`;

  const textContent = `${greeting}

${copy.recoveryIntro}

${copy.lead}

${copy.features.map(([, title, body]) => `${title}
${body}`).join("\n\n")}

קוד ההטבה: ${copy.code}
${copy.price} · ${copy.priceDetail}
${copy.terms}

${copy.cta}:
${offerUrl}

${copy.reassurance}

יש שאלה לפני הרכישה, או משהו שלא ברור בתהליך? אפשר לפנות אלינו בווטסאפ העסקי ונעזור לבחור את הצעד המתאים:
${RECOVERY_BUSINESS_WHATSAPP_URL}

באהבה,
הילית כספי

הילית כספי
להסרה: ${unsubscribeUrl}`;

  return { subject: copy.subject, preheader: copy.preheader, htmlContent, textContent };
}

export const buildNewsletter = buildPurchaseRecoveryNewsletter;
export { RECOVERY_CAMPAIGN, RECOVERY_OFFER_EXPIRES_AT };
