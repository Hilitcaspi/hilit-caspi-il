import { describe, expect, it } from "vitest";
import { calculateOutcomeSegments } from "./matchmakingSegments";

describe("matchmaking outcome segments", () => {
  const singles = [
    { id: 1, sourceLabel: "Meta Ads", productLabel: "מאגר בלבד", religiosity: "חילוני/ת" },
    { id: 2, sourceLabel: "Meta Ads", productLabel: "מאגר + קורס", religiosity: "מסורתי/ת" },
    { id: 3, sourceLabel: "מייל", productLabel: "מאגר בלבד", religiosity: "חילוני/ת" },
  ];
  const matches = [
    { singleAId: 1, singleBId: 2, status: "matched", approvedByA: true, approvedByB: true, matchDetailStatus: "continuing" },
    { singleAId: 3, singleBId: 99, status: "proposed", approvedByA: false, approvedByB: false, matchDetailStatus: null },
  ];

  it("calculates coverage and positive outcomes by source", () => {
    const result = calculateOutcomeSegments(singles, matches);
    const meta = result.bySource.find(row => row.label === "Meta Ads");
    expect(meta).toMatchObject({ members: 2, covered: 2, coverageRate: 100, positive: 2, positiveRate: 100 });
  });

  it("keeps product and religiosity segments independent", () => {
    const result = calculateOutcomeSegments(singles, matches);
    expect(result.byProduct.find(row => row.label === "מאגר בלבד")?.members).toBe(2);
    expect(result.bySegment.find(row => row.label === "חילוני/ת")?.members).toBe(2);
  });

  it("does not count released matches", () => {
    const result = calculateOutcomeSegments(singles, [{ ...matches[0], returnedToPoolAt: Date.now() }]);
    expect(result.bySource.find(row => row.label === "Meta Ads")?.coverageRate).toBe(0);
  });
});
