// Draft content only. This module does not send messages, access a database, or schedule work.
import {
  purchaseRecoveryOfferUrl,
  recoveryOfferCode,
  RECOVERY_CAMPAIGN,
  RECOVERY_BUSINESS_WHATSAPP_URL,
  RECOVERY_OFFER_EXPIRES_AT,
} from "../shared/purchaseRecoveryLinks";
import type { PurchaseRecoveryProduct } from "./purchaseRecoveryNewsletter";

export type PurchaseRecoverySmsInput = {
  product: PurchaseRecoveryProduct;
  offerUrl: string;
  unsubscribeUrl: string;
};

const SITE = "https://hilitcaspi.com";
const EXPIRY_TEXT = "26.10 בשעה 23:59, שעון ישראל";
const EXPECTED_EXPIRY_TIME = Date.parse("2026-10-26T23:59:59+02:00");
const SENSITIVE_QUERY_KEY = /^(email|e|token|auth|authorization|first_?name|last_?name|name|phone|mobile|recipient|user|customer|lead|contact|identity|pii)$/i;
const PLUS_PERSONAL_QUERY_KEYS = new Set(["email", "token"]);

const PRODUCT_PATHS: Record<PurchaseRecoveryProduct, string> = {
  database: "/join",
  session: "/single-session",
  plus: "/database-plus",
};

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

function checkedOfferUrl(product: PurchaseRecoveryProduct, value: string) {
  const url = new URL(value, SITE);
  const expected = new URL(purchaseRecoveryOfferUrl(product, "sms"), SITE);
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
    || url.searchParams.get("coupon") !== recoveryOfferCode(product)
    || url.searchParams.get("utm_campaign") !== RECOVERY_CAMPAIGN
    || (product === "database" && url.searchParams.get("source") !== "database")
    || !hasCanonicalParams
    || !hasOnlyAllowedKeys
    || (product !== "plus" && Array.from(url.searchParams.keys()).some(key => SENSITIVE_QUERY_KEY.test(key)))
    || (product === "plus" && personalPlusKeys.length > 0 && !hasPairedPlusIdentity)
    || (product !== "plus" && url.href !== expected.href)
  ) {
    throw new Error("Invalid purchase recovery offer URL");
  }

  return url.href;
}

function messageFor(product: PurchaseRecoveryProduct) {
  if (product === "database") {
    return `🎁 היי, ראיתי שהתעניינת במאגר ההיכרויות שלי ורציתי לכתוב לך אישית. אתמול לא הייתה אפשרות לבצע רכישות באתר, ועכשיו האפשרות חזרה לפעול. אם עדיין מתאים לך לחזור לתהליך, שמרתי לך כמחווה אישית להשלמת הרכישה הטבה מיוחדת: 10% הנחה עם הקוד MATCH10. המחיר הוא 269.10 ₪ במקום 299 ₪, בתשלום חד פעמי.

ההצטרפות למאגר כוללת התאמה על בסיס DNA, בניית פרופיל והעדפות, והצעות שנבחנות בידי אדם. יצירת קשר מתקיימת רק לאחר אישור הדדי. חשוב לי להיות מדויקת: אין כאן התחייבות למועד, לכמות הצעות או לתוצאה, אלא תהליך היכרות אישי ומכבד.

אם זה מרגיש נכון עכשיו, אפשר לחזור ולהצטרף כאן. הקוד כבר בקישור:`;
  }
  if (product === "session") {
    return `🎁 היי, ראיתי שהתעניינת בפגישה אישית איתי ורציתי לעדכן אותך. אתמול לא הייתה אפשרות לבצע רכישות באתר, ועכשיו האפשרות חזרה לפעול. אם הפגישה עדיין מתאימה לך, שמרתי לך כמחווה אישית להשלמת הרכישה הטבה מיוחדת: 10% הנחה עם הקוד LOVE10DAY. פגישה של 60 דקות זמינה בזום או בקליניקה, במחיר 450 ₪ במקום 500 ₪.

בפגישה אפשר לעשות סדר במה שחשוב לך בתהליך ההיכרות ולדייק כיוון שמתאים לחיים שלך. הפגישה נערכת איתי, הילית, או עם צוות מיומן הפועל בהשגחה צמודה שלי. חשוב לי להיות מדויקת: אין כאן הבטחה לתוצאה, למועד או להתקדמות מסוימת, אלא מקום מקצועי לשיחה, בחינה ובהירות.

אם זה מרגיש נכון עכשיו, אפשר לחזור ולרכוש את הפגישה כאן. הקוד כבר בקישור:`;
  }
  return `🎁 היי, ראיתי שהתעניינת ב Plus ורציתי לכתוב לך אישית. אתמול לא הייתה אפשרות לבצע רכישות באתר, ועכשיו האפשרות חזרה לפעול. אם עדיין מתאים לך לחזור למסלול Plus, שמרתי לך כמחווה אישית להשלמת הרכישה הטבה מיוחדת: בוסט נוסף במתנה בהצטרפות ראשונה, עם הקוד PLUSGIFT, מעבר לבוסט הכלול במסלול.

Plus מיועד לחברות ולחברי מאגר בתשלום פעיל בלבד. המחיר הוא 99 ₪ בחיוב חודשי מתחדש עד לביטול, ובמסלול יש שתי הצעות בכל 30 יום. חשוב לי להיות מדויקת: הצעות אינן הבטחה לדייט, לזוגיות, למועד מסוים או לתוצאה. המטרה היא להמשיך תהליך היכרות אישי בקצב שמתאים לך.

אם זה מרגיש נכון עכשיו, אפשר לחזור ולהצטרף ל Plus כאן. הקוד כבר בקישור:`;
}

export function buildPurchaseRecoverySms(input: PurchaseRecoverySmsInput) {
  const expiresAt = checkedExpiryText();
  const offerUrl = checkedOfferUrl(input.product, input.offerUrl);
  const unsubscribeUrl = checkedUnsubscribeUrl(input.unsubscribeUrl);

  return `הילית כספי | ${messageFor(input.product)}\n${offerUrl}\nההטבה האישית בתוקף עד ${expiresAt}.\n\nאם יש שאלה או צורך בעזרה לפני שמחליטים, אפשר לכתוב לי בוואטסאפ:\n${RECOVERY_BUSINESS_WHATSAPP_URL}\n\nלביטול קבלת SMS שיווקי, לחצו כאן: ${unsubscribeUrl}`;
}

export const buildSms = buildPurchaseRecoverySms;
export const SMS = buildPurchaseRecoverySms;
export { RECOVERY_CAMPAIGN, RECOVERY_OFFER_EXPIRES_AT };
