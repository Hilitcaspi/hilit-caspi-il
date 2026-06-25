/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HILIT CASPI, MATCHING ALGORITHM v8.0  "The Genius Engine"
 * ═══════════════════════════════════════════════════════════════════════════════
 * COPYRIGHT NOTICE:
 * © 2024–2025 Hilit Caspi. All rights reserved.
 * This algorithm, its scoring matrices, weights, and logic are the exclusive
 * intellectual property of Hilit Caspi, protected under Israeli Copyright Law
 * (2007) and maintained as a trade secret.
 * Unauthorized copying, reproduction, distribution, or use of any part of
 * this code is strictly prohibited without prior written consent.
 * שיטת ההתאמה, המטריצות והלוגיקה מוגנים בזכויות יוצרים ומהווים סוד מסחרי של הילית כספי.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * v8.0 CHANGES:
 * 1. Gender-aware DNA matrices (hetero M+F, F+F, M+M)
 * 2. Astrology bonus (zodiac element compatibility, max 5 pts)
 * 3. City Intelligence (lifestyle profiles per city)
 * 4. NLP text analysis (keyword extraction from free-text fields)
 * 5. New location distance tiers (same city=100, ≤20km=85, 20-50km=65, 50-80km=40, 80-120km=25, >120km=10)
 * 6. Kids count scoring (0+0=100 through 0+3+=40)
 * 7. Marital status scoring (divorced+divorced=100, divorced+single=55, widowed+single=50)
 * 8. Life-stage-aware questionnaire weights
 * 9. Smart narrative generation (warm, personal, in Hilit's voice)
 *
 * SCORING ARCHITECTURE (100 points total):
 *   Questionnaire Compatibility:  40 pts
 *   Life Stage & Demographics:    20 pts
 *   DNA Personality Synergy:      13 pts  (gender-aware)
 *   Religiosity & Values:         10 pts
 *   Interaction Bonuses:           7 pts
 *   Education & Ambition:          5 pts
 *   Location & Practical:          5 pts
 *                                ────────
 *                          Total: 100 pts (capped at 97)
 *   Astrology Bonus:              +0 to +5 (added on top, capped at 97)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { Single } from "../drizzle/schema";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import { scoreLocation } from "../shared/cities";

export const MATCH_THRESHOLD = 55;
export const MAX_MATCHES_PER_PERSON = 5;

export type ScoreBreakdown = {
  total: number;
  questionnaire: number;
  lifeStage: number;
  dna: number;
  practical: number;
  religiosity: number;
  education: number;
  interactionBonus: number;
  astrologyBonus: number;
  textBonus: number;
  cityIntelligence: number;
  details: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: QUESTIONNAIRE SCORING (40 points)
// ═══════════════════════════════════════════════════════════════════════════════

const Q_MATRICES: Record<string, number[][]> = {
  q_commitment: [
    [100, 40, 75, 20, 70],
    [ 40,100, 50, 65, 55],
    [ 75, 50,100, 35, 80],
    [ 20, 65, 35,100, 50],
    [ 70, 55, 80, 50,100],
  ],
  q_conflict_style: [
    [100, 70, 35, 25],
    [ 70,100, 60, 45],
    [ 35, 60,100, 70],
    [ 25, 45, 70,100],
  ],
  q_attachment: [
    [ 45, 85, 20, 35],
    [ 85, 95, 55, 60],
    [ 20, 55, 40, 30],
    [ 35, 60, 30, 40],
  ],
  q_kids_future: [
    [100, 75, 50,  8],
    [ 75,100, 70, 40],
    [ 50, 70,100, 55],
    [  8, 40, 55,100],
  ],
  q_kids_flexibility: [
    [100, 70, 40, 15],
    [ 70,100, 75, 45],
    [ 40, 75,100, 80],
    [ 15, 45, 80,100],
  ],
  q_marriage: [
    [100, 65, 15, 50],
    [ 65,100, 55, 75],
    [ 15, 55,100, 60],
    [ 50, 75, 60,100],
  ],
  q_living_together: [
    [100, 60, 25, 70],
    [ 60,100, 55, 80],
    [ 25, 55,100, 65],
    [ 70, 80, 65,100],
  ],
  q_friday_night: [
    [100, 55, 25, 75],
    [ 55,100, 70, 80],
    [ 25, 70,100, 75],
    [ 75, 80, 75,100],
  ],
  q_religion: [
    [100, 65, 25,  8],
    [ 65,100, 70, 30],
    [ 25, 70,100, 65],
    [  8, 30, 65,100],
  ],
  q_money: [
    [100, 70, 30, 65],
    [ 70,100, 60, 80],
    [ 30, 60,100, 65],
    [ 65, 80, 65,100],
  ],
  q_lifestyle_economic: [
    [100, 65, 30, 10],
    [ 65,100, 70, 35],
    [ 30, 70,100, 65],
    [ 10, 35, 65,100],
  ],
  q_financial_independence: [
    [100, 75, 55, 30],
    [ 75,100, 80, 50],
    [ 55, 80,100, 70],
    [ 30, 50, 70,100],
  ],
  q_energy: [
    [100, 65, 30, 70],
    [ 65,100, 70, 80],
    [ 30, 70,100, 65],
    [ 70, 80, 65,100],
  ],
  q_communication: [
    [100, 70, 35, 15],
    [ 70,100, 65, 35],
    [ 35, 65,100, 65],
    [ 15, 35, 65,100],
  ],
  q_ambition: [
    [100, 70, 40, 20],
    [ 70,100, 65, 40],
    [ 40, 65,100, 70],
    [ 20, 40, 70,100],
  ],
  q_humor: [
    [100, 80, 50, 30],
    [ 80,100, 70, 45],
    [ 50, 70,100, 75],
    [ 30, 45, 75,100],
  ],
  q_location: [
    [100, 50, 30],
    [ 50,100, 75],
    [ 30, 75,100],
  ],
  q_kids_existing: [
    [100, 80, 65, 30],
    [ 80,100, 70, 40],
    [ 65, 70,100, 60],
    [ 30, 40, 60,100],
  ],
  q_age_gap: [
    [100, 70, 35, 50],
    [ 70,100, 65, 75],
    [ 35, 65,100, 85],
    [ 50, 75, 85,100],
  ],
  q_past_relationship: [
    [100, 60, 35],
    [ 60,100, 65],
    [ 35, 65,100],
  ],
  q_pets: [
    [100, 85, 30,  5],
    [ 85,100, 55, 25],
    [ 30, 55,100, 80],
    [  5, 25, 80,100],
  ],
  q_step_parent: [
    [100, 70, 35, 20],
    [ 70,100, 60, 40],
    [ 35, 60,100, 65],
    [ 20, 40, 65,100],
  ],
  q_kids_involvement: [
    [100, 75, 50, 40],
    [ 75,100, 70, 55],
    [ 50, 70,100, 75],
    [ 40, 55, 75,100],
  ],
  q_relationship_pace: [
    [100, 65, 30],
    [ 65,100, 70],
    [ 30, 70,100],
  ],
};

function scoreLoveLanguageRank(rankA: number[], rankB: number[]): number {
  if (!rankA?.length || !rankB?.length) return 50;
  let score = 0;
  if (rankA[0] === rankB[0]) score += 45;
  const setA = new Set(rankA.slice(0, 3));
  const setB = new Set(rankB.slice(0, 3));
  let overlapCount = 0;
  Array.from(setA).forEach(v => { if (setB.has(v)) overlapCount++; });
  score += overlapCount * 18;
  if (rankA[0] !== undefined && !setB.has(rankA[0])) score -= 10;
  if (rankB[0] !== undefined && !setA.has(rankB[0])) score -= 10;
  return Math.max(15, Math.min(100, score));
}

function getLifeStageWeights(a: Single, b: Single): Record<string, number> {
  const aHasKids = a.hasKids ?? false;
  const bHasKids = b.hasKids ?? false;
  const aChapter2 = a.maritalStatus === "divorced" || a.maritalStatus === "widowed";
  const bChapter2 = b.maritalStatus === "divorced" || b.maritalStatus === "widowed";
  const bothChapter2WithKids = aChapter2 && bChapter2 && aHasKids && bHasKids;
  const eitherHasKids = aHasKids || bHasKids;
  const neitherHasKids = !aHasKids && !bHasKids;
  return {
    q_commitment:           4,
    q_conflict_style:       4,
    q_love_language:        3,
    q_attachment:           4,
    q_kids_future:          neitherHasKids ? 3 : 0,
    q_kids_flexibility:     neitherHasKids ? 3 : 0,
    q_marriage:             3,
    q_living_together:      bothChapter2WithKids ? 1 : 2,
    q_friday_night:         2,
    q_religion:             3,
    q_money:                bothChapter2WithKids ? 4 : 2,
    q_lifestyle_economic:   2,
    q_financial_independence: bothChapter2WithKids ? 3 : 2,
    q_energy:               2,
    q_communication:        3,
    q_ambition:             2,
    q_humor:                2,
    q_location:             2,
    q_kids_existing:        eitherHasKids ? 3 : 1,
    q_age_gap:              2,
    q_past_relationship:    aChapter2 || bChapter2 ? 2 : 1,
    q_pets:                 2,
    q_step_parent:          eitherHasKids ? 4 : 0,
    q_kids_involvement:     eitherHasKids ? 3 : 0,
    q_relationship_pace:    aChapter2 || bChapter2 ? 4 : 2,
  };
}

function scoreQuestion(
  qId: string,
  ansA: MatchAnswer,
  ansB: MatchAnswer,
  weight: number
): { raw: number; weighted: number; maxWeighted: number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getVal = (ans: MatchAnswer) => {
    if (ans.myAnswer !== undefined) return ans.myAnswer;
    return (ans as any).value;
  };
  const rawA_check = getVal(ansA);
  const rawB_check = getVal(ansB);
  if (Array.isArray(rawA_check) || Array.isArray(rawB_check)) {
    const rankA = Array.isArray(rawA_check) ? rawA_check : [];
    const rankB = Array.isArray(rawB_check) ? rawB_check : [];
    const raw = scoreLoveLanguageRank(rankA, rankB);
    const impA = (ansA.importance ?? 1) + 1;
    const impB = (ansB.importance ?? 1) + 1;
    const effectiveImp = (impA + impB + Math.max(impA, impB)) / 3;
    const weighted = raw * weight * effectiveImp;
    const maxWeighted = 100 * weight * 3;
    return { raw, weighted, maxWeighted };
  }
  const valA = getVal(ansA);
  const valB = getVal(ansB);
  const myA = typeof valA === "number" ? valA : 0;
  const myB = typeof valB === "number" ? valB : 0;
  const FLEXIBLE_ANSWERS: Record<string, number[]> = {
    q_friday_night:           [3],
    q_kids_future:            [1, 2],
    q_kids_flexibility:       [2, 3],
    q_marriage:               [1],
    q_living_together:        [3],
    q_location:               [2],
    q_kids_existing:          [0, 2],
    q_age_gap:                [3],
    q_financial_independence: [2, 3],
    q_step_parent:            [0, 1],
    q_relationship_pace:      [1],
  };
  const flexA = FLEXIBLE_ANSWERS[qId]?.includes(myA) ?? false;
  const flexB = FLEXIBLE_ANSWERS[qId]?.includes(myB) ?? false;
  let raw: number;
  const matrix = Q_MATRICES[qId];
  if (flexA || flexB) {
    if (flexA && flexB) {
      raw = 90;
    } else {
      if (matrix && matrix[myA] && matrix[myA][myB] !== undefined) {
        raw = Math.max(75, matrix[myA][myB]);
      } else {
        raw = 80;
      }
    }
  } else if (matrix && matrix[myA] && matrix[myA][myB] !== undefined) {
    raw = matrix[myA][myB];
  } else {
    const maxOpt = Math.max(myA, myB, 3);
    const dist = Math.abs(myA - myB);
    raw = Math.round(100 - (dist / maxOpt) * 70);
  }
  const impA = (ansA.importance ?? 1) + 1;
  const impB = (ansB.importance ?? 1) + 1;
  const effectiveImp = (impA + impB + Math.max(impA, impB)) / 3;
  const weighted = raw * weight * effectiveImp;
  const maxWeighted = 100 * weight * 3;
  return { raw, weighted, maxWeighted };
}

function scoreQuestionnaire(
  answersA: MatchAnswer[],
  answersB: MatchAnswer[],
  a: Single,
  b: Single
): number {
  if (!answersA.length || !answersB.length) return 50;
  const mapA = new Map(answersA.map(a => [a.qId, a]));
  const mapB = new Map(answersB.map(a => [a.qId, a]));
  const WEIGHTS = getLifeStageWeights(a, b);
  let totalWeighted = 0;
  let totalMaxWeighted = 0;
  let questionsScored = 0;
  const allQIds = Array.from(new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]));
  for (const qId of allQIds) {
    const ansA = mapA.get(qId);
    const ansB = mapB.get(qId);
    if (!ansA || !ansB) continue;
    const weight = WEIGHTS[qId] ?? 2;
    if (weight === 0) continue;
    const { weighted, maxWeighted } = scoreQuestion(qId, ansA, ansB, weight);
    totalWeighted += weighted;
    totalMaxWeighted += maxWeighted;
    questionsScored++;
  }
  if (totalMaxWeighted === 0) return 50;
  const normalized = (totalWeighted / totalMaxWeighted) * 100;
  const confidence = Math.min(questionsScored / 12, 1);
  const adjusted = 50 + (normalized - 50) * confidence;
  return Math.round(Math.max(10, Math.min(98, adjusted)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: LIFE STAGE & DEMOGRAPHICS (20 points)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreLifeStage(a: Single, b: Single): number {
  const ageDiff = Math.abs((a.age ?? 30) - (b.age ?? 30));
  const ageA = a.age ?? 30;
  const ageB = b.age ?? 30;
  let agePreferenceScore = 50;
  const aInBRange = (!b.minAgePreference || ageA >= b.minAgePreference) &&
                    (!b.maxAgePreference || ageA <= b.maxAgePreference);
  const bInARange = (!a.minAgePreference || ageB >= a.minAgePreference) &&
                    (!a.maxAgePreference || ageB <= a.maxAgePreference);
  if (aInBRange && bInARange) {
    // Both within each other's stated range (or no preferences set).
    // Even so, apply an absolute age-gap cap so that a 27-year gap never
    // scores the same as a 3-year gap just because no preferences were set.
    if (ageDiff <= 5) agePreferenceScore = 100;
    else if (ageDiff <= 10) agePreferenceScore = 85;
    else if (ageDiff <= 15) agePreferenceScore = 65;
    else if (ageDiff <= 20) agePreferenceScore = 40;
    else agePreferenceScore = 15; // 20+ year gap is very unlikely to be a good match
  } else if (aInBRange || bInARange) {
    const outOfRangeAge = aInBRange ? ageA : ageB;
    const outOfRangePerson = aInBRange ? b : a;
    const tooYoung = outOfRangePerson.minAgePreference && outOfRangeAge < outOfRangePerson.minAgePreference;
    const tooOld   = outOfRangePerson.maxAgePreference && outOfRangeAge > outOfRangePerson.maxAgePreference;
    const gapFromRange = tooYoung
      ? (outOfRangePerson.minAgePreference! - outOfRangeAge)
      : tooOld ? (outOfRangeAge - outOfRangePerson.maxAgePreference!) : 0;
    if (gapFromRange <= 2) agePreferenceScore = 85;
    else if (gapFromRange <= 4) agePreferenceScore = 75;
    else if (ageDiff <= 3) agePreferenceScore = 80;
    else if (ageDiff <= 7) agePreferenceScore = 70;
    else if (ageDiff <= 12) agePreferenceScore = 55;
    else agePreferenceScore = 40;
  } else {
    if (ageDiff <= 3) agePreferenceScore = 55;
    else if (ageDiff <= 7) agePreferenceScore = 35;
    else if (ageDiff <= 12) agePreferenceScore = 20;
    else agePreferenceScore = 10;
  }

  // Kids count scoring
  let kidsScore = 50;
  const aHasKids = a.hasKids ?? false;
  const bHasKids = b.hasKids ?? false;
  const aNumKids = a.numKids ?? 0;
  const bNumKids = b.numKids ?? 0;
  if (aHasKids && bHasKids) {
    const aAccepts = a.openToPartnerWithKids !== "no" && a.acceptsKids !== false;
    const bAccepts = b.openToPartnerWithKids !== "no" && b.acceptsKids !== false;
    if (!aAccepts || !bAccepts) {
      kidsScore = 20;
    } else {
      const kidsDiff = Math.abs(aNumKids - bNumKids);
      if (kidsDiff === 0) kidsScore = aNumKids <= 2 ? 100 : 95;
      else if (kidsDiff === 1) kidsScore = 85;
      else if (kidsDiff === 2) kidsScore = 70;
      else kidsScore = 55;
      if (a.kidsInvolvement === "grown" && b.kidsInvolvement === "grown") kidsScore = Math.min(100, kidsScore + 5);
    }
  } else if (aHasKids || bHasKids) {
    const parentNumKids = aHasKids ? aNumKids : bNumKids;
    const nonParent = aHasKids ? b : a;
    const accepts = nonParent.openToPartnerWithKids;
    const acceptsKids = nonParent.acceptsKids;
    const parent = aHasKids ? a : b;
    if (accepts === "yes" || acceptsKids === true) {
      if (parentNumKids === 0) kidsScore = 90;
      else if (parentNumKids === 1) kidsScore = 70;
      else if (parentNumKids === 2) kidsScore = 55;
      else kidsScore = 40;
    } else if (accepts === "depends_on_age") {
      kidsScore = parent.kidsInvolvement === "grown" ? 80 : 55;
    } else if (accepts === "no" || acceptsKids === false) {
      kidsScore = 15;
    } else {
      kidsScore = 50;
    }
  } else {
    const wA = a.wantsKids;
    const wB = b.wantsKids;
    if (wA === wB) kidsScore = 95;
    else if (wA === "open" || wB === "open") kidsScore = 75;
    else if ((wA === "yes" && wB === "no") || (wA === "no" && wB === "yes")) {
      const wantsNo   = wA === "no" ? a : b;
      const noAge     = wantsNo.age ?? 30;
      const noGender  = wantsNo.gender;
      if (noGender === "female" && noAge >= 37) {
        kidsScore = noAge >= 42 ? 55 : 40;
      } else if (noGender === "male" && noAge >= 45) {
        kidsScore = 35;
      } else {
        kidsScore = 15;
      }
    } else {
      kidsScore = 60;
    }
  }

  // Marital status alignment
  let maritalScore = 70;
  const aStatus = a.maritalStatus ?? "single";
  const bStatus = b.maritalStatus ?? "single";
  if (aStatus === bStatus) {
    if (aStatus === "divorced" && aHasKids && bHasKids) maritalScore = 100;
    else if (aStatus === "widowed") maritalScore = 95;
    else maritalScore = 90;
  } else if (
    (aStatus === "divorced" && bStatus === "single") ||
    (aStatus === "single" && bStatus === "divorced")
  ) {
    maritalScore = 55;
  } else if (
    (aStatus === "widowed" && bStatus === "single") ||
    (aStatus === "single" && bStatus === "widowed")
  ) {
    maritalScore = 50;
  } else if (
    (aStatus === "widowed" && bStatus === "divorced") ||
    (aStatus === "divorced" && bStatus === "widowed")
  ) {
    maritalScore = 80;
  }

  // Height preference
  let heightScore = 70;
  if (a.height && b.height) {
    const aH = a.height;
    const bH = b.height;
    const maleProfile  = (a.gender === "male")   ? a : (b.gender === "male")   ? b : null;
    const femaleProfile = (a.gender === "female") ? a : (b.gender === "female") ? b : null;
    const maleH   = maleProfile?.height ?? null;
    const femaleH = femaleProfile?.height ?? null;
    let naturalHeightPenalty = 0;
    if (maleH !== null && femaleH !== null && maleH < femaleH) {
      const femaleMinH = femaleProfile?.minHeightPreference;
      if (!femaleMinH || femaleMinH > maleH) {
        const diff = femaleH - maleH;
        naturalHeightPenalty = diff <= 3 ? 15 : diff <= 7 ? 30 : 45;
      }
    }
    const aMinH = a.minHeightPreference;
    const aMaxH = a.maxHeightPreference;
    const bMinH = b.minHeightPreference;
    const bMaxH = b.maxHeightPreference;
    const bInARange = (!aMinH || bH >= aMinH) && (!aMaxH || bH <= aMaxH);
    const aInBRange = (!bMinH || aH >= bMinH) && (!bMaxH || aH <= bMaxH);
    if (bInARange && aInBRange) heightScore = 95;
    else if (bInARange || aInBRange) heightScore = 65;
    else {
      const aGap = Math.max(0, (aMinH ?? 0) - bH, bH - (aMaxH ?? 999));
      const bGap = Math.max(0, (bMinH ?? 0) - aH, aH - (bMaxH ?? 999));
      const totalGap = aGap + bGap;
      if (totalGap <= 5) heightScore = 50;
      else if (totalGap <= 10) heightScore = 35;
      else heightScore = 20;
    }
    heightScore = Math.max(10, heightScore - naturalHeightPenalty);
  }

  const score = Math.round(
    agePreferenceScore * 0.35 +
    kidsScore * 0.35 +
    maritalScore * 0.15 +
    heightScore * 0.15
  );
  return Math.max(10, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: DNA PERSONALITY SYNERGY (13 points), GENDER-AWARE
// ═══════════════════════════════════════════════════════════════════════════════

// leader(0), romantic(1), free_spirit(2), anchor(3)
const DNA_HETERO: number[][] = [
  [  15,  80,  70,  95 ],
  [  80,  50,  75, 100 ],
  [  70,  75,  20,  80 ],
  [  95, 100,  80,  60 ],
];
const DNA_FF: number[][] = [
  [  40,  75,  70,  90 ],
  [  75,  60,  70,  85 ],
  [  70,  70,  50,  80 ],
  [  90,  85,  80,  65 ],
];
const DNA_MM: number[][] = [
  [  35,  80,  65,  90 ],
  [  80,  55,  70,  85 ],
  [  65,  70,  45,  80 ],
  [  90,  85,  80,  60 ],
];
const DNA_INDEX: Record<string, number> = {
  leader: 0, romantic: 1, free_spirit: 2, anchor: 3,
};

function getDnaSynergy(
  dnaA: string | null | undefined,
  dnaB: string | null | undefined,
  genderA: string | null | undefined,
  genderB: string | null | undefined
): number {
  if (!dnaA || !dnaB) return 55;
  const iA = DNA_INDEX[dnaA];
  const iB = DNA_INDEX[dnaB];
  if (iA === undefined || iB === undefined) return 55;
  const isFF = genderA === "female" && genderB === "female";
  const isMM = genderA === "male"   && genderB === "male";
  const matrix = isFF ? DNA_FF : isMM ? DNA_MM : DNA_HETERO;
  return matrix[iA][iB];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: LOCATION & PRACTICAL (5 points), UPDATED TIERS
// ═══════════════════════════════════════════════════════════════════════════════

function scoreLocationV8(
  cityA: string | null | undefined,
  cityB: string | null | undefined,
  locationPrefA?: string | null,
  locationPrefB?: string | null,
  religiosityA?: string | null,
  religiosityB?: string | null
): { score: number; distanceKm: number | null; notes: string[] } {
  const notes: string[] = [];
  if (locationPrefA === "anywhere" && locationPrefB === "anywhere") {
    return { score: 100, distanceKm: null, notes: ["שניהם פתוחים לכל מרחק"] };
  }
  const result = scoreLocation(cityA, cityB, locationPrefA, locationPrefB, religiosityA, religiosityB);
  const km = result.distanceKm;
  if (km === null) return result;
  let base: number;
  if (km <= 5)         base = 100;
  else if (km <= 20)   base = 85;
  else if (km <= 50)   base = 65;
  else if (km <= 80)   base = 40;
  else if (km <= 120)  base = 25;
  else                 base = 10;
  if (locationPrefA === "close" && locationPrefB === "close" && km > 50) {
    base = Math.min(base, 15);
    notes.push("שניהם מחפשים קרוב ומרחק גדול מ-50 ק\"מ");
  } else if ((locationPrefA === "close" || locationPrefB === "close") && km > 50) {
    base = Math.min(base, 30);
  }
  if (locationPrefA === "anywhere" || locationPrefB === "anywhere") {
    base = Math.max(base, 50);
  }
  const bonusFromOriginal = result.score - (km <= 5 ? 100 : km <= 15 ? 90 : km <= 30 ? 75 : km <= 50 ? 58 : km <= 80 ? 38 : km <= 120 ? 20 : 5);
  const final = Math.max(0, Math.min(100, base + Math.max(0, bonusFromOriginal)));
  return { score: final, distanceKm: km, notes: [...notes, ...result.notes] };
}

function scorePractical(a: Single, b: Single): number {
  const locResult = scoreLocationV8(
    a.city, b.city,
    a.locationPreference, b.locationPreference,
    a.religiosity, b.religiosity
  );
  let petsScore = 70;
  if (a.hasPets && b.acceptsPets === false) petsScore = 15;
  else if (b.hasPets && a.acceptsPets === false) petsScore = 15;
  else if (a.hasPets && b.hasPets) petsScore = 95;
  else if ((a.hasPets && b.acceptsPets === true) || (b.hasPets && a.acceptsPets === true)) petsScore = 85;
  else if (!a.hasPets && !b.hasPets && a.acceptsPets === false && b.acceptsPets === false) petsScore = 90;
  return Math.round(locResult.score * 0.75 + petsScore * 0.25);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: RELIGIOSITY & VALUES (10 points)
// ═══════════════════════════════════════════════════════════════════════════════

const RELIGIOSITY_MATRIX: Record<string, Record<string, number>> = {
  secular:     { secular: 100, traditional: 65, religious: 0,   orthodox: 0   },
  traditional: { secular: 65,  traditional: 95, religious: 60,  orthodox: 20  },
  religious:   { secular: 0,   traditional: 60, religious: 100, orthodox: 75  },
  orthodox:    { secular: 0,   traditional: 20, religious: 75,  orthodox: 100 },
};

const RELIGIOSITY_DISQUALIFY: [string, string][] = [
  ["secular",  "religious"],
  ["secular",  "orthodox"],
  ["religious","secular"],
  ["orthodox", "secular"],
  ["orthodox", "traditional"],
  ["traditional", "orthodox"],
];

function isReligiosityDisqualified(relA: string, relB: string): boolean {
  return RELIGIOSITY_DISQUALIFY.some(
    ([x, y]) => (x === relA && y === relB) || (x === relB && y === relA)
  );
}

function religiosityScore(a: Single, b: Single): number {
  const relA = a.religiosity ?? "secular";
  const relB = b.religiosity ?? "secular";
  let base = RELIGIOSITY_MATRIX[relA]?.[relB] ?? 50;
  if (a.religiosityPreference) {
    const prefs = a.religiosityPreference.split(",").map(s => s.trim());
    if (prefs.length > 0 && !prefs.includes(relB)) base = Math.min(base, 30);
  }
  if (b.religiosityPreference) {
    const prefs = b.religiosityPreference.split(",").map(s => s.trim());
    if (prefs.length > 0 && !prefs.includes(relA)) base = Math.min(base, 30);
  }
  if (relA === "traditional" && relB === "traditional") {
    if (a.religiosityOrigin && b.religiosityOrigin) {
      base = a.religiosityOrigin === b.religiosityOrigin ? 100 : 80;
    }
  }
  return Math.max(5, Math.min(100, base));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: EDUCATION & AMBITION (5 points)
// ═══════════════════════════════════════════════════════════════════════════════

// Education levels — ordered by academic tier
// vocational (הכשרה מקצועית) and technician (הנדסאי) sit between high_school and bachelor
// student (סטודנט) is treated as equivalent to bachelor (in-progress)
const EDU_LEVEL: Record<string, number> = {
  high_school: 1,
  vocational: 2,   // הכשרה מקצועית / קורס / תעודה
  technician: 2.5, // הנדסאי — practical degree, between vocational and bachelor
  student: 3,      // סטודנט — treated as bachelor-in-progress
  bachelor: 3,
  other: 2,
  master: 4,
  phd: 5,
};

// Special bonus: technician+technician or vocational+vocational = same-track bonus
const EDU_SAME_TRACK_BONUS: Record<string, string[]> = {
  technician: ["technician", "vocational", "bachelor"],
  vocational:  ["vocational", "technician"],
  student:     ["student", "bachelor", "master"],
};

function educationScore(a: Single, b: Single): number {
  if (!a.education || !b.education) return 60;
  const levelA = EDU_LEVEL[a.education] ?? 2;
  const levelB = EDU_LEVEL[b.education] ?? 2;
  const diff = Math.abs(levelA - levelB);

  // Same education type = perfect match
  if (a.education === b.education) return 100;

  // Same-track bonus: technician+bachelor, vocational+technician etc.
  const trackA = EDU_SAME_TRACK_BONUS[a.education] ?? [];
  const trackB = EDU_SAME_TRACK_BONUS[b.education] ?? [];
  if (trackA.includes(b.education) || trackB.includes(a.education)) return 90;

  // Numeric level difference scoring
  if (diff <= 0.5) return 95;  // e.g. technician(2.5) vs bachelor(3)
  if (diff <= 1)   return 80;
  if (diff <= 1.5) return 70;
  if (diff <= 2)   return 55;
  if (diff <= 3)   return 35;
  return 20;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: ASTROLOGY BONUS (0-5 points)
// ═══════════════════════════════════════════════════════════════════════════════

function getZodiacSign(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null;
  try {
    const parts = birthDate.split("-").map(Number);
    const month = parts[1];
    const day = parts[2];
    if (!month || !day) return null;
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "aries";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "taurus";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "gemini";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "cancer";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "leo";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "virgo";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "libra";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "scorpio";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "sagittarius";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "capricorn";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "aquarius";
    return "pisces";
  } catch {
    return null;
  }
}

function getZodiacElement(sign: string): "fire" | "earth" | "air" | "water" | null {
  const elements: Record<string, "fire" | "earth" | "air" | "water"> = {
    aries: "fire", leo: "fire", sagittarius: "fire",
    taurus: "earth", virgo: "earth", capricorn: "earth",
    gemini: "air", libra: "air", aquarius: "air",
    cancer: "water", scorpio: "water", pisces: "water",
  };
  return elements[sign] ?? null;
}

const ZODIAC_NAMES_HE: Record<string, string> = {
  aries: "טלה", taurus: "שור", gemini: "תאומים", cancer: "סרטן",
  leo: "אריה", virgo: "בתולה", libra: "מאזניים", scorpio: "עקרב",
  sagittarius: "קשת", capricorn: "גדי", aquarius: "דלי", pisces: "דגים",
};

function scoreAstrology(a: Single, b: Single): { bonus: number; detail: string | null } {
  const signA = getZodiacSign((a as any).birthDate);
  const signB = getZodiacSign((b as any).birthDate);
  if (!signA || !signB) return { bonus: 0, detail: null };
  const elemA = getZodiacElement(signA);
  const elemB = getZodiacElement(signB);
  if (!elemA || !elemB) return { bonus: 0, detail: null };
  const nameA = ZODIAC_NAMES_HE[signA] ?? signA;
  const nameB = ZODIAC_NAMES_HE[signB] ?? signB;
  if (elemA === elemB) {
    return { bonus: 5, detail: `${nameA} + ${nameB}, אותו אלמנט אסטרולוגי, הרמוניה טבעית` };
  }
  const compatible = (
    (elemA === "fire" && elemB === "air") || (elemA === "air" && elemB === "fire") ||
    (elemA === "water" && elemB === "earth") || (elemA === "earth" && elemB === "water")
  );
  if (compatible) {
    return { bonus: 3, detail: `${nameA} + ${nameB}, אלמנטים משלימים` };
  }
  const challenging = (
    (elemA === "fire" && elemB === "water") || (elemA === "water" && elemB === "fire") ||
    (elemA === "earth" && elemB === "air") || (elemA === "air" && elemB === "earth")
  );
  if (challenging) return { bonus: 0, detail: null };
  return { bonus: 1, detail: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: CITY INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

type CityProfile = "affluent" | "religious_hub" | "liberal" | "family_oriented" | "adventurous" | "mixed";

const CITY_PROFILES: Record<string, CityProfile> = {
  "סביון": "affluent", "כפר שמריהו": "affluent", "הרצליה פיתוח": "affluent",
  "קיסריה": "affluent", "כוכב יאיר": "affluent", "מכמורת": "affluent",
  "תל אביב": "liberal", "תל אביב-יפו": "liberal", "גבעתיים": "liberal", "פלורנטין": "liberal",
  "בני ברק": "religious_hub", "מודיעין עילית": "religious_hub", "ביתר עילית": "religious_hub",
  "ירושלים": "religious_hub", "בית שמש": "religious_hub", "נתיבות": "religious_hub",
  "אילת": "adventurous", "מצפה רמון": "adventurous", "ערד": "adventurous",
  "רעננה": "family_oriented", "מודיעין": "family_oriented", "רמת השרון": "family_oriented",
  "כפר סבא": "family_oriented", "הוד השרון": "family_oriented", "נס ציונה": "family_oriented",
  "זכרון יעקב": "family_oriented", "יוקנעם": "family_oriented",
};

function getCityProfile(city: string | null | undefined): CityProfile {
  if (!city) return "mixed";
  return CITY_PROFILES[city] ?? "mixed";
}

function scoreCityIntelligence(a: Single, b: Single): { score: number; narrativeHints: string[] } {
  const profA = getCityProfile(a.city);
  const profB = getCityProfile(b.city);
  const hints: string[] = [];
  if (profA === profB && profA !== "mixed") {
    const label = profA === "affluent" ? "אמיד" : profA === "liberal" ? "ליברלי" : profA === "family_oriented" ? "משפחתי" : profA === "adventurous" ? "הרפתקני" : "דתי";
    hints.push(`שניהם מאזור ${label}`);
    return { score: 90, narrativeHints: hints };
  }
  if ((profA === "affluent" && profB === "family_oriented") ||
      (profA === "family_oriented" && profB === "affluent")) {
    hints.push("שניהם מחפשים יציבות ואיכות חיים");
    return { score: 80, narrativeHints: hints };
  }
  if ((profA === "liberal" && profB === "adventurous") ||
      (profA === "adventurous" && profB === "liberal")) {
    hints.push("שניהם אוהבים חופש ופתיחות");
    return { score: 80, narrativeHints: hints };
  }
  if ((profA === "religious_hub" && profB === "liberal") ||
      (profA === "liberal" && profB === "religious_hub")) {
    return { score: 40, narrativeHints: [] };
  }
  return { score: 65, narrativeHints: hints };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: NLP TEXT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9b: TEXT BONUS, "What one seeks" matches "What the other IS"
// ═══════════════════════════════════════════════════════════════════════════════
function scoreTextBonus(a: Single, b: Single): { bonus: number; hints: string[] } {
  let bonus = 0;
  const hints: string[] = [];
  const aboutA = ((a as any).about || "").toLowerCase();
  const aboutB = ((b as any).about || "").toLowerCase();
  const seekA = ((a as any).partnerDescription || "").toLowerCase();
  const seekB = ((b as any).partnerDescription || "").toLowerCase();
  const interestsA = ((a as any).interests || "").toLowerCase();
  const interestsB = ((b as any).interests || "").toLowerCase();
  const occupationA = ((a as any).occupation || "").toLowerCase();
  const occupationB = ((b as any).occupation || "").toLowerCase();
  // Check: what A seeks appears in B about/interests (and vice versa)
  const seekAWords = extractMeaningfulWords(seekA);
  const seekBWords = extractMeaningfulWords(seekB);
  const profileA = aboutA + " " + interestsA + " " + occupationA;
  const profileB = aboutB + " " + interestsB + " " + occupationB;
  // A seeks something that B IS
  let aSeeksBIs = 0;
  for (const word of seekAWords) {
    if (profileB.includes(word)) aSeeksBIs++;
  }
  // B seeks something that A IS
  let bSeeksAIs = 0;
  for (const word of seekBWords) {
    if (profileA.includes(word)) bSeeksAIs++;
  }
  if (aSeeksBIs >= 2) { bonus += 2; hints.push("מה שהיא מחפשת, הוא בדיוק מתאר את עצמו ככה"); }
  else if (aSeeksBIs >= 1) { bonus += 1; }
  if (bSeeksAIs >= 2) { bonus += 2; hints.push("מה שהוא מחפש, היא בדיוק ככה"); }
  else if (bSeeksAIs >= 1) { bonus += 1; }
  // Same occupation/field bonus
  if (occupationA && occupationB && occupationA === occupationB) {
    bonus += 1;
    hints.push("שניהם באותו תחום מקצועי, שפה משותפת");
  }
  // Complementary values: one seeks depth + other writes about depth
  const depthWords = /עומק|רגש|לב|נשמה|אמיתי|כנות|פתיחות|אותנטי|חיבור/;
  const strengthWords = /חזק|ביטחון|מנהיג|יציב|בטוח|אמין|עוגן/;
  if (depthWords.test(seekA) && depthWords.test(aboutB)) { bonus += 1; }
  if (depthWords.test(seekB) && depthWords.test(aboutA)) { bonus += 1; }
  if (strengthWords.test(seekA) && strengthWords.test(aboutB)) { bonus += 1; }
  if (strengthWords.test(seekB) && strengthWords.test(aboutA)) { bonus += 1; }
  return { bonus: Math.min(5, bonus), hints };
}
function extractMeaningfulWords(text: string): string[] {
  if (!text) return [];
  const stopWords = new Set(["את","של","עם","על","לי","שלי","מאוד","גם","או","לא","כן","אני","הוא","היא","זה","מי","מה","שיהיה","טוב","טובה"]);
  return text.split(/[\s,\.!?]+/).filter(w => w.length > 2 && !stopWords.has(w));
}


function extractTextTags(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  const t = text.toLowerCase();
  const tags = new Set<string>();
  if (/משפח|ילד|בית|הורה|אמא|אבא|סבא|סבתא|ביחד|בית חם/.test(t)) tags.add("family");
  if (/טיול|הרפתקה|טבע|טרק|ים|הר|לטייל|לגלות|ספונטני|חופש/.test(t)) tags.add("adventure");
  if (/קריירה|עבודה|שאפתן|מקצועי|עסק|הצלחה|יזם|פרוייקט/.test(t)) tags.add("career");
  if (/שקט|סרט|ספר|קפה|נוח|פשוט|רגוע|ביתי/.test(t)) tags.add("quiet");
  if (/חבר|מסיבה|חברתי|יוצא|מסעדה|בילוי|אנשים|קבוצה/.test(t)) tags.add("social");
  if (/רוחני|מדיטציה|יוגה|נשמה|אמונה|תפילה|שבת|חג/.test(t)) tags.add("spiritual");
  if (/יציב|בטוח|אמין|נאמן|רציני|מחויב|בשל/.test(t)) tags.add("stability");
  return tags;
}

function scoreNLPCompatibility(a: Single, b: Single): { score: number; hints: string[] } {
  const textA = [(a as any).about, (a as any).partnerDescription].filter(Boolean).join(" ");
  const textB = [(b as any).about, (b as any).partnerDescription].filter(Boolean).join(" ");
  const tagsA = extractTextTags(textA);
  const tagsB = extractTextTags(textB);
  if (tagsA.size === 0 || tagsB.size === 0) return { score: 50, hints: [] };
  const overlap = Array.from(tagsA).filter(t => tagsB.has(t));
  const hints: string[] = [];
  if (overlap.includes("family")) hints.push("שניהם שמים משפחה במרכז");
  if (overlap.includes("adventure")) hints.push("שניהם אוהבים הרפתקאות וטיולים");
  if (overlap.includes("quiet")) hints.push("שניהם מעריכים שקט ורגיעה");
  if (overlap.includes("stability")) hints.push("שניהם מחפשים יציבות ובגרות");
  if (overlap.includes("social")) hints.push("שניהם אוהבים חיי חברה");
  const score = overlap.length === 0 ? 40 : overlap.length === 1 ? 60 : overlap.length === 2 ? 75 : 90;
  return { score, hints };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: INTERACTION BONUSES (7 points)
// ═══════════════════════════════════════════════════════════════════════════════

function computeInteractionBonuses(a: Single, b: Single): { score: number; details: string[] } {
  let bonus = 0;
  const details: string[] = [];
  const aChapter2 = a.maritalStatus === "divorced" || a.maritalStatus === "widowed";
  const bChapter2 = b.maritalStatus === "divorced" || b.maritalStatus === "widowed";
  const aHasKids = a.hasKids ?? false;
  const bHasKids = b.hasKids ?? false;

  if (a.maritalStatus === "widowed" && b.maritalStatus === "widowed") {
    bonus += 25;
    details.push("שניהם אלמנ/ה, הבנה עמוקה של אובדן ותקווה חדשה");
  } else if (aChapter2 && bChapter2) {
    bonus += 20;
    details.push("שניהם בפרק ב׳, הבנה הדדית עמוקה");
    if (aHasKids && bHasKids) {
      bonus += 15;
      details.push("שניהם הורים, מבינים את המציאות של גידול ילדים");
    }
  }

  if (!aHasKids && !bHasKids && a.wantsKids === "no" && b.wantsKids === "no") {
    bonus += 20;
    details.push("שניהם בחרו בחיים ללא ילדים, הלמה מאוד חשובה");
  }

  if (!aHasKids && !bHasKids && a.wantsKids === "yes" && b.wantsKids === "yes") {
    const ageA = a.age ?? 30;
    const ageB = b.age ?? 30;
    const ageDiff = Math.abs(ageA - ageB);
    const bothYoungEnough = ageA <= 42 && ageB <= 50;
    if (ageDiff <= 5 && bothYoungEnough) {
      bonus += 25;
      details.push("שניהם רוצים ילדים ובגיל הנכון, תזמון מושלם");
    }
  }

  if (aHasKids && bHasKids &&
      a.kidsInvolvement === "grown" && b.kidsInvolvement === "grown") {
    bonus += 18;
    details.push("לשניהם ילדים בוגרים, חופש ובגרות לזוגיות חדשה");
  }

  if (a.city && b.city && a.city === b.city) {
    bonus += 20;
    details.push(`שניהם מ${a.city}, קרבה גיאוגרפית מושלמת`);
  }

  const isHetero = a.gender !== b.gender;
  if (isHetero) {
    const male   = a.gender === "male" ? a : b;
    const female = a.gender === "female" ? a : b;
    if (male.dnaType === "leader" && female.dnaType === "anchor") {
      bonus += 15;
      details.push("מנהיג + עוגן, שילוב מנצח של כוח ויציבות");
    } else if (male.dnaType === "anchor" && female.dnaType === "leader") {
      bonus += 12;
      details.push("עוגן + מנהיגה, שילוב חזק ומאוזן");
    }
    if ((male.dnaType === "romantic" && female.dnaType === "anchor") ||
        (male.dnaType === "anchor" && female.dnaType === "romantic")) {
      bonus += 12;
      details.push("רומנטיקן + עוגן, תשוקה מעוגנת");
    }
  }

  const nlp = scoreNLPCompatibility(a, b);
  if (nlp.hints.length > 0) {
    bonus += Math.round((nlp.score - 50) / 5);
    details.push(...nlp.hints);
  }

  if (a.relationshipPace && b.relationshipPace && a.relationshipPace === b.relationshipPace) {
    bonus += 10;
    details.push("קצב מערכת יחסים דומה");
  }

  if ((a as any).interests && (b as any).interests) {
    const interestsA = new Set((a as any).interests.toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean));
    const interestsB = new Set((b as any).interests.toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean));
    let overlap = 0;
    Array.from(interestsA).forEach((i: unknown) => { if (interestsB.has(i)) overlap++; });
    if (overlap >= 3) { bonus += 15; details.push("תחומי עניין משותפים רבים"); }
    else if (overlap >= 2) { bonus += 10; details.push("תחומי עניין משותפים"); }
    else if (overlap >= 1) { bonus += 4; }
  }

  return { score: Math.min(100, bonus), details };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: SMART NARRATIVE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export function generateMatchNarrative(
  a: Single,
  b: Single,
  score: number,
  breakdown: ScoreBreakdown
): string {
  const lines: string[] = [];
  const aName = (a as any).firstName ?? "היא";
  const bName = (b as any).firstName ?? "הוא";
  if (score >= 85) {
    lines.push(`ראיתי משהו בין ${aName} ל${bName} שגרם לי לחייך.`);
  } else if (score >= 75) {
    lines.push(`יש כאן משהו שמרגיש נכון, ואני רוצה שתכירו.`);
  } else {
    lines.push(`אני רואה פה פוטנציאל אמיתי שמגיע לבדיקה.`);
  }
  const aChapter2 = a.maritalStatus === "divorced" || a.maritalStatus === "widowed";
  const bChapter2 = b.maritalStatus === "divorced" || b.maritalStatus === "widowed";
  if (aChapter2 && bChapter2) {
    lines.push(`שניהם עברו דרך ויודעים מה הם רוצים. זה לא מקרה.`);
  }
  const cityA = getCityProfile(a.city);
  const cityB = getCityProfile(b.city);
  if (cityA === "affluent" || cityB === "affluent") {
    lines.push(`יש כאן התאמה של אורח חיים ורמת חיים שלא תמיד קל למצוא.`);
  }
  if (cityA === "family_oriented" && cityB === "family_oriented") {
    lines.push(`שניהם בחרו לגור באזור משפחתי, וזה אומר הרבה על מה שחשוב להם.`);
  }
  const nlp = scoreNLPCompatibility(a, b);
  if (nlp.hints.length > 0) {
    lines.push(nlp.hints[0] + ".");
  }
  const isHetero = a.gender !== b.gender;
  if (isHetero && a.dnaType && b.dnaType) {
    const male   = a.gender === "male" ? a : b;
    const female = a.gender === "female" ? a : b;
    if (male.dnaType === "leader" && female.dnaType === "anchor") {
      lines.push(`הוא מנהיג שצריך עוגן, והיא בדיוק זה. שילוב שעובד.`);
    } else if (male.dnaType === "romantic" && female.dnaType === "anchor") {
      lines.push(`הוא רומנטיקן שמחפש יציבות, והיא נותנת בדיוק את זה.`);
    } else if (male.dnaType === "anchor" && female.dnaType === "leader") {
      lines.push(`היא יודעת מה היא רוצה, והוא מספק את היציבות שהיא צריכה.`);
    }
  }
  const astro = scoreAstrology(a, b);
  if (astro.detail) {
    lines.push(`גם האסטרולוגיה מסכימה: ${astro.detail}.`);
  }
  lines.push(`תני לזה סיכוי אמיתי. לפעמים הדברים הכי טובים מגיעים בדיוק כשאנחנו פחות מצפים.`);
  return lines.join(" ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: HARD FILTER CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export function passesHardFilters(a: Single, b: Single): { pass: boolean; reason?: string } {
  // "any" defaults to opposite gender to prevent same-gender matches
  const aEffSeeking = (!a.seekingGender || a.seekingGender === 'any') ? (a.gender === 'female' ? 'male' : 'female') : a.seekingGender;
  const bEffSeeking = (!b.seekingGender || b.seekingGender === 'any') ? (b.gender === 'female' ? 'male' : 'female') : b.seekingGender;
  const aSeeksB = aEffSeeking === b.gender;
  const bSeeksA = bEffSeeking === a.gender;
  if (!aSeeksB || !bSeeksA) return { pass: false, reason: "אי-התאמה במגדר המבוקש" };

  const relA = a.religiosity ?? "secular";
  const relB = b.religiosity ?? "secular";
  if (isReligiosityDisqualified(relA, relB)) {
    return { pass: false, reason: `אי-התאמה דתית מוחלטת: ${relA} + ${relB}` };
  }

  const ageA = a.age ?? 30;
  const ageB = b.age ?? 30;
  // Strict age filter - no tolerance, respect exact preference range
  if (b.minAgePreference && ageA < b.minAgePreference)
    return { pass: false, reason: `גיל ${ageA} נמוך מדי (מינימום ${b.minAgePreference})` };
  if (b.maxAgePreference && ageA > b.maxAgePreference)
    return { pass: false, reason: `גיל ${ageA} גבוה מדי (מקסימום ${b.maxAgePreference})` };
  if (a.minAgePreference && ageB < a.minAgePreference)
    return { pass: false, reason: `גיל ${ageB} נמוך מדי (מינימום ${a.minAgePreference})` };
  if (a.maxAgePreference && ageB > a.maxAgePreference)
    return { pass: false, reason: `גיל ${ageB} גבוה מדי (מקסימום ${a.maxAgePreference})` };

  const isMaleFemale = a.gender === "male" && b.gender === "female";
  const isFemaleMale = a.gender === "female" && b.gender === "male";
  if (isMaleFemale || isFemaleMale) {
    const male   = isMaleFemale ? a : b;
    const female = isMaleFemale ? b : a;
    const maleH   = male.height ?? null;
    const femaleH = female.height ?? null;
    // Man must always be taller than or equal to woman (strict)
    if (maleH !== null && femaleH !== null && maleH < femaleH) {
      return { pass: false, reason: `גובה הגבר (${maleH}) נמוך מגובה האישה (${femaleH})` };
    }
    // Strict height preference filter for woman's minimum
    if (female.minHeightPreference && maleH !== null && maleH < female.minHeightPreference) {
      return { pass: false, reason: `גובה הגבר (${maleH}) מתחת למינימום המבוקש (${female.minHeightPreference})` };
    }
    if (female.maxHeightPreference && maleH !== null && maleH > female.maxHeightPreference) {
      return { pass: false, reason: `גובה הגבר (${maleH}) מעל המקסימום המבוקש (${female.maxHeightPreference})` };
    }
    // Also check man's height preferences
    if (male.minHeightPreference && femaleH !== null && femaleH < male.minHeightPreference) {
      return { pass: false, reason: `גובה האישה (${femaleH}) מתחת למינימום המבוקש (${male.minHeightPreference})` };
    }
    if (male.maxHeightPreference && femaleH !== null && femaleH > male.maxHeightPreference) {
      return { pass: false, reason: `גובה האישה (${femaleH}) מעל המקסימום המבוקש (${male.maxHeightPreference})` };
    }
  }
  if (a.gender === b.gender) {
    const aH = a.height ?? null;
    const bH = b.height ?? null;
    if (b.minHeightPreference && aH !== null && aH < b.minHeightPreference)
      return { pass: false, reason: `גובה מתחת למינימום המבוקש` };
    if (b.maxHeightPreference && aH !== null && aH > b.maxHeightPreference)
      return { pass: false, reason: `גובה מעל המקסימום המבוקש` };
    if (a.minHeightPreference && bH !== null && bH < a.minHeightPreference)
      return { pass: false, reason: `גובה מתחת למינימום המבוקש` };
    if (a.maxHeightPreference && bH !== null && bH > a.maxHeightPreference)
      return { pass: false, reason: `גובה מעל המקסימום המבוקש` };
  }

  const aHasKids = a.hasKids ?? false;
  const bHasKids = b.hasKids ?? false;
  if (aHasKids && b.openToPartnerWithKids === "no")
    return { pass: false, reason: "לא מקבל/ת ילדים של פרטנר" };
  if (bHasKids && a.openToPartnerWithKids === "no")
    return { pass: false, reason: "לא מקבל/ת ילדים של פרטנר" };
  if (!aHasKids && !bHasKids) {
    if (a.wantsKids === "yes" && b.wantsKids === "no")
      return { pass: false, reason: "אחד רוצה ילדים והשני לא" };
    if (a.wantsKids === "no" && b.wantsKids === "yes")
      return { pass: false, reason: "אחד רוצה ילדים והשני לא" };
  }
  if (a.wantsKids === "no" && b.wantsKids === "yes" && !bHasKids)
    return { pass: false, reason: "אחד לא רוצה ילדים נוספים והשני רוצה ילדים" };
  if (b.wantsKids === "no" && a.wantsKids === "yes" && !aHasKids)
    return { pass: false, reason: "אחד לא רוצה ילדים נוספים והשני רוצה ילדים" };

  const locResult = scoreLocationV8(a.city, b.city, a.locationPreference, b.locationPreference);
  if (a.locationPreference === "close" && b.locationPreference === "close" &&
      locResult.distanceKm !== null && locResult.distanceKm > 50) {
    return { pass: false, reason: `שניהם מחפשים קרוב אך מרחק ${locResult.distanceKm} ק"מ` };
  }
  // ── SMOKING hard filter ──────────────────────────────────────────────────
  const aSmokingStatus = (a as any).smokingStatus as string | null;
  const bSmokingStatus = (b as any).smokingStatus as string | null;
  const aSmokingPref   = (a as any).smokingPreference as string | null;
  const bSmokingPref   = (b as any).smokingPreference as string | null;
  const aActuallySmokes = aSmokingStatus === "yes" || aSmokingStatus === "occasionally";
  const bActuallySmokes = bSmokingStatus === "yes" || bSmokingStatus === "occasionally";
  if (aSmokingPref === "no_smokers" && bActuallySmokes)
    return { pass: false, reason: "אי-התאמה בעישון: אחד דורש שהשני לא יעשן" };
  if (bSmokingPref === "no_smokers" && aActuallySmokes)
    return { pass: false, reason: "אי-התאמה בעישון: אחד דורש שהשני לא יעשן" };

  return { pass: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════


// ─── Smoking compatibility bonus (up to 5 pts) ───────────────────────────────
// Scoring logic:
//   - Both non-smokers: +5
//   - Both occasional: +4
//   - Both smokers: +3
//   - One non-smoker prefers non-smokers, other smokes: 0 (hard mismatch)
//   - One non-smoker ok with occasional, other occasional: +3
//   - One non-smoker "doesnt_matter", other smokes: +2
//   - Otherwise partial: +2
function scoreSmokingCompatibility(a: Single, b: Single): { bonus: number; detail: string | null } {
  const aStatus = (a as any).smokingStatus as string | null;
  const bStatus = (b as any).smokingStatus as string | null;
  const aPref   = (a as any).smokingPreference as string | null;
  const bPref   = (b as any).smokingPreference as string | null;

  // If either hasn't answered, no bonus/penalty
  if (!aStatus || !bStatus) return { bonus: 0, detail: null };

  // Both non-smokers → perfect match
  if (aStatus === "no" && bStatus === "no") return { bonus: 5, detail: "שניהם לא מעשנים" };
  // Both occasional → perfect match
  if (aStatus === "occasionally" && bStatus === "occasionally") return { bonus: 5, detail: null };
  // Both smokers → perfect match (they're compatible)
  if (aStatus === "yes" && bStatus === "yes") return { bonus: 5, detail: null };

  // Mismatch cases, check preferences
  const aSmokes = aStatus === "yes" || aStatus === "occasionally";
  const bSmokes = bStatus === "yes" || bStatus === "occasionally";

  if (!aSmokes && bSmokes) {
    if (aPref === "no_smokers") return { bonus: 0, detail: "לא מעשנת מחפשת מי שלא מעשן" };
    if (aPref === "doesnt_matter") return { bonus: 5, detail: null }; // doesn't mind → full match
    if (aPref === "occasionally_ok" && bStatus === "occasionally") return { bonus: 4, detail: null };
    return { bonus: 1, detail: null };
  }
  if (aSmokes && !bSmokes) {
    if (bPref === "no_smokers") return { bonus: 0, detail: "לא מעשן/ת מחפש/ת מי שלא מעשן" };
    if (bPref === "doesnt_matter") return { bonus: 5, detail: null }; // doesn't mind → full match
    if (bPref === "occasionally_ok" && aStatus === "occasionally") return { bonus: 4, detail: null };
    return { bonus: 1, detail: null };
  }

  return { bonus: 2, detail: null };
}

export function computeFullScore(
  a: Single,
  b: Single,
  answersA: MatchAnswer[],
  answersB: MatchAnswer[]
): ScoreBreakdown {
  const details: string[] = [];

  const hardCheck = passesHardFilters(a, b);
  if (!hardCheck.pass) {
    details.push(`פסילה מוחלטת: ${hardCheck.reason}`);
    return {
      total: 0, questionnaire: 0, lifeStage: 0, dna: 0, textBonus: 0,
      practical: 0, religiosity: 0, education: 0, interactionBonus: 0,
      astrologyBonus: 0, cityIntelligence: 0, details,
    };
  }

  const qScore      = scoreQuestionnaire(answersA, answersB, a, b);
  const lsScore     = scoreLifeStage(a, b);
  const dnaScore    = getDnaSynergy(a.dnaType, b.dnaType, a.gender, b.gender);
  const prScore     = scorePractical(a, b);
  const relScore    = religiosityScore(a, b);
  const eduScore    = educationScore(a, b);
  const interaction = computeInteractionBonuses(a, b);
  const astro       = scoreAstrology(a, b);
  const textBon     = scoreTextBonus(a, b);
  const cityIntel   = scoreCityIntelligence(a, b);
  const smokingBon  = scoreSmokingCompatibility(a, b);

  details.push(...interaction.details);
  if (astro.detail) details.push(astro.detail);
  if (cityIntel.narrativeHints.length > 0) details.push(...cityIntel.narrativeHints);
  if (textBon.hints.length > 0) details.push(...textBon.hints);
  if (smokingBon.detail) details.push(smokingBon.detail);

  let total = Math.round(
    qScore      * 0.40 +
    lsScore     * 0.20 +
    dnaScore    * 0.13 +
    relScore    * 0.10 +
    interaction.score * 0.07 +
    eduScore    * 0.05 +
    prScore     * 0.05
  );

  total = Math.min(97, total + astro.bonus + textBon.bonus + smokingBon.bonus);
  total = Math.max(12, Math.min(97, total));

  return {
    total,
    questionnaire: qScore,
    lifeStage: lsScore,
    dna: dnaScore,
    practical: prScore,
    religiosity: relScore,
    education: eduScore,
    interactionBonus: interaction.score,
    astrologyBonus: astro.bonus,
    textBonus: textBon.bonus,
    cityIntelligence: cityIntel.score,
    details,
  };
}

// ─── Admin override: bypass hard filters, collect warnings instead ───────────
export function computeFullScoreAdmin(
  a: Single,
  b: Single,
  answersA: MatchAnswer[],
  answersB: MatchAnswer[]
): ScoreBreakdown & { warnings: string[] } {
  const warnings: string[] = [];
  // Run hard filters but collect warnings instead of returning 0
  const hardCheck = passesHardFilters(a, b);
  if (!hardCheck.pass) {
    warnings.push(`⚠️ ${hardCheck.reason}`);
  }
  const qScore      = scoreQuestionnaire(answersA, answersB, a, b);
  const lsScore     = scoreLifeStage(a, b);
  const dnaScore    = getDnaSynergy(a.dnaType, b.dnaType, a.gender, b.gender);
  const prScore     = scorePractical(a, b);
  const relScore    = religiosityScore(a, b);
  const eduScore    = educationScore(a, b);
  const interaction = computeInteractionBonuses(a, b);
  const astro       = scoreAstrology(a, b);
  const textBon     = scoreTextBonus(a, b);
  const cityIntel   = scoreCityIntelligence(a, b);
  const smokingBon  = scoreSmokingCompatibility(a, b);
  const details: string[] = [];
  details.push(...interaction.details);
  if (astro.detail) details.push(astro.detail);
  if (cityIntel.narrativeHints.length > 0) details.push(...cityIntel.narrativeHints);
  if (textBon.hints.length > 0) details.push(...textBon.hints);
  if (smokingBon.detail) details.push(smokingBon.detail);
  let total = Math.round(
    qScore      * 0.40 +
    lsScore     * 0.20 +
    dnaScore    * 0.13 +
    relScore    * 0.10 +
    interaction.score * 0.07 +
    eduScore    * 0.05 +
    prScore     * 0.05
  );
  total = Math.min(97, total + astro.bonus + textBon.bonus + smokingBon.bonus);
  total = Math.max(12, Math.min(97, total));
  return {
    total,
    questionnaire: qScore,
    lifeStage: lsScore,
    dna: dnaScore,
    practical: prScore,
    religiosity: relScore,
    education: eduScore,
    interactionBonus: interaction.score,
    astrologyBonus: astro.bonus,
    textBonus: textBon.bonus,
    cityIntelligence: cityIntel.score,
    details,
    warnings,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14: MATCH FINDING
// ═══════════════════════════════════════════════════════════════════════════════

export type MatchResult = {
  singleA: number;
  singleB: number;
  score: number;
  breakdown: ScoreBreakdown;
  narrative?: string;
};

export function findAllMatches(
  singles: Single[],
  answersMap: Map<number, MatchAnswer[]>
): MatchResult[] {
  const results: MatchResult[] = [];
  for (let i = 0; i < singles.length; i++) {
    for (let j = i + 1; j < singles.length; j++) {
      const a = singles[i];
      const b = singles[j];
      const answersA = answersMap.get(a.id) ?? [];
      const answersB = answersMap.get(b.id) ?? [];
      const breakdown = computeFullScore(a, b, answersA, answersB);
      if (breakdown.total > 0 && breakdown.total >= MATCH_THRESHOLD) {
        const narrative = generateMatchNarrative(a, b, breakdown.total, breakdown);
        results.push({ singleA: a.id, singleB: b.id, score: breakdown.total, breakdown, narrative });
      }
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 15: LEGACY EXPORTS (backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

export { scoreLocation };

export async function scoreOpenText(
  textA: string | null | undefined,
  textB: string | null | undefined,
  textC?: string | null | undefined,
  textD?: string | null | undefined
): Promise<number> {
  const combined1 = (textA ?? "") + " " + (textD ?? "");
  const combined2 = (textB ?? "") + " " + (textC ?? "");
  if (!combined1.trim() || !combined2.trim()) return 50;
  const wordsA = new Set(combined1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(combined2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const overlap = Array.from(wordsA).filter(w => wordsB.has(w)).length;
  return Math.min(50 + overlap * 5, 85);
}

export async function scoreVisualAsync(
  _photoA: string | null | undefined,
  _photoB: string | null | undefined
): Promise<number> {
  return 75;
}

export function computeProfileScore(a: Single, b: Single): number {
  return computeFullScore(a, b, [], []).total;
}

export function calculateCompatibility(
  a: Single, b: Single, answersA: MatchAnswer[], answersB: MatchAnswer[]
): number {
  return computeFullScore(a, b, answersA, answersB).total;
}

export function findMatches(
  personId: number,
  pool: Single[],
  answersMap: Map<number, MatchAnswer[]>,
  threshold = MATCH_THRESHOLD
): Array<{ memberId: number; score: number }> {
  const person = pool.find(s => s.id === personId);
  if (!person) return [];
  const answersA = answersMap.get(personId) ?? [];
  return pool
    .filter(s => s.id !== personId)
    .map(s => ({
      memberId: s.id,
      score: computeFullScore(person, s, answersA, answersMap.get(s.id) ?? []).total,
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

export async function findMatchesWithText(
  personId: number,
  answers: MatchAnswer[],
  _dnaType: string | null,
  gender: string,
  _seekingGender: string,
  _about: string | null,
  _partnerDescription: string | null,
  pool: Array<Single & { answers: MatchAnswer[] }>,
  threshold = MATCH_THRESHOLD
): Promise<Array<{ memberId: number; score: number }>> {
  const person = pool.find(s => s.id === personId);
  if (!person) return [];
  const results: Array<{ memberId: number; score: number }> = [];
  for (const candidate of pool) {
    if (candidate.id === personId) continue;
    // "any" means open to any gender BUT we still enforce opposite-gender default
    // to prevent same-gender matches unless explicitly seeking same gender
    const oppositeOfPerson = person.gender === 'female' ? 'male' : 'female';
    const oppositeOfCandidate = candidate.gender === 'female' ? 'male' : 'female';
    const personEffectiveSeeking = (!person.seekingGender || person.seekingGender === 'any') ? oppositeOfPerson : person.seekingGender;
    const candidateEffectiveSeeking = (!candidate.seekingGender || candidate.seekingGender === 'any') ? oppositeOfCandidate : candidate.seekingGender;
    const personSeeksCandidate = personEffectiveSeeking === candidate.gender;
    const candidateSeeksPerson = candidateEffectiveSeeking === gender;
    if (!personSeeksCandidate || !candidateSeeksPerson) continue;
    const bd = computeFullScore(person, candidate, answers, candidate.answers ?? []);
    if (bd.total >= threshold) {
      results.push({ memberId: candidate.id, score: bd.total });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}
