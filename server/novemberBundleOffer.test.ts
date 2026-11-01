import { describe, expect, it } from "vitest";
import {
  evaluateNovemberBundleFirstMatchPolicy,
  FIRST_MATCH_DAYS,
  isNovemberBundleOfferActive,
  novemberBundleFirstMatchDueAt,
  NOVEMBER_BUNDLE_EXPIRES_AT,
  NOVEMBER_BUNDLE_STARTS_AT,
} from "../shared/novemberBundleOffer";

const complete = {
  paidAt: Date.parse("2026-11-01T10:00:00+02:00"),
  questionnaireCompletedAt: Date.parse("2026-11-01T12:00:00+02:00"),
  hasAllProfileRequirements: true,
  isPaid: true,
  isActive: true,
  isSeed: false,
  firstProposalDeliveredAt: null,
  hasActiveMatchHold: false,
  profileRequirementsMissing: [],
};

describe("November bundle offer contract", () => {
  it("uses the inclusive 1 November / exclusive 1 December Israel checkout window", () => {
    expect(isNovemberBundleOfferActive(NOVEMBER_BUNDLE_STARTS_AT - 1)).toBe(false);
    expect(isNovemberBundleOfferActive(NOVEMBER_BUNDLE_STARTS_AT)).toBe(true);
    expect(isNovemberBundleOfferActive(NOVEMBER_BUNDLE_EXPIRES_AT - 1)).toBe(true);
    expect(isNovemberBundleOfferActive(NOVEMBER_BUNDLE_EXPIRES_AT)).toBe(false);
  });

  it("starts the three-calendar-day promise at stable readiness, not payment or profile edits", () => {
    const readyAt = Date.parse("2026-11-01T23:45:00+02:00");
    expect(FIRST_MATCH_DAYS).toBe(3);
    expect(novemberBundleFirstMatchDueAt(readyAt)).toBe(Date.parse("2026-11-05T00:00:00+02:00"));
    const result = evaluateNovemberBundleFirstMatchPolicy(complete, complete.questionnaireCompletedAt! + 1);
    expect(result.readyAt).toBe(complete.questionnaireCompletedAt);
    expect(result.dueAt).toBe(Date.parse("2026-11-05T00:00:00+02:00"));
    expect(result.state).toBe("ready");
  });

  it("does not begin a deadline until actual profile requirements are complete", () => {
    const result = evaluateNovemberBundleFirstMatchPolicy({
      ...complete,
      hasAllProfileRequirements: false,
      profileRequirementsMissing: ["תמונה", "טווח גילאים"],
    }, Date.parse("2026-11-20T12:00:00+02:00"));
    expect(result.readyAt).toBeNull();
    expect(result.dueAt).toBeNull();
    expect(result.state).toBe("awaiting_profile");
  });

  it("requires manual review rather than inferring a late unknown readiness time", () => {
    const result = evaluateNovemberBundleFirstMatchPolicy({
      ...complete,
      readinessTimestampNeedsReview: true,
    }, Date.parse("2026-11-20T12:00:00+02:00"));
    expect(result.readyAt).toBeNull();
    expect(result.dueAt).toBeNull();
    expect(result.eligibilityIssues).toContain("readiness_time");
    expect(result.state).toBe("needs_review");
    expect(result.canPrepareProposal).toBe(false);
  });

  it("marks only a ready, unresolved member overdue after the due boundary", () => {
    const result = evaluateNovemberBundleFirstMatchPolicy(complete, Date.parse("2026-11-05T00:00:00+02:00"));
    expect(result.state).toBe("overdue");
    expect(result.canPrepareProposal).toBe(false);
  });

  it("requires review rather than sends when there is an active delivered-proposal hold", () => {
    const result = evaluateNovemberBundleFirstMatchPolicy({ ...complete, hasActiveMatchHold: true });
    expect(result.state).toBe("needs_review");
    expect(result.canPrepareProposal).toBe(false);
  });
});
