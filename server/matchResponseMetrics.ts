import { eq } from "drizzle-orm";
import { matches, matchDeliveryEvents } from "../drizzle/schema";
import { getDb } from "./db";
import { buildMatchResponseSummaries } from "../shared/matchResponseSummary";

/** Read only. Tokens are represented as booleans, never returned or logged. */
export async function getMatchResponseSummaries(now = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Response metrics unavailable");
  const [rows, deliveries] = await Promise.all([
    db.select({
      id: matches.id, singleAId: matches.singleAId, singleBId: matches.singleBId,
      status: matches.status, proposedAt: matches.proposedAt, ownerApprovedAt: matches.ownerApprovedAt,
      approvalExpiresAt: matches.approvalExpiresAt,
      approvedByA: matches.approvedByA, approvedByB: matches.approvedByB,
      tokenAUsedAt: matches.tokenAUsedAt, tokenBUsedAt: matches.tokenBUsedAt,
      singleAConsent: matches.singleAConsent, singleBConsent: matches.singleBConsent,
      singleAConsentAt: matches.singleAConsentAt, singleBConsentAt: matches.singleBConsentAt,
      emailAOpenedAt: matches.emailAOpenedAt, emailBOpenedAt: matches.emailBOpenedAt,
      matchedAt: matches.matchedAt, contactRevealedAt: matches.contactRevealedAt,
      returnedToPoolAt: matches.returnedToPoolAt, matchDetailStatus: matches.matchDetailStatus,
    }).from(matches),
    db.select({
      matchId: matchDeliveryEvents.matchId, singleId: matchDeliveryEvents.singleId,
      status: matchDeliveryEvents.status, acceptedAt: matchDeliveryEvents.acceptedAt,
      attemptedAt: matchDeliveryEvents.attemptedAt, attemptType: matchDeliveryEvents.attemptType,
    }).from(matchDeliveryEvents).where(eq(matchDeliveryEvents.status, "accepted")),
  ]);
  return buildMatchResponseSummaries(rows, deliveries, now);
}
