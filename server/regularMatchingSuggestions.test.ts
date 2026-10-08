import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn(), score: vi.fn(), adminScore: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.db }));
vi.mock("./compatibility", () => ({ computeFullScore: mocks.score, computeFullScoreAdmin: mocks.adminScore }));
import { previewRegularCandidates } from "./regularMatchingSuggestions";
import { IL_SERVICE_CHOICES_STARTED_AT } from "./regularMatchingEligibility";
const main = { id: 1, isPaid: true, isActive: true, isSeed: false, market: "il", createdAt: IL_SERVICE_CHOICES_STARTED_AT - 1, questionnaireCompletedAt: 1, gender: "male", photoUrl: "example.png" };
function setup(results: any[][]) {
  let step = 0;
  const writes = vi.fn();
  const db = { select: vi.fn(() => ({ from: () => { const rows = results[step++] || []; return Object.assign(Promise.resolve(rows), { where: () => Object.assign(Promise.resolve(rows), { limit: async () => rows }) }); } })), insert: writes, update: writes, delete: writes };
  mocks.db.mockResolvedValue(db); return { writes, db };
}
describe("admin-only regular preview", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.score.mockReturnValue({ total: 0, details: ["פסילה מוחלטת: פער גיל"] }); mocks.adminScore.mockReturnValue({ total: 71, warnings: ["פער גיל"] }); });
  it("returns preview with warning even with no Boost membership, without writes", async () => {
    const { writes } = setup([[main], [], [{ ...main, id: 2, gender: "female", firstName: "Example", city: "Example" }], [], []]);
    const rows = await previewRegularCandidates(1);
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ matchId: 0, status: "preview", requiresCriteriaOverride: true });
    expect(rows[0].warnings).toContain("פסילה מוחלטת: פער גיל"); expect(writes).not.toHaveBeenCalled();
  });
  it("never offers a previously delivered pair or missing photograph", async () => {
    const { writes } = setup([[main], [{ singleAId: 1, singleBId: 2, status: "rejected", proposedAt: 1 }], [{ ...main, id: 2, gender: "female" }, { ...main, id: 3, gender: "female", photoUrl: null }], [], []]);
    expect(await previewRegularCandidates(1)).toEqual([]); expect(writes).not.toHaveBeenCalled();
  });
  it("does not preview a closed or unpaid profile", async () => {
    const { writes } = setup([[{ ...main, isActive: false }]]);
    expect(await previewRegularCandidates(1)).toEqual([]); expect(writes).not.toHaveBeenCalled();
  });
});
