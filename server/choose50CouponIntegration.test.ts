import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHOOSE50_START_AT, CHOOSE50_END_AT, validateChoose50Coupon } from "./choose50Coupon";

const source = readFileSync("server/routers.ts", "utf8");
const validation = source.slice(source.indexOf("// ─── Discount Coupons"), source.indexOf("// Admin: list all coupons"));
const checkout = source.slice(source.indexOf('const normalizedCheckoutEmail = input.email.trim().toLowerCase();'), source.indexOf('// Save/update UTM + ga4ClientId'));
const wallet = readFileSync("client/src/components/GrowWallet.tsx", "utf8");

describe("Choose50 exact-price integration", () => {
  it("returns 7450 agorot and 50 percent for the guide only, case-insensitively", () => {
    const result = validateChoose50Coupon({ code: "Choose50", product: "guide", now: CHOOSE50_START_AT });
    expect(result).toMatchObject({ valid: true, discountPercent: 50, fixedPrice: 74.5, priceAgorot: 7450 });
    for (const product of ["course", "database", "plus", "match_boost", "session", "coaching", "coaching_mas", "bundle_tubav", "bundle_new_year", "live_october", undefined]) {
      expect(validateChoose50Coupon({ code: "CHOOSE50", product, now: CHOOSE50_START_AT }).valid).toBe(false);
    }
  });

  it("expires exactly after the inclusive Jerusalem month-end boundary", () => {
    expect(validateChoose50Coupon({ code: "CHOOSE50", product: "guide", now: CHOOSE50_END_AT }).valid).toBe(true);
    expect(validateChoose50Coupon({ code: "CHOOSE50", product: "guide", now: CHOOSE50_END_AT + 1 }).valid).toBe(false);
  });

  it("keeps database active, expiry and maximum-use validation before the dedicated offer", () => {
    const gate = validation.indexOf("if (code.code === CHOOSE50_CODE)");
    expect(gate).toBeGreaterThan(0);
    for (const check of ["if (!code)", "if (!code.isActive)", "code.expiresAt < Date.now()", "code.usedCount >= code.maxUses"]) {
      expect(validation.indexOf(check)).toBeGreaterThan(-1);
      expect(validation.indexOf(check)).toBeLessThan(gate);
    }
    expect(validation).toContain("product: input.product");
    expect(validation).toContain("discountAmount: undefined");
  });

  it("rejects an ineligible Choose50 before Boost/Plus preparation or any provider call", () => {
    const guard = checkout.indexOf("if (reservedCode === CHOOSE50_CODE)");
    const end = checkout.indexOf("const recoveryProduct", guard);
    const offerGuard = checkout.slice(guard, end);
    expect(guard).toBeGreaterThan(0);
    expect(offerGuard).toContain("PRECONDITION_FAILED");
    expect(offerGuard).toContain("storedCoupon?.isActive");
    expect(offerGuard).toContain('storedCoupon.product !== "guide"');
    expect(offerGuard).not.toMatch(/db\.(?:insert|update|delete)/);
    expect(guard).toBeLessThan(checkout.indexOf("preparePaidBoostCheckout"));
    expect(offerGuard).toContain("choose50FixedPrice = offer.fixedPrice");
  });

  it("uses the exact validated amount and bypasses whole-shekel rounding only for Choose50", () => {
    expect(checkout).toContain("if (choose50FixedPrice !== undefined) finalSum = choose50FixedPrice;");
    expect(checkout).toContain("choose50FixedPrice === undefined && !validatedRecoveryCode");
    expect(checkout).toContain("finalSum = computeCouponPrice(basePrice, code)");
  });

  it("shows the struck-through guide base price and exact promotional button amount", () => {
    expect(wallet).toContain('couponApplied.code === "CHOOSE50"');
    expect(wallet).toMatch(/<del className="text-sm font-normal text-gray-500">\s*₪\{PRODUCT_CONFIGS\.guide\.sum\}\s*<\/del>/);
    expect(wallet).toContain("couponApplied.fixedPrice.toFixed(2)");
    expect(wallet).toContain('couponApplied?.code === "CHOOSE50"');
  });
});
