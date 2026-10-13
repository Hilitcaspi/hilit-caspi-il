import { wasMatchProposalSent, type MatchDeliveryEvidence } from "./matchDelivery";
import type { MatchLifecycleLike } from "./matchLifecycle";

const WINDOW_MS = 48 * 60 * 60 * 1000;
export const RESPONSE_FOLLOWUP_THRESHOLD = 3;
export type ResponseMatch = MatchDeliveryEvidence & MatchLifecycleLike & {
  id: number; singleAId: number; singleBId: number;
  approvalExpiresAt?: number | null;
  singleAConsent?: boolean | null; singleBConsent?: boolean | null;
  singleAConsentAt?: number | null; singleBConsentAt?: number | null;
};
export type ResponseDelivery = {
  matchId: number; singleId: number; status: string;
  acceptedAt?: number | null; attemptedAt?: number | null;
  attemptType?: string | null;
};
export type MatchResponseSummary = {
  deliveredCount: number; respondedCount: number; unansweredCount: number;
  waitingCount: number; closedBeforeDeadlineCount: number;
  consecutiveUnanswered: number; needsFollowup: boolean;
  lastDeliveredAt: number | null; lastRespondedAt: number | null;
};
export function hasParticipantResponded(match: ResponseMatch, side: "A" | "B"): boolean {
  const approved = side === "A" ? match.approvedByA : match.approvedByB;
  const usedAt = side === "A" ? match.tokenAUsedAt : match.tokenBUsedAt;
  const consent = side === "A" ? match.singleAConsent : match.singleBConsent;
  const consentAt = side === "A" ? match.singleAConsentAt : match.singleBConsentAt;
  // False is also the legacy database default: only token use proves a decline.
  return approved === true || Boolean(usedAt || consentAt || consent)
    || Boolean(match.matchedAt || match.contactRevealedAt || match.status === "matched");
}
/** Per-recipient, delivery-confirmed metrics. No writes or communication. */
export function buildMatchResponseSummaries(
  matches: readonly ResponseMatch[], deliveries: readonly ResponseDelivery[], now = Date.now(),
): Record<number, MatchResponseSummary> {
  const accepted = new Map<string, number>();
  for (const event of deliveries) {
    if (event.status !== "accepted" || event.attemptType === "followup") continue;
    const at = Number(event.acceptedAt || event.attemptedAt || 0);
    if (!at) continue;
    const key = `${event.matchId}:${event.singleId}`;
    accepted.set(key, Math.min(accepted.get(key) ?? at, at));
  }
  type Row = { at: number; responseAt: number | null; state: "responded" | "unanswered" | "waiting" | "closed" };
  const perSingle = new Map<number, Row[]>();
  for (const match of matches) {
    for (const side of ["A", "B"] as const) {
      const id = side === "A" ? match.singleAId : match.singleBId;
      const usedAt = side === "A" ? match.tokenAUsedAt : match.tokenBUsedAt;
      const consentAt = side === "A" ? match.singleAConsentAt : match.singleBConsentAt;
      const openedAt = side === "A" ? match.emailAOpenedAt : match.emailBOpenedAt;
      const responded = hasParticipantResponded(match, side);
      // Only this recipient's accepted delivery or personal response/open proves exposure.
      const acceptedAt = accepted.get(`${match.id}:${id}`);
      const exposureAt = Number(acceptedAt || usedAt || consentAt || openedAt || 0);
      if (!exposureAt && !responded) continue;
      if (!acceptedAt && !responded && !wasMatchProposalSent(match)) continue;
      const at = Number(match.proposedAt || exposureAt || match.matchedAt || match.contactRevealedAt || 0);
      if (!at) continue;
      const deadline = Number(match.approvalExpiresAt || (at + WINDOW_MS));
      const otherResponded = hasParticipantResponded(match, side === "A" ? "B" : "A");
      const otherApproved = side === "A" ? match.approvedByB : match.approvedByA;
      const otherUsedAt = side === "A" ? match.tokenBUsedAt : match.tokenAUsedAt;
      const closedEarly = Boolean(match.returnedToPoolAt && match.returnedToPoolAt < deadline)
        || Boolean(match.status === "rejected" && (
          // Without a timestamp proving a full response window, a manual or
          // legacy rejection must not become a customer non-response warning.
          !otherUsedAt || (otherResponded && otherApproved !== true && otherUsedAt < deadline)
        ));
      const state: Row["state"] = responded ? "responded" : closedEarly ? "closed" : now >= deadline ? "unanswered" : "waiting";
      const list = perSingle.get(id) || [];
      list.push({ at, responseAt: responded ? Number(usedAt || consentAt || match.matchedAt || match.contactRevealedAt || at) : null, state });
      perSingle.set(id, list);
    }
  }
  const result: Record<number, MatchResponseSummary> = {};
  for (const [id, rows] of Array.from(perSingle.entries())) {
    rows.sort((a, b) => b.at - a.at);
    let consecutiveUnanswered = 0;
    for (const row of rows) {
      if (row.state === "waiting" || row.state === "closed") continue;
      if (row.state === "responded") break;
      consecutiveUnanswered += 1;
    }
    const lastRespondedAt = Math.max(0, ...rows.map(row => row.responseAt || 0)) || null;
    // A late response to any old proposal also clears a stale current warning.
    if (lastRespondedAt && lastRespondedAt >= (rows.find(row => row.state === "unanswered")?.at || 0)) consecutiveUnanswered = 0;
    result[id] = {
      deliveredCount: rows.length, respondedCount: rows.filter(r => r.state === "responded").length,
      unansweredCount: rows.filter(r => r.state === "unanswered").length,
      waitingCount: rows.filter(r => r.state === "waiting").length,
      closedBeforeDeadlineCount: rows.filter(r => r.state === "closed").length,
      consecutiveUnanswered, needsFollowup: consecutiveUnanswered >= RESPONSE_FOLLOWUP_THRESHOLD,
      lastDeliveredAt: rows[0]?.at || null, lastRespondedAt,
    };
  }
  return result;
}
export function buildNonResponseFollowupMessage(firstName: string): string {
  return `היי ${firstName}, הילית כאן. ראיתי שכמה הצעות התאמה ששלחתי לאחרונה נשארו בלי תגובה, ורציתי לוודא שהן מגיעות אליך ושהכול נפתח כרגיל. גם תשובת ״לא״ עוזרת לי לדייק את ההצעות הבאות. אפשר להיכנס לאזור האישי דרך האתר ולבדוק את ההתאמות. אם יש קושי טכני או שההודעות לא מגיעות, אפשר להשיב לי כאן ואעזור.`;
}
