import { describe, expect, it, vi } from "vitest";
import type { Single } from "../drizzle/schema";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import { computeFullScore, computeFullScoreAdmin } from "./compatibility";
import { evaluateMatchPreview } from "./matchScorePreview";

const mock = vi.hoisted(() => ({ db: null as any }));
vi.mock("./db", () => ({ getDb: async () => mock.db }));
import { matchScoringProfileColumns, rankAdvancedCandidates, scoreAdvancedPair } from "./advancedMatchRanking";

const basePerson = (id: number, extra: Partial<Single> = {}): Single => ({
  id,
  gender: id % 2 ? "female" : "male",
  seekingGender: id % 2 ? "male" : "female",
  age: 35,
  birthDate: "1990-05-15",
  city: "חיפה",
  height: id % 2 ? 165 : 180,
  education: "bachelor",
  religiosity: "secular",
  religiosityOrigin: "cultural",
  occupation: "מורה",
  about: "משפחה טיולים יציבות",
  interests: "טיולים,ספרים,קפה",
  maritalStatus: "single",
  hasKids: false,
  numKids: 0,
  wantsKids: "open",
  dnaType: "anchor",
  openToPartnerWithKids: "yes",
  kidsInvolvement: "grown",
  relationshipPace: "medium",
  hasPets: false,
  acceptsPets: true,
  locationPreference: "anywhere",
  smokingStatus: "no",
  smokingPreference: "doesnt_matter",
  isActive: true,
  isSeed: false,
  ...extra,
} as Single);

const pair = (a: Partial<Single> = {}, b: Partial<Single> = {}) => [basePerson(1, a), basePerson(2, b)] as const;
const answer = (qId: string, myAnswer: number, importance: 0 | 1 | 2 = 2): MatchAnswer => ({ qId, myAnswer, importance });

function legacyPreview(a: Single, b: Single, answersA: MatchAnswer[], answersB: MatchAnswer[]) {
  const strict = computeFullScore(a, b, answersA, answersB);
  const breakdown = computeFullScoreAdmin(a, b, answersA, answersB);
  const hardBlockReason = strict.details.find(detail => detail.startsWith("פסילה מוחלטת:"))
    ?.replace(/^פסילה מוחלטת:\s*/, "") || null;
  const warnings = [...breakdown.warnings];
  if (hardBlockReason && !warnings.some(warning => warning.includes(hardBlockReason))) {
    warnings.unshift(`⚠️ ${hardBlockReason}`);
  }
  return {
    score: breakdown.total,
    breakdown,
    warnings,
    hasHardBlock: strict.total === 0,
    hardBlockReason,
    canOverrideCriteria: strict.total === 0 && !!hardBlockReason && !hardBlockReason.includes("מגדר המבוקש"),
  };
}

let state = 0x9e3779b9;
const random = () => {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 2 ** 32;
};
const pick = <T,>(values: readonly T[]) => values[Math.floor(random() * values.length)]!;

function randomPerson(id: number): Single {
  return basePerson(id, {
    gender: pick(["female", "male"] as const),
    seekingGender: pick(["female", "male", "any", null]),
    age: Math.floor(random() * 40) + 20,
    birthDate: pick(["1980-01-20", "1990-06-15", null]),
    city: pick(["חיפה", "תל אביב", "ירושלים", "Unknownville", null]),
    height: pick([null, 155, 165, 175, 185]),
    education: pick(["high_school", "bachelor", "master", "other", null]),
    religiosity: pick(["secular", "traditional", "religious", "orthodox", null]),
    religiosityOrigin: pick(["cultural", "halachic", null]),
    maritalStatus: pick(["single", "divorced", "widowed", null]),
    hasKids: pick([true, false, null]),
    numKids: pick([null, 0, 1, 3]),
    wantsKids: pick(["yes", "no", "open", null]),
    dnaType: pick(["leader", "romantic", "free_spirit", "anchor", null]),
    openToPartnerWithKids: pick(["yes", "no", "depends_on_age", null]),
    kidsInvolvement: pick(["full_time", "weekends", "rarely", "grown", null]),
    relationshipPace: pick(["slow", "medium", "fast", null]),
    hasPets: pick([true, false, null]),
    acceptsPets: pick([true, false, null]),
    minAgePreference: pick([null, 25, 35, 45]),
    maxAgePreference: pick([null, 30, 40, 50]),
    minHeightPreference: pick([null, 160, 170, 180]),
    maxHeightPreference: pick([null, 160, 170, 180]),
    religiosityPreference: pick([null, "secular, traditional", "religious"]),
    locationPreference: pick(["close", "anywhere", null]),
    smokingStatus: pick(["no", "occasionally", "yes", null]),
    smokingPreference: pick(["no_smokers", "occasionally_ok", "doesnt_matter", null]),
    about: pick(["משפחה טיולים", "שקט קריירה", null]),
    interests: pick(["טיולים,ספרים", "יוגה,קפה", null]),
    occupation: pick(["מורה", "מהנדס", null]),
    partnerDescription: pick(["יציבות ומשפחה", "חופש והרפתקה", null]),
  });
}

