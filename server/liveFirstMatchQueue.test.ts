import { describe, expect, it } from "vitest";
import { wasMatchProposalSent } from "../shared/matchDelivery";
import {
  evaluateLiveFirstMatchPolicy,
  isLiveFirstMatchPublicOfferActive,
  LIVE_FIRST_MATCH_OFFER_END,
  LIVE_FIRST_MATCH_EVENT_START,
  LIVE_FIRST_MATCH_OFFER_START,
  LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE,
} from "../shared/liveFirstMatchPolicy";

const ONE_MINUTE = 60_000;
const complete = {
  hasProfile: true,
  hasCompleteProfile: true,
  hasPhoto: true,
  questionnaireCompletedAt: LIVE_FIRST_MATCH_EVENT_START - ONE_MINUTE,
  isPaid: true,
  isActive: true,
  isSeed: false,
  firstProposalDeliveredAt: null,
  hasActiveMatchHold: false,
};

describe("live first-match queue policy", () => {
  it("expires public acquisition copy on Sunday while preserving existing commitments", () => {
    expect(new Date(LIVE_FIRST_MATCH_OFFER_END).toISOString()).toBe("2026-10-17T21:00:00.000Z");
    expect(isLiveFirstMatchPublicOfferActive(LIVE_FIRST_MATCH_OFFER_START - 1)).toBe(false);
    expect(isLiveFirstMatchPublicOfferActive(LIVE_FIRST_MATCH_OFFER_START)).toBe(true);
    expect(isLiveFirstMatchPublicOfferActive(LIVE_FIRST_MATCH_OFFER_END - 1)).toBe(true);
    expect(isLiveFirstMatchPublicOfferActive(LIVE_FIRST_MATCH_OFFER_END)).toBe(false);
    expect(evaluateLiveFirstMatchPolicy(complete, LIVE_FIRST_MATCH_OFFER_END + 1).state).toBe("ready");
  });
  it("uses the fixed Monday 2.11 deadline after the Saturday live", () => {
    const result = evaluateLiveFirstMatchPolicy(complete, LIVE_FIRST_MATCH_EVENT_START);
    expect(result.originalPromiseDeadline).toBe(LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE);
    expect(new Date(result.originalPromiseDeadline).toISOString()).toBe("2026-11-02T21:59:59.000Z");
    expect(LIVE_FIRST_MATCH_OFFER_START).toBe(Date.parse("2026-10-14T14:48:00.000Z"));
  });

  it("keeps a complete, active, paid non-seed member ready before the fixed deadline", () => {
    expect(evaluateLiveFirstMatchPolicy(complete, LIVE_FIRST_MATCH_EVENT_START).state).toBe("ready");
  });

  it("holds incomplete profiles as awaiting_profile before the deadline", () => {
    const result = evaluateLiveFirstMatchPolicy({ ...complete, hasPhoto: false, hasCompleteProfile: false });
    expect(result.state).toBe("awaiting_profile");
    expect(result.profileRequirementsMissing).toEqual(["profile", "photo"]);
  });

  it("never silently extends an expired promise for an incomplete or late questionnaire", () => {
    const result = evaluateLiveFirstMatchPolicy({
      ...complete,
      questionnaireCompletedAt: LIVE_FIRST_MATCH_EVENT_START + ONE_MINUTE,
      hasActiveMatchHold: false,
    }, LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE + ONE_MINUTE);
    expect(result.state).toBe("overdue");
    expect(result.completedAfterLive).toBe(true);
    expect(result.originalPromiseDeadline).toBe(LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE);
  });

  it("marks a genuinely delivered first proposal as fulfilled, including one delivered before the live", () => {
    const result = evaluateLiveFirstMatchPolicy({
      ...complete,
      firstProposalDeliveredAt: LIVE_FIRST_MATCH_EVENT_START - ONE_MINUTE,
    }, LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE + ONE_MINUTE);
    expect(result.state).toBe("fulfilled");
  });

  it("does not treat a generated pending proposal as a sent proposal", () => {
    expect(wasMatchProposalSent({ status: "pending" })).toBe(false);
    expect(wasMatchProposalSent({ status: "proposed", proposedAt: LIVE_FIRST_MATCH_EVENT_START })).toBe(false);
    expect(wasMatchProposalSent({ status: "proposed", approvalTokenA: "opaque-proof" })).toBe(true);
  });

  it("requires staff review for an active genuinely sent proposal and never makes it sendable", () => {
    const result = evaluateLiveFirstMatchPolicy({ ...complete, hasActiveMatchHold: true });
    expect(result.state).toBe("needs_review");
    expect(result.canPrepareProposal).toBe(false);
  });
});
