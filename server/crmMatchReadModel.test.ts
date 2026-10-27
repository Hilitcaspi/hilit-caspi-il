import { describe, expect, it, vi } from "vitest";
import { buildCrmMatchRow, compactLifecycleNotes, getCrmMatchDetails, getCrmMatchIndex } from "./crmMatchReadModel";
import { wasMatchProposalSent } from "../shared/matchDelivery";
import { getMatchAvailability } from "../shared/matchAvailability";
import type { Match, Single } from "../drizzle/schema";
import type { MatchScoreInputs } from "./pendingMatchScore";
import { presentMatchScore } from "./pendingMatchScore";

function person(id: number, gender: "male" | "female"): Single {
  return { id, firstName: `Synthetic ${id}`, lastName: "Fixture", gender, seekingGender: gender === "male" ? "female" : "male", age: 32,
    city: "תל אביב", height: gender === "male" ? 180 : 168, isActive: true, isSeed: false, isPaid: true,
    dnaType: "anchor", education: "bachelor", religiosity: "secular", maritalStatus: "single", minAgePreference: 25,
    maxAgePreference: 45, photoUrl: "/synthetic-photo.jpg", about: "profile detail ".repeat(100), partnerDescription: "preference detail ".repeat(100),
    questionnaireCompletedAt: 1000, isCoachingClient: true, isNotBasic: true, updatedAt: 2000 } as Single;
}
const inputs: MatchScoreInputs = { people: new Map([[1, person(1, "male")], [2, person(2, "female")]]), answers: new Map() };
function record(overrides: Partial<Match> = {}): Match {
  return { id: 10, singleAId: 1, singleBId: 2, singleId: 1, matchedSingleId: 2, status: "pending", score: 81,
    notes: "[REGULAR_REVIEW] synthetic long note ".repeat(50), scoreBreakdown: JSON.stringify({ total: 81, details: ["stored detail"] }),
    autoExplanation: "stored explanation ".repeat(100), createdAt: new Date(1000), updatedAt: 2000, proposedAt: 1000,
    approvedByA: false, approvedByB: false, returnedToPoolAt: null, matchDetailStatus: null, ...overrides } as Match;
}
function mockDb(rows: unknown[][]) {
  let cursor = 0;
  const db: any = { select: vi.fn(() => {
    const data = rows[cursor++] || [];
    const query: any = { from: vi.fn(() => query), where: vi.fn(() => query), orderBy: vi.fn(() => query), limit: vi.fn(async () => data),
      then: (resolve: any, reject: any) => Promise.resolve(data).then(resolve, reject) };
    return query;
  }), insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
  return db;
}

describe("compact CRM match read model", () => {
  it("keeps the current preview score and full legacy snapshot while omitting repeated text from the index", () => {
    const m = record();
    const full = buildCrmMatchRow(m, inputs, 1);
    const compact = buildCrmMatchRow(m, inputs, 1, true);
    const expected = presentMatchScore(m, inputs.people.get(1), inputs.people.get(2));
    expect(compact.score).toBe(expected.score);
    expect(compact.savedScore).toBe(full.savedScore);
    expect(compact.hasHardBlock).toBe(full.hasHardBlock);
    expect(compact.scoreWarnings).toEqual(full.scoreWarnings);
    expect(compact.proposalSource).toBe(full.proposalSource);
    expect(compact.boostInitiatorId).toBe(1);
    expect(compact.scoreBreakdown).toBeNull();
    expect(compact.autoExplanation).toBeNull();
    expect(compact.singleAAbout).toBeUndefined();
    expect(full.singleAAbout).toBe(inputs.people.get(1)?.about);
    expect(full.singleBPartnerDesc).toBe(inputs.people.get(2)?.partnerDescription);
    expect(full.singleAIsCoachingClient).toBe(true);
    expect(compact.singleAIsNotBasic).toBe(true);
    expect(compact.singleAPhotoUrl).toBe(full.singleAPhotoUrl);
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(full).length / 3);
  });

  it("preserves every lifecycle availability and delivery state, including legacy notes and empty tokens", () => {
    const variants: Partial<Match>[] = [
      { status: "pending", notes: "[BOOST_CANDIDATE] draft" },
      { status: "proposed", notes: "generated only", approvedByA: false },
      { status: "proposed", approvalTokenA: "synthetic-token", approvalExpiresAt: 20000 },
      { status: "proposed", notes: "נשלחה בעבר: historical", approvalExpiresAt: 20000 },
      { status: "matched", returnedToPoolAt: null },
      { status: "matched", returnedToPoolAt: 1500 },
      { status: "proposed", tokenAUsedAt: 1500, approvedByA: false },
      { status: "proposed", approvedByA: true, approvedByB: true },
      { status: "expired", approvalTokenA: "", singleAToken: "", notes: null },
      { status: "proposed", ownerApprovedAt: 1500, proposedAt: null, approvalExpiresAt: null },
    ];
    for (const variant of variants) {
      const m = record(variant);
      const compact = buildCrmMatchRow(m, inputs, null, true);
      expect(wasMatchProposalSent(compact)).toBe(wasMatchProposalSent(m));
      expect(getMatchAvailability(compact, 10000)).toEqual(getMatchAvailability(m, 10000));
      if (m.status !== "pending" || wasMatchProposalSent(m)) expect(compact.score).toBe(m.score);
    }
  });

  it("keeps Boost source/initiator exact and missing profiles marked unavailable", () => {
    const boost = record({ notes: "[BOOST_SENT] note", autoExplanation: "[BOOST] narrative" });
    expect(buildCrmMatchRow(boost, inputs, 2, true).proposalSource).toBe("boost");
    expect(buildCrmMatchRow(record({ autoExplanation: "[boost] not a marker" }), inputs, null, true).proposalSource).toBe("regular");
    const missing = buildCrmMatchRow(record(), { people: new Map(), answers: new Map() }, null, true);
    expect(missing.score).toBeNull(); expect(missing.scoreSource).toBe("unavailable"); expect(missing.hasHardBlock).toBe(true);
    expect(compactLifecycleNotes("arbitrary long text [BOOST_CANDIDATE] נשלחה בעבר")).toBe("[BOOST_CANDIDATE] נשלחה בעבר");
  });

  it("retains duplicate historical pair events, sorts newest-first and performs only four bulk reads", async () => {
    const one = record({ id: 10, proposedAt: 1000 });
    const two = record({ id: 11, proposedAt: 2000 });
    const db = mockDb([[one, two], [{ matchId: 10, singleId: 1 }], [...inputs.people.values()], []]);
    const result = await getCrmMatchIndex(db);
    expect(result.map(row => row.id)).toEqual([11, 10]);
    expect(result[1].boostInitiatorId).toBe(1);
    expect(db.select).toHaveBeenCalledTimes(4);
    expect(db.insert).not.toHaveBeenCalled();expect(db.update).not.toHaveBeenCalled();expect(db.delete).not.toHaveBeenCalled();
  });

  it("loads one full detail only, keeps score breakdown/text, and returns null for hidden or missing records", async () => {
    const m = record({ status: "matched" });
    const db = mockDb([[m], [...inputs.people.values()], [], []]);
    const detail = await getCrmMatchDetails(db, 10);
    expect(detail?.id).toBe(10);expect(detail?.score).toBe(81);expect(detail?.scoreBreakdown).toBe(m.scoreBreakdown);
    expect(detail?.singleAAbout).toBe(person(1, "male").about);expect(detail?.autoExplanation).toBe(m.autoExplanation);
    expect(db.select).toHaveBeenCalledTimes(4);expect(db.update).not.toHaveBeenCalled();
    const hidden = mockDb([[]]);
    expect(await getCrmMatchDetails(hidden, 999)).toBeNull();expect(hidden.select).toHaveBeenCalledTimes(1);
  });
});
