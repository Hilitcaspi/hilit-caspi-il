import { hasPreviouslyActivatedPlus } from "./plusWednesdayOffer";

/**
 * Post-event checkout offers approved on 31 October 2026. These are service
 * entitlements only: neither code changes a product price or activates a
 * global discount-coupon row.
 */
export const LIVE_POST_OFFER_START = Date.parse("2026-10-31T21:30:00+02:00");
export const LIVE_POST_OFFER_END = Date.parse("2026-11-02T00:00:00+02:00");
export const LIVE_POST_DATABASE_CODE = "LIVE48" as const;
export const LIVE_POST_PLUS_CODE = "LIVEPLUS" as const;
export const LIVE_POST_PLUS_COHORT = "live_post_2026_10_31" as const;
export const LIVE_POST_PLUS_FIRST_CYCLE_TARGET = 3;
export const LIVE_POST_STANDARD_CYCLE_TARGET = 2;
export const LIVE_POST_PLUS_UTM_TERM_MARKER = "BONUS:LIVEPLUS3" as const;
export const LIVE_POST_FIRST_MATCH_SLA_MS = 48 * 60 * 60 * 1000;

const UTM_TERM_MAX_LENGTH = 200;

export type LivePostOfferCode = typeof LIVE_POST_DATABASE_CODE | typeof LIVE_POST_PLUS_CODE;

type PriorPlusMember = {
  activatedAt?: number | null;
  status?: string | null;
  billingStatus?: string | null;
  lastPaymentTransactionId?: string | null;
  lastPaymentAt?: number | null;
} | null | undefined;

export type LivePostOfferTicket = {
  eventSlug?: string | null;
  email?: string | null;
  revokedAt?: number | null;
  voucherCode?: string | null;
  singleId?: number | null;
} | null | undefined;

export function normalizeLivePostOfferEmail(email: string | null | undefined) {
  return String(email || "").trim().toLowerCase();
}

export function isLivePostOfferCode(value: string | null | undefined): value is LivePostOfferCode {
  const code = String(value || "").trim().toUpperCase();
  return code === LIVE_POST_DATABASE_CODE || code === LIVE_POST_PLUS_CODE;
}

/** The end is exclusive: 02.11.2026 00:00 Israel time is not eligible. */
export function isLivePostOfferPaymentTime(paidAt: number) {
  return Number.isFinite(paidAt) && paidAt >= LIVE_POST_OFFER_START && paidAt < LIVE_POST_OFFER_END;
}

/** A ticket is scoped to the real October event and cannot be revived after revocation. */
export function isLivePostOfferTicket(ticket: LivePostOfferTicket, checkoutEmail: string) {
  return Boolean(
    ticket
    && ticket.eventSlug === "matching-secrets-2026-10-31"
    && normalizeLivePostOfferEmail(ticket.email) === normalizeLivePostOfferEmail(checkoutEmail)
    && !ticket.revokedAt
    && !String(ticket.voucherCode || "").startsWith("TEST-"),
  );
}

/**
 * The caller must first verify the actual membership's personal token. An
 * email-matched open ticket can be unlinked, but a ticket linked to another
 * account is never accepted. A bare matching email alone is insufficient.
 */
export function isLivePostOfferAccountTicket(ticket: LivePostOfferTicket, checkoutEmail: string, singleId?: number | null) {
  if (!isLivePostOfferTicket(ticket, checkoutEmail)) return false;
  return Boolean(singleId && Number(singleId) > 0 && (!ticket?.singleId || Number(ticket.singleId) === Number(singleId)));
}

export function hasLivePostPlusOfferMarker(utmTerm: string | null | undefined) {
  return String(utmTerm || "")
    .split("|")
    .map(value => value.trim())
    .includes(LIVE_POST_PLUS_UTM_TERM_MARKER);
}

/** Removes only the private offer proof and leaves marketing attribution intact. */
export function stripLivePostPlusOfferMarker(utmTerm: string | null | undefined) {
  return String(utmTerm || "")
    .split("|")
    .filter(value => value.trim() !== LIVE_POST_PLUS_UTM_TERM_MARKER)
    .join("|")
    .trim();
}

