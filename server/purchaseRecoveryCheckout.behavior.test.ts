import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createPaymentProcess: vi.fn(),
  isPurchaseRecoveryOfferCode: vi.fn(),
  validatePurchaseRecoveryCoupon: vi.fn(),
  reservePurchaseRecoveryOffer: vi.fn(),
  bindPurchaseRecoveryProviderProcess: vi.fn(),
  releasePurchaseRecoveryReservationAfterProvenSetupFailure: vi.fn(),
  requirePlusDatabaseCheckout: vi.fn(),
  createPlusCheckoutReference: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
// These tests isolate product eligibility/attribution. Durable reservation and
// concurrency run against the real module in checkoutReservationIntegration.test.ts.
vi.mock("./checkoutReservation", async importOriginal => ({
  ...await importOriginal<typeof import("./checkoutReservation")>(),
  createCheckoutReservationFingerprint: () => "synthetic-isolated-product-test-binding",
  withCheckoutReservation: async (_input: unknown, create: () => Promise<unknown>) => create(),
}));
vi.mock("./growPayment", () => ({
  PRODUCT_CONFIGS: {
    database: { sum: 299 },
    session: { sum: 500 },
    plus: { sum: 99 },
  },
  getPlusCheckoutConfig: () => ({ configured: true, mode: "production", checkoutAmount: 99, displayAmount: 99 }),
  createPaymentProcess: mocks.createPaymentProcess,
  isGrowCreateDefinitelyRejected: () => false,
}));
vi.mock("./purchaseRecoveryOffers", () => ({
  isPurchaseRecoveryOfferCode: mocks.isPurchaseRecoveryOfferCode,
  validatePurchaseRecoveryCoupon: mocks.validatePurchaseRecoveryCoupon,
  reservePurchaseRecoveryOffer: mocks.reservePurchaseRecoveryOffer,
  bindPurchaseRecoveryProviderProcess: mocks.bindPurchaseRecoveryProviderProcess,
  releasePurchaseRecoveryReservationAfterProvenSetupFailure: mocks.releasePurchaseRecoveryReservationAfterProvenSetupFailure,
}));
vi.mock("./plusDatabaseCheckout", () => ({
  requirePlusDatabaseCheckout: mocks.requirePlusDatabaseCheckout,
}));
vi.mock("./plusCheckoutReference", () => ({
  createPlusCheckoutReference: mocks.createPlusCheckoutReference,
}));
vi.mock("./brevo", () => ({ sendEmail: vi.fn(), addContactToList: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./acquisitionCapture", async importOriginal => ({
  ...await importOriginal<typeof import("./acquisitionCapture")>(),
  recordAcquisitionSafely: vi.fn(),
}));

import { appRouter } from "./routers";

type RecoveryProduct = "database" | "session" | "plus";

type CheckoutDbHarness = ReturnType<typeof createCheckoutDb>;

function createCheckoutDb(selectRows: unknown[][] = []) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  const persistOrder = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  let selectIndex = 0;
  const db = {
    select: vi.fn(() => {
      const rows = selectRows[selectIndex++] ?? [];
      const query: any = {
        from: () => query,
        innerJoin: () => query,
        where: () => query,
        limit: async () => rows,
        then: (resolve: (value: unknown[]) => unknown, reject: (reason?: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
      };
      return query;
    }),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push(values);
        return { onDuplicateKeyUpdate: persistOrder };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return { where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
      }),
    })),
  };
  return { db, inserts, updates, persistOrder };
}

