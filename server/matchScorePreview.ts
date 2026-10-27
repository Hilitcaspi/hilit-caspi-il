import type { Single } from "../drizzle/schema";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import { computeFullScoreAdmin, getStrictMatchEligibility } from "./compatibility";

/** A single read-only score contract for staff previews. Send eligibility stays strict. */
export function evaluateMatchPreview(a: Single, b: Single, answersA: MatchAnswer[], answersB: MatchAnswer[]) {
  const breakdown = computeFullScoreAdmin(a, b, answersA, answersB);
  const strictEligibility = getStrictMatchEligibility(a, b, answersA, answersB);
  const hardBlockReason = strictEligibility.reason || null;
  const warnings = [...breakdown.warnings];
  if (hardBlockReason && !warnings.some(warning => warning.includes(hardBlockReason))) {
    warnings.unshift(`⚠️ ${hardBlockReason}`);
  }
  // A passing strict score equals the admin total. Keep the legacy total===0
  // contract intact if a future scoring policy can validly compute zero.
  const strictTotalIsZero = !strictEligibility.pass || breakdown.total === 0;
  return {
    score: breakdown.total, breakdown, warnings,
    hasHardBlock: strictTotalIsZero,
    hardBlockReason,
    canOverrideCriteria: strictTotalIsZero && !!hardBlockReason && !hardBlockReason.includes("מגדר המבוקש"),
  };
}

/** Compact, numeric details only: no profile data, free-text, tokens or answers. */
export function previewScoreDimensions(preview: ReturnType<typeof evaluateMatchPreview>) {
  const b = preview.breakdown;
  return {
    questionnaire: b.questionnaire, lifeStage: b.lifeStage, dna: b.dna,
    practical: b.practical, religiosity: b.religiosity, education: b.education,
    cityIntelligence: b.cityIntelligence,
  };
}
