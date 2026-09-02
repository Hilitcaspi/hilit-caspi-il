import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("database purchase tracking integrity", () => {
  it("does not report a purchase merely because the public thank-you page was opened", () => {
    const source = read("client/src/pages/ThankYouDatabase.tsx");

    expect(source).not.toContain("trackPurchase(");
    expect(source).not.toContain('eventType: "purchase"');
    expect(source).not.toContain("gaPurchase(");
    expect(source).not.toContain("client-database-");
  });

  it("reports the server-side Meta purchase only from the confirmed Grow webhook", () => {
    const webhook = read("server/growWebhook.ts");
    const capi = read("server/_core/metaCapi.ts");

    expect(webhook).toContain("completedPayments");
    expect(webhook).toContain("capiPurchase({");
    expect(webhook).toContain("transactionId: transactionId || undefined");
    expect(capi).toContain('event_name: "Purchase"');
    expect(capi).toContain("? `grow-${params.transactionId}`");
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
