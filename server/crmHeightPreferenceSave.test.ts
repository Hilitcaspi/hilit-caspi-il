import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  hashActor: vi.fn(() => "synthetic-crm-actor-hash"),
  recordSelfServiceEventSafely: vi.fn().mockResolvedValue(undefined),
}));

// This suite exercises the router through createCaller. The database is an
// in-memory synthetic state machine; it never opens a real connection.
vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./usageMetrics", async importOriginal => ({
  ...(await importOriginal<typeof import("./usageMetrics")>()),
  hashActor: mocks.hashActor,
  recordSelfServiceEventSafely: mocks.recordSelfServiceEventSafely,
}));

import { appRouter } from "./routers";

type SyntheticProfile = {
  id: number;
  minHeightPreference: number | null;
  maxHeightPreference: number | null;
  firstName: string;
  city: string;
  email: string;
  occupation: string;
  internalMarker: string;
  updatedAt?: number;
};

type HarnessOptions = {
  profile?: SyntheticProfile | null;
  readbackOverride?: Partial<Pick<SyntheticProfile, "minHeightPreference" | "maxHeightPreference">>;
  writeFailure?: Error;
};

function syntheticProfile(overrides: Partial<SyntheticProfile> = {}): SyntheticProfile {
  return {
    id: 17301,
    minHeightPreference: 160,
    maxHeightPreference: 190,
    firstName: "בדיקת CRM סינתטית",
    city: "עיר בדיקה",
    email: "synthetic.crm.profile@example.test",
    occupation: "בדיקת איכות",
    internalMarker: "preserve-synthetic-profile-data",
    ...overrides,
  };
}

function createDbHarness({
  profile = syntheticProfile(),
  readbackOverride,
  writeFailure,
}: HarnessOptions = {}) {
  const updates: Array<Record<string, unknown>> = [];
  let heightReadCount = 0;

  const db = {
    select: vi.fn(() => {
      const chain: any = {};
      chain.from = vi.fn(() => chain);
      chain.where = vi.fn(() => chain);
      chain.limit = vi.fn(async () => {
        heightReadCount += 1;
        if (!profile) return [];
        const readback = heightReadCount > 1 && readbackOverride
          ? { ...profile, ...readbackOverride }
          : profile;
        // The procedure explicitly projects these two columns. Returning only
        // them makes an accidental whole-profile dependency visible to the test.
        return [{
          minHeightPreference: readback.minHeightPreference,
          maxHeightPreference: readback.maxHeightPreference,
        }];
      });
      return chain;
    }),
    update: vi.fn(() => ({
      set: vi.fn((patch: Record<string, unknown>) => {
        updates.push(patch);
        return {
          where: vi.fn(async () => {
            if (writeFailure) throw writeFailure;
            if (profile) Object.assign(profile, patch);
            return [{ affectedRows: profile ? 1 : 0 }];
          }),
        };
      }),
    })),
    insert: vi.fn(),
  };

  return {
    db,
    updates,
    profile: () => profile,
    heightReadCount: () => heightReadCount,
  };
}

