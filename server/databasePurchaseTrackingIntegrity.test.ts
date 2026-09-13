import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("database purchase tracking integrity", () => {
  it("does not report a purchase merely because any public thank-you page was opened", () => {
    const thankYouPages = [
      "ThankYouDatabase.tsx",
      "ThankYouDigital.tsx",
      "ThankYouCourse.tsx",
      "ThankYouCoaching.tsx",
      "ThankYouSession.tsx",
      "ThankYouBundle.tsx",
      "ThankYouNewYearBundle.tsx",
      "ThankYouMatchBoost.tsx",
      "ThankYouPlus.tsx",
    ];

    for (const file of thankYouPages) {
      const source = read(`client/src/pages/${file}`);
      expect(source).not.toContain("trackPurchase(");
      expect(source).not.toContain('eventType: "purchase"');
      expect(source).not.toContain("gaPurchase(");
      expect(source).not.toMatch(/client-(?:database|guide|course|coaching|session|bundle)/);
    }
  });

  it("reports the server-side Meta purchase only from the confirmed Grow webhook", () => {
    const webhook = read("server/growWebhook.ts");
    const capi = read("server/_core/metaCapi.ts");

    expect(webhook).toContain("completedPayments");
    expect(webhook).toContain("capiPurchase({");
    expect(webhook).toContain("transactionId: transactionId || undefined");
    expect(webhook).toContain("eventId: purchaseTracking?.purchaseEventId || undefined");
    expect(webhook).toContain("fbp:");
    expect(webhook).toContain("fbc:");
    expect(capi).toContain('event_name: "Purchase"');
    expect(capi).toContain("resolvePurchaseEventId(params)");
  });

  it("fires the browser Pixel only after the server returns a one-time confirmed status", () => {
    const tracker = read("client/src/components/VerifiedPurchaseTracker.tsx");
    const router = read("server/routers.ts");

    expect(tracker).toContain('result.status === "confirmed"');
    expect(tracker).toContain("trackPurchase({");
    expect(tracker).toContain("eventID: result.eventId");
    expect(router).toContain("confirmedTransactionId");
    expect(router).toContain("isNull(paymentLeads.browserTrackedAt)");
    expect(router).toContain("claimResult.affectedRows !== 1");
  });

  it("reports InitiateCheckout only when Grow is actually opened", () => {
    const register = read("client/src/pages/Register.tsx");
    const wallet = read("client/src/components/GrowWallet.tsx");

    expect(register).not.toContain("trackInitiateCheckout(");
    expect(register).not.toContain("gaBeginCheckout(");
    expect(wallet).toContain("gaBeginCheckout(product)");
    expect(wallet).toContain("trackInitiateCheckout({ value: trackedCheckoutPrice");
  });
});
