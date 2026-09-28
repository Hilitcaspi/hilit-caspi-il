export const DATABASE_NOW_CAMPAIGN = "database_holiday_now_sep27";
export const DATABASE_NOW_COUPON = "NOW";
export const DATABASE_NOW_PRICE_ILS = 299;
export const DATABASE_NOW_MAX_USES = 100;
export const DATABASE_REGULAR_PRICE_ILS = 499;
// End of 1 October 2026 in Israel (UTC+3).
export const DATABASE_NOW_EXPIRES_AT = Date.parse("2026-10-01T20:59:59.000Z");
export const DATABASE_NOW_EMAIL_JOURNEY = `${DATABASE_NOW_CAMPAIGN}_email`;
export const DATABASE_NOW_SMS_JOURNEY = `${DATABASE_NOW_CAMPAIGN}_sms`;

export function isDatabaseNowAttribution(input: {
  couponCode?: string | null;
  utmCampaign?: string | null;
}) {
  const couponCode = input.couponCode?.trim().toUpperCase() || "";
  const utmCampaign = input.utmCampaign?.trim().toLowerCase() || "";
  return couponCode === DATABASE_NOW_COUPON || utmCampaign === DATABASE_NOW_CAMPAIGN.toLowerCase();
}

export function databaseNowOfferUrl(source: "email" | "sms" | "whatsapp" | "story") {
  return `https://hilitcaspi.com/now?s=${source}`;
}
