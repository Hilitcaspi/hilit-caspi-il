import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(), createPaymentProcess: vi.fn(), sendEmail: vi.fn(), notifyOwner: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
// Isolate coupon validation; real reservation/concurrency behavior has dedicated tests.
vi.mock("./checkoutReservation", async importOriginal => ({
  ...await importOriginal<typeof import("./checkoutReservation")>(),
  createCheckoutReservationFingerprint: () => "synthetic-coupon-test-binding",
  withCheckoutReservation: async (_input: unknown, create: () => Promise<unknown>) => create(),
}));
vi.mock("./growPayment", () => ({
  PRODUCT_CONFIGS: {
    database: { sum: 299 }, guide: { sum: 149 }, course: { sum: 249 },
    coaching: { sum: 2960 }, coaching_mas: { sum: 4200 }, session: { sum: 500 },
    bundle_new_year: { sum: 399 },
  },
  getPlusCheckoutConfig: () => ({ configured: true, mode: "production", checkoutAmount: 99, displayAmount: 99 }),
  createPaymentProcess: mocks.createPaymentProcess,
  isGrowCreateDefinitelyRejected: () => false,
}));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail, addContactToList: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./acquisitionCapture", async importOriginal => ({
  ...await importOriginal<typeof import("./acquisitionCapture")>(),
  recordAcquisitionSafely: vi.fn(),
}));

import { appRouter } from "./routers";

const now = Date.parse("2026-11-15T12:00:00Z");
const input = { product: "database" as const, fullName: "Synthetic Coupon", email: "coupon@example.test", phone: "0500000000" };
const context = () => ({ user: null, req: { protocol: "https", headers: {} }, res: {} }) as TrpcContext;
const coupon = {
  code: "SAVE10", isActive: true, discountPercent: 10, discountAmount: null,
  fixedPrice: null, expiresAt: null as number | null, maxUses: null as number | null,
  usedCount: 0, product: null as string | null,
};

