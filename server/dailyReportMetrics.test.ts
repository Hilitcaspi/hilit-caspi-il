import { describe, expect, it } from "vitest";
import {
  buildDailyReportMessage,
  DAILY_REPORT_MAX_MESSAGE_LENGTH,
  deriveDailyReportMetrics,
  getReportDateForMidnightRun,
  getReportDateRange,
  type DailyReportMetrics,
  type DailyReportTargets,
} from "./dailyReportMetrics";

const targets: DailyReportTargets = {
  databaseMonthlyMinTarget: 350,
  databaseMonthlyStretchTarget: 400,
  databaseMonthlyBudgetAgorot: 1_000_000,
  boostMonthlyTarget: null,
  bundleMonthlyTarget: null,
  leadMonthlyTarget: null,
  revenueMonthlyTargetAgorot: null,
};

const metrics: DailyReportMetrics = {
  reportDate: "2026-09-01",
  dayOfMonth: 1,
  daysInMonth: 30,
  revenueTodayAgorot: 89_700,
  revenueMonthAgorot: 89_700,
  salesPurchasesToday: 3,
  salesPurchasesMonth: 3,
  databasePurchasesToday: 2,
  databasePurchasesMonth: 2,
  databaseRevenueTodayAgorot: 59_800,
  databaseRevenueMonthAgorot: 59_800,
  boostPurchasesToday: 1,
  boostPurchasesMonth: 1,
  boostRevenueTodayAgorot: 1_990,
  boostRevenueMonthAgorot: 1_990,
  bundlePurchasesToday: 0,
  bundlePurchasesMonth: 0,
  bundleRevenueTodayAgorot: 0,
  bundleRevenueMonthAgorot: 0,
  leadsToday: 20,
  leadsMonth: 20,
  instagramFollowersNew: 4,
  salesCampaignSpendTodayAgorot: 12_000,
  salesCampaignSpendMonthAgorot: 12_000,
  boostCampaignSpendTodayAgorot: 4_000,
  boostCampaignSpendMonthAgorot: 4_000,
  matchesSentToday: 5,
  matchesMutualYesToday: 2,
  activeSinglesNoMatch14Days: 17,
  activeSinglesMissingDetails: 9,
  excludedEstimatedPaymentsToday: 0,
};

describe("daily report Israel date boundaries", () => {
  it("summarizes the day that just ended at Israel midnight", () => {
    expect(getReportDateForMidnightRun(Date.parse("2026-09-01T21:00:10Z"))).toBe("2026-09-01");
  });

  it("uses UTC+3 in September and UTC+2 in January", () => {
    expect(getReportDateRange("2026-09-01").dayStart).toBe(Date.parse("2026-08-31T21:00:00Z"));
    expect(getReportDateRange("2026-09-01").dayEnd).toBe(Date.parse("2026-09-01T21:00:00Z"));
    expect(getReportDateRange("2026-01-01").dayStart).toBe(Date.parse("2025-12-31T22:00:00Z"));
  });
});

describe("daily report metrics and message", () => {
  it("calculates daily and monthly database gaps and verified ratios", () => {
    const result = deriveDailyReportMetrics(metrics, targets);
    expect(result.databaseDailyTarget).toBeCloseTo(11.67, 2);
    expect(result.databaseDailyGap).toBe(10);
    expect(result.databaseMonthlyGap).toBe(348);
    expect(result.boostCpaAgorot).toBe(4_000);
    expect(result.boostRoas).toBe(0.5);
  });

  it("renders one concise Hebrew line per metric and flags unavailable sources", () => {
    const message = buildDailyReportMessage(metrics, targets, {
      payments: { available: true, label: "Grow" },
      meta: { available: false, label: "Meta" },
    });
    expect(message).toContain("התאמות: 5 נשלחו | 2 זוגות אמרו כן");
    expect(message).toContain("יעד טרם הוגדר");
    expect(message).toContain("נותר ₪9,880");
    expect(message).toContain("17 מעל 14 יום בלי התאמה");
    expect(message).toContain("מקור לא זמין: Meta");
    expect(message.length).toBeLessThanOrEqual(DAILY_REPORT_MAX_MESSAGE_LENGTH);
  });

  it("hard-limits the SMS even when many sources are unavailable", () => {
    const sources = Object.fromEntries(Array.from({ length: 120 }, (_, index) => [
      `source_${index}`,
      { available: false, label: `מקור חיצוני ארוך ${index}` },
    ]));
    const message = buildDailyReportMessage(metrics, targets, sources);
    expect(message.length).toBeLessThanOrEqual(DAILY_REPORT_MAX_MESSAGE_LENGTH);
    expect(message.endsWith("…")).toBe(true);
  });
});
