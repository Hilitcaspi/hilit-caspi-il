import { describe, expect, it } from "vitest";
import {
  BOOST_CANDIDATE_NOTE_MARKER,
  MAX_BOOST_SCORE,
  MIN_BOOST_SCORE,
  MIN_REGULAR_REVIEW_SCORE,
  REGULAR_REVIEW_NOTE_MARKER,
  isBoostCandidate,
  isBoostScore,
  isRegularReviewScore,
  regularReviewNotes,
} from "../shared/boostScorePolicy";

describe("Boost score policy", () => {
  it("keeps Boost in the inclusive 60–79 lane and rejects the 79.5 boundary fraction", () => {
    expect({ MIN_BOOST_SCORE, MAX_BOOST_SCORE, MIN_REGULAR_REVIEW_SCORE }).toEqual({
      MIN_BOOST_SCORE: 60,
      MAX_BOOST_SCORE: 79,
      MIN_REGULAR_REVIEW_SCORE: 80,
    });

    expect(isBoostScore(60)).toBe(true);
    expect(isBoostScore("60")).toBe(true);
    expect(isBoostScore(79)).toBe(true);
    expect(isBoostScore("79")).toBe(true);

    for (const score of [59, 0, -1, 80, 86, 91, 100, 79.5, NaN, Infinity, -Infinity, null, undefined, "", "not-a-score"]) {
      expect(isBoostScore(score)).toBe(false);
    }
  });

  it("puts finite scores from 80 through 100 in the regular review lane", () => {
    expect(isRegularReviewScore(80)).toBe(true);
    expect(isRegularReviewScore(80.5)).toBe(true);
    expect(isRegularReviewScore(91)).toBe(true);
    expect(isRegularReviewScore(100)).toBe(true);

    for (const score of [79, 79.5, 101, NaN, Infinity, null, undefined, "", "invalid"]) {
      expect(isRegularReviewScore(score)).toBe(false);
    }
  });

  it("requires the Boost candidate marker as well as the score and converts only a leading marker for owner review", () => {
    expect(isBoostCandidate({ score: 77, notes: `${BOOST_CANDIDATE_NOTE_MARKER} unsent synthetic` })).toBe(true);
    expect(isBoostCandidate({ score: 77, notes: `prefix ${BOOST_CANDIDATE_NOTE_MARKER}` })).toBe(false);
    expect(isBoostCandidate({ score: 80, notes: `${BOOST_CANDIDATE_NOTE_MARKER} high draft` })).toBe(false);
    expect(isBoostCandidate({ score: 79.5, notes: `${BOOST_CANDIDATE_NOTE_MARKER} fractional` })).toBe(false);
    expect(isBoostCandidate({ score: 77, notes: `${REGULAR_REVIEW_NOTE_MARKER} owner draft` })).toBe(false);

    expect(regularReviewNotes(`${BOOST_CANDIDATE_NOTE_MARKER} unsent synthetic`))
      .toBe(`${REGULAR_REVIEW_NOTE_MARKER} unsent synthetic`);
    expect(regularReviewNotes(`keep ${BOOST_CANDIDATE_NOTE_MARKER} in free text`))
      .toBe(`keep ${BOOST_CANDIDATE_NOTE_MARKER} in free text`);
    expect(regularReviewNotes(null)).toBe("");
  });
});
