export const LIVE_FIRST_MATCH_OFFER_ENABLED = true;
/** Staff-facing draft: this code never publishes a promise or sends a proposal. */
export const LIVE_FIRST_MATCH_POLICY_STATUS = "draft" as const;
/** Public deadline copy stays off until the owner approves staffing/capacity and the final campaign. */
export const LIVE_FIRST_MATCH_PUBLIC_PROMISE_ENABLED = false;
export const LIVE_FIRST_MATCH_OFFER_START = Date.parse("2026-10-14T14:48:00.000Z");
export const LIVE_FIRST_MATCH_EVENT_START = Date.parse("2026-10-31T18:30:00.000Z");
/** No new live-benefit ticket is eligible once the event starts. */
export const LIVE_FIRST_MATCH_OFFER_END = LIVE_FIRST_MATCH_EVENT_START;
// Sunday 1.11 and Monday 2.11 are the two Israeli business days after the Saturday live.
export const LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE = Date.parse("2026-11-02T21:59:59.000Z");

export type LiveFirstMatchQueueState = "awaiting_profile" | "ready" | "fulfilled" | "overdue" | "needs_review";

export type LiveFirstMatchPolicyInput = {
  hasProfile: boolean;
  hasCompleteProfile: boolean;
  hasPhoto: boolean;
  questionnaireCompletedAt: number | null;
  isPaid: boolean;
  isActive: boolean;
  isSeed: boolean;
  /** A genuinely accepted delivery for this participant after verified paid registration. */
  firstProposalDeliveredAt: number | null;
  /** A current, actually-sent proposal or mutual match that needs staff review. */
  hasActiveMatchHold: boolean;
};

export type LiveFirstMatchPolicyResult = {
  state: LiveFirstMatchQueueState;
  originalPromiseDeadline: number;
  isOverdue: boolean;
  profileRequirementsMissing: Array<"profile" | "photo" | "questionnaire">;
  completedAfterLive: boolean;
  eligibilityIssues: Array<"unpaid" | "inactive" | "seed">;
  needsReview: boolean;
  canPrepareProposal: boolean;
};

/**
 * Read-only policy for the prospective 31.10.2026 live benefit.
 *
 * The customer-facing promise remains the original Monday 2.11 deadline. A
 * later questionnaire completion never moves that deadline: it is surfaced as
 * a separate review condition. A photo has no historical upload timestamp in
 * the current schema, so its current presence is checked here while the queue
 * remains staff-only and never sends a proposal automatically.
 */
export function evaluateLiveFirstMatchPolicy(
  input: LiveFirstMatchPolicyInput,
  now = Date.now(),
): LiveFirstMatchPolicyResult {
  const profileRequirementsMissing: LiveFirstMatchPolicyResult["profileRequirementsMissing"] = [];
  if (!input.hasProfile || !input.hasCompleteProfile) profileRequirementsMissing.push("profile");
  if (!input.hasPhoto) profileRequirementsMissing.push("photo");
  if (!input.questionnaireCompletedAt) profileRequirementsMissing.push("questionnaire");

  const eligibilityIssues: LiveFirstMatchPolicyResult["eligibilityIssues"] = [];
  if (!input.isPaid) eligibilityIssues.push("unpaid");
  if (!input.isActive) eligibilityIssues.push("inactive");
  if (input.isSeed) eligibilityIssues.push("seed");

  const completedAfterLive = Boolean(
    input.questionnaireCompletedAt && input.questionnaireCompletedAt > LIVE_FIRST_MATCH_EVENT_START,
  );
  const isOverdue = !input.firstProposalDeliveredAt && now > LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE;
  const needsReview = completedAfterLive || input.hasActiveMatchHold || eligibilityIssues.length > 0;

  let state: LiveFirstMatchQueueState;
  if (input.firstProposalDeliveredAt) state = "fulfilled";
  // Never make an expired promise disappear merely because the profile is incomplete or late.
  else if (isOverdue) state = "overdue";
  else if (needsReview) state = "needs_review";
  else if (profileRequirementsMissing.length > 0) state = "awaiting_profile";
  else state = "ready";

  return {
    state,
    originalPromiseDeadline: LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE,
    isOverdue,
    profileRequirementsMissing,
    completedAfterLive,
    eligibilityIssues,
    needsReview,
    canPrepareProposal: state === "ready",
  };
}
