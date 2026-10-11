/** Existing production pixel verified against Israeli campaigns. */
export const ISRAEL_META_PIXEL_ID = "1404692968091892";
/** Local retry limit; not a claim about Meta's attribution window. */
export const META_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const META_MAX_ATTEMPTS = 30;
export function isProductionPurchaseMeasurement(input: { amount: number; couponCode?: string | null; testCheckout?: boolean }) {
  return !input.testCheckout && input.couponCode?.trim().toUpperCase() !== "TEST1"
    && Number.isFinite(input.amount) && input.amount > 1.5;
}
export function isIsraeliProductionMeasurementRuntime(env: string | undefined) { return env === "production"; }
export function isPaidGrowMeasurementNotification(input: { statusCode: unknown; transactionId: string; transactionToken: string; paymentDate?: unknown }) {
  // Documented Server Response omits statusCode. Require its payment date and
  // canonical transaction identities, never a browser/SDK success flag alone.
  const canonicalServerResponse = input.statusCode == null && typeof input.paymentDate === "string"
    && /^\d{2}\/\d{2}\/(?:\d{2}|\d{4})$/.test(input.paymentDate);
  return (Number(input.statusCode) === 2 || canonicalServerResponse) && /^\d{3,30}$/.test(input.transactionId)
    && /^[a-zA-Z0-9]{12,200}$/.test(input.transactionToken);
}
export function metaRetryDelay(attempt: number) {
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 60 * 60 * 1000);
}
/** Accept explicit Unix or offset-qualified ISO timestamps only. Never infer from receipt time. */
export function metaProviderPaidAt(value: unknown): number | null {
  if (typeof value === "number" || typeof value === "string" && /^\d{10,13}$/.test(value)) {
    const n = Number(value), ms = n < 100_000_000_000 ? n * 1000 : n;
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const ms = Date.parse(value); return Number.isFinite(ms) ? ms : null;
}
/** Grow documents DD/MM/YY (no time). Use receipt time only on that same Israeli day.
 * This is date-precision measurement, not proof of the exact payment second. */
export function metaNotificationPaidAt(value: unknown, receivedAt: number): number | null {
  const exact = metaProviderPaidAt(value);
  if (exact !== null) return exact;
  if (typeof value !== "string") return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(value);
  if (!match) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(receivedAt));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return match[1] === get("day") && match[2] === get("month") && year === get("year") ? receivedAt : null;
}
export function isFreshMetaEvent(eventTime: number, enabledAt: number, now: number) {
  return Number.isFinite(eventTime) && eventTime >= enabledAt
    && eventTime <= now + 60_000 && now - eventTime < META_RETRY_WINDOW_MS;
}
export function matchesMetaCheckout(input: {
  processToken: string; checkoutProcessToken?: string | null;
  confirmedTransactionId?: string | null; transactionId: string;
}) {
  return Boolean(input.processToken && input.checkoutProcessToken === input.processToken
    && (!input.confirmedTransactionId || input.confirmedTransactionId === input.transactionId));
}
