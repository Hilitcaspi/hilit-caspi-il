import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createPaymentProcess: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./growPayment", () => ({
  PRODUCT_CONFIGS: { plus: { description: "Database Plus - monthly", sum: 99 } },
  PLUS_CHECKOUT_PUBLICLY_AVAILABLE: false,
  getPlusCheckoutConfig: vi.fn(() => ({
    configured: false,
    mode: "unconfigured",
    checkoutAmount: null,
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

describe("Database Plus hidden createProcess behavior", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a direct Plus API request before an intent or Grow process is created", async () => {
    const db = createDbHarness();
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(createPublicContext()).payment.createProcess(validInput))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    expect(db.select).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it("stays blocked even when all three Plus consents are present", async () => {
    const db = createDbHarness();
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(createPublicContext()).payment.createProcess(validInput))
      .rejects.toMatchObject({ message: "מסך החיוב החודשי עדיין לא הופעל" });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });
});
