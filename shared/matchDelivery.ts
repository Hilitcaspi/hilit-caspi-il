export type MatchDeliveryEvidence = {
  status?: string | null;
  ownerApprovedAt?: number | null;
  approvalTokenA?: string | null;
  approvalTokenB?: string | null;
  singleAToken?: string | null;
  singleBToken?: string | null;
  emailAOpenedAt?: number | null;
  emailBOpenedAt?: number | null;
  tokenAUsedAt?: number | null;
  tokenBUsedAt?: number | null;
  approvedByA?: boolean | null;
  approvedByB?: boolean | null;
  emailRetriedAt?: number | null;
  waSentAt?: number | null;
  notes?: string | null;
};

const LEGACY_SENT_MARKER = "נשלחה בעבר";

/**
 * A match row can exist before any customer-facing proposal is sent. Candidate
 * generation used to populate proposedAt early, so proposedAt/status alone are
 * not reliable delivery evidence. This function intentionally relies only on
 * tokens, responses, delivery/open tracking, owner approval, or the explicit
 * legacy "sent previously" marker.
 */
export function wasMatchProposalSent(match: MatchDeliveryEvidence): boolean {
  return Boolean(
    match.status === "matched"
    || match.ownerApprovedAt
    || match.approvalTokenA
    || match.approvalTokenB
    || match.singleAToken
    || match.singleBToken
    || match.emailAOpenedAt
    || match.emailBOpenedAt
    || match.tokenAUsedAt
    || match.tokenBUsedAt
    || match.approvedByA === true
    || match.approvedByB === true
    || match.emailRetriedAt
    || match.waSentAt
    || String(match.notes || "").includes(LEGACY_SENT_MARKER)
  );
}
