import { describe, expect, it } from "vitest";
import { selectFreshCandidatesForRerun } from "./routers";

const row = (id: number, score: number, hasAnswers = true) => ({
  candidate: { id },
  breakdown: { total: score },
  candidateAnswers: hasAnswers ? [{}] : [],
});

describe("single-profile matching reruns", () => {
  it("removes existing pairs before applying the result limit", () => {
    const ranked = [
      row(1, 92), row(2, 90), row(3, 88), row(4, 86), row(5, 84), row(6, 82),
      row(7, 79), row(8, 78), row(9, 77), row(10, 76), row(11, 75), row(12, 74),
    ];
    const result = selectFreshCandidatesForRerun(ranked, new Set([1, 2, 3, 4, 5, 6]), 6);
    expect(result.map((entry) => entry.candidate.id)).toEqual([7, 8, 9, 10, 11, 12]);
  });

  it("does not create a new option for a candidate without questionnaire answers", () => {
    const result = selectFreshCandidatesForRerun([
      row(1, 80, false),
      row(2, 76),
    ], new Set(), 6);
    expect(result.map((entry) => entry.candidate.id)).toEqual([2]);
  });
});
