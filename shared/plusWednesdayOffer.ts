export const PLUS_WEDNESDAY_OFFER_CODE = "PLUS" as const;
export const PLUS_WEDNESDAY_COHORT = "plus_wednesday_2026" as const;
export const PLUS_WEDNESDAY_FIRST_CYCLE_TARGET = 3;
export const PLUS_STANDARD_CYCLE_TARGET = 2;
export const PLUS_WEDNESDAY_OFFER_CUTOFF_AT = Date.parse("2026-10-14T14:48:00Z");
// Keep the persisted internal marker stable across the public code rename.
export const PLUS_WEDNESDAY_OFFER_UTM_TERM_MARKER = "BONUS:PLUS3" as const;
export const PLUS_CURRENT_OFFER_EXPIRES_AT = Date.parse("2026-10-18T00:00:00+03:00");
export function isPlusBonusCouponCode(value: string | null | undefined) {
  return ["PLUS", "PLUS3"].includes(String(value || "").trim().toUpperCase());
}
const LEGACY_PLUS_THIRD_PROPOSAL_COHORT = "plus_launch_sep26";

const ISRAEL_TIME_ZONE = "Asia/Jerusalem";
const UTM_TERM_MAX_LENGTH = 200;

type PriorPlusMember = {
  activatedAt?: number | null;
  status?: string | null;
  billingStatus?: string | null;
  lastPaymentTransactionId?: string | null;
  lastPaymentAt?: number | null;
} | null | undefined;

/** Uses Israel local time, rather than the server's timezone or UTC weekday. */
export function isIsraelWednesday(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: ISRAEL_TIME_ZONE,
  }).format(new Date(timestamp)) === "Wed";
}

export function isPlusWednesdayOfferPaymentTime(paidAt: number) {
  return Number.isFinite(paidAt)
    && paidAt > PLUS_WEDNESDAY_OFFER_CUTOFF_AT
    && (paidAt < PLUS_CURRENT_OFFER_EXPIRES_AT || isIsraelWednesday(paidAt));
}

/** A waitlist/invited row is not a prior subscription; an activated or billed row is. */
export function hasPreviouslyActivatedPlus(member: PriorPlusMember) {
  if (!member) return false;
  return Number(member.activatedAt || 0) > 0
    || Number(member.lastPaymentAt || 0) > 0
    || Boolean(member.lastPaymentTransactionId)
    || ["active", "churned"].includes(String(member.status || ""))
    || ["active", "past_due", "cancelled", "ended"].includes(String(member.billingStatus || ""));
}

export function hasPlusWednesdayOfferMarker(utmTerm: string | null | undefined) {
  return String(utmTerm || "")
    .split("|")
    .map(value => value.trim())
    .includes(PLUS_WEDNESDAY_OFFER_UTM_TERM_MARKER);
}

/** Removes only the reserved bonus segment; all other marketing attribution is retained verbatim. */
export function stripPlusWednesdayOfferMarker(utmTerm: string | null | undefined) {
  return String(utmTerm || "")
    .split("|")
    .filter(value => value.trim() !== PLUS_WEDNESDAY_OFFER_UTM_TERM_MARKER)
    .join("|")
    .trim();
}

/**
 * Keeps any existing term attribution and appends a machine-readable bonus marker.
 * Failing closed avoids silently dropping a full marketing term in the fixed 200-char column.
 */
export function appendPlusWednesdayOfferMarker(utmTerm: string | null | undefined) {
  const existing = String(utmTerm || "").trim();
  if (hasPlusWednesdayOfferMarker(existing)) return existing;
  const combined = existing
    ? `${existing}|${PLUS_WEDNESDAY_OFFER_UTM_TERM_MARKER}`
    : PLUS_WEDNESDAY_OFFER_UTM_TERM_MARKER;
  if (combined.length > UTM_TERM_MAX_LENGTH) {
    throw new Error("לא ניתן לשמור את ראיית ההטבה בלי לדרוס את מקור השיווק. יש לקצר את utm_term ולנסות שוב.");
  }
  return combined;
}

export function canApplyPlusWednesdayOfferCoupon(input: {
  couponCode?: string | null;
  paidAt: number;
  existingMember?: PriorPlusMember;
}) {
  return isPlusBonusCouponCode(input.couponCode)
    && isPlusWednesdayOfferPaymentTime(input.paidAt)
    && !hasPreviouslyActivatedPlus(input.existingMember);
}

/** Rechecks persisted evidence against the verified payment time during fulfilment. */
export function qualifiesForPlusWednesdayOffer(input: {
  utmTerm?: string | null;
  paidAt?: number | null;
  amountAgorot?: number | null;
  existingMember?: PriorPlusMember;
}) {
  return hasPlusWednesdayOfferMarker(input.utmTerm)
    && isPlusWednesdayOfferPaymentTime(Number(input.paidAt || 0))
    && Number(input.amountAgorot || 0) === 9900
    && !hasPreviouslyActivatedPlus(input.existingMember);
}

export function isPlusWednesdayOfferCohort(pilotCohort: string | null | undefined) {
  return pilotCohort === PLUS_WEDNESDAY_COHORT;
}

/** Only the original 30-day service period gets the third manual proposal. */
export function getPlusWednesdayCycleTarget(
  pilotCohort: string | null | undefined,
  cycleIndex: number,
  configuredTarget: number | null | undefined,
) {
  if (pilotCohort === LEGACY_PLUS_THIRD_PROPOSAL_COHORT || isPlusWednesdayOfferCohort(pilotCohort)) {
    return cycleIndex === 0 ? PLUS_WEDNESDAY_FIRST_CYCLE_TARGET : PLUS_STANDARD_CYCLE_TARGET;
  }
  return Math.max(1, Number(configuredTarget || PLUS_STANDARD_CYCLE_TARGET));
}

/** Public only: no account-level eligibility is exposed before the server validates checkout. */
export function getPlusWednesdayOfferPublicStatus(now = Date.now()) {
  return {
    available: isPlusWednesdayOfferPaymentTime(now),
    code: PLUS_WEDNESDAY_OFFER_CODE,
    firstCycleTarget: PLUS_WEDNESDAY_FIRST_CYCLE_TARGET,
    currentCampaignExpiresAt: PLUS_CURRENT_OFFER_EXPIRES_AT,
    timezone: ISRAEL_TIME_ZONE,
  } as const;
}
