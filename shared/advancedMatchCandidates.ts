import { wasMatchProposalSent, type MatchDeliveryEvidence } from "./matchDelivery";
import { hasMutualYes, type MatchLifecycleLike } from "./matchLifecycle";

const PROPOSAL_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * The subset of a match row used when building Advanced Match candidates.
 * Delivery evidence is deliberately kept separate from lifecycle timestamps:
 * generated rows may have a `proposedAt` before a customer-facing proposal
 * was ever sent.
 */
export type AdvancedMatchCandidateMatch = MatchDeliveryEvidence & MatchLifecycleLike & {
  singleAId: number;
  singleBId: number;
  approvalExpiresAt?: number | null;
};

export type AdvancedMatchExclusions = {
  /** Singles occupied by a current sent proposal or an active mutual match. */
  unavailableIds: Set<number>;
  /** Partners a particular target has already received a real proposal for. */
  previousPartnerIds: Set<number>;
};

export type AdvancedMatchCandidateSingle = {
  id: number;
  isActive?: boolean | null;
  isSeed?: boolean | null;
};

export type SentMatchHistoryRecord<T extends AdvancedMatchCandidateMatch = AdvancedMatchCandidateMatch> = T & {
  opponentId: number;
};

function hasBeenReturnedOrEnded(match: AdvancedMatchCandidateMatch): boolean {
  return Boolean(match.returnedToPoolAt) || match.matchDetailStatus === "ended";
}

function proposalExpiresAt(match: AdvancedMatchCandidateMatch): number | null {
  if (typeof match.approvalExpiresAt === "number") return match.approvalExpiresAt;
  if (typeof match.proposedAt === "number") return match.proposedAt + PROPOSAL_WINDOW_MS;
  return null;
}

function isCurrentSentProposal(match: AdvancedMatchCandidateMatch, now: number): boolean {
  if (match.status !== "proposed" || !wasMatchProposalSent(match)) return false;
  if (hasBeenReturnedOrEnded(match) || hasMutualYes(match)) return false;
  if (match.approvedByA === false || match.approvedByB === false) return false;

  const expiresAt = proposalExpiresAt(match);
  return expiresAt !== null && now < expiresAt;
}

function isActiveMutualMatch(match: AdvancedMatchCandidateMatch): boolean {
  if (hasBeenReturnedOrEnded(match)) return false;
  return match.status === "matched" || hasMutualYes(match);
}

/**
 * Returns only proposals that have actual customer-facing delivery evidence.
 * `opponentId` is oriented to `singleId`, so callers need not rely on stored
 * A/B order. Pending/generated rows with only lifecycle timestamps are omitted.
 */
export function sentMatchHistoryForSingle<T extends AdvancedMatchCandidateMatch>(
  matches: readonly T[],
  singleId: number,
): Array<SentMatchHistoryRecord<T>> {
  return matches.flatMap((match) => {
    if (!wasMatchProposalSent(match)) return [];
    if (match.singleAId === singleId) return [{ ...match, opponentId: match.singleBId }];
    if (match.singleBId === singleId) return [{ ...match, opponentId: match.singleAId }];
    return [];
  });
}

/**
 * Builds candidate exclusions without mutating match rows. Unavailability is
 * global (and therefore still useful without a target); prior partners are
 * meaningful only when a target is supplied.
 */
export function buildAdvancedMatchExclusions(
  matches: readonly AdvancedMatchCandidateMatch[],
  targetId?: number,
  now = Date.now(),
): AdvancedMatchExclusions {
  const unavailableIds = new Set<number>();

  for (const match of matches) {
    if (!isActiveMutualMatch(match) && !isCurrentSentProposal(match, now)) continue;
    unavailableIds.add(match.singleAId);
    unavailableIds.add(match.singleBId);
  }

  const previousPartnerIds = targetId === undefined
    ? new Set<number>()
    : new Set(sentMatchHistoryForSingle(matches, targetId).map((match) => match.opponentId));

  return { unavailableIds, previousPartnerIds };
}

/**
 * Applies Advanced Match's availability and history rules to one single.
 * Gender is intentionally not considered here: the main matching flow owns
 * compatibility filtering and supports same-sex matches.
 */
export function isAdvancedMatchCandidate(
  single: AdvancedMatchCandidateSingle,
  exclusions: AdvancedMatchExclusions,
  targetId?: number,
): boolean {
  return single.isActive !== false
    && single.isSeed !== true
    && single.id !== targetId
    && !exclusions.unavailableIds.has(single.id)
    && !exclusions.previousPartnerIds.has(single.id);
}
