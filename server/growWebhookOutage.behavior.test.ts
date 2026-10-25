import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(), accounting: vi.fn(), approve: vi.fn(), sendEmail: vi.fn(), notifyOwner: vi.fn(), capi: vi.fn(), feedback: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./growPaymentAccounting", () => ({ recordGrowPaymentOnce: mocks.accounting }));
vi.mock("./growPayment", () => ({ approveTransaction: mocks.approve }));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./_core/metaCapi", () => ({ capiPurchase: mocks.capi }));
vi.mock("./_core/ga4", () => ({ ga4Purchase: vi.fn(), clientIdFromEmail: vi.fn() }));
vi.mock("./feedbackAutomation", () => ({ queueProductFeedbackAfterPurchase: mocks.feedback }));
vi.mock("./automation", () => ({ startJourney: vi.fn(), getJourneyKey: vi.fn() }));

import { productAccessTokens } from "../drizzle/schema";
import { handleGrowWebhook } from "./growWebhook";

function dbHarness() {
  const db = {
    select: vi.fn(() => ({ from: vi.fn((table: unknown) => ({ where: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue(table === productAccessTokens ? [{ id: 1 }] : []),
    })) })) })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })),
    update: vi.fn(),
  };
  return db;
}
const notification = { data: {
  payerEmail: "synthetic@example.test", fullName: "Synthetic QA", sum: "149", description: "guide",
  transactionId: "123456789", transactionToken: "syntheticTransactionToken12345", processToken: "synthetic-process", statusCode: 2, paymentDate: "24/10/26",
} };
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External providers forbidden"); }));
  mocks.approve.mockResolvedValue(undefined);
  mocks.capi.mockResolvedValue(undefined);
  mocks.feedback.mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Unverified Grow notifications do not fulfill products", () => {
  it.each(["pending", "review"] as const)("stops all side effects for an accounting %s result", async state => {
    const db = dbHarness(); mocks.getDb.mockResolvedValue(db); mocks.accounting.mockResolvedValue(state);
    const context: { accountingRetry?: boolean } = {};
    await handleGrowWebhook(notification, context);
    expect(context.accountingRetry).toBe(state === "pending" ? true : undefined);
    expect(mocks.accounting).toHaveBeenCalledOnce();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.capi).not.toHaveBeenCalled();
    expect(mocks.feedback).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("propagates unavailable receipt storage for an HTTP retry without acknowledging Grow", async () => {
    const db = dbHarness(); mocks.getDb.mockResolvedValue(db);
    mocks.accounting.mockRejectedValue(new Error("grow_accounting_database_unavailable"));
    await expect(handleGrowWebhook(notification)).rejects.toThrow("grow_accounting_database_unavailable");
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.feedback).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["recorded", "duplicate"] as const)("preserves the verified %s path and existing product idempotency", async state => {
    const db = dbHarness(); mocks.getDb.mockResolvedValue(db); mocks.accounting.mockResolvedValue(state);
    await handleGrowWebhook(notification);
    expect(mocks.approve).toHaveBeenCalledOnce();
    expect(db.insert).toHaveBeenCalledOnce();
    expect(mocks.feedback).toHaveBeenCalledOnce();
    expect(mocks.sendEmail).not.toHaveBeenCalled(); // Existing guide access token is preserved.
    expect(fetch).not.toHaveBeenCalled();
  });
  it("allows a provider retry after inquiry recovery, without writes on the first pending attempt", async () => {
    const db = dbHarness(); mocks.getDb.mockResolvedValue(db);
    mocks.accounting.mockResolvedValueOnce("pending").mockResolvedValueOnce("recorded");
    const firstContext: { accountingRetry?: boolean } = {};
    await handleGrowWebhook(notification, firstContext);
    expect(firstContext.accountingRetry).toBe(true);
    expect(db.insert).not.toHaveBeenCalled();
    await handleGrowWebhook(notification, {});
    expect(mocks.accounting).toHaveBeenCalledTimes(2);
    expect(mocks.approve).toHaveBeenCalledOnce();
    expect(db.insert).toHaveBeenCalledOnce();
    expect(mocks.feedback).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("stops a bound authorized TEST1 diagnostic after accounting without approval, fulfillment, messaging, or conversion work", async () => {
    const previousOwner = process.env.LIVE_TEST_CHECKOUT_EMAIL;
    process.env.LIVE_TEST_CHECKOUT_EMAIL = "synthetic@example.test";
    let selectIndex = 0;
    const tracking = {
      id: 44, name: "Synthetic QA", phone: "0500000000", couponCode: "TEST1",
      providerProcessToken: "synthetic-process", confirmedTransactionId: null,
      utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null,
      confirmedAt: null, purchaseEventId: "test-event", fbp: null, fbc: null,
      clientIp: null, clientUserAgent: null, attributionExpiresAt: null,
    };
    const db = {
      select: vi.fn(() => {
        const rows = selectIndex++ === 1 ? [tracking] : [];
        const chain: any = {};
        chain.from = vi.fn(() => chain);
        chain.where = vi.fn(() => chain);
        chain.orderBy = vi.fn(() => chain);
        chain.limit = vi.fn().mockResolvedValue(rows);
        return chain;
      }),
      insert: vi.fn(), update: vi.fn(),
    };
    mocks.getDb.mockResolvedValue(db);
    mocks.accounting.mockResolvedValue("recorded");
    try {
      await handleGrowWebhook({ data: { ...notification.data, sum: "1" } });
      expect(mocks.accounting).toHaveBeenCalledWith(expect.objectContaining({
        couponCode: "TEST1", amountAgorot: 100, testCheckout: true,
      }));
      expect(mocks.approve).not.toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.capi).not.toHaveBeenCalled();
      expect(mocks.feedback).not.toHaveBeenCalled();
      expect(mocks.notifyOwner).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      if (previousOwner === undefined) delete process.env.LIVE_TEST_CHECKOUT_EMAIL;
      else process.env.LIVE_TEST_CHECKOUT_EMAIL = previousOwner;
    }
  });
});
