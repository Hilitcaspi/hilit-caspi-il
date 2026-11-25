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

    const insideWindow = 5_000 + 60 * 60 * 1000;
    expect(isWaitingForMatchResponses(activeProposal, insideWindow)).toBe(true);
    expect(hasMutualYes(activeProposal)).toBe(false);
    expect(isUnsuccessfulMatch(activeProposal, insideWindow)).toBe(false);
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

describe("proposals past their response window", () => {
  const HOUR = 60 * 60 * 1000;
  const now = 1_000 * HOUR;
  it("moves an unanswered proposal to no-match once the 48 hour window is over, even if status is still proposed", () => {
    const m = { status: "proposed", proposedAt: now - 49 * HOUR };
    expect(isWaitingForMatchResponses(m, now)).toBe(false);
    expect(isUnsuccessfulMatch(m, now)).toBe(true);
  });
  it("treats a one-sided yes that expired as no-match", () => {
    const m = { status: "proposed", proposedAt: now - 60 * HOUR, approvedByA: true, approvedByB: null };
    expect(isWaitingForMatchResponses(m, now)).toBe(false);
    expect(isUnsuccessfulMatch(m, now)).toBe(true);
  });
  it("keeps proposals inside the window waiting", () => {
    const m = { status: "proposed", proposedAt: now - 10 * HOUR };
    expect(isWaitingForMatchResponses(m, now)).toBe(true);
    expect(isUnsuccessfulMatch(m, now)).toBe(false);
  });
  it("honours an explicit extended deadline over the 48 hour fallback", () => {
    const m = { status: "proposed", proposedAt: now - 72 * HOUR, approvalExpiresAt: now + HOUR };
    expect(isWaitingForMatchResponses(m, now)).toBe(true);
    expect(isUnsuccessfulMatch(m, now)).toBe(false);
  });
  it("never moves a mutual yes to no-match", () => {
    const m = { status: "proposed", proposedAt: now - 100 * HOUR, approvedByA: true, approvedByB: true };
    expect(isUnsuccessfulMatch(m, now)).toBe(false);
  });
});
