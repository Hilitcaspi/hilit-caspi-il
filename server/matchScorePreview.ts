import type { Single } from "../drizzle/schema";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import { computeFullScore, computeFullScoreAdmin } from "./compatibility";

/** A single read-only score contract for staff previews. Send eligibility stays strict. */
export function evaluateMatchPreview(a: Single, b: Single, answersA: MatchAnswer[], answersB: MatchAnswer[]) {
  const strict = computeFullScore(a, b, answersA, answersB);
  const breakdown = computeFullScoreAdmin(a, b, answersA, answersB);
  const hardBlockReason = strict.details.find(detail => detail.startsWith("פסילה מוחלטת:"))
    ?.replace(/^פסילה מוחלטת:\s*/, "") || null;
  const warnings = [...breakdown.warnings];
  if (hardBlockReason && !warnings.some(warning => warning.includes(hardBlockReason))) {
    warnings.unshift(`⚠️ ${hardBlockReason}`);
  }
  return {
    score: breakdown.total, breakdown, warnings,
    hasHardBlock: strict.total === 0, hardBlockReason,
    canOverrideCriteria: strict.total === 0 && !!hardBlockReason && !hardBlockReason.includes("מגדר המבוקש"),
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
