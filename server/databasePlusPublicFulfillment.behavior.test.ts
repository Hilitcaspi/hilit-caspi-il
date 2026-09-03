import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  notifyOwner: vi.fn().mockResolvedValue(true),
  activatePlusForSingle: vi.fn().mockResolvedValue({ memberId: 91 }),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./plusFulfillment", () => ({ activatePlusForSingle: mocks.activatePlusForSingle }));

import { handlePlus } from "./growWebhook";

function createDbHarness(selectRows: unknown[][]) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  let selectIndex = 0;
  const db = {
    select: vi.fn(() => {
      const rows = selectRows[selectIndex++] ?? [];
      const limit = vi.fn().mockResolvedValue(rows);
      return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit })) })) };
    }),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return { where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push(values);
        return Promise.resolve([{ insertId: inserts.length }]);
      }),
    })),
  };
  return { db, inserts, updates };
}

describe("Database Plus public payment fulfillment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a confirmed Plus payment without a singles profile and creates a bound completion link", async () => {
    const harness = createDbHarness([[], [], []]);
    mocks.getDb.mockResolvedValue(harness.db);

    await handlePlus("new.member@example.com", "New Member", "tx-plus-public", 1, {
      payerPhone: "0500000000",
      paymentLinkProcessToken: "synthetic-recurring-id",
    });

    expect(harness.updates[0]).toMatchObject({
      status: "paid_pending_profile",
      providerTransactionId: "tx-plus-public",
      amountAgorot: 100,
      singleId: null,
    });
    expect(harness.inserts).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: "new.member@example.com", source: "plus_subscription" }),
      expect.objectContaining({ email: "new.member@example.com", status: "new_lead" }),
    ]));
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: { email: "new.member@example.com", name: "New Member" },
      subject: "התשלום ל־Database Plus התקבל",
      htmlContent: expect.stringContaining("/join?free_token="),
    }));
    expect(mocks.activatePlusForSingle).not.toHaveBeenCalled();
  });

  it("activates Plus immediately when the payer already has an active paid profile", async () => {
    const single = {
      id: 42,
      isActive: true,
      isPaid: true,
      questionnaireToken: "synthetic-questionnaire-token",
    };
    const harness = createDbHarness([[single]]);
    mocks.getDb.mockResolvedValue(harness.db);

    await handlePlus("existing.member@example.com", "Existing Member", "tx-plus-existing", 99, {
      subscriptionId: "synthetic-subscription-id",
    });

    expect(harness.updates[0]).toMatchObject({ status: "active", singleId: 42, amountAgorot: 9900 });
    expect(mocks.activatePlusForSingle).toHaveBeenCalledWith(expect.objectContaining({
      single,
      transactionId: "tx-plus-existing",
      providerSubscriptionId: "synthetic-subscription-id",
    }));
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