function context(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const databaseInput = {
  product: "database" as const,
  fullName: "Synthetic Recovery",
  email: "recovery@example.test",
  phone: "0500000000",
  couponCode: "MATCH10",
};

function successfulRecoveryValidation(code: string, fixedPrice: number | undefined) {
  return {
    valid: true as const,
    code,
    discountPercent: code === "PLUSGIFT" ? undefined : 10,
    discountAmount: undefined,
    fixedPrice,
  };
}

function successfulReservation(product: RecoveryProduct, code: string, fixedPrice: number | undefined) {
  return {
    offer: {
      product,
      code,
      fixedPrice,
      expectedAmountAgorot: product === "database" ? 26910 : product === "session" ? 45000 : 9900,
      kind: product === "plus" ? "plus_gift" as const : "discount" as const,
    },
    reference: `signed-recovery-${product}-reference`,
    reservedUntil: Date.now() + 20 * 60 * 1000,
  };
}

function setRecoveryMocks(product: RecoveryProduct, code: string, fixedPrice: number | undefined) {
  mocks.isPurchaseRecoveryOfferCode.mockImplementation((value: string | undefined) => value === code);
  mocks.validatePurchaseRecoveryCoupon.mockResolvedValue(successfulRecoveryValidation(code, fixedPrice));
  mocks.reservePurchaseRecoveryOffer.mockResolvedValue(successfulReservation(product, code, fixedPrice));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.createPaymentProcess.mockResolvedValue({ authCode: "synthetic-auth", processToken: "synthetic-process" });
  mocks.bindPurchaseRecoveryProviderProcess.mockResolvedValue(undefined);
  mocks.requirePlusDatabaseCheckout.mockResolvedValue({ id: 81, gender: "female" });
  mocks.createPlusCheckoutReference.mockReturnValue("signed-plus-reference");
});