function checkoutDb(selectRows: unknown[][] = []) {
  let selectIndex = 0;
  const limit = vi.fn(() => Promise.resolve(selectRows[selectIndex++] ?? []));
  const where = vi.fn((_condition: unknown) => ({ limit }));
  const persistOrder = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  const set = vi.fn((_values: Record<string, unknown>) => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }));
  const db = {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onDuplicateKeyUpdate: persistOrder })) })),
    update: vi.fn(() => ({ set })),
  };
  mocks.getDb.mockResolvedValue(db);
  return { db, limit, where, persistOrder, set };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(now);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Live network forbidden"); }));
  mocks.createPaymentProcess.mockResolvedValue({ authCode: "synthetic-auth", processToken: "synthetic-process" });
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  expect(mocks.sendEmail).not.toHaveBeenCalled();
  expect(mocks.notifyOwner).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("standard coupons fail closed at the public createProcess procedure", () => {
  it.each([
    ["unknown", null],
    ["inactive", { ...coupon, isActive: false }],
    ["expired", { ...coupon, expiresAt: now - 1 }],
    ["expiry boundary", { ...coupon, expiresAt: now }],
    ["exhausted", { ...coupon, maxUses: 2, usedCount: 2 }],
    ["zero quota", { ...coupon, maxUses: 0 }],
    ["wrong product", { ...coupon, product: "guide, course" }],
  ])("rejects an %s supplied coupon before order writes or Grow", async (_reason, stored) => {
    const h = checkoutDb([stored ? [stored] : []]);
    await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode: "SAVE10" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("לא נפתח תשלום במחיר מלא") });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    expect(h.db.insert).not.toHaveBeenCalled();
    expect(h.db.update).not.toHaveBeenCalled();
  });

  it.each([
    ["removed", null],
    ["deactivated", { ...coupon, isActive: false }],
    ["expired", { ...coupon, expiresAt: now - 1 }],
    ["exhausted", { ...coupon, maxUses: 1, usedCount: 1 }],
  ])("rechecks a coupon that was valid client-side but is %s before createProcess", async (_reason, changed) => {
    const h = checkoutDb([[coupon], changed ? [changed] : []]);
    const caller = appRouter.createCaller(context());
    await expect(caller.coupons.validate({ code: "SAVE10", product: input.product, email: input.email }))
      .resolves.toMatchObject({ valid: true, code: "SAVE10", discountPercent: 10 });
    await expect(caller.payment.createProcess({ ...input, couponCode: "SAVE10" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(h.db.select).toHaveBeenCalledTimes(2);
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    expect(h.db.insert).not.toHaveBeenCalled();
    expect(h.db.update).not.toHaveBeenCalled();
  });

  it.each(["database", "guide", "course", "coaching", "coaching_mas", "session", "bundle_new_year"] as const)
    ("blocks an unknown coupon for the standard %s checkout", async product => {
      checkoutDb([[]]);
      await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, product, couponCode: "UNKNOWN" }))
        .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    });

  it.each([
    ["percentage", { ...coupon, expiresAt: now + 1, maxUses: 2, usedCount: 1 }, 269],
    ["fixed amount", { ...coupon, discountAmount: 20 }, 279],
    ["fixed price", { ...coupon, fixedPrice: 74.5 }, 74.5],
    ["comma-separated product", { ...coupon, product: "guide, database " }, 269],
  ])("preserves existing %s pricing without altering coupon usage", async (_kind, stored, sum) => {
    const h = checkoutDb([[stored]]);
    const snapshot = { ...stored };
    const result = await appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode: "SAVE10" });
    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({ product: "database", sum }));
    expect(result).toMatchObject({ authCode: "synthetic-auth", processToken: "synthetic-process" });
    expect(h.persistOrder.mock.invocationCallOrder[0]).toBeLessThan(mocks.createPaymentProcess.mock.invocationCallOrder[0]);
    expect(h.db.update).toHaveBeenCalledOnce(); // Provider-token binding, not coupon usage.
    expect(h.set.mock.calls[0][0]).not.toHaveProperty("usedCount");
    expect(stored).toEqual(snapshot);
  });

  it("uses the same trimmed, case-insensitive coupon code accepted by client validation", async () => {
    const h = checkoutDb([[coupon]]);
    await appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode: "  save10  " });
    const { SQL, StringChunk, Param } = await import("drizzle-orm");
    const parameters = (value: unknown): unknown[] => value instanceof SQL
      ? value.queryChunks.flatMap(parameters)
      : value instanceof Param ? [value.value]
      : value instanceof StringChunk ? [] : [value];
    expect(parameters(h.where.mock.calls[0][0])).toContain("SAVE10");
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({ sum: 269 }));
  });

  it("does not silently accept a nonempty whitespace-only coupon", async () => {
    checkoutDb([[]]);
    await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode: "   " }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("preserves no-code normal-price checkout (%s)", async couponCode => {
    const h = checkoutDb();
    await appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode });
    expect(h.db.select).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({ product: "database", sum: undefined }));
  });
});

describe("existing special coupon and product guards remain intact", () => {
  it("keeps NOVEMBER10's existing whole-shekel discount", async () => {
    const stored = { ...coupon, code: "NOVEMBER10" };
    checkoutDb([[stored], [stored]]);
    await appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode: "november10" });
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({ sum: 269 }));
  });
  it("fails closed if NOVEMBER10 disappears after its dedicated precheck", async () => {
    checkoutDb([[{ ...coupon, code: "NOVEMBER10" }], []]);
    await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode: "NOVEMBER10" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });
  it("preserves the authorized permanent TEST1 diagnostic without a stored coupon", async () => {
    vi.stubEnv("LIVE_TEST_CHECKOUT_EMAIL", input.email);
    const h = checkoutDb();
    await appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode: "TEST1" });
    expect(h.db.select).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({ sum: 1, diagnosticTest: true }));
  });
  it("does not let TEST1 bypass its authorized-email guard", async () => {
    vi.stubEnv("LIVE_TEST_CHECKOUT_EMAIL", "different-owner@example.test");
    checkoutDb();
    await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, couponCode: "TEST1" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });
  it.each(["plus", "match_boost"] as const)("does not let a standard coupon bypass %s consent/personal-link guards", async product => {
    const h = checkoutDb([[coupon]]);
    await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, product, couponCode: "SAVE10" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(h.db.select).not.toHaveBeenCalled();
    expect(h.db.insert).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });
  it("keeps PLUS50's active membership requirement", async () => {
    checkoutDb([[{ ...coupon, code: "PLUS50", discountPercent: 50 }], [{ id: 12 }], []]);
    await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, product: "guide", couponCode: "PLUS50" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });
});
