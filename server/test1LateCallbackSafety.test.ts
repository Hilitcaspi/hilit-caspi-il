import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(), accounting: vi.fn(), approve: vi.fn(), sendEmail: vi.fn(),
  notifyOwner: vi.fn(), capi: vi.fn(), ga4: vi.fn(), feedback: vi.fn(),
  activatePlus: vi.fn(), activatePendingPlus: vi.fn(), databaseMatch: vi.fn(),
  liveTicket: vi.fn(), plusLiveTicket: vi.fn(), paidPlusLiveTicket: vi.fn(),
  fulfillBoost: vi.fn(), journey: vi.fn(), markConfirmed: vi.fn(), inquiry: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./growPaymentAccounting", () => ({ recordGrowPaymentOnce: mocks.accounting }));
vi.mock("./growPayment", () => ({ approveTransaction: mocks.approve }));
vi.mock("./growInquiry", () => ({ verifyGrowTransaction: mocks.inquiry }));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./_core/metaCapi", () => ({ capiPurchase: mocks.capi }));
vi.mock("./_core/ga4", () => ({ ga4Purchase: mocks.ga4, clientIdFromEmail: () => "synthetic-client" }));
vi.mock("./feedbackAutomation", () => ({ queueProductFeedbackAfterPurchase: mocks.feedback }));
vi.mock("./automation", () => ({ startJourney: mocks.journey, getJourneyKey: vi.fn() }));
vi.mock("./plusFulfillment", () => ({
  activatePlusForSingle: mocks.activatePlus,
  activatePendingPlusAfterRegistration: mocks.activatePendingPlus,
}));
vi.mock("./databaseNowFulfillment", () => ({ ensureDatabaseNowMatchTask: mocks.databaseMatch }));
vi.mock("./liveOctober", () => ({
  LIVE_PRODUCT: "live_october",
  ensureLiveTicket: mocks.liveTicket,
  ensurePlusLiveTicket: mocks.plusLiveTicket,
  ensurePaidPlusLiveTicket: mocks.paidPlusLiveTicket,
}));
vi.mock("./matchBoostRouter", () => ({ fulfillPaidBoostPayment: mocks.fulfillBoost }));
vi.mock("./checkoutReservation", () => ({ markCheckoutReservationProviderConfirmed: mocks.markConfirmed }));

import { completedPayments, crmLeads, paymentLeads, singles } from "../drizzle/schema";
import { handleGrowWebhook } from "./growWebhook";

const notification = { data: {
  payerEmail: "synthetic@example.test", fullName: "Synthetic QA", payerPhone: "0500000000",
  sum: "1", description: "Database Plus", transactionId: "123456789",
  transactionToken: "syntheticTransactionToken12345", processToken: "synthetic-test-process",
  statusCode: 2, paymentDate: "06/11/26",
} };
const heldMessage = "[CheckoutSafety] One-shekel notification held: exact authorized binding required; manual review, no funding or activation";

function checkoutTracking(couponCode: string | null, providerProcessToken: string) {
  return {
    id: 44, name: "Synthetic QA", phone: "0500000000", couponCode, providerProcessToken,
    confirmedTransactionId: null, confirmedAt: null,
    utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null,
    purchaseEventId: "synthetic-event", fbp: null, fbc: null,
    clientIp: null, clientUserAgent: null, attributionExpiresAt: null,
  };
}

function dbHarness(tracking: ReturnType<typeof checkoutTracking> | null) {
  // The same email/product row is mutable, just like the checkout upsert.
  const currentLead = { row: tracking };
  const writes: { table: unknown; values: Record<string, unknown> }[] = [];
  const single = { id: 42, isPaid: true, isActive: true,
    questionnaireToken: "synthetic-questionnaire", questionnaireCompletedAt: 1 };
  const db = {
    select: vi.fn(() => {
      const chain: any = {};
      chain.from = vi.fn((table: unknown) => {
        const rows = table === paymentLeads ? (currentLead.row ? [currentLead.row] : [])
          : table === singles ? [single]
          : table === completedPayments ? [{ paidAt: Date.now() }]
          : table === crmLeads ? [{ id: 42, gender: "female" }] : [];
        chain.limit = vi.fn().mockResolvedValue(rows);
        return chain;
      });
      chain.where = vi.fn(() => chain);
      chain.orderBy = vi.fn(() => chain);
      return chain;
    }),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        writes.push({ table, values });
        return Promise.resolve([{ affectedRows: 1, insertId: 55 }]);
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => {
        writes.push({ table, values });
        return { where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
      }),
    })),
    delete: vi.fn(),
  };
  return { db, currentLead, writes };
}

