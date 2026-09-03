export type MatchLifecycleLike = {
  status: string;
  proposedAt?: number | null;
  approvedByA?: boolean | null;
  approvedByB?: boolean | null;
  matchedAt?: number | null;
  contactRevealedAt?: number | null;
  returnedToPoolAt?: number | null;
  matchDetailStatus?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function hasMutualYes(match: MatchLifecycleLike): boolean {
  return Boolean(
    (match.approvedByA && match.approvedByB)
    || match.matchedAt
    || match.contactRevealedAt,
  );
}

export function isWaitingForMatchResponses(match: MatchLifecycleLike): boolean {
  return Boolean(match.proposedAt) && match.status === "proposed" && !match.returnedToPoolAt && !hasMutualYes(match);
}

export function isUnsuccessfulMatch(match: MatchLifecycleLike): boolean {
  return Boolean(match.proposedAt)
    && !hasMutualYes(match)
    && (match.status === "rejected" || match.status === "expired" || Boolean(match.returnedToPoolAt));
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
