import { describe, expect, it } from "vitest";
import { computeCouponPrice, hasActivePlusCouponEntitlement, isPlus50ProductAllowed } from "./couponPolicy";

describe("PLUS50 coupon policy", () => {
  it("allows approved upsell products but not database or plus", () => {
    expect(isPlus50ProductAllowed("session")).toBe(true);
    expect(isPlus50ProductAllowed("guide")).toBe(true);
    expect(isPlus50ProductAllowed("coaching_mas")).toBe(true);
    expect(isPlus50ProductAllowed("database")).toBe(false);
    expect(isPlus50ProductAllowed("plus")).toBe(false);
  });

  it("allows an active paid Plus member", () => {
    expect(hasActivePlusCouponEntitlement({ status: "active", billingStatus: "active" }, 1000)).toBe(true);
  });

  it("keeps the benefit until the paid period ends after cancellation", () => {
    expect(hasActivePlusCouponEntitlement({ status: "churned", billingStatus: "cancelled", billingCycleEndsAt: 2000 }, 1000)).toBe(true);
    expect(hasActivePlusCouponEntitlement({ status: "churned", billingStatus: "cancelled", billingCycleEndsAt: 500 }, 1000)).toBe(false);
  });

  it("rejects waitlist, invited and past-due members", () => {
    expect(hasActivePlusCouponEntitlement({ status: "waitlist", billingStatus: "not_configured" })).toBe(false);
    expect(hasActivePlusCouponEntitlement({ status: "invited", billingStatus: "pending" })).toBe(false);
    expect(hasActivePlusCouponEntitlement({ status: "active", billingStatus: "past_due" })).toBe(false);
  });

  it("calculates LOVE10 and PLUS50 correctly for a 500 ILS session", () => {
    expect(computeCouponPrice(500, { discountPercent: 10 })).toBe(450);
    expect(computeCouponPrice(500, { discountAmount: 50 })).toBe(450);
  });

  it("calculates the September 50 percent offer for digital products", () => {
    expect(computeCouponPrice(149, { discountPercent: 50 })).toBe(75);
    expect(computeCouponPrice(249, { discountPercent: 50 })).toBe(125);
  });
});
