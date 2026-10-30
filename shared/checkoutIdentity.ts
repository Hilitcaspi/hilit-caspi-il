export interface CheckoutCustomerIdentity {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * Canonicalizes user-entered display whitespace without transliterating or changing
 * letters. This keeps Hebrew, Latin, and other Unicode names intact while making
 * full-name validation independent of repeated, non-breaking, and zero-width spaces.
 */
export function normalizeCheckoutFullName(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFKC")
    // ES5-target-compatible set of JavaScript whitespace, Unicode separator,
    // and zero-width-space code points. Avoid Unicode-property regex flags here
    // because this client project intentionally compiles below ES2018.
    .replace(/[\s\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]+/g, " ")
    .trim();
}

/** A checkout name requires at least two letter-containing name parts. */
export function isValidCheckoutFullName(value: string | null | undefined): boolean {
  const parts = normalizeCheckoutFullName(value)
    .split(" ")
    .filter(Boolean);
  // Covers Hebrew, Arabic, Latin (including accented forms), Greek, Cyrillic,
  // and the common BMP letter blocks without depending on ES2018 `\p{L}`.
  return parts.length >= 2
    && parts.every(part => /[A-Za-z\u00C0-\u024F\u0370-\u1FFF\u2C00-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]/.test(part));
}

export function isValidCheckoutEmail(value: string | null | undefined): boolean {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * A wallet may hide its editable identity fields only when all three values are
 * complete. `normalizedPhone` is supplied by the existing Israeli-phone policy so
 * this helper stays pure and safe for both client code and unit tests.
 */
export function hasCompleteCheckoutPrefill(
  identity: CheckoutCustomerIdentity,
  normalizedPhone: string | null | undefined,
): boolean {
  return isValidCheckoutFullName(identity.fullName)
    && isValidCheckoutEmail(identity.email)
    && Boolean(normalizedPhone);
}