/** Fails closed rather than dropping marketing attribution from the fixed column. */
export function appendLivePostPlusOfferMarker(utmTerm: string | null | undefined) {
  const existing = String(utmTerm || "").trim();
  if (hasLivePostPlusOfferMarker(existing)) return existing;
  const combined = existing ? `${existing}|${LIVE_POST_PLUS_UTM_TERM_MARKER}` : LIVE_POST_PLUS_UTM_TERM_MARKER;
  if (combined.length > UTM_TERM_MAX_LENGTH) {
    throw new Error("לא ניתן לשמור את ראיית ההטבה בלי לדרוס את מקור השיווק. יש לקצר את utm_term ולנסות שוב.");
  }
  return combined;
}

/** Rechecks persisted proof against verified payment evidence during fulfilment. */
export function qualifiesForLivePostPlusOffer(input: {
  utmTerm?: string | null;
  paidAt?: number | null;
  amountAgorot?: number | null;
  existingMember?: PriorPlusMember;
  verifiedTicket: boolean;
}) {
  return hasLivePostPlusOfferMarker(input.utmTerm)
    && isLivePostOfferPaymentTime(Number(input.paidAt || 0))
    && Number(input.amountAgorot || 0) === 9900
    && input.verifiedTicket
    && !hasPreviouslyActivatedPlus(input.existingMember);
}

export function isLivePostPlusOfferCohort(pilotCohort: string | null | undefined) {
  return pilotCohort === LIVE_POST_PLUS_COHORT;
}

/** Only cycle zero receives the approved third manual proposal. */
export function getLivePostPlusCycleTarget(
  pilotCohort: string | null | undefined,
  cycleIndex: number,
  configuredTarget: number | null | undefined,
) {
  if (isLivePostPlusOfferCohort(pilotCohort)) {
    return cycleIndex === 0 ? LIVE_POST_PLUS_FIRST_CYCLE_TARGET : LIVE_POST_STANDARD_CYCLE_TARGET;
  }
  return Math.max(1, Number(configuredTarget || LIVE_POST_STANDARD_CYCLE_TARGET));
}

export type LivePostFirstMatchPolicyInput = {
  paidAt: number;
  hasProfile: boolean;
  hasCompleteProfile: boolean;
  hasPhoto: boolean;
  questionnaireCompletedAt: number | null;
  isPaid: boolean;
  isActive: boolean;
  isSeed: boolean;
  firstProposalDeliveredAt: number | null;
  /** A current, actually-sent proposal is never proof of a second fulfilment. */
  hasActiveMatchHold?: boolean;
};

export type LivePostFirstMatchQueueState = "awaiting_profile" | "ready" | "fulfilled" | "overdue" | "needs_review";

/**
 * Read-only SLA evaluation. The deadline is the verified payment instant plus
 * 48 elapsed hours. An incomplete profile never becomes a claimed fulfilment;
 * it stays visible for staff rather than inventing a profile-ready timestamp
 * that the current schema does not store.
 */
export function evaluateLivePostFirstMatchPolicy(input: LivePostFirstMatchPolicyInput, now = Date.now()) {
  const profileRequirementsMissing: Array<"profile" | "photo" | "questionnaire"> = [];
  if (!input.hasProfile || !input.hasCompleteProfile) profileRequirementsMissing.push("profile");
  if (!input.hasPhoto) profileRequirementsMissing.push("photo");
  if (!input.questionnaireCompletedAt) profileRequirementsMissing.push("questionnaire");
  const eligibilityIssues: Array<"unpaid" | "inactive" | "seed"> = [];
  if (!input.isPaid) eligibilityIssues.push("unpaid");
  if (!input.isActive) eligibilityIssues.push("inactive");
  if (input.isSeed) eligibilityIssues.push("seed");
  const dueAt = Number(input.paidAt || 0) + LIVE_POST_FIRST_MATCH_SLA_MS;

  let state: LivePostFirstMatchQueueState;
  if (input.firstProposalDeliveredAt) state = "fulfilled";
  else if (eligibilityIssues.length > 0 || input.hasActiveMatchHold) state = "needs_review";
  else if (profileRequirementsMissing.length > 0) state = "awaiting_profile";
  else if (!Number.isFinite(dueAt) || dueAt <= now) state = "overdue";
  else state = "ready";

  return {
    state,
    dueAt,
    isOverdue: state === "overdue",
    profileRequirementsMissing,
    eligibilityIssues,
    canPrepareProposal: state === "ready",
  } as const;
}