function adminContext(): TrpcContext {
  return {
    user: {
      id: 717,
      openId: "synthetic-admin-open-id",
      email: "synthetic.admin@example.test",
      name: "Synthetic CRM Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
    },
    teamMember: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function noCredentialsContext(): TrpcContext {
  return {
    user: null,
    teamMember: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function nonAdminContext(): TrpcContext {
  return {
    ...adminContext(),
    user: {
      ...adminContext().user!,
      id: 718,
      openId: "synthetic-non-admin-open-id",
      role: "user",
    },
  };
}

async function updateHeight(
  input: Record<string, unknown>,
  context: TrpcContext = adminContext(),
) {
  return (appRouter.createCaller(context).matchmaking as any).updateSingleInline(input);
}

describe("CRM height-preference saves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashActor.mockReturnValue("synthetic-crm-actor-hash");
    mocks.recordSelfServiceEventSafely.mockResolvedValue(undefined);
  });

  it("saves an inclusive 173–200 range and verifies both stored height fields before success", async () => {
    const harness = createDbHarness();
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, minHeightPreference: 173, maxHeightPreference: 200 }))
      .resolves.toEqual({ success: true });

    expect(harness.updates).toHaveLength(1);
    expect(harness.updates[0]).toMatchObject({ minHeightPreference: 173, maxHeightPreference: 200 });
    expect(harness.profile()).toMatchObject({ minHeightPreference: 173, maxHeightPreference: 200 });
    expect(harness.heightReadCount()).toBe(2);
    expect(mocks.recordSelfServiceEventSafely).toHaveBeenCalledOnce();
  });

  it("saves only a minimum while preserving the stored maximum in the merged range", async () => {
    const harness = createDbHarness({ profile: syntheticProfile({ minHeightPreference: 160, maxHeightPreference: 192 }) });
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, minHeightPreference: 173 })).resolves.toEqual({ success: true });

    expect(harness.updates[0]).toMatchObject({ minHeightPreference: 173 });
    expect(harness.updates[0]).not.toHaveProperty("maxHeightPreference");
    expect(harness.profile()).toMatchObject({ minHeightPreference: 173, maxHeightPreference: 192 });
    expect(harness.heightReadCount()).toBe(2);
  });

  it("saves only a maximum while preserving the stored minimum in the merged range", async () => {
    const harness = createDbHarness({ profile: syntheticProfile({ minHeightPreference: 171, maxHeightPreference: 190 }) });
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, maxHeightPreference: 200 })).resolves.toEqual({ success: true });

    expect(harness.updates[0]).toMatchObject({ maxHeightPreference: 200 });
    expect(harness.updates[0]).not.toHaveProperty("minHeightPreference");
    expect(harness.profile()).toMatchObject({ minHeightPreference: 171, maxHeightPreference: 200 });
    expect(harness.heightReadCount()).toBe(2);
  });

  it("persists explicit blank/null height inputs as clears", async () => {
    const harness = createDbHarness();
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, minHeightPreference: null, maxHeightPreference: null }))
      .resolves.toEqual({ success: true });

    expect(harness.updates[0]).toMatchObject({ minHeightPreference: null, maxHeightPreference: null });
    expect(harness.profile()).toMatchObject({ minHeightPreference: null, maxHeightPreference: null });
    expect(harness.heightReadCount()).toBe(2);
  });

  it("does not overwrite unrelated existing profile fields while saving a height preference", async () => {
    const original = syntheticProfile({
      city: "עיר סינתטית שנשמרת",
      email: "preserve.other.fields@example.test",
      occupation: "עיסוק סינתטי שנשמר",
      internalMarker: "unrelated-data-must-survive",
    });
    const harness = createDbHarness({ profile: original });
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, minHeightPreference: 173 })).resolves.toEqual({ success: true });

    expect(harness.profile()).toMatchObject({
      city: "עיר סינתטית שנשמרת",
      email: "preserve.other.fields@example.test",
      occupation: "עיסוק סינתטי שנשמר",
      internalMarker: "unrelated-data-must-survive",
    });
    expect(harness.updates[0]).not.toHaveProperty("city");
    expect(harness.updates[0]).not.toHaveProperty("email");
    expect(harness.updates[0]).not.toHaveProperty("occupation");
  });

  it.each([
    ["NaN", { minHeightPreference: Number.NaN }],
    ["a fractional value", { minHeightPreference: 173.5 }],
    ["a value below 100", { minHeightPreference: 99 }],
    ["a value above 250", { maxHeightPreference: 251 }],
  ])("rejects %s before any database operation", async (_label, heightInput) => {
    const harness = createDbHarness();
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, ...heightInput })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(harness.db.select).not.toHaveBeenCalled();
    expect(harness.db.update).not.toHaveBeenCalled();
    expect(mocks.recordSelfServiceEventSafely).not.toHaveBeenCalled();
  });

  it("rejects a one-sided edit that reverses the merged stored height range before writing", async () => {
    const harness = createDbHarness({ profile: syntheticProfile({ minHeightPreference: 160, maxHeightPreference: 190 }) });
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, minHeightPreference: 201 }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("המינימלי") });

    expect(harness.heightReadCount()).toBe(1);
    expect(harness.db.update).not.toHaveBeenCalled();
    expect(mocks.recordSelfServiceEventSafely).not.toHaveBeenCalled();
  });

  it("rejects a requested height change for a missing profile without writing or reporting success", async () => {
    const harness = createDbHarness({ profile: null });
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, maxHeightPreference: 200 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(harness.heightReadCount()).toBe(1);
    expect(harness.db.update).not.toHaveBeenCalled();
    expect(mocks.recordSelfServiceEventSafely).not.toHaveBeenCalled();
  });

  it("propagates a failed write rather than returning a false success", async () => {
    const writeFailure = new Error("synthetic height write failure");
    const harness = createDbHarness({ writeFailure });
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, minHeightPreference: 173 }))
      .rejects.toThrow("synthetic height write failure");

    expect(harness.heightReadCount()).toBe(1);
    expect(harness.db.update).toHaveBeenCalledOnce();
    expect(mocks.recordSelfServiceEventSafely).not.toHaveBeenCalled();
  });

  it("rejects a successful-looking write when the readback range does not match, without false success", async () => {
    const harness = createDbHarness({
      readbackOverride: { minHeightPreference: 160, maxHeightPreference: 200 },
    });
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({ id: 17301, minHeightPreference: 173, maxHeightPreference: 200 }))
      .rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: expect.stringContaining("לאמת") });

    expect(harness.heightReadCount()).toBe(2);
    expect(harness.profile()).toMatchObject({ minHeightPreference: 173, maxHeightPreference: 200 });
    expect(mocks.recordSelfServiceEventSafely).not.toHaveBeenCalled();
  });

  it("blocks unauthenticated and non-admin callers before any database operation", async () => {
    const unauthenticated = createDbHarness();
    mocks.getDb.mockResolvedValue(unauthenticated.db);

    await expect(updateHeight({ id: 17301, minHeightPreference: 173 }, noCredentialsContext()))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(unauthenticated.db.select).not.toHaveBeenCalled();
    expect(unauthenticated.db.update).not.toHaveBeenCalled();

    const nonAdmin = createDbHarness();
    mocks.getDb.mockResolvedValue(nonAdmin.db);
    await expect(updateHeight({ id: 17301, minHeightPreference: 173 }, nonAdminContext()))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(nonAdmin.db.select).not.toHaveBeenCalled();
    expect(nonAdmin.db.update).not.toHaveBeenCalled();
  });

  it("rejects unknown fields because the input contract is strict", async () => {
    const harness = createDbHarness();
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(updateHeight({
      id: 17301,
      minHeightPreference: 173,
      unrecognizedSyntheticField: "must-not-be-stripped",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(harness.db.select).not.toHaveBeenCalled();
    expect(harness.db.update).not.toHaveBeenCalled();
    expect(mocks.recordSelfServiceEventSafely).not.toHaveBeenCalled();
  });
});
