import { inArray } from "drizzle-orm";
import { matchmakingAnswers, singles, type Match, type Single } from "../drizzle/schema";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import { wasMatchProposalSent } from "../shared/matchDelivery";
import { evaluateMatchPreview } from "./matchScorePreview";
import type { getDb } from "./db";

type AppDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type ScoreRecord = Pick<Match, "status" | "score" | "scoreBreakdown"> & Parameters<typeof wasMatchProposalSent>[0];
export type MatchScoreInputs = {
  people: Map<number, Single>;
  answers: Map<number, MatchAnswer[]>;
};

/** Full scoring inputs loaded in two bulk reads, never returned to the client. */
export async function loadMatchScoreInputs(db: AppDb, singleIds: number[]): Promise<MatchScoreInputs> {
  if (!singleIds.length) return { people: new Map(), answers: new Map() };
  const [people, rows] = await Promise.all([
    db.select().from(singles).where(inArray(singles.id, singleIds)),
    db.select({ singleId: matchmakingAnswers.singleId, answersJson: matchmakingAnswers.answersJson })
      .from(matchmakingAnswers).where(inArray(matchmakingAnswers.singleId, singleIds)),
  ]);
  const answers = new Map<number, MatchAnswer[]>();
  for (const row of rows) {
    // Match the single-pair and bulk-ranking inputs exactly. A malformed answer
    // must fail rather than silently computing a plausible score without it.
    const parsed = row.answersJson ? (typeof row.answersJson === "string" ? JSON.parse(row.answersJson) : row.answersJson) : [];
    if (!Array.isArray(parsed)) throw new Error("Invalid questionnaire answer data");
    answers.set(row.singleId, parsed as MatchAnswer[]);
  }
  return { people: new Map(people.map(person => [person.id, person])), answers };
}

/** Overlay only: never updates the stored match or changes a sent snapshot. */
export function presentMatchScore(record: ScoreRecord, a: Single | undefined, b: Single | undefined,
  answersA: MatchAnswer[] = [], answersB: MatchAnswer[] = []) {
  // Retain the original breakdown in storage without doubling every API row.
  const saved = { savedScore: record.score };
  if (record.status !== "pending" || wasMatchProposalSent(record)) {
    return { ...saved, score: record.score, scoreBreakdown: record.scoreBreakdown, scoreSource: "saved_snapshot" as const,
      scoreWarnings: [] as string[], hasHardBlock: false, hardBlockReason: null as string | null, canOverrideCriteria: false };
  }
  if (!a || !b) {
    return { ...saved, score: null, scoreBreakdown: null, scoreSource: "unavailable" as const,
      scoreWarnings: ["פרופיל חסר — לא ניתן לחשב ציון עדכני"], hasHardBlock: true,
      hardBlockReason: "פרופיל חסר", canOverrideCriteria: false };
  }
  const preview = evaluateMatchPreview(a, b, answersA, answersB);
  return { ...saved, score: preview.score, scoreBreakdown: JSON.stringify(preview.breakdown),
    scoreSource: "current_preview" as const, scoreWarnings: preview.warnings,
    hasHardBlock: preview.hasHardBlock, hardBlockReason: preview.hardBlockReason,
    canOverrideCriteria: preview.canOverrideCriteria };
}
