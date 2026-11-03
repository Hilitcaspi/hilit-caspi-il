import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(), createPaymentProcess: vi.fn(), loadPlusPilotCapacityRows: vi.fn(),
  sendEmail: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./growPayment", () => ({
  PRODUCT_CONFIGS: { plus: { sum: 99 } }, PLUS_CHECKOUT_PUBLICLY_AVAILABLE: true,
  getPlusCheckoutConfig: () => ({ configured: true, mode: "production", checkoutAmount: 99, displayAmount: 99 }),
  createPaymentProcess: mocks.createPaymentProcess, isGrowCreateDefinitelyRejected: () => false,
}));
vi.mock("./plusPilotCapacityLoader", () => ({ loadPlusPilotCapacityRows: mocks.loadPlusPilotCapacityRows }));
// Product-boundary isolation; real durable dedupe/uncertainty/cooldown behavior
// remains covered by checkoutReservationIntegration.test.ts and checkoutReservation.test.ts.
vi.mock("./checkoutReservation", async importOriginal => ({
  ...await importOriginal<typeof import("./checkoutReservation")>(),
  createCheckoutReservationFingerprint: () => "synthetic-plus-unlimited-binding",
  withCheckoutReservation: async (_input: unknown, create: () => Promise<unknown>) => create(),
}));
vi.mock("./plusCheckoutReference", () => ({ createPlusCheckoutReference: () => "synthetic-plus-reference", verifyPlusCheckoutReference: vi.fn() }));
vi.mock("./purchaseRecoveryOffers", () => ({ isPurchaseRecoveryOfferCode: () => false, validatePurchaseRecoveryCoupon: vi.fn() }));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail, addContactToList: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./acquisitionCapture", async importOriginal => ({
  ...await importOriginal<typeof import("./acquisitionCapture")>(), recordAcquisitionSafely: vi.fn(),
}));

import { appRouter } from "./routers";
import { plusPilotRouter } from "./plusPilotRouter";
import { calculatePlusPilotCapacity } from "./plusPilotCapacity";

const profile = { id: 152, gender: "female", isPaid: true, isActive: true, isSeed: false, market: "il" };
const input = {
  product: "plus" as const, fullName: "Synthetic Member", email: "member@example.test", phone: "0500000000",
  personalToken: "synthetic-personal-token-123456", plusRenewalAccepted: true, plusTermsAccepted: true,
  plusBoostAccepted: true, origin: "https://preview.example",
};
const ctx = (admin = false) => ({ user: admin ? { role: "admin" } : null, teamMember: null,
  req: { protocol: "https", headers: {} }, res: {} }) as TrpcContext;

