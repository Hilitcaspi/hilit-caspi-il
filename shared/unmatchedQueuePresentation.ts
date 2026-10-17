export type WaitingQueueProfile = {
  id: number;
  questionnaireCompletedAt?: number | null;
  createdAt?: number | null;
};

export type AcceptedDeliveryForQueue = {
  matchId: number;
  singleId: number;
  acceptedAt?: number | null;
};

export type QueueHistoryMatch = {
  id: number;
  singleAId: number;
  singleBId: number;
  status: string;
  score?: number | null;
  emailAOpenedAt?: number | null;
  emailBOpenedAt?: number | null;
  tokenAUsedAt?: number | null;
  tokenBUsedAt?: number | null;
  singleAConsentAt?: number | null;
  singleBConsentAt?: number | null;
};

export type QueueHistoryOpponent = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
};

export type QueueMatchHistoryItem = {
  matchId: number;
  opponentName: string;
  opponentPhotoUrl: string | null;
  sentAt: number;
  status: string;
  score: number | null;
  sourceLabel: string;
};

export const ACCEPTED_DELIVERY_SOURCE_LABEL = "מסירה מאומתת על ידי ספק";
export const LEGACY_PERSONAL_EVIDENCE_SOURCE_LABEL = "ראיית חשיפה/תגובה אישית היסטורית";
export const UNMATCHED_QUEUE_HISTORY_DISCLAIMER = "ההיסטוריה כוללת מסירות שאושרו על ידי ספק, ובנתונים ישנים רק ראיית חשיפה או תגובה המתועדת לאותו נמען. רשומות ללא ראיה אישית אינן מיוחסות לשני הצדדים.";

function timestampOrNull(value: number | null | undefined): number | null {
  const timestamp = Number(value || 0);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

/** Latest accepted provider delivery controls the recipient's queue waiting date. */
export function buildLastAcceptedDeliveryBySingle(
  deliveries: readonly AcceptedDeliveryForQueue[],
): Map<number, number> {
  const latestBySingle = new Map<number, number>();
  for (const delivery of deliveries) {
    const acceptedAt = timestampOrNull(delivery.acceptedAt);
    if (!acceptedAt) continue;
    const previous = latestBySingle.get(delivery.singleId) ?? 0;
    if (acceptedAt > previous) latestBySingle.set(delivery.singleId, acceptedAt);
  }
  return latestBySingle;
}

/**
 * Retains the queue's established fallback: questionnaire completion, then
 * profile creation. The optional clock keeps the all-missing-data edge stable
 * within one response and makes the policy unit-testable.
 */
export function getWaitingFrom(
  profile: WaitingQueueProfile,
  lastAcceptedDeliveryBySingle: ReadonlyMap<number, number>,
  now = Date.now(),
): number {
  return lastAcceptedDeliveryBySingle.get(profile.id)
    || Number(profile.questionnaireCompletedAt || profile.createdAt || now);
}

/** Queue priority is strictly longest waiting first; feedback never reorders it. */
export function sortWaitingProfilesByWaitingFrom<T extends WaitingQueueProfile>(
  profiles: readonly T[],
  lastAcceptedDeliveryBySingle: ReadonlyMap<number, number>,
  now = Date.now(),
): T[] {
  return [...profiles].sort((a, b) => {
    const waitingDifference = getWaitingFrom(a, lastAcceptedDeliveryBySingle, now)
      - getWaitingFrom(b, lastAcceptedDeliveryBySingle, now);
    return waitingDifference || a.id - b.id;
  });
}

function earliestLegacyPersonalEvidence(match: QueueHistoryMatch, side: "A" | "B"): number | null {
  const candidates = side === "A"
    ? [match.emailAOpenedAt, match.tokenAUsedAt, match.singleAConsentAt]
    : [match.emailBOpenedAt, match.tokenBUsedAt, match.singleBConsentAt];
  const timestamps = candidates
    .map(timestampOrNull)
    .filter((timestamp): timestamp is number => timestamp !== null);
  return timestamps.length > 0 ? Math.min(...timestamps) : null;
}

function displayOpponent(opponent: QueueHistoryOpponent | undefined) {
  const name = `${opponent?.firstName || ""} ${opponent?.lastName || ""}`.trim();
  return {
    opponentName: name || "פרופיל לא זמין",
    opponentPhotoUrl: opponent?.photoUrl || null,
  };
}

/**
 * Builds one deduplicated history record per match and recipient. Provider
 * acceptance is recipient-specific; legacy rows are included only when that
 * same participant has a timestamped open or response, never because the
 * opposite participant was delivered to or interacted with a proposal.
 */
export function buildRecipientMatchHistory(
  matches: readonly QueueHistoryMatch[],
  acceptedDeliveries: readonly AcceptedDeliveryForQueue[],
  opponentsById: ReadonlyMap<number, QueueHistoryOpponent>,
  recipientIds: ReadonlySet<number>,
): Map<number, QueueMatchHistoryItem[]> {
  const earliestAcceptedByMatchAndRecipient = new Map<string, number>();
  for (const delivery of acceptedDeliveries) {
    const acceptedAt = timestampOrNull(delivery.acceptedAt);
    if (!acceptedAt) continue;
    const key = `${delivery.matchId}:${delivery.singleId}`;
    const previous = earliestAcceptedByMatchAndRecipient.get(key);
    if (!previous || acceptedAt < previous) {
      earliestAcceptedByMatchAndRecipient.set(key, acceptedAt);
    }
  }

  const historyByRecipient = new Map<number, QueueMatchHistoryItem[]>();
  for (const match of matches) {
    for (const side of ["A", "B"] as const) {
      const recipientId = side === "A" ? match.singleAId : match.singleBId;
      if (!recipientIds.has(recipientId)) continue;

      const acceptedAt = earliestAcceptedByMatchAndRecipient.get(`${match.id}:${recipientId}`);
      const legacyEvidenceAt = acceptedAt ? null : earliestLegacyPersonalEvidence(match, side);
      const sentAt = acceptedAt || legacyEvidenceAt;
      if (!sentAt) continue;

      const opponentId = side === "A" ? match.singleBId : match.singleAId;
      const opponent = displayOpponent(opponentsById.get(opponentId));
      const entry: QueueMatchHistoryItem = {
        matchId: match.id,
        ...opponent,
        sentAt,
        status: match.status,
        score: match.score ?? null,
        sourceLabel: acceptedAt ? ACCEPTED_DELIVERY_SOURCE_LABEL : LEGACY_PERSONAL_EVIDENCE_SOURCE_LABEL,
      };
      const history = historyByRecipient.get(recipientId) ?? [];
      history.push(entry);
      historyByRecipient.set(recipientId, history);
    }
  }

  for (const history of Array.from(historyByRecipient.values())) {
    history.sort((a: QueueMatchHistoryItem, b: QueueMatchHistoryItem) => b.sentAt - a.sentAt || b.matchId - a.matchId);
  }
  return historyByRecipient;
}

export function normalizeQueueEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}
