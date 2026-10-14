import { TRPCError } from "@trpc/server";
import { inArray, or } from "drizzle-orm";
import { matches, matchmakingAnswers, singles } from "../drizzle/schema";
import { buildAdvancedMatchExclusions, isAdvancedMatchCandidate } from "../shared/advancedMatchCandidates";
import { evaluateMatchPreview, previewScoreDimensions } from "./matchScorePreview";
import { getDb } from "./db";
import type { MatchAnswer } from "../shared/matchmakingTypes";

/** Identical deterministic score to checkCompatibility; narrative is deferred. */
export function scoreAdvancedPair(personA: any, personB: any, answersA: MatchAnswer[], answersB: MatchAnswer[]) {
  const preview = evaluateMatchPreview(personA, personB, answersA, answersB);
  return {
    id: personB.id, score: preview.score, warnings: preview.warnings,
    hasHardBlock: preview.hasHardBlock, hardBlockReason: preview.hardBlockReason,
    canOverrideCriteria: preview.canOverrideCriteria,
    breakdown: previewScoreDimensions(preview),
    narrativeDeferred: true as const,
  };
}

/** Three bulk reads instead of four reads + an LLM call for each candidate. */
export async function rankAdvancedCandidates(targetId: number, candidateIds: number[]) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const ids = Array.from(new Set([targetId, ...candidateIds]));
  const [people, answerRows, matchRows] = await Promise.all([
    db.select().from(singles).where(inArray(singles.id, ids)),
    db.select({ singleId: matchmakingAnswers.singleId, answersJson: matchmakingAnswers.answersJson }).from(matchmakingAnswers).where(inArray(matchmakingAnswers.singleId, ids)),
    db.select({ singleAId: matches.singleAId, singleBId: matches.singleBId, status: matches.status, proposedAt: matches.proposedAt, matchedAt: matches.matchedAt, returnedToPoolAt: matches.returnedToPoolAt, matchDetailStatus: matches.matchDetailStatus,
      approvalExpiresAt: matches.approvalExpiresAt, approvedByA: matches.approvedByA, approvedByB: matches.approvedByB,
      ownerApprovedAt: matches.ownerApprovedAt, approvalTokenA: matches.approvalTokenA, approvalTokenB: matches.approvalTokenB,
      singleAToken: matches.singleAToken, singleBToken: matches.singleBToken, emailAOpenedAt: matches.emailAOpenedAt, emailBOpenedAt: matches.emailBOpenedAt,
      tokenAUsedAt: matches.tokenAUsedAt, tokenBUsedAt: matches.tokenBUsedAt, emailRetriedAt: matches.emailRetriedAt, waSentAt: matches.waSentAt, notes: matches.notes,
    }).from(matches).where(or(inArray(matches.singleAId, ids), inArray(matches.singleBId, ids))),
  ]);
  const target = people.find(p => p.id === targetId);
  if (!target || !target.isActive || target.isSeed) throw new TRPCError({ code: "NOT_FOUND", message: "פרופיל היעד אינו זמין" });
  const exclusions = buildAdvancedMatchExclusions(matchRows, targetId);
  if (exclusions.unavailableIds.has(targetId)) throw new TRPCError({ code: "CONFLICT", message: "לפרופיל היעד קיימת התאמה פעילה" });
  const answersById = new Map<number, MatchAnswer[]>();
  for (const row of answerRows) {
    const parsed = row.answersJson ? (typeof row.answersJson === "string" ? JSON.parse(row.answersJson) : row.answersJson) : [];
    answersById.set(row.singleId, parsed as MatchAnswer[]);
  }
  const requested = new Set(candidateIds);
  const results = people.filter(p => requested.has(p.id) && isAdvancedMatchCandidate(p, exclusions, targetId))
    .map(p => scoreAdvancedPair(target, p, answersById.get(targetId) || [], answersById.get(p.id) || []))
    .sort((a,b) => b.score - a.score || a.id - b.id);
  // Return scores only; raw records, tokens, notes and answers remain server-side.
  return { targetId, results, excludedIds: candidateIds.filter(id => !results.some(r => r.id === id)), ranked: results.length, narrativeDeferred: true as const };
}
