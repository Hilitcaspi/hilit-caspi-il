const EXPECTED_CHECKOUT_REJECTION_MESSAGES = [
  "Database Plus זמין רק לחברי המאגר הפעילים",
  "התשלום עבור Plus כבר נקלט",
  "מנוי Plus כבר פעיל",
  "מכסת ההשקה מלאה כרגע",
  "יש לאשר את תנאי החיוב, התקנון והשתתפות ב־Boost לפני התשלום",
  "נדרש קישור אישי ואישור תקנון Boost לפני התשלום",
] as const;

/**
 * Business-rule rejections are expected checkout outcomes, not payment-system
 * failures. They should remain visible to the customer but must not trigger an
 * operational payment alarm.
 */
export function isExpectedCheckoutRejection(message?: string | null): boolean {
  const normalized = String(message || "");
  return EXPECTED_CHECKOUT_REJECTION_MESSAGES.some(expected => normalized.includes(expected));
}
