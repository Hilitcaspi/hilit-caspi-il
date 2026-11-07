import { isNovemberBundleOfferActive } from "./novemberBundleOffer";

export const NOVEMBER_COUPON_CODE = "NOVEMBER10";
export const NOVEMBER_COUPON_PRODUCTS = new Set(["database", "course", "guide", "session", "coaching", "coaching_mas"]);
export const NOVEMBER_COUPON_ERROR = "קוד november10 תקף בנובמבר למוצרים הרגילים בלבד, לא לחבילת נובמבר, Plus או בוסט.";
export function isNovemberCouponAllowed(product?: string | null, now = Date.now()) {
  return Boolean(product && NOVEMBER_COUPON_PRODUCTS.has(product) && isNovemberBundleOfferActive(now));
}