describe("purchase recovery checkout plumbing", () => {
  it.each([
    ["database", "MATCH10", 269.1],
    ["session", "LOVE10DAY", 450],
  ] as const)("passes the exact %s recovery price to Grow only after durable reservation", async (product, code, fixedPrice) => {
    const harness: CheckoutDbHarness = createCheckoutDb();
    mocks.getDb.mockResolvedValue(harness.db);
    setRecoveryMocks(product, code, fixedPrice);

    const result = await appRouter.createCaller(context()).payment.createProcess({
      ...databaseInput,
      product,
      couponCode: code,
    });

    expect(mocks.validatePurchaseRecoveryCoupon).toHaveBeenCalledWith({
      code,
      product,
      email: "recovery@example.test",
    });
    expect(harness.persistOrder).toHaveBeenCalledOnce();
    expect(mocks.reservePurchaseRecoveryOffer).toHaveBeenCalledWith({
      email: "recovery@example.test",
      product,
      code,
    });
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({
      product,
      sum: fixedPrice,
      recoveryWebhookReference: `signed-recovery-${product}-reference`,
    }));
    expect(mocks.bindPurchaseRecoveryProviderProcess).toHaveBeenCalledWith({
      reference: `signed-recovery-${product}-reference`,
      email: "recovery@example.test",
      product,
      processToken: "synthetic-process",
    });
    expect(harness.persistOrder.mock.invocationCallOrder[0]).toBeLessThan(mocks.reservePurchaseRecoveryOffer.mock.invocationCallOrder[0]);
    expect(mocks.reservePurchaseRecoveryOffer.mock.invocationCallOrder[0]).toBeLessThan(mocks.createPaymentProcess.mock.invocationCallOrder[0]);
    expect(mocks.createPaymentProcess.mock.invocationCallOrder[0]).toBeLessThan(mocks.bindPurchaseRecoveryProviderProcess.mock.invocationCallOrder[0]);
    expect(result).toMatchObject({ authCode: "synthetic-auth", processToken: "synthetic-process" });
  });

  it("rejects a failed recovery eligibility check before persisting an order or calling Grow", async () => {
    const harness: CheckoutDbHarness = createCheckoutDb();
    mocks.getDb.mockResolvedValue(harness.db);
    mocks.isPurchaseRecoveryOfferCode.mockReturnValue(true);
    mocks.validatePurchaseRecoveryCoupon.mockResolvedValue({ valid: false, error: "recovery unavailable" });

    await expect(appRouter.createCaller(context()).payment.createProcess(databaseInput))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: "recovery unavailable" });

    expect(harness.persistOrder).not.toHaveBeenCalled();
    expect(mocks.reservePurchaseRecoveryOffer).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it("keeps the provider reservation intact and never retries Grow if token binding fails after provider acceptance", async () => {
    const harness: CheckoutDbHarness = createCheckoutDb();
    mocks.getDb.mockResolvedValue(harness.db);
    setRecoveryMocks("database", "MATCH10", 269.1);
    mocks.bindPurchaseRecoveryProviderProcess.mockRejectedValue(new Error("synthetic bind failure"));

    await expect(appRouter.createCaller(context()).payment.createProcess(databaseInput))
      .rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: expect.stringContaining("אין לשלם שוב לפני בדיקה") });

    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
    expect(mocks.bindPurchaseRecoveryProviderProcess).toHaveBeenCalledOnce();
    expect(mocks.releasePurchaseRecoveryReservationAfterProvenSetupFailure).not.toHaveBeenCalled();
    expect(harness.updates).toHaveLength(0);
  });

  it("keeps PLUSGIFT at the normal recurring Plus amount while binding its recovery callback", async () => {
    // select order: existing Plus intent, prior Plus membership, capacity rows.
    const harness: CheckoutDbHarness = createCheckoutDb([[], [], []]);
    mocks.getDb.mockResolvedValue(harness.db);
    setRecoveryMocks("plus", "PLUSGIFT", undefined);
    mocks.createPaymentProcess.mockResolvedValue({
      authCode: "",
      processToken: "synthetic-plus-process",
      url: "https://grow.example/synthetic-plus",
      checkoutMode: "production",
    });

    const result = await appRouter.createCaller(context()).payment.createProcess({
      product: "plus",
      fullName: "Synthetic Recovery",
      email: "recovery@example.test",
      phone: "0500000000",
      couponCode: "PLUSGIFT",
      personalToken: "synthetic-personal-token-123456",
      plusRenewalAccepted: true,
      plusTermsAccepted: true,
      plusBoostAccepted: true,
      origin: "https://hilitcaspi.com",
    });

    expect(mocks.requirePlusDatabaseCheckout).toHaveBeenCalledWith("recovery@example.test", "synthetic-personal-token-123456");
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({
      product: "plus",
      sum: undefined,
      recoveryWebhookReference: "signed-recovery-plus-reference",
    }));
    expect(mocks.bindPurchaseRecoveryProviderProcess).toHaveBeenCalledWith({
      reference: "signed-recovery-plus-reference",
      email: "recovery@example.test",
      product: "plus",
      processToken: "synthetic-plus-process",
    });
    expect(result).toMatchObject({ url: "https://grow.example/synthetic-plus", processToken: "synthetic-plus-process" });
  });

  it("does not mark a recovery Plus intent failed after Grow accepted a process but binding is ambiguous", async () => {
    const harness: CheckoutDbHarness = createCheckoutDb([[], [], []]);
    mocks.getDb.mockResolvedValue(harness.db);
    setRecoveryMocks("plus", "PLUSGIFT", undefined);
    mocks.createPaymentProcess.mockResolvedValue({
      authCode: "",
      processToken: "synthetic-plus-process",
      url: "https://grow.example/synthetic-plus",
      checkoutMode: "production",
    });
    mocks.bindPurchaseRecoveryProviderProcess.mockRejectedValue(new Error("synthetic plus bind failure"));

    await expect(appRouter.createCaller(context()).payment.createProcess({
      product: "plus",
      fullName: "Synthetic Recovery",
      email: "recovery@example.test",
      phone: "0500000000",
      couponCode: "PLUSGIFT",
      personalToken: "synthetic-personal-token-123456",
      plusRenewalAccepted: true,
      plusTermsAccepted: true,
      plusBoostAccepted: true,
      origin: "https://hilitcaspi.com",
    })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: expect.stringContaining("אין לשלם שוב לפני בדיקה") });

    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
    expect(mocks.bindPurchaseRecoveryProviderProcess).toHaveBeenCalledOnce();
    expect(harness.updates.some(update => update.status === "failed")).toBe(false);
  });
});