type Harness = ReturnType<typeof dbHarness>;
function expectNoBusinessSideEffects(harness: Harness) {
  expect(harness.db.insert).not.toHaveBeenCalled();
  expect(harness.db.update).not.toHaveBeenCalled();
  expect(harness.db.delete).not.toHaveBeenCalled();
  expect(harness.writes).toEqual([]);
  for (const sideEffect of [mocks.approve, mocks.sendEmail, mocks.notifyOwner,
    mocks.capi, mocks.ga4, mocks.feedback, mocks.activatePlus, mocks.activatePendingPlus,
    mocks.databaseMatch, mocks.liveTicket, mocks.plusLiveTicket, mocks.paidPlusLiveTicket,
    mocks.fulfillBoost, mocks.journey, mocks.inquiry]) {
    expect(sideEffect).not.toHaveBeenCalled();
  }
  expect(fetch).not.toHaveBeenCalled();
}
function expectHeld(harness: Harness) {
  expect(mocks.accounting).not.toHaveBeenCalled();
  expect(mocks.markConfirmed).not.toHaveBeenCalled();
  expectNoBusinessSideEffects(harness);
  // The hold log is constant: no email, name, phone, token, receipt or transaction ID.
  expect(console.warn).toHaveBeenCalledOnce();
  expect(console.warn).toHaveBeenCalledWith(heldMessage);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("LIVE_TEST_CHECKOUT_EMAIL", "synthetic@example.test");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External providers forbidden"); }));
  for (const mock of [mocks.approve, mocks.sendEmail, mocks.notifyOwner, mocks.capi,
    mocks.ga4, mocks.feedback, mocks.activatePlus, mocks.activatePendingPlus,
    mocks.databaseMatch, mocks.liveTicket, mocks.plusLiveTicket, mocks.paidPlusLiveTicket,
    mocks.journey, mocks.markConfirmed]) mock.mockResolvedValue(undefined);
  mocks.fulfillBoost.mockResolvedValue({ alreadyProcessed: false, delivered: false });
  mocks.inquiry.mockImplementation(() => { throw new Error("Provider inquiry forbidden"); });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Late one-shekel callbacks require exact authorized binding before accounting", () => {
  it("holds a TEST1 retry with a prior verified receipt after the production checkout overwrites the lead", async () => {
    const harness = dbHarness(checkoutTracking("TEST1", "synthetic-test-process"));
    // Models recordGrowPaymentOnce's early verified-receipt return. It loses the
    // diagnostic category in its string result; the new guard must never call it.
    const priorReceipt = { state: "verified", category: "test_checkout", product: "plus", amountAgorot: 100 };
    mocks.accounting.mockImplementation(async () => priorReceipt.state === "verified" ? "duplicate" : "review");
    harness.currentLead.row = checkoutTracking(null, "synthetic-production-process");
    mocks.getDb.mockResolvedValue(harness.db);
    await handleGrowWebhook(notification);
    expectHeld(harness);
  });

  it("holds a first late TEST1 notification after the same production overwrite even if accounting would verify it", async () => {
    const harness = dbHarness(checkoutTracking("TEST1", "synthetic-test-process"));
    harness.currentLead.row = checkoutTracking(null, "synthetic-production-process");
    mocks.getDb.mockResolvedValue(harness.db);
    mocks.accounting.mockResolvedValue("recorded");
    await handleGrowWebhook(notification);
    expectHeld(harness);
  });

  it.each([
    ["missing checkout row", null],
    ["TEST1 belonging to another process", checkoutTracking("TEST1", "synthetic-other-test-process")],
    ["generic fixed-price coupon belonging to another process", checkoutTracking("FIXED1", "synthetic-production-process")],
    ["matching process without TEST1", checkoutTracking(null, "synthetic-test-process")],
  ] as const)("holds one shekel with %s without assuming verified TEST1", async (_label, tracking) => {
    const harness = dbHarness(tracking);
    mocks.getDb.mockResolvedValue(harness.db);
    mocks.accounting.mockResolvedValue("duplicate");
    await handleGrowWebhook(notification);
    expectHeld(harness);
  });

  it("preserves accounting verification for an ordinary one-shekel coupon bound to its own process", async () => {
    const harness = dbHarness(checkoutTracking("FIXED1", "synthetic-production-process"));
    mocks.getDb.mockResolvedValue(harness.db);
    mocks.accounting.mockResolvedValue("review"); // Provider proof still controls fulfillment.
    await handleGrowWebhook({ data: { ...notification.data, description: "guide", processToken: "synthetic-production-process" } });
    expect(mocks.accounting).toHaveBeenCalledOnce();
    expect(mocks.accounting).toHaveBeenCalledWith(expect.objectContaining({ couponCode: "FIXED1", testCheckout: false, amountAgorot: 100 }));
    expect(console.warn).not.toHaveBeenCalledWith(heldMessage);
    expectNoBusinessSideEffects(harness);
  });

  it("holds exact TEST1 process binding when the payer is no longer authorized", async () => {
    vi.stubEnv("LIVE_TEST_CHECKOUT_EMAIL", "different-owner@example.test");
    const harness = dbHarness(checkoutTracking("TEST1", "synthetic-test-process"));
    mocks.getDb.mockResolvedValue(harness.db);
    await handleGrowWebhook(notification);
    expectHeld(harness);
  });

  it("holds an unclassified one-shekel notification before owner messaging", async () => {
    const harness = dbHarness(null);
    mocks.getDb.mockResolvedValue(harness.db);
    vi.stubEnv("GROW_SANDBOX_USER_ID", "");
    vi.stubEnv("GROW_SANDBOX_RECURRING_PAGE_CODE", "");
    await handleGrowWebhook({ data: { ...notification.data, description: "unknown-product" } });
    expectHeld(harness);
  });

  it.each(["recorded", "duplicate"] as const)("preserves exact authorized TEST1 %s accounting and confirmation without activation", async state => {
    const harness = dbHarness(checkoutTracking("TEST1", "synthetic-test-process"));
    mocks.getDb.mockResolvedValue(harness.db);
    mocks.accounting.mockResolvedValue(state);
    await handleGrowWebhook(notification);
    expect(mocks.accounting).toHaveBeenCalledOnce();
    expect(mocks.accounting).toHaveBeenCalledWith(expect.objectContaining({
      product: "plus", amountAgorot: 100, couponCode: "TEST1", testCheckout: true,
      processToken: "synthetic-test-process",
    }));
    expect(mocks.markConfirmed).toHaveBeenCalledOnce();
    expect(mocks.markConfirmed).toHaveBeenCalledWith("synthetic-test-process");
    expect(console.warn).not.toHaveBeenCalled();
    expectNoBusinessSideEffects(harness);
  });
});

