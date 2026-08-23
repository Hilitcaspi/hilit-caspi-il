import { describe, expect, it } from "vitest";
import { buildSessionJourneyEmail, DATABASE_SESSION_JOURNEY_LAUNCH_AT, isEligibleForSessionJourney, selectNextSessionJourneyStage, selectSessionJourneyStage } from "./databaseSessionJourney";

const DAY = 24 * 60 * 60 * 1000;
const single = { firstName: "נועה", email: "noa@example.com" } as any;

describe("database session journey", () => {
  it("stages historical members gradually from launch and new members after 14 days", () => {
    expect(selectSessionJourneyStage(DATABASE_SESSION_JOURNEY_LAUNCH_AT - 100 * DAY, DATABASE_SESSION_JOURNEY_LAUNCH_AT)).toBe(1);
    expect(selectSessionJourneyStage(DATABASE_SESSION_JOURNEY_LAUNCH_AT, DATABASE_SESSION_JOURNEY_LAUNCH_AT + 13 * DAY)).toBeNull();
    expect(selectSessionJourneyStage(DATABASE_SESSION_JOURNEY_LAUNCH_AT, DATABASE_SESSION_JOURNEY_LAUNCH_AT + 14 * DAY)).toBe(1);
    expect(selectSessionJourneyStage(DATABASE_SESSION_JOURNEY_LAUNCH_AT, DATABASE_SESSION_JOURNEY_LAUNCH_AT + 28 * DAY)).toBe(2);
  });

  it("always sends the first offer before the reminder even when both stages are due", () => {
    const now = DATABASE_SESSION_JOURNEY_LAUNCH_AT + 30 * DAY;
    const joinedAt = DATABASE_SESSION_JOURNEY_LAUNCH_AT - 100 * DAY;
    expect(selectNextSessionJourneyStage(joinedAt, now, new Set())).toBe(1);
    expect(selectNextSessionJourneyStage(joinedAt, now, new Set([1]))).toBe(2);
    expect(selectNextSessionJourneyStage(joinedAt, now, new Set([1, 2]))).toBeNull();
  });

  it("excludes incomplete, already purchased, coaching and active match profiles", () => {
    const base = { missingFields: [], purchasedSession: false, isCoachingClient: false, hasActiveMutualMatch: false, hasPositiveOutcome: false };
    expect(isEligibleForSessionJourney(base)).toBe(true);
    expect(isEligibleForSessionJourney({ ...base, missingFields: ["תמונה"] })).toBe(false);
    expect(isEligibleForSessionJourney({ ...base, purchasedSession: true })).toBe(false);
    expect(isEligibleForSessionJourney({ ...base, hasActiveMutualMatch: true })).toBe(false);
  });

  it("offers Plus members 450 ILS and regular members 500 ILS", () => {
    const plus = buildSessionJourneyEmail(1, single, true);
    const regular = buildSessionJourneyEmail(1, single, false);
    expect(plus.htmlBody).toContain("450 ש״ח במקום 500 ש״ח");
    expect(plus.htmlBody).toContain("coupon=PLUS50");
    expect(regular.htmlBody).toContain("מחיר הפגישה: 500 ש״ח");
    expect(regular.htmlBody).not.toContain("coupon=PLUS50");
  });
});