function fakeDb(rows: unknown[][]) {
  let index = 0;
  const db = {
    select: vi.fn(() => {
      if (index >= rows.length) throw new Error("Unexpected SELECT: no cohort/capacity query allowed");
      const result = rows[index++];
      const query: any = {};
      for (const method of ["from", "where", "innerJoin"]) query[method] = vi.fn(() => query);
      query.limit = vi.fn().mockResolvedValue(result);
      query.then = (resolve: (rows: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
      return query;
    }),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })) })),
  };
  mocks.getDb.mockResolvedValue(db);
  return db;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createPaymentProcess.mockResolvedValue({ authCode: "", processToken: "synthetic-process", url: "https://grow.example/synthetic", checkoutMode: "production" });
  mocks.loadPlusPilotCapacityRows.mockImplementation(() => { throw new Error("Admission must never load capacity rows"); });
  mocks.sendEmail.mockResolvedValue({ success: true });
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("open Plus enrollment at the real API boundary", () => {
  it.each(["female", "male"])("opens checkout with 151 existing %s members without a capacity SELECT", async gender => {
    const cohort = Array.from({ length: 151 }, (_, i) => ({ id: i + 1, status: "active", billingStatus: "active", gender }));
    expect(calculatePlusPilotCapacity(cohort)[gender].reserved).toBe(151);
    const db = fakeDb([[{ ...profile, gender }], [], []]);
    await expect(appRouter.createCaller(ctx()).payment.createProcess(input)).resolves.toMatchObject({ processToken: "synthetic-process" });
    expect(db.select).toHaveBeenCalledTimes(3); // Verified profile, own intent, own prior membership only.
    expect(mocks.loadPlusPilotCapacityRows).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({ product: "plus", sum: undefined, personalToken: input.personalToken }));
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("publishes explicit unlimited configuration without altering the monthly price", async () => {
    const result = await appRouter.createCaller(ctx()).payment.plusCheckoutConfig();
    expect(result).toMatchObject({ enrollmentLimited: false, limitPerGender: null, displayAmount: 99, checkoutAmount: 99 });
    expect(mocks.getDb).not.toHaveBeenCalled(); expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it.each([
    ["missing personal proof", undefined, [{ ...profile }]],
    ["mismatched identity", input.personalToken, []],
    ["unpaid database", input.personalToken, [{ ...profile, isPaid: false }]],
    ["inactive database", input.personalToken, [{ ...profile, isActive: false }]],
    ["missing profile gender", input.personalToken, [{ ...profile, gender: null }]],
  ])("still rejects %s before intent/provider writes", async (_label, personalToken, profiles) => {
    const db = fakeDb([profiles as unknown[], [], []]);
    await expect(appRouter.createCaller(ctx()).payment.createProcess({ ...input, personalToken: personalToken as string | undefined }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.insert).not.toHaveBeenCalled(); expect(db.update).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled(); expect(mocks.loadPlusPilotCapacityRows).not.toHaveBeenCalled();
  });

  it.each(["active", "paid_pending_profile"])("rejects an already %s payment intent", async status => {
    const db = fakeDb([[profile], [{ status }]]);
    await expect(appRouter.createCaller(ctx()).payment.createProcess(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.insert).not.toHaveBeenCalled(); expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it("rejects an already active paid Plus subscription", async () => {
    const db = fakeDb([[profile], [], [{ id: 152, status: "active", billingStatus: "active" }]]);
    await expect(appRouter.createCaller(ctx()).payment.createProcess(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.insert).not.toHaveBeenCalled(); expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it.each(["female", "male"])("admits the 152nd %s member only with confirmed Production payment, without counting the cohort", async gender => {
    const cohort = Array.from({ length: 151 }, () => ({ status: "active", gender }));
    expect(calculatePlusPilotCapacity(cohort)[gender].reserved).toBe(151);
    const db = fakeDb([[{ pilot: { id: 152, status: "invited", billingStatus: "active" }, single: { gender } }],
      [{ eventType: "payment_succeeded", amountAgorot: 9900, providerTransactionId: "synthetic-confirmed-payment" }]]);
    await expect(plusPilotRouter.createCaller(ctx(true)).adminUpdateStatus({ id: 152, status: "active" })).resolves.toEqual({ success: true });
    expect(db.select).toHaveBeenCalledTimes(2); expect(db.update).toHaveBeenCalledOnce();
    expect(mocks.loadPlusPilotCapacityRows).not.toHaveBeenCalled(); expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["no confirmed payment", "active", []],
    ["diagnostic one-shekel payment", "active", [{ eventType: "payment_succeeded", amountAgorot: 100, providerTransactionId: "synthetic-test" }]],
    ["inactive billing", "pending", [{ eventType: "payment_succeeded", amountAgorot: 9900, providerTransactionId: "synthetic-payment" }]],
    ["missing transaction evidence", "active", [{ eventType: "payment_succeeded", amountAgorot: 9900 }]],
  ])("rejects admin activation with %s", async (_label, billingStatus, events) => {
    const db = fakeDb([[{ pilot: { id: 152, status: "invited", billingStatus }, single: { gender: "female" } }], events as unknown[]]);
    await expect(plusPilotRouter.createCaller(ctx(true)).adminUpdateStatus({ id: 152, status: "active" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.update).not.toHaveBeenCalled(); expect(mocks.loadPlusPilotCapacityRows).not.toHaveBeenCalled();
  });

  it("does not require an invitation or eligibility score to show a non-active paid member the personal enrollment CTA", () => {
    const source = readFileSync("client/src/pages/UserDashboard.tsx", "utf8");
    expect(source).toContain('{status !== "active" && (');
    expect(source).toContain("databaseMembershipActive === true");
    expect(source).not.toContain('(status === "eligible" || status === "invited" || !registered)');
  });
});