describe("Production 99/299 callbacks do not enter the one-shekel hold", () => {
  it.each(["recorded", "duplicate"] as const)("preserves verified %s Plus 99 accounting, approval, fulfillment and events", async state => {
    const harness = dbHarness(checkoutTracking(null, "synthetic-production-process"));
    mocks.getDb.mockResolvedValue(harness.db);
    mocks.accounting.mockResolvedValue(state);
    await handleGrowWebhook({ data: { ...notification.data, sum: "99", processToken: "synthetic-production-process" } });
    expect(mocks.accounting).toHaveBeenCalledOnce();
    expect(mocks.accounting).toHaveBeenCalledWith(expect.objectContaining({
      product: "plus", amountAgorot: 9900, testCheckout: false,
    }));
    expect(mocks.approve).toHaveBeenCalledOnce();
    expect(mocks.activatePlus).toHaveBeenCalledOnce();
    expect(mocks.activatePlus).toHaveBeenCalledWith(expect.objectContaining({ amountAgorot: 9900 }));
    expect(mocks.capi).toHaveBeenCalledOnce();
    expect(mocks.ga4).toHaveBeenCalledOnce();
    expect(mocks.feedback).toHaveBeenCalledOnce();
    expect(console.warn).not.toHaveBeenCalledWith(heldMessage);
    expect(mocks.inquiry).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves database 299 accounting, approval and paid profile fulfillment", async () => {
    const harness = dbHarness(checkoutTracking(null, "synthetic-production-process"));
    mocks.getDb.mockResolvedValue(harness.db);
    mocks.accounting.mockResolvedValue("recorded");
    await handleGrowWebhook({ data: { ...notification.data,
      description: "database", sum: "299", processToken: "synthetic-production-process",
    } });
    expect(mocks.accounting).toHaveBeenCalledOnce();
    expect(mocks.accounting).toHaveBeenCalledWith(expect.objectContaining({
      product: "database", amountAgorot: 29900, testCheckout: false,
    }));
    expect(mocks.approve).toHaveBeenCalledOnce();
    expect(harness.writes).toContainEqual({ table: singles, values: expect.objectContaining({ isPaid: true, isActive: true }) });
    expect(mocks.activatePendingPlus).toHaveBeenCalledOnce();
    expect(mocks.databaseMatch).toHaveBeenCalledOnce();
    expect(mocks.capi).toHaveBeenCalledOnce();
    expect(mocks.ga4).toHaveBeenCalledOnce();
    expect(mocks.feedback).toHaveBeenCalledOnce();
    expect(console.warn).not.toHaveBeenCalledWith(heldMessage);
    expect(mocks.inquiry).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
