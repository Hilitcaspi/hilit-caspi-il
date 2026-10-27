import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { evaluateMatchPreview, previewScoreDimensions } from "./matchScorePreview";
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
import { appRouter } from "./routers";

function dbRows(rows: unknown[][]) {
  let cursor = 0;
  const db: any = { select: vi.fn(() => {
    const data = rows[cursor++] || [];
    const query: any = { from: vi.fn(() => query), where: vi.fn(() => query),
      then: (resolve: any, reject: any) => Promise.resolve(data).then(resolve, reject) };
    return query;
  }), insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
  return db;
}
const a: any = { id: 1, firstName: "Synthetic A", gender: "male", seekingGender: "female", age: 33, city: "תל אביב", height: 181,
  education: "bachelor", religiosity: "secular", maritalStatus: "single", dnaType: "anchor", isActive: true, isSeed: false, minAgePreference: 25, maxAgePreference: 45 };
const b: any = { ...a, id: 2, firstName: "Synthetic B", gender: "female", seekingGender: "male", height: 168 };
const ctx = { user: { id: 1, role: "admin", openId: "synthetic-admin" }, teamMember: null,
  req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;

beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Provider/network forbidden in fast preview tests"); })); });

describe("fast compatibility preview", () => {
  it("uses exactly two bulk reads, returns the identical numeric preview and skips provider work", async () => {
    const db = dbRows([[a, b], []]);mocks.getDb.mockResolvedValue(db);
    const expected = evaluateMatchPreview(a, b, [], []);
    const result = await appRouter.createCaller(ctx).admin.checkCompatibility({ idA: 1, idB: 2, includeNarrative: false });
    expect(result.score).toBe(expected.score);expect(result.breakdown).toEqual(previewScoreDimensions(expected));
    expect(result.warnings).toEqual(expected.warnings);expect(result.hasHardBlock).toBe(expected.hasHardBlock);
    expect(result.canOverrideCriteria).toBe(expected.canOverrideCriteria);expect(result.narrative).toBe("");
    expect(result.personA.id).toBe(1);expect(result.personB.id).toBe(2);
    expect(db.select).toHaveBeenCalledTimes(2);expect(db.update).not.toHaveBeenCalled();expect(db.insert).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains blockers and legacy first-answer-row semantics without starting a checkout or notification", async () => {
    const blocked = { ...b, gender: "male", seekingGender: "male" };
    const rows = [{ singleId: 1, answersJson: "[]" }, { singleId: 1, answersJson: "not-valid-json" }, { singleId: 2, answersJson: "[]" }];
    const db = dbRows([[a, blocked], rows]);mocks.getDb.mockResolvedValue(db);
    const expected = evaluateMatchPreview(a, blocked, [], []);
    const result = await appRouter.createCaller(ctx).admin.checkCompatibility({ idA: 1, idB: 2, includeNarrative: false });
    expect(result.hasHardBlock).toBe(true);expect(result.hardBlockReason).toBe(expected.hardBlockReason);
    expect(result.canOverrideCriteria).toBe(false);expect(result.score).toBe(expected.score);expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects unauthorized access before a database read and missing people before generating a narrative", async () => {
    await expect(appRouter.createCaller({ ...ctx, user: null, teamMember: null }).admin.checkCompatibility({ idA: 1, idB: 2, includeNarrative: false })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.getDb).not.toHaveBeenCalled();
    const db = dbRows([[a], []]);mocks.getDb.mockResolvedValue(db);
    await expect(appRouter.createCaller(ctx).admin.checkCompatibility({ idA: 1, idB: 2, includeNarrative: false })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
