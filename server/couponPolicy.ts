export const PLUS_MEMBER_COUPON = "PLUS50";

export const PLUS50_ALLOWED_PRODUCTS = new Set([
  "guide",
  "course",
  "session",
  "coaching",
  "coaching_mas",
]);

type PlusEntitlement = {
  status?: string | null;
  billingStatus?: string | null;
  billingCycleEndsAt?: number | null;
};

export function isPlus50ProductAllowed(product?: string | null) {
  return Boolean(product && PLUS50_ALLOWED_PRODUCTS.has(product));
}

export function hasActivePlusCouponEntitlement(member: PlusEntitlement | null | undefined, now = Date.now()) {
  if (!member) return false;
  if (member.billingStatus === "active" && member.status === "active") return true;
  return member.billingStatus === "cancelled" &&
    member.status === "churned" &&
    Boolean(member.billingCycleEndsAt && member.billingCycleEndsAt > now);
}

type CouponDiscount = {
  fixedPrice?: number | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
};

export function computeCouponPrice(basePrice: number, coupon: CouponDiscount) {
  if (coupon.fixedPrice) return Math.max(1, coupon.fixedPrice);
  if (coupon.discountAmount) return Math.max(1, basePrice - coupon.discountAmount);
  if (coupon.discountPercent) return Math.max(1, Math.round(basePrice * (1 - coupon.discountPercent / 100)));
  return basePrice;
}
