export const TU_BAV_CLOSED_MESSAGE = "הטבת ט״ו באב הסתיימה ואינה פתוחה לרכישות חדשות. זכויות של רכישות קודמות נשמרות";

/** Only new checkout creation is blocked; historical fulfillment stays intact. */
export function isClosedSeasonalProduct(product: string): boolean {
  return product === "bundle_tubav";
}
