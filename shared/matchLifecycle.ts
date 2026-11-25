export type MatchLifecycleLike = {
  status: string;
  proposedAt?: number | null;
  approvalExpiresAt?: number | null;
  approvedByA?: boolean | null;
  approvedByB?: boolean | null;
  matchedAt?: number | null;
  contactRevealedAt?: number | null;
  returnedToPoolAt?: number | null;
  matchDetailStatus?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const PROPOSAL_WINDOW_MS = 48 * 60 * 60 * 1000;

function finiteTimestamp(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Enforceable proposal deadline. An explicit deadline always wins; the 48-hour
 * window is used only for a proposal with a usable proposedAt.
 */
export function getProposalDeadline(match: Pick<MatchLifecycleLike, "proposedAt" | "approvalExpiresAt">): number | null {
  const explicitDeadline = finiteTimestamp(match.approvalExpiresAt);
  if (explicitDeadline !== null) return explicitDeadline;
  const proposedAt = finiteTimestamp(match.proposedAt);
  return proposedAt === null ? null : proposedAt + PROPOSAL_WINDOW_MS;
}

/** True once the response window is over, whether or not the DB status was flipped yet. */
export function hasProposalWindowEnded(match: MatchLifecycleLike, now = Date.now()): boolean {
  const deadline = getProposalDeadline(match);
  return deadline !== null && now >= deadline;
}

export function hasMutualYes(match: MatchLifecycleLike): boolean {
  return Boolean(
    (match.approvedByA && match.approvedByB)
    || match.matchedAt
    || match.contactRevealedAt,
  );
}

export function isWaitingForMatchResponses(match: MatchLifecycleLike, now = Date.now()): boolean {
  return Boolean(match.proposedAt)
    && match.status === "proposed"
    && !match.returnedToPoolAt
    && !hasMutualYes(match)
    // A proposal whose response window is over has ended, even if the status is not updated yet.
    && !hasProposalWindowEnded(match, now);
}

export function isUnsuccessfulMatch(match: MatchLifecycleLike, now = Date.now()): boolean {
  return Boolean(match.proposedAt)
    && !hasMutualYes(match)
    && (
      match.status === "rejected"
      || match.status === "expired"
      || Boolean(match.returnedToPoolAt)
      || (match.status === "proposed" && hasProposalWindowEnded(match, now))
    );
}

export function getMatchTrackingSummary(match: MatchLifecycleLike, now = Date.now()) {
  const mutualYes = hasMutualYes(match);
  const startedAt = Number(match.matchedAt || match.contactRevealedAt || match.proposedAt || 0);
  const endedAt = Number(match.returnedToPoolAt || now);
  const daysInMatch = startedAt > 0 ? Math.max(0, Math.floor((endedAt - startedAt) / DAY_MS)) : 0;

  if (!mutualYes) {
    return { mutualYes: false, state: "not_mutual" as const, label: "לא נוצרה התאמה הדדית", daysInMatch };
  }
  if (match.returnedToPoolAt) {
    return { mutualYes: true, state: "released" as const, label: `חזרו למאגר אחרי ${daysInMatch} ימים`, daysInMatch };
  }

  const labels: Record<string, string> = {
    talking: "עדיין בקשר",
    dating: "יוצאים",
    met: "נפגשו",
    together: "בזוגיות",
    ended: "ההתאמה הסתיימה",
  };
  return {
    mutualYes: true,
    state: "active" as const,
    label: `${labels[match.matchDetailStatus || ""] || "עדיין בהתאמה"} · ${daysInMatch} ימים`,
    daysInMatch,
  };
}

export function getReleaseLifecycleUpdate(match: MatchLifecycleLike) {
  const mutualYes = hasMutualYes(match);
  return {
    status: mutualYes ? "matched" as const : "rejected" as const,
    matchDetailStatus: mutualYes ? "ended" as const : undefined,
  };
}
