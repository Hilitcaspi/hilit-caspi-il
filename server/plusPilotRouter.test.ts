import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assessPlusEligibility, buildPlusHolidayLaunchTracking, calculatePlusBoostBenefit, getIsraelCalendarMonthRange, hasConfirmedProductionPlusPayment } from "./plusPilotRouter";
import { PLUS_HOLIDAY_LAUNCH_COHORT } from "./plusLaunchOffer";

const now = new Date("2026-08-22T12:00:00Z").getTime();
const completeSingle = {
  id: 1,
  firstName: "דנה",
  lastName: "ישראלית",
  email: "dana@example.com",
  phone: "0500000000",
  gender: "female" as const,
  age: 36,
  city: "תל אביב",
  height: 168,
  occupation: "מנהלת",
  religiosity: "secular",
  about: "אוהבת אנשים, טבע ושיחות עמוקות",
  partnerDescription: "מחפשת בן זוג חם, סקרן ויציב",
  photoUrl: "https://example.com/photo.jpg",
  dnaType: "anchor",
  questionnaireCompletedAt: now - 20 * 24 * 60 * 60 * 1000,
  createdAt: now - 30 * 24 * 60 * 60 * 1000,
  isActive: true,
  isPaid: true,
  isSeed: false,
};

describe("Plus pilot eligibility", () => {
  it("marks a complete active member as eligible", () => {
    const result = assessPlusEligibility(completeSingle, [], now);
    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.blockers).toEqual([]);
  });

  it("blocks an incomplete profile even after enough time in the database", () => {
    const result = assessPlusEligibility({ ...completeSingle, photoUrl: null }, [], now);
    expect(result.eligible).toBe(false);
    expect(result.blockers.join(" ")).toContain("תמונה");
  });

  it("does not offer the pilot when a positive outcome is already active", () => {
    const result = assessPlusEligibility(completeSingle, [{
      status: "matched",
      matchDetailStatus: "together",
      returnedToPoolAt: null,
    }], now);
    expect(result.positiveOutcome).toBe(true);
    expect(result.eligible).toBe(false);
  });

  it("counts only pending non-released possibilities as under review", () => {
    const result = assessPlusEligibility(completeSingle, [
      { status: "pending", returnedToPoolAt: null },
      { status: "pending", returnedToPoolAt: now - 1000 },
      { status: "proposed", returnedToPoolAt: null },
    ], now);
    expect(result.potentialMatchesUnderReview).toBe(1);
    expect(result.activeMatch).toBe(true);
  });
});

describe("Plus admin visibility helpers", () => {
  it("uses the current calendar month in Israel", () => {
    const range = getIsraelCalendarMonthRange(new Date("2026-09-07T12:00:00Z").getTime());
    expect(range.start).toBe(new Date("2026-08-31T21:00:00.000Z").getTime());
    expect(range.end).toBe(new Date("2026-09-30T21:00:00.000Z").getTime());
    expect(range.label).toContain("ספטמבר");
  });

  it("accepts only a real 99 shekel payment event with a provider transaction", () => {
    expect(hasConfirmedProductionPlusPayment([{ eventType: "subscription_started", amountAgorot: 100, providerTransactionId: "sandbox-test" }])).toBe(false);
    expect(hasConfirmedProductionPlusPayment([{ eventType: "subscription_started", amountAgorot: 9900, providerTransactionId: null }])).toBe(false);
    expect(hasConfirmedProductionPlusPayment([{ eventType: "payment_succeeded", amountAgorot: 9900, providerTransactionId: "prod-transaction" }])).toBe(true);
  });

  it("marks the included boost as used only when a request exists for the current cycle", () => {
    const member = { status: "active", billingStatus: "active", billingCycleStartedAt: 1234 };
    expect(calculatePlusBoostBenefit(member, [])).toEqual({ available: true, inProgress: false, used: false, requestStatus: null, requestedAt: null, usedAt: null });
    expect(calculatePlusBoostBenefit(member, [{ source: "plus_included", plusBillingCycleStartedAt: 1234, status: "queued", requestedAt: 1500 }]))
      .toEqual({ available: false, inProgress: true, used: false, requestStatus: "queued", requestedAt: 1500, usedAt: null });
    expect(calculatePlusBoostBenefit(member, [{ source: "plus_included", plusBillingCycleStartedAt: 1234, status: "approved", requestedAt: 1500, fulfilledAt: 1800 }]))
      .toEqual({ available: false, inProgress: false, used: true, requestStatus: "approved", requestedAt: 1500, usedAt: 1800 });
    expect(calculatePlusBoostBenefit(member, [{ source: "plus_included", plusBillingCycleStartedAt: 1234, status: "cancelled", requestedAt: 1500 }]))
      .toEqual({ available: true, inProgress: false, used: false, requestStatus: "cancelled", requestedAt: 1500, usedAt: null });
  });

  it("marks the holiday launch entitlement and preserves the exact purchase channel", () => {
    expect(buildPlusHolidayLaunchTracking(
      { pilotCohort: PLUS_HOLIDAY_LAUNCH_COHORT, monthlyMatchTarget: 3 },
      { utmCampaign: PLUS_HOLIDAY_LAUNCH_COHORT, utmSource: "sms", utmMedium: "launch", paidAt: now },
    )).toEqual({
      entitled: true,
      attribution: {
        campaign: PLUS_HOLIDAY_LAUNCH_COHORT,
        source: "sms",
        medium: "launch",
        content: null,
        paidAt: now,
      },
    });

    expect(buildPlusHolidayLaunchTracking(
      { pilotCohort: PLUS_HOLIDAY_LAUNCH_COHORT, monthlyMatchTarget: 2 },
      { utmCampaign: PLUS_HOLIDAY_LAUNCH_COHORT, utmSource: "email" },
    ).entitled).toBe(false);
  });

  it("keeps the holiday entitlement and channel visible in the CRM", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/PlusPilotAdminSection.tsx"), "utf8");
    expect(source).toContain("הטבת השקה · יעד 3/3");
    expect(source).toContain("מקור:");
    expect(source).toContain("row.launchAttribution.source === \"sms\"");
    expect(source).toContain("עמדו ביעד האישי");
  });

  it("shows verified Grow purchases before and after Plus activation", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/PlusPilotAdminSection.tsx"), "utf8");

    expect(source).toContain("רכישות Plus מאומתות ב־Grow");
    expect(source).toContain("row.confirmedPayment");
    expect(source).toContain("overview.data?.pendingPaidProfiles");
    expect(source).toContain("פעיל/ה במערכת");
    expect(source).toContain("שולם · ממתין/ה להצטרפות למאגר");
    expect(source).toContain("refetchOnWindowFocus: true");
    expect(source).toContain("רענון עכשיו");
  });
});
