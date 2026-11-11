import type { Match } from "../drizzle/schema";
import type { MatchSmsLinkPreference } from "./matchSmsPreferences";

export type MatchSmsLinkState = Pick<Match,
  "singleAId" | "singleBId" | "approvalTokenA" | "approvalTokenB" | "ownerApprovalToken"
  | "tokenAUsedAt" | "tokenBUsedAt" | "approvedByA" | "approvedByB" | "approvalExpiresAt"
  | "proposedAt" | "ownerApprovedAt" | "status" | "autoExplanation" | "notes" | "returnedToPoolAt">;

/** No response parameter: visiting the existing page only reads match details. */
export function buildMatchSmsResponseLink(
  match: MatchSmsLinkState,
  side: "A" | "B",
  singleId: number,
  preference: MatchSmsLinkPreference,
  now = Date.now(),
): string | null {
  if (!preference.enabled || preference.effectiveFrom == null
      || !Number.isSafeInteger(preference.effectiveFrom) || preference.effectiveFrom <= 0
      || !Number.isSafeInteger(singleId) || singleId <= 0
      || !match.proposedAt || match.proposedAt < preference.effectiveFrom || match.proposedAt > now
      || match.status !== "proposed" || match.returnedToPoolAt != null
      || !match.approvalExpiresAt || match.approvalExpiresAt <= now) return null;

  // Regular proposals require the existing owner's approval. Boost proposals
  // retain their existing explicit algorithmic dispatch path, not an SMS bypass.
  const dispatchedBoost = String(match.autoExplanation || "").startsWith("[BOOST]")
    && String(match.notes || "").startsWith("[BOOST_SENT]");
  if (!match.ownerApprovedAt && !dispatchedBoost) return null;

  const myId = side === "A" ? match.singleAId : match.singleBId;
  const otherId = side === "A" ? match.singleBId : match.singleAId;
  const token = side === "A" ? match.approvalTokenA : match.approvalTokenB;
  const otherToken = side === "A" ? match.approvalTokenB : match.approvalTokenA;
  const usedAt = side === "A" ? match.tokenAUsedAt : match.tokenBUsedAt;
  const approved = side === "A" ? match.approvedByA : match.approvedByB;
  if (singleId !== myId || myId === otherId || usedAt != null || approved
      || !token || token === otherToken || token === match.ownerApprovalToken
      || !/^[a-f0-9]{48}$/i.test(token)) return null;

  return `https://hilitcaspi.com/match/respond?token=${encodeURIComponent(token)}`;
}
