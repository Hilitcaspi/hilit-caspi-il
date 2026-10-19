import { wasMatchProposalSent, type MatchDeliveryEvidence } from "./matchDelivery";
import { hasMutualYes, type MatchLifecycleLike } from "./matchLifecycle";

export const PROPOSAL_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * The match fields used to decide whether either participant is unavailable for
 * a new match. Consent timestamps are included because legacy `approvedBy* =
 * false` values are database defaults, not proof of a rejection by themselves.
 */
export type MatchAvailabilityMatch = MatchDeliveryEvidence & MatchLifecycleLike & {
  approvalExpiresAt?: number | null;
  singleAConsentAt?: number | null;
  singleBConsentAt?: number | null;
};

export type MatchAvailabilityReason =
  | "current_proposal"
  | "active_connection"
  | "expired_proposal"
  | "ended"
  | "returned"
  | "declined"
  | "unsent"
  | "needs_review"
  | "inactive";

export type MatchAvailability = {
  /** Whether this row prevents either participant from receiving a new match. */
  blocksNewMatch: boolean;
  reason: MatchAvailabilityReason;
  deadline: number | null;
};

function finiteTimestamp(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Returns the enforceable proposal deadline. An explicit deadline always wins;
 * the 48-hour window is used only for a proposal with a usable proposedAt.
 */
export function getProposalDeadline(match: MatchAvailabilityMatch): number | null {
  const explicitDeadline = finiteTimestamp(match.approvalExpiresAt);
  if (explicitDeadline !== null) return explicitDeadline;

  const proposedAt = finiteTimestamp(match.proposedAt);
  return proposedAt === null ? null : proposedAt + PROPOSAL_WINDOW_MS;
}

/**
 * A false approval flag is a legacy default unless token use proves that the
 * participant actually submitted a response.
 */
function hasConfirmedDecline(match: MatchAvailabilityMatch): boolean {
  return (match.approvedByA === false && Boolean(match.tokenAUsedAt))
    || (match.approvedByB === false && Boolean(match.tokenBUsedAt));
}

/**
 * Pure availability policy. It deliberately never infers that an otherwise
 * sent proposal ended when neither an expiry nor a proposedAt was recorded.
 */
export function getMatchAvailability(
  match: MatchAvailabilityMatch,
  now = Date.now(),
): MatchAvailability {
  const deadline = getProposalDeadline(match);
  // Explicit lifecycle closure always takes precedence over stale active flags.
  if (finiteTimestamp(match.returnedToPoolAt) !== null) {
    return { blocksNewMatch: false, reason: "returned", deadline };
  }
  if (match.matchDetailStatus === "ended") {
    return { blocksNewMatch: false, reason: "ended", deadline };
  }

  // A real connection remains active independently of the proposal window.
  if (match.status === "matched" || hasMutualYes(match)) {
    return { blocksNewMatch: true, reason: "active_connection", deadline };
  }

  if (hasConfirmedDecline(match)) {
    return { blocksNewMatch: false, reason: "declined", deadline };
  }

  if (match.status !== "proposed") {
    return { blocksNewMatch: false, reason: "inactive", deadline };
  }

  // proposedAt/status alone can come from candidate generation, not delivery.
  if (!wasMatchProposalSent(match)) {
    return { blocksNewMatch: false, reason: "unsent", deadline };
  }

  if (deadline === null) {
    return { blocksNewMatch: true, reason: "needs_review", deadline };
  }
  if (now >= deadline) {
    return { blocksNewMatch: false, reason: "expired_proposal", deadline };
  }

  return { blocksNewMatch: true, reason: "current_proposal", deadline };
}

/** Returns only the blocking facet of getMatchAvailability for exclusion code. */
export function isBlockingMatch(match: MatchAvailabilityMatch, now = Date.now()): boolean {
  return getMatchAvailability(match, now).blocksNewMatch;
}
