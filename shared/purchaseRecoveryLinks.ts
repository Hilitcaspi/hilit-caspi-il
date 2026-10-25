export const RECOVERY_CAMPAIGN = "recovery_oct25_2026" as const;
export const RECOVERY_SEND_AT = Date.parse("2026-10-25T19:00:00+02:00");
export const RECOVERY_SEND_EXPIRES_AT = Date.parse("2026-10-25T22:00:00+02:00");
export const RECOVERY_OFFER_EXPIRES_AT = Date.parse("2026-10-26T23:59:59+02:00");
// Same public business contact used on the Israeli home and session pages.
// The destination contains no recipient identifiers and never sends a message automatically.
export const RECOVERY_BUSINESS_WHATSAPP_URL = "https://wa.me/972552442334";

export type PurchaseRecoveryProduct = "database" | "session" | "plus";
export type PurchaseRecoveryChannel = "email" | "sms";

const RECOVERY_OFFERS: Record<PurchaseRecoveryProduct, string> = {
  database: "MATCH10",
  // LOVE10 is an existing unrestricted legacy discount code. Recovery uses a
  // separate code so this campaign never changes that established behavior.
  session: "LOVE10DAY",
  plus: "PLUSGIFT",
};

const RECOVERY_PATHS: Record<PurchaseRecoveryProduct, string> = {
  database: "/join?source=database",
  session: "/single-session",
  plus: "/database-plus",
};

/** Returns only the campaign's server-recognized offer code for an allowed product. */
export function recoveryOfferCode(product: PurchaseRecoveryProduct) {
  return RECOVERY_OFFERS[product];
}

/**
 * Public, recipient-neutral campaign destination. Eligibility is never encoded
 * into this URL; checkout re-validates the offer against the server snapshot.
 */
export function purchaseRecoveryOfferUrl(product: PurchaseRecoveryProduct, channel: PurchaseRecoveryChannel) {
  const url = new URL(RECOVERY_PATHS[product], "https://hilitcaspi.com");
  url.searchParams.set("coupon", recoveryOfferCode(product));
  url.searchParams.set("utm_source", channel);
  url.searchParams.set("utm_medium", "recovery");
  url.searchParams.set("utm_campaign", RECOVERY_CAMPAIGN);
  url.searchParams.set("utm_content", `${product}_${channel}`);
  return url.toString();
}
