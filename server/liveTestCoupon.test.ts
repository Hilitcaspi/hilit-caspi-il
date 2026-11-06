import { afterEach, describe, expect, it } from "vitest";
import {
  LIVE_TEST_EXPIRES_AT,
  LIVE_TEST_MAX_USES,
  LIVE_TEST_PRICE,
  LIVE_TEST_PRODUCTS,
  isAuthorizedLiveTestEmail,
  isLiveTestCheckout,
} from "./liveTestCoupon";

const priorOwner = process.env.LIVE_TEST_CHECKOUT_EMAIL;
afterEach(() => {
  if (priorOwner === undefined) delete process.env.LIVE_TEST_CHECKOUT_EMAIL;
  else process.env.LIVE_TEST_CHECKOUT_EMAIL = priorOwner;
});

const AFTER_OLD_EXPIRY = Date.parse("2026-11-06T10:00:00+02:00");

describe("TEST1 permanent diagnostic coupon policy", () => {
  it("has no coupon expiry or use quota and keeps the diagnostic price at one shekel", () => {
    expect(LIVE_TEST_EXPIRES_AT).toBeNull();
    expect(LIVE_TEST_MAX_USES).toBeNull();
    expect(LIVE_TEST_PRICE).toBe(1);
    expect(LIVE_TEST_PRODUCTS).toEqual([
      "database", "guide", "course", "coaching", "coaching_mas", "session",
      "bundle_tubav", "bundle_new_year", "bundle_november", "match_boost", "plus", "live_october",
    ]);
  });

  it.each(LIVE_TEST_PRODUCTS)("authorizes repeat diagnostic %s checkouts after the old cutoff and in future years", product => {
    process.env.LIVE_TEST_CHECKOUT_EMAIL = "test-owner@gmail.com";
    for (const now of [AFTER_OLD_EXPIRY, Date.parse("2030-01-01T00:00:00Z"), Date.parse("2099-12-31T00:00:00Z")]) {
      for (let attempt = 0; attempt < 25; attempt++) {
        expect(isLiveTestCheckout(product, "test1", "test-owner@gmail.com", now)).toBe(true);
      }
    }
  });

  it("still rejects arbitrary public codes, unauthorized mailboxes and unknown products", () => {
    process.env.LIVE_TEST_CHECKOUT_EMAIL = "test-owner@gmail.com";
    expect(isLiveTestCheckout("database", "PUBLIC1", "test-owner@gmail.com", AFTER_OLD_EXPIRY)).toBe(false);
    expect(isLiveTestCheckout("database", "TEST1", "other@example.test", AFTER_OLD_EXPIRY)).toBe(false);
    expect(isLiveTestCheckout("unknown", "TEST1", "test-owner@gmail.com", AFTER_OLD_EXPIRY)).toBe(false);
    expect(isLiveTestCheckout("database", null, "test-owner@gmail.com", AFTER_OLD_EXPIRY)).toBe(false);
  });

  it("fails closed when the test inbox has not been configured", () => {
    delete process.env.LIVE_TEST_CHECKOUT_EMAIL;
    expect(isAuthorizedLiveTestEmail("test-owner@gmail.com", AFTER_OLD_EXPIRY)).toBe(false);
    expect(isLiveTestCheckout("guide", "TEST1", "test-owner@gmail.com", AFTER_OLD_EXPIRY)).toBe(false);
  });

  it("keeps only the owner's exact Gmail inbox and its two previously approved aliases", () => {
    process.env.LIVE_TEST_CHECKOUT_EMAIL = " Test-Owner@gmail.com ";
    for (const email of ["test-owner@gmail.com", " TEST-OWNER@gmail.com ", "test-owner+live-database@gmail.com", "test-owner+live-ticket@gmail.com"]) {
      expect(isLiveTestCheckout("course", " TEST1 ", email, AFTER_OLD_EXPIRY)).toBe(true);
    }
    for (const email of ["test-owner+anything@gmail.com", "testowner@gmail.com", "test-owner@gmail.com.example.test", "test-owner+live-ticket@example.test", "someone@gmail.com"]) {
      expect(isLiveTestCheckout("course", "TEST1", email, AFTER_OLD_EXPIRY)).toBe(false);
    }
  });

  it("does not invent aliases for a configured non-Gmail inbox", () => {
    process.env.LIVE_TEST_CHECKOUT_EMAIL = "test-owner@example.test";
    expect(isLiveTestCheckout("session", "TEST1", "TEST-OWNER@example.test", AFTER_OLD_EXPIRY)).toBe(true);
    expect(isLiveTestCheckout("session", "TEST1", "test-owner+live-ticket@example.test", AFTER_OLD_EXPIRY)).toBe(false);
  });
});
