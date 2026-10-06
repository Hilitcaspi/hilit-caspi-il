import { describe, expect, it } from "vitest";
import type { Single } from "../drizzle/schema";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import { MATCH_SCORE_WEIGHTS, MATCH_SCORING_VERSION } from "../shared/matchScoringPolicy";
import { computeFullScore, computeFullScoreAdmin, educationScore } from "./compatibility";

const edu = (education: Single["education"]) => ({ education });
const person = (gender: "male" | "female", education: Single["education"]): Single => ({
  gender, education, age: 42, seekingGender: gender === "male" ? "female" : "male",
  dnaType: "anchor", religiosity: "secular", hasKids: false,
} as Single);
const answer = (qId: string, myAnswer: number, importance: 0 | 1 | 2): MatchAnswer => ({
  qId, myAnswer, importance,
});

describe("v9 education proximity", () => {
  it("uses all seven approved weights summing to exactly 100%", () => {
    expect(Object.values(MATCH_SCORE_WEIGHTS).reduce((sum, n) => sum + n, 0)).toBeCloseTo(1);
    expect(MATCH_SCORE_WEIGHTS).toMatchObject({
      questionnaire: .40, dna: .15, lifeStage: .20,
      religiosity: .07, interactionBonus: .07, education: .06, practical: .05,
    });
  });

  it("keeps bachelor and master close while recognizing a technician-master gap", () => {
    expect(educationScore(edu("bachelor"), edu("master"))).toBe(95);
    expect(educationScore(edu("master"), edu("technician"))).toBe(25);
    expect(educationScore(edu("technician"), edu("master"))).toBe(25);
    expect(educationScore(edu("bachelor"), edu("technician"))).toBe(50);
    expect(educationScore(edu("high_school"), edu("master"))).toBe(15);
  });

  it("does not treat an unanswered education field as no degree", () => {
    expect(educationScore(edu(null), edu("master"))).toBe(60);
    expect(educationScore(edu("other"), edu("master"))).toBe(60);
  });

  it("keeps non-degree mismatches nuanced, not absolute rejections", () => {
    const higher = person("male", "master");
    const technical = person("female", "technician");
    const bothAcademic = person("female", "bachelor");
    const a = computeFullScore(higher, technical, [], []);
    const b = computeFullScore(higher, bothAcademic, [], []);
    expect(a.education).toBe(25);
    expect(b.education).toBe(95);
    expect(a.total).toBeGreaterThan(0);
    expect(b.total).toBeGreaterThan(a.total);
    expect(a.algorithm).toBe(MATCH_SCORING_VERSION);
    expect(computeFullScoreAdmin(higher, technical, [], []).total).toBe(a.total);
  });
});

describe("v9 questionnaire importance normalization", () => {
  it("does not deflate an otherwise identical answer when both mark low importance", () => {
    const a = person("male", "bachelor");
    const b = person("female", "master");
    const low = computeFullScore(a, b,
      [answer("q_conflict_style", 0, 0)], [answer("q_conflict_style", 0, 0)]);
    const high = computeFullScore(a, b,
      [answer("q_conflict_style", 0, 2)], [answer("q_conflict_style", 0, 2)]);
    expect(low.questionnaire).toBe(high.questionnaire);
  });

  it("lets a high-importance disagreement count more than a low-importance one", () => {
    const a = person("male", "bachelor");
    const b = person("female", "bachelor");
    const qA = [answer("q_conflict_style", 0, 2), answer("q_commitment", 0, 0)];
    const qB = [answer("q_conflict_style", 3, 2), answer("q_commitment", 0, 0)];
    const highDisagreement = computeFullScore(a, b, qA, qB);
    const lowDisagreement = computeFullScore(a, b,
      [answer("q_conflict_style", 0, 0), answer("q_commitment", 0, 2)],
      [answer("q_conflict_style", 3, 0), answer("q_commitment", 0, 2)]);
    expect(highDisagreement.questionnaire).toBeLessThan(lowDisagreement.questionnaire);
  });

  it("does not inflate the total because of astrology, smoking or free-text overlap", () => {
    const a = person("male", "bachelor");
    const b = person("female", "master");
    const baseline = computeFullScore(a, b, [], []).total;
    const withHints = computeFullScore(
      { ...a, birthDate: "1984-04-01", smokingStatus: "no", about: "טיולים זוגיות טבע", partnerDescription: "טיולים טבע זוגיות" } as Single,
      { ...b, birthDate: "1984-08-01", smokingStatus: "no", about: "טיולים זוגיות טבע", partnerDescription: "טיולים טבע זוגיות" } as Single,
      [], [],
    );
    expect(withHints.total).toBe(baseline);
  });

  it("does not let one person's openness to distance erase the other's close preference", () => {
    const a = { ...person("male", "bachelor"), city: "תל אביב", locationPreference: "close" } as Single;
    const b = { ...person("female", "master"), city: "חיפה", locationPreference: "anywhere" } as Single;
    const close = computeFullScore(a, b, [], []);
    const bothOpen = computeFullScore({ ...a, locationPreference: "anywhere" }, b, [], []);
    expect(close.total).toBe(0);
    expect(bothOpen.total).toBeGreaterThan(0);
    expect(computeFullScoreAdmin(a, b, [], []).warnings).toContainEqual(
      expect.stringContaining("מחפש קרוב"),
    );
  });
});
