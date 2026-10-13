import { describe, expect, it } from "vitest";
import {
  buildAdvancedMatchExclusions,
  isAdvancedMatchCandidate,
  sentMatchHistoryForSingle,
  type AdvancedMatchCandidateMatch,
} from "../shared/advancedMatchCandidates";

const NOW = 1_000_000_000;
const HOUR = 60 * 60 * 1000;

function match(
  singleAId: number,
  singleBId: number,
  overrides: Partial<AdvancedMatchCandidateMatch> = {},
): AdvancedMatchCandidateMatch {
  return {
    singleAId,
    singleBId,
    status: "pending",
    ...overrides,
  };
}

describe("advanced match candidate exclusions", () => {
  it("handles null responses on a genuinely sent pending proposal", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, {
        status: "proposed",
        approvalTokenA: "delivery-proof",
        approvalExpiresAt: NOW + HOUR,
        approvedByA: null,
        approvedByB: null,
      }),
    ], 10, NOW);

    expect(exclusions.unavailableIds).toEqual(new Set([10, 20]));
    expect(exclusions.previousPartnerIds).toEqual(new Set([20]));
  });

  it("allows generated pending and proposed-at-only rows", () => {
    const generated = match(10, 20, {
      status: "pending",
      proposedAt: NOW - HOUR,
      approvalExpiresAt: NOW + HOUR,
    });
    const proposedAtOnly = match(10, 30, {
      status: "proposed",
      proposedAt: NOW - HOUR,
      approvalExpiresAt: NOW + HOUR,
    });

    const exclusions = buildAdvancedMatchExclusions([generated, proposedAtOnly], 10, NOW);

    expect(exclusions.unavailableIds).toEqual(new Set());
    expect(exclusions.previousPartnerIds).toEqual(new Set());
    expect(sentMatchHistoryForSingle([generated, proposedAtOnly], 10)).toEqual([]);
  });

  it("releases an expired proposal but keeps a delivered partner out of prior choices", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, {
        status: "expired",
        approvalTokenA: "delivery-proof",
        proposedAt: NOW - 49 * HOUR,
        approvalExpiresAt: NOW - HOUR,
      }),
    ], 10, NOW);

    expect(exclusions.unavailableIds).toEqual(new Set());
    expect(exclusions.previousPartnerIds).toEqual(new Set([20]));
  });

  it("does not treat generated rejected or expired placeholders as previous history", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, { status: "rejected", proposedAt: NOW - HOUR }),
      match(10, 30, { status: "expired", proposedAt: NOW - 49 * HOUR }),
    ], 10, NOW);

    expect(exclusions.unavailableIds).toEqual(new Set());
    expect(exclusions.previousPartnerIds).toEqual(new Set());
  });

  it("keeps a matched pair unavailable even when its proposal is older than 48 hours", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, {
        status: "matched",
        proposedAt: NOW - 72 * HOUR,
        approvalExpiresAt: NOW - 24 * HOUR,
        matchedAt: NOW - 60 * HOUR,
      }),
    ], undefined, NOW);

    expect(exclusions.unavailableIds).toEqual(new Set([10, 20]));
    expect(exclusions.previousPartnerIds).toEqual(new Set());
  });

  it("releases matched people after an ended status or a return to pool", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, { status: "matched", matchDetailStatus: "ended" }),
      match(30, 40, { status: "matched", returnedToPoolAt: NOW - HOUR }),
    ], undefined, NOW);

    expect(exclusions.unavailableIds).toEqual(new Set());
  });

  it("orients sent history to the requested participant when stored order is reversed", () => {
    const sent = match(20, 10, { status: "rejected", tokenBUsedAt: NOW - HOUR });

    expect(sentMatchHistoryForSingle([sent], 10)).toEqual([{ ...sent, opponentId: 20 }]);
    expect(buildAdvancedMatchExclusions([sent], 10, NOW).previousPartnerIds).toEqual(new Set([20]));
  });

  it("builds global unavailability even without a target", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, {
        status: "proposed",
        approvalTokenA: "delivery-proof",
        proposedAt: NOW - HOUR,
      }),
    ], undefined, NOW);

    expect(exclusions.unavailableIds).toEqual(new Set([10, 20]));
    expect(exclusions.previousPartnerIds).toEqual(new Set());
  });

  it("filters each real candidate independently without a gender rule", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, { status: "rejected", approvalTokenA: "delivery-proof" }),
      match(30, 40, { status: "proposed", approvalTokenA: "delivery-proof", approvalExpiresAt: NOW + HOUR }),
    ], 10, NOW);

    expect(isAdvancedMatchCandidate({ id: 10, isActive: true, isSeed: false }, exclusions, 10)).toBe(false);
    expect(isAdvancedMatchCandidate({ id: 20, isActive: true, isSeed: false }, exclusions, 10)).toBe(false);
    expect(isAdvancedMatchCandidate({ id: 30, isActive: true, isSeed: false }, exclusions, 10)).toBe(false);
    expect(isAdvancedMatchCandidate({ id: 40, isActive: true, isSeed: false }, exclusions, 10)).toBe(false);
    expect(isAdvancedMatchCandidate({ id: 50, isActive: true, isSeed: false }, exclusions, 10)).toBe(true);
    expect(isAdvancedMatchCandidate({ id: 60, isActive: false, isSeed: false }, exclusions, 10)).toBe(false);
    expect(isAdvancedMatchCandidate({ id: 70, isActive: true, isSeed: true }, exclusions, 10)).toBe(false);
  });
  it("releases a proposal as soon as either participant declines, retaining prior history", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, { status: "proposed", ownerApprovedAt: NOW - HOUR, approvalExpiresAt: NOW + HOUR, approvedByA: false }),
      match(30, 40, { status: "proposed", ownerApprovedAt: NOW - HOUR, approvalExpiresAt: NOW + HOUR, approvedByB: false }),
    ], 10, NOW);
    expect(exclusions.unavailableIds.size).toBe(0);
    expect(exclusions.previousPartnerIds).toEqual(new Set([20]));
  });
  it("expires at the exact deadline and respects explicit expiry over the 48h fallback", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, { status: "proposed", ownerApprovedAt: NOW - HOUR, proposedAt: NOW - HOUR, approvalExpiresAt: NOW }),
      match(30, 40, { status: "proposed", ownerApprovedAt: NOW - HOUR, proposedAt: NOW - 100 * HOUR, approvalExpiresAt: NOW + HOUR }),
    ], undefined, NOW);
    expect(exclusions.unavailableIds).toEqual(new Set([30, 40]));
    expect(isAdvancedMatchCandidate({ id: 10, isActive: true }, exclusions)).toBe(true);
  });
  it("blocks active mutual consent without relying on the stored lifecycle status", () => {
    const exclusions = buildAdvancedMatchExclusions([
      match(10, 20, { status: "proposed", approvedByA: true, approvedByB: true, approvalExpiresAt: NOW - HOUR }),
      match(30, 40, { status: "proposed", approvedByA: true, approvedByB: true, matchDetailStatus: "ended" }),
    ], undefined, NOW);
    expect(exclusions.unavailableIds).toEqual(new Set([10, 20]));
  });
});
