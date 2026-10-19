import { and, desc, eq, gt, isNull, ne, notLike, or, sql } from "drizzle-orm";
import { matches, type Match } from "../drizzle/schema";
import { isBlockingMatch } from "../shared/matchAvailability";

/** SQL counterpart of wasMatchProposalSent; candidate notes never hide a real sent lifecycle. */
export function visibleMatchSql(candidateMarker: string) {
  const textEvidence = [matches.approvalTokenA, matches.approvalTokenB, matches.singleAToken, matches.singleBToken];
  const timestampEvidence = [matches.ownerApprovedAt, matches.emailAOpenedAt, matches.emailBOpenedAt,
    matches.tokenAUsedAt, matches.tokenBUsedAt, matches.emailRetriedAt, matches.waSentAt];
  return or(
    isNull(matches.notes), notLike(matches.notes, `%${candidateMarker}%`),
    eq(matches.status, "matched"),
    ...timestampEvidence.map(column => gt(column, 0)),
    ...textEvidence.map(column => sql`${column} IS NOT NULL AND ${column} <> ''`),
    eq(matches.approvedByA, true), eq(matches.approvedByB, true),
    sql`${matches.notes} LIKE ${"%נשלחה בעבר%"}`,
  );
}

/** Minimal lifecycle projection. Never includes participant names, contacts or profile text. */
export const matchAvailabilityColumns = {
  id: matches.id, singleAId: matches.singleAId, singleBId: matches.singleBId,
  status: matches.status, proposedAt: matches.proposedAt, approvalExpiresAt: matches.approvalExpiresAt,
  approvedByA: matches.approvedByA, approvedByB: matches.approvedByB,
  tokenAUsedAt: matches.tokenAUsedAt, tokenBUsedAt: matches.tokenBUsedAt,
  singleAConsent: matches.singleAConsent, singleBConsent: matches.singleBConsent,
  singleAConsentAt: matches.singleAConsentAt, singleBConsentAt: matches.singleBConsentAt,
  matchedAt: matches.matchedAt, contactRevealedAt: matches.contactRevealedAt,
  returnedToPoolAt: matches.returnedToPoolAt, matchDetailStatus: matches.matchDetailStatus,
  ownerApprovedAt: matches.ownerApprovedAt, approvalTokenA: matches.approvalTokenA,
  approvalTokenB: matches.approvalTokenB, singleAToken: matches.singleAToken, singleBToken: matches.singleBToken,
  emailAOpenedAt: matches.emailAOpenedAt, emailBOpenedAt: matches.emailBOpenedAt,
  emailRetriedAt: matches.emailRetriedAt, waSentAt: matches.waSentAt, notes: matches.notes,
  score: matches.score, createdAt: matches.createdAt,
};
export type AvailabilityMatchRow = Pick<Match, keyof typeof matchAvailabilityColumns>;

/** Include legacy mutual records, not just their sometimes-stale lifecycle status. */
export function possibleBlockingMatchSql() {
  return or(eq(matches.status, "proposed"), eq(matches.status, "matched"),
    and(eq(matches.approvedByA, true), eq(matches.approvedByB, true)),
    gt(matches.matchedAt, 0), gt(matches.contactRevealedAt, 0));
}

/** Check all potential blockers before choosing one; an expired newest row cannot conceal a real connection. */
export async function findBlockingMatchForSingle(db: any, singleId: number, now = Date.now(), excludeMatchId?: number): Promise<AvailabilityMatchRow | null> {
  const rows: AvailabilityMatchRow[] = await db.select(matchAvailabilityColumns).from(matches).where(and(
    or(eq(matches.singleAId, singleId), eq(matches.singleBId, singleId)),
    possibleBlockingMatchSql(),
    excludeMatchId === undefined ? undefined : ne(matches.id, excludeMatchId),
  )).orderBy(desc(matches.createdAt), desc(matches.id));
  return rows.find(match => isBlockingMatch(match, now)) ?? null;
}
