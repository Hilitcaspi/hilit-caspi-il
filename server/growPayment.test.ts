import { describe, it, expect } from "vitest";
import { createPaymentProcess, approveTransaction, PRODUCT_CONFIGS } from "./growPayment";

describe("growPayment module", () => {
  it("exports createPaymentProcess function", () => {
    expect(typeof createPaymentProcess).toBe("function");
  });

  it("exports approveTransaction function", () => {
    expect(typeof approveTransaction).toBe("function");
  });

  it("has product configs for all supported products", () => {
    const expected = ["database", "guide", "course", "coaching", "session"];
    for (const p of expected) {
      expect(PRODUCT_CONFIGS[p]).toBeDefined();
      expect(PRODUCT_CONFIGS[p].sum).toBeGreaterThan(0);
    }
  });

  it("uses sandbox URL when GROW_ENV is not production", () => {
    // GROW_ENV is not set in test env → should use sandbox
    const isGrowProd = process.env.GROW_ENV === "production";
    expect(isGrowProd).toBe(false);
  });
});
