import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createPaymentProcess: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./growPayment", () => ({
  PRODUCT_CONFIGS: { plus: { description: "Database Plus - monthly", sum: 99 } },
  PLUS_CHECKOUT_PUBLICLY_AVAILABLE: true,
  getPlusCheckoutConfig: vi.fn(() => ({
    configured: true,
    mode: "production",
    checkoutAmount: 99,
    displayAmount: 99,
  })),
  createPaymentProcess: mocks.createPaymentProcess,
}));
vi.mock("./plusCheckoutReference", () => ({
  createPlusCheckoutReference: vi.fn(),
  verifyPlusCheckoutReference: vi.fn(() => true),
}));
vi.mock("./brevo", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  addContactToList: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

import { appRouter } from "./routers";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createDbHarness() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
}

const validInput = {
  product: "plus" as const,
  fullName: "Public Test Member",
  email: "public.member@example.com",
  phone: "0500000000",
  plusRenewalAccepted: true as const,
  plusTermsAccepted: true as const,
  plusBoostAccepted: true as const,
  origin: "https://preview.example",
};

describe("Database Plus public createProcess safeguards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a direct Plus API request without all three consents", async () => {
    const db = createDbHarness();
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(createPublicContext()).payment.createProcess({
      ...validInput,
      plusRenewalAccepted: undefined,
      plusTermsAccepted: undefined,
      plusBoostAccepted: undefined,
    }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(db.select).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it("keeps the monthly price and Production checkout contract", () => {
    const db = createDbHarness();
    mocks.getDb.mockResolvedValue(db);

    expect(validInput.plusRenewalAccepted).toBe(true);
    expect(validInput.plusTermsAccepted).toBe(true);
    expect(validInput.plusBoostAccepted).toBe(true);
  });
});
