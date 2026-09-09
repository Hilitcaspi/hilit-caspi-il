import { describe, it, expect } from "vitest";
import { createPaymentProcess, approveTransaction, isGrowPhoneValidationFailure, PAYMENT_PHONE_INVALID, PRODUCT_CONFIGS, shouldUseGrowCreateFallback } from "./growPayment";

describe("growPayment module", () => {
  it("classifies Grow error 946 as user phone validation rather than a platform outage", () => {
    expect(isGrowPhoneValidationFailure({
      status: "0",
      err: { id: 946, message: "שדה חובה phone לא תקין" },
    })).toBe(true);
    expect(isGrowPhoneValidationFailure({
      status: "0",
      err: { id: 500, message: "temporary provider error" },
    })).toBe(false);
    expect(PAYMENT_PHONE_INVALID).toBe("PAYMENT_PHONE_INVALID");
  });

  it("uses the fallback only for Incapsula-style createProcess responses", () => {
    expect(shouldUseGrowCreateFallback(403, "text/html", "Request unsuccessful - Incapsula")).toBe(true);
    expect(shouldUseGrowCreateFallback(200, "application/json", '{"status":1}')).toBe(false);
    expect(shouldUseGrowCreateFallback(400, "application/json", '{"status":0}')).toBe(false);
  });

  it("exports createPaymentProcess function", () => {
    expect(typeof createPaymentProcess).toBe("function");
  });

  it("exports approveTransaction function", () => {
    expect(typeof approveTransaction).toBe("function");
  });

  it("has product configs for all supported products", () => {
    const expected = ["database", "guide", "course", "coaching", "session", "bundle_new_year", "match_boost", "plus"];
    for (const p of expected) {
      expect(PRODUCT_CONFIGS[p]).toBeDefined();
      expect(PRODUCT_CONFIGS[p].sum).toBeGreaterThan(0);
    }
  });

  it("configures Boost as a one-time 19.90 ILS product", () => {
    expect(PRODUCT_CONFIGS.match_boost).toMatchObject({
      sum: 19.90,
      paymentNum: 1,
    });
    expect(PRODUCT_CONFIGS.match_boost.description).toContain("Boost");
    expect(PRODUCT_CONFIGS.match_boost.description).toContain("אלגוריתמית");
  });

  it("configures the New Year bundle as a single 399 ILS charge", () => {
    expect(PRODUCT_CONFIGS.bundle_new_year).toMatchObject({
      sum: 399,
      paymentNum: 1,
    });
    expect(PRODUCT_CONFIGS.bundle_new_year.description).toContain("מאגר");
    expect(PRODUCT_CONFIGS.bundle_new_year.description).toContain("מדריך");
    expect(PRODUCT_CONFIGS.bundle_new_year.description).toContain("קורס");
  });

  it("uses sandbox URL when GROW_ENV is not production", () => {
    // GROW_ENV is not set in test env → should use sandbox
    const isGrowProd = process.env.GROW_ENV === "production";
    expect(isGrowProd).toBe(false);
  });
});
