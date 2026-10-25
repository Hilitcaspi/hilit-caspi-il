import { afterEach, describe, expect, it } from "vitest";
import {
  LIVE_TEST_EXPIRES_AT,
  LIVE_TEST_PRICE,
  LIVE_TEST_PRODUCTS,
  isLiveTestCheckout,
} from "./liveTestCoupon";

const priorOwner = process.env.LIVE_TEST_CHECKOUT_EMAIL;
afterEach(() => {
  if (priorOwner === undefined) delete process.env.LIVE_TEST_CHECKOUT_EMAIL;
  else process.env.LIVE_TEST_CHECKOUT_EMAIL = priorOwner;
});

describe("TEST1 diagnostic coupon policy", () => {
  it("authorizes the configured owner for every checkout enum product during the bounded window", () => {
    process.env.LIVE_TEST_CHECKOUT_EMAIL = "test-owner@gmail.com";
    const now = LIVE_TEST_EXPIRES_AT - 1;
    expect(LIVE_TEST_PRICE).toBe(1);
    expect(LIVE_TEST_PRODUCTS).toEqual([
      "database", "guide", "course", "coaching", "coaching_mas", "session",
      "bundle_tubav", "bundle_new_year", "match_boost", "plus", "live_october",
    ]);
    for (const product of LIVE_TEST_PRODUCTS) {
      expect(isLiveTestCheckout(product, "test1", "test-owner@gmail.com", now)).toBe(true);
    }
  });

  it("rejects arbitrary public codes, unauthorized mailboxes, unknown products, and expiry", () => {
    process.env.LIVE_TEST_CHECKOUT_EMAIL = "test-owner@gmail.com";
    const now = LIVE_TEST_EXPIRES_AT - 1;
    expect(isLiveTestCheckout("database", "PUBLIC1", "test-owner@gmail.com", now)).toBe(false);
    expect(isLiveTestCheckout("database", "TEST1", "other@example.test", now)).toBe(false);
    expect(isLiveTestCheckout("unknown", "TEST1", "test-owner@gmail.com", now)).toBe(false);
    expect(isLiveTestCheckout("database", "TEST1", "test-owner@gmail.com", LIVE_TEST_EXPIRES_AT)).toBe(false);
  });
});
