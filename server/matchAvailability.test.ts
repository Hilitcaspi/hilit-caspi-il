import { describe, expect, it } from "vitest";
import {
  getMatchAvailability,
  getProposalDeadline,
  isBlockingMatch,
  type MatchAvailabilityMatch,
} from "../shared/matchAvailability";

const NOW = 1_000_000_000;
const HOUR = 60 * 60 * 1000;

function match(overrides: Partial<MatchAvailabilityMatch> = {}): MatchAvailabilityMatch {
  return { status: "pending", ...overrides };
}

describe("match availability", () => {
  it("blocks a sent, unexpired proposal when false approval values have no response proof", () => {
    const proposal = match({
      status: "proposed",
      approvalTokenA: "prepared-for-delivery",
      approvalExpiresAt: NOW + HOUR,
      approvedByA: false,
      approvedByB: false,
    });

    expect(getMatchAvailability(proposal, NOW)).toEqual({
      blocksNewMatch: true, reason: "current_proposal", deadline: NOW + HOUR,
    });
    expect(isBlockingMatch(proposal, NOW)).toBe(true);
  });

  it("does not mistake zero timestamps for a recorded release or valid deadline", () => {
    expect(isBlockingMatch(match({ status: "matched", returnedToPoolAt: 0 }), NOW)).toBe(true);
    expect(getMatchAvailability(match({ status: "proposed", approvalTokenA: "prepared-for-delivery", approvalExpiresAt: 0, proposedAt: 0 }), NOW).reason).toBe("needs_review");
    expect(getProposalDeadline(match({ proposedAt: Number.NaN, approvalExpiresAt: Number.POSITIVE_INFINITY }))).toBeNull();
  });

  it("also blocks null approval values while the sent proposal is current", () => {
    const proposal = match({
      status: "proposed",
      approvalTokenA: "prepared-for-delivery",
      approvalExpiresAt: NOW + HOUR,
      approvedByA: null,
      approvedByB: null,
    });

    expect(getMatchAvailability(proposal, NOW).reason).toBe("current_proposal");
    expect(isBlockingMatch(proposal, NOW)).toBe(true);
  });

  it("permits a proposal after a decline is confirmed by a response timestamp", () => {
    const proposal = match({
      status: "proposed",
      approvalTokenA: "prepared-for-delivery",
      approvalExpiresAt: NOW + HOUR,
      approvedByA: false,
      tokenAUsedAt: NOW - HOUR,
    });

    expect(getMatchAvailability(proposal, NOW)).toEqual({
      blocksNewMatch: false, reason: "declined", deadline: NOW + HOUR,
    });
  });

  it("permits rows explicitly returned to the pool or ended", () => {
    expect(getMatchAvailability(match({
      status: "matched", returnedToPoolAt: NOW - HOUR,
    }), NOW).reason).toBe("returned");
    expect(isBlockingMatch(match({
      status: "matched", returnedToPoolAt: NOW - HOUR,
    }), NOW)).toBe(false);
    expect(getMatchAvailability(match({
      status: "matched", matchDetailStatus: "ended",
    }), NOW).reason).toBe("ended");
    expect(isBlockingMatch(match({
      status: "matched", matchDetailStatus: "ended",
    }), NOW)).toBe(false);
  });

  it("permits an expired sent proposal at the exact deadline", () => {
    const proposal = match({
      status: "proposed",
      approvalTokenA: "prepared-for-delivery",
      proposedAt: NOW - 48 * HOUR,
    });

    expect(getProposalDeadline(proposal)).toBe(NOW);
    expect(getMatchAvailability(proposal, NOW)).toEqual({
      blocksNewMatch: false, reason: "expired_proposal", deadline: NOW,
    });
  });

  it("keeps a matched or mutually approved pair blocked beyond a proposal deadline", () => {
    const expired = { approvalExpiresAt: NOW - HOUR, proposedAt: NOW - 49 * HOUR };

    expect(getMatchAvailability(match({ status: "matched", ...expired }), NOW).reason).toBe("active_connection");
    expect(isBlockingMatch(match({ status: "matched", ...expired }), NOW)).toBe(true);
    expect(getMatchAvailability(match({
      status: "proposed", approvedByA: true, approvedByB: true, ...expired,
    }), NOW).reason).toBe("active_connection");
    expect(isBlockingMatch(match({
      status: "proposed", approvedByA: true, approvedByB: true, ...expired,
    }), NOW)).toBe(true);
  });

  it("uses an explicit deadline instead of the proposed-at fallback", () => {
    const proposal = match({
      status: "proposed",
      approvalTokenA: "prepared-for-delivery",
      proposedAt: NOW - 100 * HOUR,
      approvalExpiresAt: NOW + HOUR,
    });

    expect(getProposalDeadline(proposal)).toBe(NOW + HOUR);
    expect(getMatchAvailability(proposal, NOW).reason).toBe("current_proposal");
  });

  it("keeps a sent proposal without any deadline blocked for manual review", () => {
    const proposal = match({ status: "proposed", approvalTokenA: "prepared-for-delivery" });

    expect(getProposalDeadline(proposal)).toBeNull();
    expect(getMatchAvailability(proposal, NOW)).toEqual({
      blocksNewMatch: true, reason: "needs_review", deadline: null,
    });
  });

  it("permits unsent generated placeholders", () => {
    const proposal = match({
      status: "proposed",
      proposedAt: NOW - HOUR,
      approvalExpiresAt: NOW + HOUR,
      approvedByA: false,
      approvedByB: null,
    });

    expect(getMatchAvailability(proposal, NOW)).toEqual({
      blocksNewMatch: false, reason: "unsent", deadline: NOW + HOUR,
    });
  });
});
