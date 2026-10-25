// Draft content only. This module does not send messages, access a database, or schedule work.
import {
  purchaseRecoveryOfferUrl,
  recoveryOfferCode,
  RECOVERY_CAMPAIGN,
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

function messageFor(product: PurchaseRecoveryProduct, expiresAt: string) {
  if (product === "database") {
    return `🎁 התעניינת במאגר שלי? שמרתי לך 10% הנחה: 269.10 ₪ במקום 299 ₪ עם MATCH10. להצטרפות ולהתחלת תהליך ההיכרות, ההטבה כבר בקישור. עד ${expiresAt}.`;
  }
  if (product === "session") {
    return `🎁 התעניינת בפגישה? מחכה לך 10% הנחה: 60 דקות של דיוק וכיוון לזוגיות, בזום או בקליניקה, ב־450 ₪ במקום 500 ₪ עם LOVE10DAY. ההטבה כבר בקישור. עד ${expiresAt}.`;
  }
  return `🎁 התעניינת ב־Plus? בוסט נוסף במתנה בהצטרפות ראשונה עם PLUSGIFT, מעבר לבוסט הכלול. 99 ₪ בחיוב חודשי מתחדש, שתי הצעות בכל 30 יום, לחברי מאגר פעילים בלבד. ההטבה בקישור עד ${expiresAt}.`;
}

export function buildPurchaseRecoverySms(input: PurchaseRecoverySmsInput) {
  const expiresAt = checkedExpiryText();
  const offerUrl = checkedOfferUrl(input.product, input.offerUrl);
  const unsubscribeUrl = checkedUnsubscribeUrl(input.unsubscribeUrl);
  const disclaimer = input.product === "plus" ? " הצעות אינן הבטחת דייט או זוגיות." : "";

  return `הילית כספי | פרסומת: ${messageFor(input.product, expiresAt)}${disclaimer}\n${offerUrl}\nלהסרה: ${unsubscribeUrl}`;
}

export const buildSms = buildPurchaseRecoverySms;
export const SMS = buildPurchaseRecoverySms;
export { RECOVERY_CAMPAIGN, RECOVERY_OFFER_EXPIRES_AT };
