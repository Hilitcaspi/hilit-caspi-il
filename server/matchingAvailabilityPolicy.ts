import { isBlockingMatch, getMatchAvailability, type MatchAvailabilityMatch } from "../shared/matchAvailability";
import { isInvalidMatchPlaceholder } from "./invalidMatchPlaceholder";

/**
 * Pure helpers for the tri-daily generator. They hold no customer contact data and
 * never send anything; the generator only creates candidates that wait for owner approval.
 */

export const HIGH_MATCH_THRESHOLD = 90;
export const LOW_MATCH_THRESHOLD_DEFAULT = 80;

type PairRow = { singleAId: number; singleBId: number };

export function pairKey(a: number, b: number): string {
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

/**
 * Participants who cannot receive a new proposal right now. Uses the same shared
 * policy as the CRM and send guards: only a current sent proposal inside its window,
 * or an active connection, blocks. Expired, ended, returned, declined or unsent rows
 * never block permanently, and "had a match before" is never a blocker.
 */
export function getUnavailableSingleIds(rows: Array<PairRow & MatchAvailabilityMatch>, now = Date.now()): Set<number> {
  const blocked = new Set<number>();
  for (const m of rows) {
    if (isInvalidMatchPlaceholder(m as any)) continue;
    if (isBlockingMatch(m, now)) {
      blocked.add(m.singleAId);
      blocked.add(m.singleBId);
    }
  }
  return blocked;
}

/** Pairs that already have any row. The same pair is never proposed twice or in parallel. */
export function getExistingPairKeys(rows: PairRow[]): Set<string> {
  return new Set(rows.map(m => pairKey(m.singleAId, m.singleBId)));
}

export type ScoredCandidate = { singleAId: number; singleBId: number; score: number };

export const DEFAULT_CANDIDATES_PER_USER = 2;

/**
 * Per-person, bounded selection. Every free profile that has no candidate waiting for the owner
 * yet gets its best `perUser` new candidates (90%+ first, otherwise 80%+). A pair is kept when it is
 * in the top list of at least one such profile. This replaces the old global rule where a single
 * 90%+ pair anywhere dropped every 80-89% candidate for everybody, and it keeps the owner's approval
 * list small: nobody gets more than `perUser` new candidates from one run through their own list.
 */
export function selectCandidatesPerUser<T extends ScoredCandidate>(
  candidates: T[],
  options: { lowThreshold?: number; perUser?: number; alreadyHasWaitingCandidate?: Set<number> } = {},
): T[] {
  const low = options.lowThreshold ?? LOW_MATCH_THRESHOLD_DEFAULT;
  const perUser = options.perUser ?? DEFAULT_CANDIDATES_PER_USER;
  const has = options.alreadyHasWaitingCandidate ?? new Set<number>();
  const eligible = candidates.filter(c => c.score >= low);
  const byPerson = new Map<number, T[]>();
  for (const c of eligible) {
    for (const id of [c.singleAId, c.singleBId]) {
      const list = byPerson.get(id) ?? [];
      list.push(c);
      byPerson.set(id, list);
    }
  }
  const keep = new Set<T>();
  for (const [id, list] of Array.from(byPerson.entries())) {
    if (has.has(id)) continue;
    list.sort((x, y) => y.score - x.score);
    list.slice(0, perUser).forEach(c => keep.add(c));
  }
  return Array.from(keep).sort((x, y) => y.score - x.score);
}

export type MatchingHealthReport = {
  eligibleProfiles: number;
  blockedByCurrentProposalOrConnection: number;
  /** Eligible, not blocked, but no candidate passed the hard filters at all. */
  noPassingCandidate: number;
  /** Eligible, not blocked, candidates exist but none reached the threshold. */
  belowThresholdOnly: number;
  /** Eligible, not blocked, with at least one candidate waiting (new or existing). */
  withAvailableCandidate: number;
  /** Eligible and free but without any available candidate (sum of the two above). */
  freeWithoutAvailableProposal: number;
  stuckProposals: number;
  newCandidatesCreated: number;
};

export type SingleScanStats = { passedHard: number; bestScore: number; hasWaitingCandidate: boolean };

/** stuck = still "proposed" and sent, but past its deadline (the expiry job should have closed it). */
export function countStuckProposals(rows: MatchAvailabilityMatch[], now = Date.now()): number {
  return rows.filter(m => m.status === "proposed" && getMatchAvailability(m, now).reason === "expired_proposal").length;
}

export function buildMatchingHealthReport(input: {
  eligibleIds: number[];
  blocked: Set<number>;
  stats: Map<number, SingleScanStats>;
  stuckProposals: number;
  newCandidatesCreated: number;
  lowThreshold?: number;
}): MatchingHealthReport {
  const low = input.lowThreshold ?? LOW_MATCH_THRESHOLD_DEFAULT;
  let blockedCount = 0, noPassing = 0, belowOnly = 0, withCandidate = 0;
  for (const id of input.eligibleIds) {
    if (input.blocked.has(id)) { blockedCount++; continue; }
    const s = input.stats.get(id);
    if (s?.hasWaitingCandidate) withCandidate++;
    else if (!s || s.passedHard === 0) noPassing++;
    else belowOnly++;
    void low;
  }
  return {
    eligibleProfiles: input.eligibleIds.length,
    blockedByCurrentProposalOrConnection: blockedCount,
    noPassingCandidate: noPassing,
    belowThresholdOnly: belowOnly,
    withAvailableCandidate: withCandidate,
    freeWithoutAvailableProposal: noPassing + belowOnly,
    stuckProposals: input.stuckProposals,
    newCandidatesCreated: input.newCandidatesCreated,
  };
}

export function formatMatchingHealthReport(r: MatchingHealthReport): string[] {
  return [
    `פרופילים פעילים וזכאים: ${r.eligibleProfiles}`,
    `חסומים כרגע (הצעה פעילה או קשר פעיל): ${r.blockedByCurrentProposalOrConnection}`,
    `פנויים עם מועמד/ת שממתינ/ה לאישור: ${r.withAvailableCandidate}`,
    `פנויים בלי הצעה זמינה: ${r.freeWithoutAvailableProposal} (אף זוג לא עבר פסילה קשיחה: ${r.noPassingCandidate}, רק מתחת לסף: ${r.belowThresholdOnly})`,
    `הצעות תקועות (פגו ולא נסגרו): ${r.stuckProposals}`,
    `מועמדים חדשים שנוצרו בהרצה: ${r.newCandidatesCreated}`,
  ];
}
