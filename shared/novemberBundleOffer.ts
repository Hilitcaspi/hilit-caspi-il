/**
 * November 2026 IL database + full-course bundle.
 *
 * These dates are explicitly Israel local time. The offer gate applies only to
 * opening new checkout processes; verified payments created while it was open
 * remain fulfillable after the public window has closed.
 */
export const NOVEMBER_BUNDLE_PRODUCT = "bundle_november" as const;
export const NOVEMBER_BUNDLE_PRICE = 349;
export const NOVEMBER_BUNDLE_STARTS_AT = Date.parse("2026-11-01T00:00:00+02:00");
export const NOVEMBER_BUNDLE_EXPIRES_AT = Date.parse("2026-12-01T00:00:00+02:00");

/** The first-match service clock starts only after payment and real readiness. */
export const FIRST_MATCH_DAYS = 3;

export function isNovemberBundleOfferActive(now = Date.now()): boolean {
  return Number.isFinite(now)
    && now >= NOVEMBER_BUNDLE_STARTS_AT
    && now < NOVEMBER_BUNDLE_EXPIRES_AT;
}

export type NovemberBundleFirstMatchQueueState =
  | "awaiting_profile"
  | "ready"
  | "fulfilled"
  | "overdue"
  | "needs_review";

export type NovemberBundleFirstMatchPolicyInput = {
  paidAt: number;
  /** Stable evidence set only when the scientific questionnaire is completed. */
  questionnaireCompletedAt: number | null;
  hasAllProfileRequirements: boolean;
  /**
   * Current completeness was modified after the payment/questionnaire bound,
   * but no immutable timestamp proves when it first became fully ready.
   */
  readinessTimestampNeedsReview?: boolean;
  isPaid: boolean;
  isActive: boolean;
  isSeed: boolean;
  firstProposalDeliveredAt: number | null;
  /** A genuinely sent proposal/mutual match needs staff review, never auto-send. */
  hasActiveMatchHold?: boolean;
  profileRequirementsMissing: string[];
};

/**
 * End-exclusive deadline for the third full Israel calendar day after readiness.
 * A member ready on 1 November has 2, 3 and 4 November available; the deadline
 * is 5 November at 00:00 Israel time. The campaign and its expected late
 * completions occur in Israel standard time (+02:00), so this deliberately
 * avoids converting a calendar promise into a 72-hour duration.
 */
export function novemberBundleFirstMatchDueAt(readyAt: number): number | null {
  if (!Number.isFinite(readyAt) || readyAt <= 0) return null;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(readyAt))
    .filter(part => part.type !== "literal")
    .map(part => [part.type, part.value]));
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  if (!year || !month || !day) return null;
  const target = new Date(Date.UTC(year, month - 1, day + FIRST_MATCH_DAYS + 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = String(target.getUTCMonth() + 1).padStart(2, "0");
  const targetDay = String(target.getUTCDate()).padStart(2, "0");
  return Date.parse(`${targetYear}-${targetMonth}-${targetDay}T00:00:00+02:00`);
}

/**
 * Read-only service policy. `readyAt` is intentionally derived from the paid
 * receipt and questionnaire completion—not `singles.updatedAt`, which changes
 * for ordinary profile edits and would incorrectly extend the commitment. A
 * later mutable update can only require a manual timestamp review; it is never
 * adopted as a replacement clock start.
 */
export function evaluateNovemberBundleFirstMatchPolicy(
  input: NovemberBundleFirstMatchPolicyInput,
  now = Date.now(),
) {
  const inferredReadyAt = input.hasAllProfileRequirements
    && Number.isFinite(input.paidAt)
    && input.paidAt > 0
    && Number.isFinite(input.questionnaireCompletedAt)
    && Number(input.questionnaireCompletedAt) > 0
    ? Math.max(input.paidAt, Number(input.questionnaireCompletedAt))
    : null;
  const readinessTimestampNeedsReview = inferredReadyAt !== null
    && input.readinessTimestampNeedsReview === true;
  const readyAt = readinessTimestampNeedsReview ? null : inferredReadyAt;
  const dueAt = readyAt === null ? null : novemberBundleFirstMatchDueAt(readyAt);
  const eligibilityIssues: Array<"unpaid" | "inactive" | "seed" | "readiness_time"> = [];
  if (!input.isPaid) eligibilityIssues.push("unpaid");
  if (!input.isActive) eligibilityIssues.push("inactive");
  if (input.isSeed) eligibilityIssues.push("seed");
  if (readinessTimestampNeedsReview) eligibilityIssues.push("readiness_time");

  let state: NovemberBundleFirstMatchQueueState;
  if (readinessTimestampNeedsReview) state = "needs_review";
  else if (input.firstProposalDeliveredAt) state = "fulfilled";
  else if (eligibilityIssues.length > 0 || input.hasActiveMatchHold) state = "needs_review";
  else if (readyAt === null || input.profileRequirementsMissing.length > 0) state = "awaiting_profile";
  else if (dueAt !== null && now >= dueAt) state = "overdue";
  else state = "ready";

  return {
    state,
    readyAt,
    dueAt,
    profileRequirementsMissing: input.profileRequirementsMissing,
    eligibilityIssues,
    canPrepareProposal: state === "ready",
  } as const;
}
