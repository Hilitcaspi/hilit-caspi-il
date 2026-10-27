import { TRPCError } from "@trpc/server";
import { inArray, or } from "drizzle-orm";
import { matches, matchmakingAnswers, singles, type Single } from "../drizzle/schema";
import { buildAdvancedMatchExclusions, isAdvancedMatchCandidate } from "../shared/advancedMatchCandidates";
import { evaluateMatchPreview, previewScoreDimensions } from "./matchScorePreview";
import { getDb } from "./db";
import type { MatchAnswer } from "../shared/matchmakingTypes";

// Every profile column reached by computeFullScoreAdmin or strict eligibility.
// This deliberately excludes free text not reached by current scoring (about,
// occupation, partnerDescription), along with identity/contact/token/payment
// and CRM fields. Consumers add their own non-scoring headers as needed.
export const matchScoringProfileColumns = {
  id: singles.id,
  gender: singles.gender,
  age: singles.age,
  city: singles.city,
  height: singles.height,
  education: singles.education,
  religiosity: singles.religiosity,
  religiosityOrigin: singles.religiosityOrigin,
  interests: singles.interests,
  maritalStatus: singles.maritalStatus,
  hasKids: singles.hasKids,
  numKids: singles.numKids,
  wantsKids: singles.wantsKids,
  dnaType: singles.dnaType,
  seekingGender: singles.seekingGender,
  openToPartnerWithKids: singles.openToPartnerWithKids,
  kidsInvolvement: singles.kidsInvolvement,
  relationshipPace: singles.relationshipPace,
  hasPets: singles.hasPets,
  acceptsPets: singles.acceptsPets,
  minAgePreference: singles.minAgePreference,
  maxAgePreference: singles.maxAgePreference,
  minHeightPreference: singles.minHeightPreference,
  maxHeightPreference: singles.maxHeightPreference,
  religiosityPreference: singles.religiosityPreference,
  acceptsKids: singles.acceptsKids,
  locationPreference: singles.locationPreference,
  smokingStatus: singles.smokingStatus,
  smokingPreference: singles.smokingPreference,
} as const;

const rankingProfileSelection = {
  ...matchScoringProfileColumns,
  // Availability headers consumed by isAdvancedMatchCandidate.
  isActive: singles.isActive,
  isSeed: singles.isSeed,
} as const;

type MatchScoringProfile = Pick<Single, keyof typeof matchScoringProfileColumns>;

/** Identical deterministic score to checkCompatibility; narrative is deferred. */
export function scoreAdvancedPair(personA: MatchScoringProfile, personB: MatchScoringProfile, answersA: MatchAnswer[], answersB: MatchAnswer[]) {
  // matchScoringProfileColumns is mechanically covered by projection parity
  // tests and includes every property reached by preview scoring/eligibility.
  const preview = evaluateMatchPreview(personA as Single, personB as Single, answersA, answersB);
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
    db.select(rankingProfileSelection).from(singles).where(inArray(singles.id, ids)),
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
  const resultIds = new Set(results.map(result => result.id));
  // Return scores only; raw records, tokens, notes and answers remain server-side.
  return { targetId, results, excludedIds: candidateIds.filter(id => !resultIds.has(id)), ranked: results.length, narrativeDeferred: true as const };
}
