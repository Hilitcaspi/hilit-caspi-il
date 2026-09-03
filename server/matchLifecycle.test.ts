import { describe, expect, it } from "vitest";
import {
  getMatchTrackingSummary,
  getReleaseLifecycleUpdate,
  hasMutualYes,
  isUnsuccessfulMatch,
  isWaitingForMatchResponses,
} from "../shared/matchLifecycle";

describe("match lifecycle history", () => {
  it("keeps a mutual yes in the historical success group after release", () => {
    const match = {
      status: "rejected",
      proposedAt: 1_000,
      approvedByA: true,
      approvedByB: true,
      matchedAt: 2_000,
      returnedToPoolAt: 5 * 86_400_000 + 2_000,
    };

    expect(hasMutualYes(match)).toBe(true);
    expect(isUnsuccessfulMatch(match)).toBe(false);
    expect(getMatchTrackingSummary(match, 10 * 86_400_000)).toMatchObject({
      state: "released",
      daysInMatch: 5,
    });
  });

  it("recognizes active proposals separately from completed history", () => {
    const activeProposal = {
      status: "proposed",
      proposedAt: 5_000,
      approvedByA: true,
      approvedByB: false,
    };

    expect(isWaitingForMatchResponses(activeProposal)).toBe(true);
    expect(hasMutualYes(activeProposal)).toBe(false);
    expect(isUnsuccessfulMatch(activeProposal)).toBe(false);
  });

  it("classifies rejected and expired proposals only when no mutual yes exists", () => {
    expect(isUnsuccessfulMatch({ status: "rejected", proposedAt: 5_000 })).toBe(true);
    expect(isUnsuccessfulMatch({ status: "expired", proposedAt: 5_000, approvedByA: true })).toBe(true);
    expect(isUnsuccessfulMatch({ status: "expired", proposedAt: 5_000, approvedByA: true, approvedByB: true })).toBe(false);
  });

  it("preserves matched status when a mutual-yes pair is released", () => {
    expect(getReleaseLifecycleUpdate({
      status: "matched",
      approvedByA: true,
      approvedByB: true,
      matchedAt: 10_000,
    })).toEqual({ status: "matched", matchDetailStatus: "ended" });

    expect(getReleaseLifecycleUpdate({
      status: "proposed",
      proposedAt: 10_000,
      approvedByA: true,
      approvedByB: false,
    })).toEqual({ status: "rejected", matchDetailStatus: undefined });
  });
});
