import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail }));

import { courseCompassRouter } from "./courseCompassRouter";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createDbHarness(confirmationRows: Array<{ id: number }> = []) {
  let insertIndex = 0;
  const waitlistUpsert = vi.fn().mockResolvedValue(undefined);
  const insertConfirmation = vi.fn().mockResolvedValue([{ insertId: 91 }]);
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const db = {
    insert: vi.fn(() => {
      const current = insertIndex++;
      return {
        values: current === 0
          ? vi.fn(() => ({ onDuplicateKeyUpdate: waitlistUpsert }))
          : insertConfirmation,
      };
    }),
    select: vi.fn(() => {
      const chain: any = {};
      chain.from = vi.fn(() => chain);
      chain.where = vi.fn(() => chain);
      chain.limit = vi.fn().mockResolvedValue(confirmationRows);
      return chain;
    }),
    update: vi.fn(() => ({ set: updateSet })),
  };
  return { db, waitlistUpsert, insertConfirmation, updateSet, updateWhere };
}

const validInput = {
  sessionId: "8d90b19e-9ed1-4bb1-9db3-3cf0f4033f34",
  name: "בדיקת מערכת",
  email: "compass-test@example.com",
  phone: "0500000000",
  resultKey: "consistency" as const,
  secondaryResultKey: "information" as const,
  selectedAction: "observe_defined",
  waitlistConsent: true as const,
  marketingConsent: false,
  utmSource: "qa",
  utmCampaign: "compass_prelaunch",
};

describe("course compass waitlist API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "mock-message" });
  });

  it("rejects submission without explicit launch notification consent", async () => {
    const { db } = createDbHarness();
    mocks.getDb.mockResolvedValue(db);
    await expect(courseCompassRouter.createCaller(createPublicContext()).joinWaitlist({
      ...validInput,
      waitlistConsent: false as never,
    })).rejects.toBeTruthy();
    expect(db.insert).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("upserts only summary data and sends one confirmation", async () => {
    const { db, waitlistUpsert, insertConfirmation, updateSet } = createDbHarness();
    mocks.getDb.mockResolvedValue(db);

    const result = await courseCompassRouter.createCaller(createPublicContext()).joinWaitlist(validInput);

    expect(result).toMatchObject({ ok: true, alreadyJoined: false, confirmationSent: true });
    expect(waitlistUpsert).toHaveBeenCalledOnce();
    expect(insertConfirmation).toHaveBeenCalledOnce();
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendEmail.mock.calls[0][0].subject).toContain("המצפן שלך נשמר");
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "sent" }));
    const storedValues = db.insert.mock.results[0].value.values.mock.calls[0][0];
    expect(storedValues).toMatchObject({
      resultKey: "consistency",
      selectedAction: "observe_defined",
      waitlistConsent: true,
      marketingConsent: false,
    });
    expect(storedValues).not.toHaveProperty("answers");
    expect(storedValues).not.toHaveProperty("responses");
  });

  it("does not resend the confirmation for an existing waitlist email", async () => {
    const { db, insertConfirmation } = createDbHarness([{ id: 77 }]);
    mocks.getDb.mockResolvedValue(db);

    const result = await courseCompassRouter.createCaller(createPublicContext()).joinWaitlist(validInput);

    expect(result).toMatchObject({ ok: true, alreadyJoined: true, confirmationSent: true });
    expect(insertConfirmation).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
