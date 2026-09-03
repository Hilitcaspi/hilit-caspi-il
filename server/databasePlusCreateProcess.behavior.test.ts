import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createPaymentProcess: vi.fn().mockResolvedValue({
    authCode: "",
    processToken: "synthetic-plus-process",
    url: "https://sandbox.meshulam.co.il/hosted/synthetic-plus",
    checkoutMode: "sandbox",
  }),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./growPayment", () => ({
  PRODUCT_CONFIGS: { plus: { description: "Database Plus - monthly", sum: 99 } },
  getPlusCheckoutConfig: vi.fn(() => ({
    configured: true,
    mode: "sandbox",
    checkoutAmount: 1,
    displayAmount: 99,
  })),
  createPaymentProcess: mocks.createPaymentProcess,
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

function createDbHarness(selectRows: unknown[][]) {
  const inserts: Array<Record<string, unknown>> = [];
  let selectIndex = 0;
  const onDuplicateKeyUpdate = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  const db = {
    select: vi.fn(() => {
      const rows = selectRows[selectIndex++] ?? [];
      const limit = vi.fn().mockResolvedValue(rows);
      return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit })) })) };
    }),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push(values);
        return { onDuplicateKeyUpdate };
      }),
    })),
  };
  return { db, inserts, onDuplicateKeyUpdate };
}

const validInput = {
  product: "plus" as const,
  fullName: "Public Test Member",
  email: "PUBLIC.MEMBER@example.com",
  phone: "0500000000",
  plusRenewalAccepted: true as const,
  plusTermsAccepted: true as const,
  plusBoostAccepted: true as const,
  origin: "https://preview.example",
};

describe("Database Plus public createProcess behavior", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens a server-created Sandbox form for an active paid member without requiring a personal token", async () => {
    const harness = createDbHarness([[
      {
        id: 71,
        firstName: "Public",
        lastName: "Member",
        email: "public.member@example.com",
        phone: "0500000000",
        questionnaireToken: "synthetic-questionnaire-token",
        isActive: true,
        isPaid: true,
      },
    ], []]);
    mocks.getDb.mockResolvedValue(harness.db);

    const result = await appRouter.createCaller(createPublicContext()).payment.createProcess(validInput);

    expect(result).toMatchObject({
      url: "https://sandbox.meshulam.co.il/hosted/synthetic-plus",
      checkoutMode: "sandbox",
    });
    expect(harness.inserts).toHaveLength(1);
    expect(harness.inserts[0]).toMatchObject({
      singleId: 71,
      status: "eligible",
      billingStatus: "pending",
      source: "plus_checkout_sandbox",
    });
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({
      product: "plus",
      fullName: "Public Member",
      email: "public.member@example.com",
      phone: "0500000000",
      origin: "https://preview.example",
    }));
  });

  it("rejects the request before database access when any required consent is missing", async () => {
    const harness = createDbHarness([]);
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(appRouter.createCaller(createPublicContext()).payment.createProcess({
      ...validInput,
      plusBoostAccepted: undefined,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(harness.db.select).not.toHaveBeenCalled();
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it("rejects an unpaid or inactive profile before creating a Grow form", async () => {
    const harness = createDbHarness([[
      {
        id: 72,
        firstName: "Inactive",
        lastName: "Member",
        email: "public.member@example.com",
        phone: "0502222222",
        questionnaireToken: "synthetic-questionnaire-token",
        isActive: false,
        isPaid: true,
      },
    ]]);
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(appRouter.createCaller(createPublicContext()).payment.createProcess(validInput))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(harness.inserts).toHaveLength(0);
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });

  it("rejects a phone that does not match the active member profile", async () => {
    const harness = createDbHarness([[
      {
        id: 73,
        firstName: "Public",
        lastName: "Member",
        email: "public.member@example.com",
        phone: "0501111111",
        questionnaireToken: "synthetic-questionnaire-token",
        isActive: true,
        isPaid: true,
      },
    ]]);
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(appRouter.createCaller(createPublicContext()).payment.createProcess(validInput))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(harness.inserts).toHaveLength(0);
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });
});
