// The seven weighted components sum to exactly 100%. Non-weighted diagnostic
// hints (astrology, word overlap, city narrative) never change the match score.
export const MATCH_SCORING_VERSION = "v9.0" as const;

export const MATCH_SCORE_WEIGHTS = {
  questionnaire: 0.40,
  lifeStage: 0.20,
  dna: 0.15,
  religiosity: 0.07,
  interactionBonus: 0.07,
  education: 0.06,
  practical: 0.05,
} as const;

// Historical scores saved without a version were calculated with these weights
// plus separate bonuses. Never relabel old snapshots as v9.
export const LEGACY_MATCH_SCORE_WEIGHTS = {
  questionnaire: 0.40,
  lifeStage: 0.20,
  dna: 0.13,
  religiosity: 0.10,
  interactionBonus: 0.07,
  education: 0.05,
  practical: 0.05,
} as const;
