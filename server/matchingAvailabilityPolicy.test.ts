import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildMatchingHealthReport, countStuckProposals, getExistingPairKeys, getUnavailableSingleIds,
  selectCandidatesPerUser, formatMatchingHealthReport,
} from "./matchingAvailabilityPolicy";

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

// A delivered proposal carries token evidence, like a real sent row.
const sent = { approvalTokenA: "a", approvalTokenB: "b", ownerApprovedAt: NOW - 100 * HOUR };
function row(id: number, a: number, b: number, patch: Record<string, unknown> = {}) {
  return { id, singleAId: a, singleBId: b, status: "proposed", proposedAt: NOW - HOUR, ...sent, ...patch } as any;
}

describe("generator availability (shared policy)", () => {
  it("blocks both sides of a current proposal inside its window", () => {
    const blocked = getUnavailableSingleIds([row(1, 1, 2)], NOW);
    expect([...blocked].sort()).toEqual([1, 2]);
  });

  it("does not block anybody for an expired proposal, even if status is still proposed", () => {
    const blocked = getUnavailableSingleIds([row(1, 1, 2, { proposedAt: NOW - 60 * HOUR })], NOW);
    expect(blocked.size).toBe(0);
  });

  it("does not block after an explicit decline of a past proposal", () => {
    const blocked = getUnavailableSingleIds([row(1, 1, 2, { status: "rejected", approvedByA: false, tokenAUsedAt: NOW - HOUR })], NOW);
    expect(blocked.size).toBe(0);
  });

  it("blocks an active connection, but not one that was returned to the pool or ended", () => {
    const active = row(1, 1, 2, { status: "matched", approvedByA: true, approvedByB: true, matchedAt: NOW - 5 * HOUR });
    expect(getUnavailableSingleIds([active], NOW).size).toBe(2);
    expect(getUnavailableSingleIds([{ ...active, returnedToPoolAt: NOW - HOUR }], NOW).size).toBe(0);
    expect(getUnavailableSingleIds([{ ...active, matchDetailStatus: "ended" }], NOW).size).toBe(0);
  });

  it("never blocks a profile only because it had a match in the past", () => {
    const history = [
      row(1, 5, 6, { status: "matched", approvedByA: true, approvedByB: true, matchedAt: NOW - 400 * HOUR, returnedToPoolAt: NOW - 300 * HOUR }),
      row(2, 5, 7, { status: "expired", proposedAt: NOW - 200 * HOUR }),
      row(3, 5, 8, { status: "rejected", approvedByA: false, tokenAUsedAt: NOW - 150 * HOUR, proposedAt: NOW - 160 * HOUR }),
    ];
    expect(getUnavailableSingleIds(history, NOW).has(5)).toBe(false);
  });

  it("allows a new proposal after the previous one ended, while the same pair is never proposed twice", () => {
    const rows = [row(1, 10, 11, { status: "expired", proposedAt: NOW - 100 * HOUR })];
    expect(getUnavailableSingleIds(rows, NOW).has(10)).toBe(false);
    expect(getExistingPairKeys(rows).has("10-11")).toBe(true);
    expect(getExistingPairKeys(rows).has("10-12")).toBe(false);
  });

  it("ignores an unsent generated candidate that only carries status proposed", () => {
    const unsent = { id: 9, singleAId: 20, singleBId: 21, status: "proposed", proposedAt: NOW - HOUR } as any;
    expect(getUnavailableSingleIds([unsent], NOW).size).toBe(0);
  });

  it("counts stuck proposals: sent, past deadline, still proposed", () => {
    expect(countStuckProposals([
      row(1, 1, 2, { proposedAt: NOW - 60 * HOUR }),
      row(2, 3, 4),
      row(3, 5, 6, { status: "expired", proposedAt: NOW - 90 * HOUR }),
    ], NOW)).toBe(1);
  });
});

describe("per-user candidate selection", () => {
  it("does not let one 90%+ pair hide 80-89% candidates of other people", () => {
    const picked = selectCandidatesPerUser([
      { singleAId: 1, singleBId: 2, score: 95 },
      { singleAId: 3, singleBId: 4, score: 82 },
    ]);
    expect(picked.map(p => p.score)).toEqual([95, 82]);
  });

  it("is bounded per profile and skips profiles that already have a candidate waiting", () => {
    const cands = [
      { singleAId: 1, singleBId: 10, score: 91 }, { singleAId: 1, singleBId: 11, score: 90 },
      { singleAId: 1, singleBId: 12, score: 85 }, { singleAId: 1, singleBId: 13, score: 81 },
    ];
    const picked = selectCandidatesPerUser(cands, { perUser: 2 });
    // profile 1 keeps its best two; the third and fourth are kept only if they are the best of their own other side
    expect(picked.filter(p => p.singleAId === 1).length).toBeGreaterThanOrEqual(2);
    const noneWaiting = selectCandidatesPerUser(cands, { perUser: 1, alreadyHasWaitingCandidate: new Set([1, 10, 11, 12, 13]) });
    expect(noneWaiting).toEqual([]);
  });

  it("drops anything below the threshold", () => {
    expect(selectCandidatesPerUser([{ singleAId: 1, singleBId: 2, score: 79 }])).toEqual([]);
  });
});

describe("monitoring report", () => {
  it("counts free profiles without an available proposal, stuck and new candidates", () => {
    const report = buildMatchingHealthReport({
      eligibleIds: [1, 2, 3, 4, 5],
      blocked: new Set([1]),
      stats: new Map([
        [2, { passedHard: 3, bestScore: 88, hasWaitingCandidate: true }],
        [3, { passedHard: 2, bestScore: 70, hasWaitingCandidate: false }],
      ]),
      stuckProposals: 4,
      newCandidatesCreated: 7,
    });
    expect(report).toMatchObject({
      eligibleProfiles: 5, blockedByCurrentProposalOrConnection: 1, withAvailableCandidate: 1,
      noPassingCandidate: 2, belowThresholdOnly: 1, freeWithoutAvailableProposal: 3,
      stuckProposals: 4, newCandidatesCreated: 7,
    });
    const text = formatMatchingHealthReport(report).join("\n");
    expect(text).toContain("הצעות תקועות");
    expect(text).not.toMatch(/@|\b05\d{8}\b/);
  });
});

describe("generator never messages participants", () => {
  const source = readFileSync(fileURLToPath(new URL("./matchingScheduler.ts", import.meta.url)), "utf8");
  const run = source.slice(source.indexOf("export async function runWeeklyMatching"), source.indexOf("Auto-expiry for proposals"));
  it("only emails the owner, creates pending rows, and supports a write-free dry run", () => {
    const sends = run.match(/sendEmail\(/g) ?? [];
    expect(sends.length).toBe(1);
    expect(run).toContain("to: { email: ADMIN_EMAIL");
    expect(run).not.toContain("sendSMS(");
    expect(run).toContain('status: "pending"');
    expect(run).not.toContain("ownerApprovedAt");
    const dry = run.slice(run.indexOf("if (dryRun) {"), run.indexOf("if (matchesToInsert.length === 0)"));
    expect(dry).toContain("return {");
    expect(dry).not.toContain("db.insert");
  });
});
