import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLiveCheckoutReference, verifyLiveCheckoutReference } from "./liveCheckoutReference";
import { isLiveCheckoutOpen, liveCheckoutPrice, matchesPaidLiveCheckout } from "./liveOctober";
import { LIVE_TEST_EXPIRES_AT, isLiveTestCheckout } from "./liveTestCoupon";

const previous = process.env.JWT_SECRET;
const previousTestEmail = process.env.LIVE_TEST_CHECKOUT_EMAIL;
beforeAll(() => { process.env.JWT_SECRET = "test-signing-secret-at-least-thirty-two-characters"; });
afterAll(() => {
  if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
  if (previousTestEmail === undefined) delete process.env.LIVE_TEST_CHECKOUT_EMAIL;
  else process.env.LIVE_TEST_CHECKOUT_EMAIL = previousTestEmail;
});

const validPayment = {
  tier: "friends" as const, product: "live_october", couponCode: "FRIENDS",
  webhookProcessToken: "ab123456789012345678", orderProcessToken: "ab123456789012345678",
  transactionId: "987654321", transactionToken: "a01234567890abcdef01234567890abc",
  statusCode: "2", status: "שולם", sum: 49,
};

describe("October live signed checkout", () => {
  it("issues a database gift before the event while standalone and FRIENDS ticket sales remain closed", () => {
    const beforeEvent = Date.parse("2026-10-04T12:00:00Z");
    const eventStart = Date.parse("2026-10-31T20:30:00+02:00");
    expect(isLiveCheckoutOpen("database", "LIVE", beforeEvent, false)).toBe(true);
    expect(isLiveCheckoutOpen("database", undefined, beforeEvent, false)).toBe(false);
    expect(isLiveCheckoutOpen("live_october", undefined, beforeEvent, false)).toBe(false);
    expect(isLiveCheckoutOpen("live_october", "FRIENDS", beforeEvent, false)).toBe(false);
    expect(isLiveCheckoutOpen("live_october", "FRIENDS", beforeEvent, true)).toBe(true);
    expect(isLiveCheckoutOpen("database", "LIVE", eventStart, true)).toBe(false);
    expect(isLiveCheckoutOpen("live_october", undefined, eventStart, true)).toBe(false);
  });
  it.each(["database_live", "friends", "standalone", "database_live_test", "standalone_test"] as const)("signs and verifies %s for the same email", tier => {
    const ref = createLiveCheckoutReference("Person@Example.com", tier, 100_000);
    expect(verifyLiveCheckoutReference(ref, "person@example.com", 101_000)).toBe(tier);
    expect(verifyLiveCheckoutReference(ref, "someone@example.com", 101_000)).toBeNull();
    expect(verifyLiveCheckoutReference(`${ref}x`, "person@example.com", 101_000)).toBeNull();
    expect(verifyLiveCheckoutReference(ref, "person@example.com", 100_000 + 49 * 60 * 60 * 1000)).toBeNull();
  });
  it("rejects unknown product/coupon combinations", () => {
    expect(liveCheckoutPrice("database", "LIVE")).toBe(299);
    expect(liveCheckoutPrice("live_october", "FRIENDS")).toBe(49);
    expect(liveCheckoutPrice("live_october", undefined)).toBe(149);
    expect(() => liveCheckoutPrice("guide", "LIVE")).toThrow();
    expect(() => liveCheckoutPrice("live_october", "LIVE")).toThrow();
  });
});

describe("October live paid callback", () => {
  it("accepts an exact FRIENDS order after a paid Grow callback", () => {
    expect(matchesPaidLiveCheckout(validPayment)).toBe(true);
  });
  it.each([
    { statusCode: 0 }, { status: "נכשל" }, { sum: 149 },
    { couponCode: "LIVE" }, { orderProcessToken: "wrong" },
    { transactionId: "invalid" }, { transactionToken: "" },
    { product: "guide" },
  ])("rejects mismatched field %o", changed => {
    expect(matchesPaidLiveCheckout({ ...validPayment, ...changed })).toBe(false);
  });
  it("uses separate prices and coupon expectations for 149 ₪ tickets and 299 ₪ LIVE signups", () => {
    expect(matchesPaidLiveCheckout({ ...validPayment, tier: "standalone", sum: 149, couponCode: null })).toBe(true);
    expect(matchesPaidLiveCheckout({ ...validPayment, tier: "database_live", product: "database", couponCode: "LIVE", sum: 299 })).toBe(true);
    expect(matchesPaidLiveCheckout({ ...validPayment, tier: "database_live", product: "database", couponCode: "LIVE", sum: 49 })).toBe(false);
  });
  it("accepts only exact 1 ₪ paid test orders linked to TEST1", () => {
    expect(matchesPaidLiveCheckout({ ...validPayment, tier: "standalone_test", sum: 1, couponCode: "TEST1" })).toBe(true);
    expect(matchesPaidLiveCheckout({ ...validPayment, tier: "database_live_test", product: "database", sum: 1, couponCode: "TEST1" })).toBe(true);
    expect(matchesPaidLiveCheckout({ ...validPayment, tier: "standalone_test", sum: 149, couponCode: "TEST1" })).toBe(false);
    expect(matchesPaidLiveCheckout({ ...validPayment, tier: "database_live_test", product: "database", sum: 1, couponCode: "LIVE" })).toBe(false);
    expect(matchesPaidLiveCheckout({ ...validPayment, tier: "database_live_test", product: "database", sum: 1, couponCode: "TEST1", statusCode: "0" })).toBe(false);
  });
});

describe("TEST1 checkout protection", () => {
  it("requires a configured owner inbox; accepts only two exact aliases before expiry", () => {
    const now = LIVE_TEST_EXPIRES_AT - 60_000;
    delete process.env.LIVE_TEST_CHECKOUT_EMAIL;
    expect(isLiveTestCheckout("database", "TEST1", "owner@example.com", now)).toBe(false);
    process.env.LIVE_TEST_CHECKOUT_EMAIL = "owner@gmail.com";
    for (const email of ["OWNER@gmail.com", "owner+live-database@gmail.com", "owner+live-ticket@gmail.com"]) {
      expect(isLiveTestCheckout("database", "test1", email, now)).toBe(true);
    }
    for (const email of ["stranger@gmail.com", "owner+free@gmail.com", "owner+live-ticket@other.com"]) {
      expect(isLiveTestCheckout("database", "TEST1", email, now)).toBe(false);
    }
    expect(isLiveTestCheckout("plus", "TEST1", "owner@gmail.com", now)).toBe(false);
    expect(isLiveTestCheckout("database", "TEST1", "owner@gmail.com", LIVE_TEST_EXPIRES_AT)).toBe(false);
  });
});
