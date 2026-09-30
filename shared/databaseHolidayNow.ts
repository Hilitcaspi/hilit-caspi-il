export const DATABASE_NOW_CAMPAIGN = "database_holiday_now_sep27";
export const DATABASE_NOW_COUPON = "NOW";
export const DATABASE_NOW_PRICE_ILS = 299;
// First 100 places plus 100 additional places opened on 30 September 2026.
export const DATABASE_NOW_MAX_USES = 200;
export const DATABASE_REGULAR_PRICE_ILS = 499;
// End of 1 October 2026 in Israel (UTC+3).
export const DATABASE_NOW_EXPIRES_AT = Date.parse("2026-10-01T20:59:59.000Z");
export const DATABASE_NOW_EMAIL_JOURNEY = `${DATABASE_NOW_CAMPAIGN}_email`;
export const DATABASE_NOW_SMS_JOURNEY = `${DATABASE_NOW_CAMPAIGN}_sms`;

export function isDatabaseNowCoupon(couponCode?: string | null) {
  return couponCode?.trim().toUpperCase() === DATABASE_NOW_COUPON;
}

export function databaseNowOfferUrl(source: "email" | "sms" | "whatsapp" | "story") {
  return `https://hilitcaspi.com/now?s=${source}`;
}
