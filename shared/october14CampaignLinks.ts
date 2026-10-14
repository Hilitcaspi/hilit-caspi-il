export const OCT14_CAMPAIGN = "evening_oct14_2026";
export type October14Audience = "database_warm" | "plus_members";
export type October14Channel = "email" | "sms" | "whatsapp";
const SITE = "https://hilitcaspi.com";
export function october14OfferUrl(audience: October14Audience, channel: October14Channel, placement = "primary") {
  const u = new URL(audience === "database_warm" ? "/live/database" : "/database-plus", SITE);
  u.searchParams.set("coupon", audience === "database_warm" ? "LIVE" : "PLUS");
  u.searchParams.set("utm_source", channel === "email" ? "newsletter" : channel === "whatsapp" ? "whatsapp_group" : "sms");
  u.searchParams.set("utm_medium", channel === "whatsapp" ? "organic_social" : channel);
  u.searchParams.set("utm_campaign", OCT14_CAMPAIGN);
  u.searchParams.set("utm_content", `${audience}_${placement}`);
  return u.href;
}
// One fixed local offer; arbitrary redirect targets, tokens and personal data are never accepted.
export function october14SmsAliasTarget() {
  const u = new URL(october14OfferUrl("database_warm", "sms", "checkout"));
  return `${u.pathname}${u.search}`;
}
export const OCT14_SMS_SHORT_URL = `${SITE}/o14`;
