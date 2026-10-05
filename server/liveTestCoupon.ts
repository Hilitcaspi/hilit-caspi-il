export const LIVE_TEST_CODE = "TEST1";
export const LIVE_TEST_PRICE = 1;
export const LIVE_TEST_EXPIRES_AT = Date.parse("2026-10-12T00:00:00+03:00");

/** Only the configured owner's inbox and two fixed Gmail aliases may test the checkout. */
export function isAuthorizedLiveTestEmail(email: string | undefined, now = Date.now()): boolean {
  const owner = process.env.LIVE_TEST_CHECKOUT_EMAIL?.trim().toLowerCase();
  if (!owner || now >= LIVE_TEST_EXPIRES_AT || !email) return false;
  const normalized = email.trim().toLowerCase();
  const at = owner.lastIndexOf("@");
  if (at < 1 || owner.slice(at) !== "@gmail.com") return normalized === owner;
  const local = owner.slice(0, at);
  return normalized === owner || normalized === `${local}+live-database@gmail.com` || normalized === `${local}+live-ticket@gmail.com`;
}

export function isLiveTestProduct(product: string): boolean {
  return product === "database" || product === "live_october";
}

export function isLiveTestCheckout(product: string, coupon: string | undefined | null, email: string | undefined, now = Date.now()): boolean {
  return coupon?.trim().toUpperCase() === LIVE_TEST_CODE && isLiveTestProduct(product) && isAuthorizedLiveTestEmail(email, now);
}
