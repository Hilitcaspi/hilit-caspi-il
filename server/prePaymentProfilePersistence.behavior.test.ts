import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  notifyOwner: vi.fn().mockResolvedValue(true),
  ga4SignUp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./brevo", () => ({
  sendEmail: mocks.sendEmail,
  addContactToList: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./_core/ga4", () => ({
  ga4GenerateLead: vi.fn().mockResolvedValue(undefined),
  ga4SignUp: mocks.ga4SignUp,
  clientIdFromEmail: vi.fn(() => "synthetic-client-id"),
}));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

import { appRouter } from "./routers";

type DbHarness = ReturnType<typeof createDbHarness>;

function createDbHarness(selectRows: unknown[][]) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
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
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push(values);
        return Promise.resolve([{ insertId: 42 }]);
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return { where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
      }),
    })),
  };

  return { db, inserts, updates };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const fullDraftInput = {
  firstName: "בדיקה",
  lastName: "סינתטית",
  gender: "female" as const,
  seekingGender: "male" as const,
  age: 34,
  birthDate: "1992-01-10",
  city: "תל אביב",
  phone: "050 123-4567",
  email: "Synthetic.Draft@Example.com",
  height: 168,
  education: "bachelor" as const,
  religiosity: "secular" as const,
  occupation: "בדיקת תוכנה",
  about: "פרופיל בדיקה סינתטי בלבד",
  interests: "מוזיקה,טיולים",
  maritalStatus: "single" as const,
  hasKids: false,
  numKids: 0,
  wantsKids: "yes" as const,
  dnaType: "anchor" as const,
  minAgePreference: 31,
  maxAgePreference: 40,
  minHeightPreference: 170,
  maxHeightPreference: 195,
  religiosityPreference: "secular,traditional",
  acceptsKids: "open" as const,
  openToPartnerWithKids: "yes" as const,
  locationPreference: "close" as const,
  partnerDescription: "תיאור סינתטי",
  consentMatchmaking: true,
  consentDataSharing: true,
  consentEmailMarketing: false,
  deferUntilPayment: true,
};

describe("registerBasicProfile pre-payment draft behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a complete inactive unpaid draft and sends nothing before payment", async () => {
    const harness: DbHarness = createDbHarness([[], [{ id: 91 }]]);
    mocks.getDb.mockResolvedValue(harness.db);

    const result = await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile(fullDraftInput);
    await Promise.resolve();

    expect(result).toMatchObject({ singleId: 42, success: true });
    expect(harness.inserts).toHaveLength(1);
    expect(harness.inserts[0]).toMatchObject({
      firstName: "בדיקה",
      gender: "female",
      seekingGender: "male",
      age: 34,
      birthDate: "1992-01-10",
      city: "תל אביב",
      phone: "0501234567",
      email: "synthetic.draft@example.com",
      occupation: "בדיקת תוכנה",
      dnaType: "anchor",
      isPaid: false,
      isActive: false,
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.ga4SignUp).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
    expect(harness.updates).toContainEqual(expect.objectContaining({
      singleId: 42,
      gender: "female",
      dnaType: "anchor",
    }));
    expect(harness.updates.some(update => update.status === "client_database")).toBe(false);
  });

  it("updates the same unpaid draft on retry instead of inserting a duplicate", async () => {
    const harness: DbHarness = createDbHarness([[
      {
        id: 42,
        age: 34,
        city: "תל אביב",
        isPaid: false,
        isActive: false,
        questionnaireToken: "synthetic-token",
        questionnaireCompletedAt: null,
        firstName: "בדיקה",
      },
    ]]);
    mocks.getDb.mockResolvedValue(harness.db);

    const result = await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      occupation: "פרט מעודכן בבדיקה",
    });

    expect(result).toMatchObject({ singleId: 42, success: true, alreadyExists: false });
    expect(harness.inserts).toHaveLength(0);
    expect(harness.updates[0]).toMatchObject({
      occupation: "פרט מעודכן בבדיקה",
      gender: "female",
      isPaid: false,
      isActive: false,
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.ga4SignUp).not.toHaveBeenCalled();
  });

  it("activates the same draft for a validated free-token path without inserting a duplicate", async () => {
    const harness: DbHarness = createDbHarness([[
      {
        id: 42,
        age: 34,
        city: "תל אביב",
        isPaid: false,
        isActive: false,
        questionnaireToken: "synthetic-token",
        questionnaireCompletedAt: null,
        firstName: "בדיקה",
      },
    ], [{ id: 91 }]]);
    mocks.getDb.mockResolvedValue(harness.db);

    const result = await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      deferUntilPayment: false,
      freeToken: "SYNTHETIC-VALIDATED-TOKEN",
    });
    await Promise.resolve();

    expect(result).toMatchObject({ singleId: 42, success: true, alreadyExists: false });
    expect(harness.inserts).toHaveLength(0);
    expect(harness.updates[0]).toMatchObject({ isPaid: true, isActive: true, gender: "female" });
    expect(harness.updates).toContainEqual(expect.objectContaining({
      status: "client_database",
      singleId: 42,
      product: "database",
    }));
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.ga4SignUp).toHaveBeenCalledTimes(1);
  });

  it("blocks a new checkout draft for an already paid profile without mutating or emailing it", async () => {
    const harness: DbHarness = createDbHarness([[
      {
        id: 42,
        age: 34,
        city: "תל אביב",
        isPaid: true,
        isActive: true,
        questionnaireToken: "synthetic-token",
        questionnaireCompletedAt: null,
        firstName: "בדיקה",
      },
    ]]);
    mocks.getDb.mockResolvedValue(harness.db);

    const result = await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile(fullDraftInput);

    expect(result).toMatchObject({ singleId: 42, success: true, alreadyExists: true });
    expect(harness.inserts).toHaveLength(0);
    expect(harness.updates).toHaveLength(0);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.ga4SignUp).not.toHaveBeenCalled();
  });
});
