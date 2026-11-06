export const LIVE_TEST_CODE = "TEST1";
export const LIVE_TEST_PRICE = 1;
/** Owner-approved permanent diagnostic: no expiry or coupon-use quota. */
export const LIVE_TEST_EXPIRES_AT = null;
export const LIVE_TEST_MAX_USES = null;

/**
 * Checkout products covered by the permanent TEST1 diagnostic. The retired
 * Tu B'Av product remains listed so the test policy cannot drift from the
 * checkout enum, but its normal closed-offer gate still rejects new checkouts.
 */
export const LIVE_TEST_PRODUCTS = [
  "database",
  "guide",
  "course",
  "coaching",
  "coaching_mas",
  "session",
  "bundle_tubav",
  "bundle_new_year",
  "bundle_november",
  "match_boost",
  "plus",
  "live_october",
] as const;

export type LiveTestProduct = (typeof LIVE_TEST_PRODUCTS)[number];

/** Only the configured owner's inbox and two fixed Gmail aliases may test the checkout. */
export function isAuthorizedLiveTestEmail(email: string | undefined, now = Date.now()): boolean {
  const owner = process.env.LIVE_TEST_CHECKOUT_EMAIL?.trim().toLowerCase();
  // Keep the optional clock argument compatible with existing callers; TEST1
  // no longer expires. Each attempt still has its normal locks and proof TTL.
  if (!owner || !email) return false;
  const normalized = email.trim().toLowerCase();
  const at = owner.lastIndexOf("@");
  if (at < 1 || owner.slice(at) !== "@gmail.com") return normalized === owner;
  const local = owner.slice(0, at);
  return normalized === owner || normalized === `${local}+live-database@gmail.com` || normalized === `${local}+live-ticket@gmail.com`;
}

export function isLiveTestProduct(product: string): product is LiveTestProduct {
  return (LIVE_TEST_PRODUCTS as readonly string[]).includes(product);
}

/**
 * This authorizes only server-controlled TEST1 diagnostic checkouts. It does
 * not bypass any product's normal availability, membership, token or consent
 * gates, which are checked by the checkout procedure separately.
 */
export function isLiveTestCheckout(product: string, coupon: string | undefined | null, email: string | undefined, now = Date.now()): boolean {
  return coupon?.trim().toUpperCase() === LIVE_TEST_CODE && isLiveTestProduct(product) && isAuthorizedLiveTestEmail(email, now);
}

export function isLiveTestCoupon(coupon: string | undefined | null): boolean {
  return coupon?.trim().toUpperCase() === LIVE_TEST_CODE;
}