function randomAnswers(): MatchAnswer[] {
  const result: MatchAnswer[] = [];
  for (const qId of ["q_kids_future", "q_marriage", "q_kids_existing", "q_pets", "q_conflict_style", "q_love_language"]) {
    if (random() < 0.35) continue;
    result.push({ qId, myAnswer: qId === "q_love_language" ? [0, 1, 2] : Math.floor(random() * 4), importance: Math.floor(random() * 3) as 0 | 1 | 2 });
    // A second value verifies first-answer hard filters versus last-value scoring.
    if (random() < 0.25) result.push({ qId, myAnswer: qId === "q_love_language" ? [2, 1, 0] : Math.floor(random() * 4), importance: Math.floor(random() * 3) as 0 | 1 | 2 });
  }
  return result;
}

function scoringProjection(person: Single) {
  return Object.fromEntries(
    Object.keys(matchScoringProfileColumns).map(key => [key, person[key as keyof Single]]),
  );
}

describe("optimized match preview parity", () => {
  it("matches the former strict-plus-admin preview for randomized complete, partial, and duplicate answers", () => {
    for (let i = 0; i < 400; i++) {
      const a = randomPerson(i * 2 + 1);
      const b = randomPerson(i * 2 + 2);
      const answersA = randomAnswers();
      const answersB = randomAnswers();
      expect(evaluateMatchPreview(a, b, answersA, answersB)).toEqual(legacyPreview(a, b, answersA, answersB));
      expect(scoreAdvancedPair(scoringProjection(a), scoringProjection(b), answersA, answersB))
        .toEqual(scoreAdvancedPair(a, b, answersA, answersB));
    }
  });

  it("matches every profile and questionnaire hard-block path, including reason and warning order", () => {
    const sameGender = { gender: "female", seekingGender: "female" } as const;
    const blockers: Array<[Partial<Single>, Partial<Single>, MatchAnswer[], MatchAnswer[]]> = [
      [{ seekingGender: "female" }, {}, [], []],
      [{ religiosity: "secular" }, { religiosity: "orthodox" }, [], []],
      [{}, { minAgePreference: 40 }, [], []],
      [{}, { maxAgePreference: 30 }, [], []],
      [{ minAgePreference: 40 }, {}, [], []],
      [{ maxAgePreference: 30 }, {}, [], []],
      [{ height: 180 }, { height: 170 }, [], []],
      [{ minHeightPreference: 190 }, {}, [], []],
      [{ maxHeightPreference: 170 }, {}, [], []],
      [{}, { minHeightPreference: 170 }, [], []],
      [{}, { maxHeightPreference: 160 }, [], []],
      [{ ...sameGender, height: 165 }, { ...sameGender, height: 175, minHeightPreference: 170 }, [], []],
      [{ ...sameGender, height: 165 }, { ...sameGender, height: 175, maxHeightPreference: 160 }, [], []],
      [{ ...sameGender, height: 175, minHeightPreference: 180 }, { ...sameGender, height: 165 }, [], []],
      [{ ...sameGender, height: 175, maxHeightPreference: 160 }, { ...sameGender, height: 165 }, [], []],
      [{ hasKids: true }, { openToPartnerWithKids: "no" }, [], []],
      [{ openToPartnerWithKids: "no" }, { hasKids: true }, [], []],
      [{ wantsKids: "yes" }, { wantsKids: "no" }, [], []],
      [{ hasKids: true, wantsKids: "no" }, { wantsKids: "yes" }, [], []],
      [{ wantsKids: "yes" }, { hasKids: true, wantsKids: "no" }, [], []],
      [{ city: "תל אביב", locationPreference: "close" }, { city: "חיפה" }, [], []],
      [{ smokingPreference: "no_smokers" }, { smokingStatus: "yes" }, [], []],
      [{ smokingStatus: "yes" }, { smokingPreference: "no_smokers" }, [], []],
      [{}, {}, [answer("q_kids_future", 0)], [answer("q_kids_future", 3)]],
      [{}, {}, [answer("q_marriage", 0)], [answer("q_marriage", 2)]],
      [{}, { hasKids: true }, [answer("q_kids_existing", 3)], []],
      [{ hasKids: true }, {}, [], [answer("q_kids_existing", 3)]],
      [{}, { hasPets: true }, [answer("q_pets", 3, 0)], []],
      [{ hasPets: true }, {}, [], [answer("q_pets", 3, 0)]],
    ];
    for (const [aExtra, bExtra, answersA, answersB] of blockers) {
      const [a, b] = pair(aExtra, bExtra);
      const expected = legacyPreview(a, b, answersA, answersB);
      expect(expected.hasHardBlock).toBe(true);
      expect(evaluateMatchPreview(a, b, answersA, answersB)).toEqual(expected);
    }
  });

  it("keeps first-answer hard filters while questionnaire scoring retains last-value semantics", () => {
    const [a, b] = pair();
    const answersA = [answer("q_kids_future", 0), answer("q_kids_future", 1), answer("q_conflict_style", 0)];
    const answersB = [answer("q_kids_future", 3), answer("q_kids_future", 1), answer("q_conflict_style", 3)];
    const preview = evaluateMatchPreview(a, b, answersA, answersB);
    expect(preview.hasHardBlock).toBe(true);
    expect(preview.hardBlockReason).toContain("ילדים");
    expect(preview.breakdown.questionnaire).toBe(
      computeFullScoreAdmin(
        a,
        b,
        [answer("q_kids_future", 1), answer("q_conflict_style", 0)],
        [answer("q_kids_future", 1), answer("q_conflict_style", 3)],
      ).questionnaire,
    );
    expect(preview).toEqual(legacyPreview(a, b, answersA, answersB));
  });
});

describe("advanced rank scoring projection", () => {
  it("selects every scoring field plus availability headers and preserves duplicate excluded IDs in order", async () => {
    const people = [basePerson(1), basePerson(2), basePerson(3, { isActive: false })];
    const rows = [people, [], []];
    const select = vi.fn(() => ({ from: () => ({ where: async () => rows.shift() }) }));
    mock.db = { select };

    const ranked = await rankAdvancedCandidates(1, [2, 3, 2, 999, 3]);
    expect(ranked.results.map(result => result.id)).toEqual([2]);
    expect(ranked.excludedIds).toEqual([3, 999, 3]);

    const projection = select.mock.calls[0]![0];
    expect(Object.keys(projection).sort()).toEqual([
      "acceptsKids", "acceptsPets", "age", "city", "dnaType", "education", "gender", "hasKids", "hasPets", "height", "id", "interests", "isActive", "isSeed", "kidsInvolvement", "locationPreference", "maritalStatus", "maxAgePreference", "maxHeightPreference", "minAgePreference", "minHeightPreference", "numKids", "openToPartnerWithKids", "relationshipPace", "religiosity", "religiosityOrigin", "religiosityPreference", "seekingGender", "smokingPreference", "smokingStatus", "wantsKids",
    ]);
  });
});
