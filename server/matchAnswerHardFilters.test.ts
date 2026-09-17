import { describe, expect, it } from "vitest";
import { passesAnswerHardFilters } from "./compatibility";
import type { MatchAnswer } from "../shared/matchmakingTypes";

const base = { hasKids: false, hasPets: false } as any;
const answer = (qId: string, myAnswer: number, importance: 0 | 1 | 2 = 2): MatchAnswer => ({ qId, myAnswer, importance });

describe("questionnaire hard filters", () => {
  it("blocks opposite non-negotiable wishes about children", () => {
    const result = passesAnswerHardFilters(base, base, [answer("q_kids_future", 0)], [answer("q_kids_future", 3)]);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("ילדים");
  });

  it("keeps the same disagreement soft when neither side marked it very important", () => {
    const result = passesAnswerHardFilters(base, base, [answer("q_marriage", 0, 1)], [answer("q_marriage", 2, 1)]);
    expect(result.pass).toBe(true);
  });

  it("blocks a very-important preference against a partner with existing children", () => {
    const result = passesAnswerHardFilters(base, { ...base, hasKids: true }, [answer("q_kids_existing", 3)], []);
    expect(result.pass).toBe(false);
  });

  it("always blocks a stated animal allergy against a home with a pet", () => {
    const result = passesAnswerHardFilters(base, { ...base, hasPets: true }, [answer("q_pets", 3, 0)], []);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("אלרגיה");
  });
});
