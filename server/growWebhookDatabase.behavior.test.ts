import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./feedbackAutomation", () => ({ queueProductFeedbackAfterPurchase: vi.fn() }));
vi.mock("./automation", () => ({ startJourney: vi.fn() }));
vi.mock("./_core/ga4", () => ({ ga4Purchase: vi.fn(), clientIdFromEmail: vi.fn() }));
vi.mock("./_core/metaCapi", () => ({ capiPurchase: vi.fn() }));

import { crmLeads, leads, singles } from "../drizzle/schema";
import { handleDatabase } from "./growWebhook";

function createDbHarness(selectRows: unknown[][], singleInsertId = 73) {
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  let selectIndex = 0;

  const db = {
    select: vi.fn(() => {
      const rows = selectRows[selectIndex++] ?? [];
      const limit = vi.fn().mockResolvedValue(rows);
      const where = vi.fn(() => ({
        limit,
        orderBy: vi.fn(() => ({ limit })),
      }));
      return { from: vi.fn(() => ({ where })) };
    }),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push({ table, values });
        const result = table === singles ? [{ insertId: singleInsertId }] : [{ insertId: 1 }];
        return Object.assign(Promise.resolve(result), {
          catch: (handler: (error: unknown) => unknown) => Promise.resolve(result).catch(handler),
        });
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push({ table, values });
        return { where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
      }),
    })),
  };

  return { db, inserts, updates };
}

describe("Grow database payment activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates an existing full draft without overwriting its profile fields", async () => {
    const harness = createDbHarness([
      [{ id: 91, gender: "female", quizSessionId: "synthetic-session" }],
      [{ id: 42, questionnaireToken: "questionnaire-token" }],
    ]);
    mocks.getDb.mockResolvedValue(harness.db);

    await handleDatabase("Draft.User@Example.com", "בדיקה סינתטית", "050-123 4567", "tx-synthetic-1");

    const profileUpdates = harness.updates.filter(entry => entry.table === singles);
    expect(profileUpdates).toHaveLength(1);
    expect(profileUpdates[0]?.values).toMatchObject({
      isPaid: true,
      isActive: true,
      paymentRef: "tx-synthetic-1",
    });
    expect(profileUpdates[0]?.values).not.toHaveProperty("gender");
    expect(profileUpdates[0]?.values).not.toHaveProperty("city");
    expect(profileUpdates[0]?.values).not.toHaveProperty("age");
    expect(harness.inserts.some(entry => entry.table === singles)).toBe(false);
    expect(harness.updates).toContainEqual(expect.objectContaining({
      table: crmLeads,
      values: expect.objectContaining({ status: "client_database", singleId: 42 }),
    }));
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("uses verified CRM gender when a rare paid fallback profile is unavoidable", async () => {
    const harness = createDbHarness([
      [{ id: 91, gender: "female", quizSessionId: null }],
      [],
    ]);
    mocks.getDb.mockResolvedValue(harness.db);

    await handleDatabase("fallback@example.com", "בדיקה סינתטית", "0501234567", "tx-synthetic-2");

    const profileInsert = harness.inserts.find(entry => entry.table === singles);
    expect(profileInsert?.values).toMatchObject({
      gender: "female",
      seekingGender: null,
      isPaid: true,
      isActive: true,
      email: "fallback@example.com",
    });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not invent gender or email a join link when no verified source exists", async () => {
    const harness = createDbHarness([[], []]);
    mocks.getDb.mockResolvedValue(harness.db);

    await handleDatabase("unknown@example.com", "בדיקה סינתטית", "0501234567", "tx-synthetic-3");

    expect(harness.inserts.some(entry => entry.table === singles)).toBe(false);
    expect(harness.inserts.some(entry => entry.table === leads)).toBe(false);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
      title: "נדרש שחזור פרופיל לאחר תשלום",
    }));
  });
});
