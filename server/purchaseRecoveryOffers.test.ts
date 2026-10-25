import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createPurchaseRecoveryCheckoutReference,
  getPurchaseRecoveryOffer,
  hasPurchaseRecoveryPlusGiftStorage,
  isPurchaseRecoveryOfferCode,
  isPurchaseRecoveryOfferOpen,
  verifyPurchaseRecoveryCheckoutReference,
} from "./purchaseRecoveryOffers";
import { RECOVERY_OFFER_EXPIRES_AT } from "../shared/purchaseRecoveryLinks";

const originalSecret = process.env.JWT_SECRET;
const withinWindow = Date.parse("2026-10-26T20:00:00+02:00");

describe("purchase recovery offer policy", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "synthetic-recovery-reference-secret-at-least-16";
  });
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it("uses campaign-only codes, precise paid amounts, and a non-priced Plus gift", () => {
    expect(getPurchaseRecoveryOffer("database", "MATCH10")).toEqual(expect.objectContaining({
      fixedPrice: 269.1, expectedAmountAgorot: 26910, kind: "discount",
    }));
    expect(getPurchaseRecoveryOffer("session", "LOVE10DAY")).toEqual(expect.objectContaining({
      fixedPrice: 450, expectedAmountAgorot: 45000, kind: "discount",
    }));
    expect(getPurchaseRecoveryOffer("plus", "PLUSGIFT")).toEqual(expect.objectContaining({
      expectedAmountAgorot: 9900, kind: "plus_gift",
    }));
    expect(getPurchaseRecoveryOffer("plus", "PLUSGIFT")).not.toHaveProperty("fixedPrice");
    expect(getPurchaseRecoveryOffer("database", "LOVE10DAY")).toBeNull();
    expect(isPurchaseRecoveryOfferCode("LOVE10")).toBe(false);
    expect(isPurchaseRecoveryOfferCode("PLUS")).toBe(false);
    expect(isPurchaseRecoveryOfferCode("PLUS3")).toBe(false);
    expect(isPurchaseRecoveryOfferCode("NOW")).toBe(false);
    expect(hasPurchaseRecoveryPlusGiftStorage()).toBe(true);
  });

  it("allows a new reservation only through the stated Israel-local deadline", () => {
    expect(isPurchaseRecoveryOfferOpen(RECOVERY_OFFER_EXPIRES_AT)).toBe(true);
    expect(isPurchaseRecoveryOfferOpen(RECOVERY_OFFER_EXPIRES_AT + 1)).toBe(false);
  });

  it("binds a reference to one email, product, campaign recipient, and nonce", () => {
    const reference = createPurchaseRecoveryCheckoutReference({
      recipientId: 91,
      email: "member@example.com",
      product: "database",
      now: withinWindow,
      reservationNonce: "synthetic_nonce_123456789",
    });
    expect(verifyPurchaseRecoveryCheckoutReference(reference, " MEMBER@example.com ", withinWindow + 1)).toEqual({
      recipientId: 91,
      product: "database",
      emailHash: expect.any(String),
      issuedAt: withinWindow,
      reservationNonce: "synthetic_nonce_123456789",
    });
    expect(verifyPurchaseRecoveryCheckoutReference(reference, "other@example.com", withinWindow + 1)).toBeNull();
    expect(verifyPurchaseRecoveryCheckoutReference(`${reference}x`, "member@example.com", withinWindow + 1)).toBeNull();
  });

  it("keeps a signed pre-expiry reservation verifiable for a late provider webhook", () => {
    const reference = createPurchaseRecoveryCheckoutReference({
      recipientId: 92,
      email: "late@example.com",
      product: "session",
      now: RECOVERY_OFFER_EXPIRES_AT - 1,
      reservationNonce: "synthetic_nonce_late_123",
    });
    expect(verifyPurchaseRecoveryCheckoutReference(reference, "late@example.com", RECOVERY_OFFER_EXPIRES_AT + 60_000))
      .toMatchObject({ recipientId: 92, product: "session" });
  });

  it("does not create a new signed checkout after expiry", () => {
    expect(() => createPurchaseRecoveryCheckoutReference({
      recipientId: 93,
      email: "expired@example.com",
      product: "database",
      now: RECOVERY_OFFER_EXPIRES_AT + 1,
    })).toThrow("purchase_recovery_offer_expired");
  });
});
