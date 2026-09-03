import type { MatchOutcomeRecord, MatchParticipantFeedback } from "./matchOutcome";
import type { TestimonialProofType } from "./testimonialService";

const POSITIVE_PARTICIPANT_STATUSES = new Set(["date_scheduled", "met", "continuing", "relationship"]);
const POSITIVE_DETAIL_STATUSES = new Set(["dating", "met", "together"]);

export function isEligibleMatchCandidate(input: {
  detailStatus?: string | null;
  outcome: MatchOutcomeRecord;
  feedback?: MatchParticipantFeedback | null;
}): boolean {
  if (input.feedback?.status && POSITIVE_PARTICIPANT_STATUSES.has(input.feedback.status)) return true;
  return Boolean(input.outcome.adminVerifiedAt && input.detailStatus && POSITIVE_DETAIL_STATUSES.has(input.detailStatus));
}

export function matchCandidateProofType(input: {
  detailStatus?: string | null;
  feedback?: MatchParticipantFeedback | null;
}): TestimonialProofType {
  if (input.detailStatus === "together" || input.feedback?.status === "relationship") return "success";
  return "progress";
}

export function matchCandidateReason(input: {
  detailStatus?: string | null;
  feedback?: MatchParticipantFeedback | null;
}): string {
  if (input.feedback?.status === "relationship" || input.detailStatus === "together") return "קשר זוגי שדווח במערכת";
  if (input.feedback?.status === "continuing" || input.detailStatus === "dating") return "דווח שההיכרות ממשיכה";
  if (input.feedback?.status === "met" || input.detailStatus === "met") return "דווח שהתקיימה פגישה";
  return "דווח על דייט או התקדמות בהיכרות";
}
