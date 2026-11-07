import { describe, expect, it } from "vitest";
import {
  detectProductByAmount,
  detectProductByDesc,
  buildPossibleDuplicateChargeNotification,
  isSupersededNovemberProcessCandidate,
  isValidNovemberBundleWebhookBinding,
} from "./growWebhook";
import { oneTimeCheckoutFamily } from "./checkoutReservation";

describe("November bundle webhook discrimination", () => {
  it("never infers November from the historical 349 ILS amount", () => {
    expect(detectProductByAmount(349)).toBe("bundle_tubav");
    expect(detectProductByDesc("חבילת נובמבר - מאגר + הקורס המלא המסע לזוגיות"))
      .toBe("bundle_november");
    expect(detectProductByDesc("bundle_november")).toBe("bundle_november");
  });

  it("requires the exact persisted provider process and full 349 ILS amount", () => {
    expect(isValidNovemberBundleWebhookBinding({
      sum: 349,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "grow-process-1",
    })).toBe(true);
    expect(isValidNovemberBundleWebhookBinding({
      sum: 349,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "different-process",
    })).toBe(false);
    expect(isValidNovemberBundleWebhookBinding({
      sum: 299,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "grow-process-1",
    })).toBe(false);
  });

  it("allows TEST1 only with the matching server order and exact diagnostic price", () => {
    expect(isValidNovemberBundleWebhookBinding({
      sum: 1,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "grow-process-1",
      couponCode: "TEST1",
    })).toBe(true);
    expect(isValidNovemberBundleWebhookBinding({
      sum: 1,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "grow-process-1",
      couponCode: "OTHER",
    })).toBe(false);
  });
});

describe("superseded November process after a returning-buyer takeover", () => {
  const base = { sum: 349, transactionId: "80007602", webhookProcessToken: "old-process", checkoutProcessToken: "new-process", hasNovemberCheckoutLead: true };
  it("accepts only the full price, a canonical transaction and an existing November lead", () => {
    expect(isSupersededNovemberProcessCandidate(base)).toBe(true);
    expect(isSupersededNovemberProcessCandidate({ ...base, sum: 299 })).toBe(false);
    expect(isSupersededNovemberProcessCandidate({ ...base, sum: 1 })).toBe(false);
    expect(isSupersededNovemberProcessCandidate({ ...base, transactionId: "J1XeG3v9token" })).toBe(false);
    expect(isSupersededNovemberProcessCandidate({ ...base, hasNovemberCheckoutLead: false })).toBe(false);
    expect(isSupersededNovemberProcessCandidate({ ...base, webhookProcessToken: "" })).toBe(false);
    // The exact match keeps using the normal binding path.
    expect(isSupersededNovemberProcessCandidate({ ...base, checkoutProcessToken: "old-process" })).toBe(false);
  });
});

describe("possible duplicate charge owner alert", () => {
  it("groups the database and every database bundle as one one-time family", () => {
    expect(oneTimeCheckoutFamily("bundle_november")).toEqual(expect.arrayContaining(["database", "bundle_november"]));
    expect(oneTimeCheckoutFamily("database")).toEqual(expect.arrayContaining(["database", "bundle_november"]));
    expect(oneTimeCheckoutFamily("plus")).toBeNull();
    expect(oneTimeCheckoutFamily("match_boost")).toBeNull();
    expect(oneTimeCheckoutFamily("session")).toBeNull();
  });
  it("builds a clear refund hint without slashes", () => {
    const note = buildPossibleDuplicateChargeNotification({
      email: "buyer@example.test", product: "database", priorProduct: "bundle_november",
      amountAgorot: 29900, priorAmountAgorot: 34900, transactionId: "80000002", priorTransactionId: "80000001",
    });
    expect(note.title).toContain("חיוב כפול");
    expect(note.content).toContain("299 ₪");
    expect(note.content).toContain("349 ₪");
    expect(note.content).toContain("לזכות");
    expect(note.content).not.toMatch(/\/ה/);
  });
});
