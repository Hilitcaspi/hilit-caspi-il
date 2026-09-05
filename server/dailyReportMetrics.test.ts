import { describe, expect, it } from "vitest";
import {
  buildHistoricalWeekdayWeights,
  buildDailyReportMessage,
  buildDailyReportMessages,
  DAILY_REPORT_MAX_MESSAGE_LENGTH,
  deriveDailyReportMetrics,
  getDailyBusinessWeight,
  getDailyReportMediaPlan,
  getReportDateForMidnightRun,
  getReportDateRange,
  weightedTargetForDate,
  weightedTargetToDate,
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
  databasePurchasesWeek: 2,
  databasePurchasesMonth: 2,
  databaseRevenueTodayAgorot: 59_800,
  databaseRevenueMonthAgorot: 59_800,
  boostPurchasesToday: 1,
  boostPurchasesWeek: 1,
  boostPurchasesMonth: 1,
  boostRevenueTodayAgorot: 1_990,
  boostRevenueMonthAgorot: 1_990,
  bundlePurchasesToday: 0,
  bundlePurchasesWeek: 0,
  bundlePurchasesMonth: 0,
  bundleRevenueTodayAgorot: 0,
  bundleRevenueMonthAgorot: 0,
  leadsToday: 20,
  leadsWeek: 20,
  leadsMonth: 20,
  instagramFollowersNew: 4,
  salesCampaignSpendTodayAgorot: 12_000,
  salesCampaignSpendMonthAgorot: 12_000,
  salesCampaignImpressionsToday: 10_000,
  salesCampaignClicksToday: 300,
  salesCampaignLeadsToday: 20,
  boostCampaignSpendTodayAgorot: 4_000,
  boostCampaignSpendMonthAgorot: 4_000,
  boostCampaignImpressionsToday: 2_000,
  boostCampaignClicksToday: 50,
  boostCampaignLeadsToday: 5,
  databaseCampaignSpendTodayAgorot: 7_000,
  databaseCampaignSpendMonthAgorot: 35_000,
  databaseCampaignPurchasesToday: 2,
  databaseCampaignClicksToday: 200,
  databaseCampaignImpressionsToday: 8_000,
  databaseCampaignLeadsToday: 15,
  bundleCampaignSpendTodayAgorot: 3_000,
  bundleCampaignSpendMonthAgorot: 15_000,
  bundleCampaignPurchasesToday: 0,
  boostProductCampaignSpendTodayAgorot: 500,
  boostProductCampaignSpendMonthAgorot: 2_500,
  boostProductCampaignPurchasesToday: 1,
  otherCampaignSpendTodayAgorot: 5_500,
  otherCampaignSpendMonthAgorot: 27_500,
  matchesSentToday: 5,
  matchesMutualYesToday: 2,
  activeSinglesNoMatch14Days: 17,
  activeSinglesMissingDetails: 9,
  excludedEstimatedPaymentsToday: 0,
};

describe("daily report Israel date boundaries", () => {
  it("summarizes the day that just ended even when the midnight heartbeat is delayed", () => {
    expect(getReportDateForMidnightRun(Date.parse("2026-09-01T21:00:10Z"))).toBe("2026-09-01");
    expect(getReportDateForMidnightRun(Date.parse("2026-09-01T21:05:18Z"))).toBe("2026-09-01");
    expect(getReportDateForMidnightRun(Date.parse("2026-09-01T21:59:59Z"))).toBe("2026-09-01");
  });

  it("uses UTC+3 in September and UTC+2 in January", () => {
    expect(getReportDateRange("2026-09-01").dayStart).toBe(Date.parse("2026-08-31T21:00:00Z"));
    expect(getReportDateRange("2026-09-01").dayEnd).toBe(Date.parse("2026-09-01T21:00:00Z"));
    expect(getReportDateRange("2026-01-01").dayStart).toBe(Date.parse("2025-12-31T22:00:00Z"));
    expect(getReportDateForMidnightRun(Date.parse("2026-01-01T22:05:00Z"))).toBe("2026-01-01");
  });
});

describe("daily report metrics and message", () => {
  it("calculates daily and monthly database gaps and verified ratios", () => {
    const result = deriveDailyReportMetrics(metrics, targets);
    expect(result.databaseDailyTarget).toBeGreaterThan(0);
    expect(result.databaseDailyGap).toBe(Math.ceil(result.databaseDailyTarget - metrics.databasePurchasesToday));
    expect(result.databaseMonthlyGap).toBe(348);
    expect(result.boostCpaAgorot).toBe(4_000);
    expect(result.boostRoas).toBe(0.5);
    expect(result.salesCtr).toBe(3);
    expect(result.salesCplAgorot).toBe(600);
  });

  it("renders three separate messages for sales, campaigns and the database", () => {
    const parts = buildDailyReportMessages(metrics, targets, {
      payments: { available: true, label: "Grow" },
      meta: { available: false, label: "Meta" },
    });
    expect(parts).toHaveLength(3);
    expect(parts.map(part => part.key)).toEqual(["sales_targets", "campaigns", "database"]);
    expect(parts[0].message).toContain("דוח 1/3");
    expect(parts[0].message).toContain("מצטבר");
    expect(parts[1].message).toContain("CTR 3%");
    expect(parts[1].message).toContain("Meta מאגר: יום");
    expect(parts[1].message).toContain("תוכנית ספטמבר שאושרה");
    expect(parts[1].message).toContain("%)");
    expect(parts[2].message).toContain("התאמות: 5 נשלחו | 2 זוגות אמרו כן");
    expect(parts[2].message).toContain("17 ללא התאמה מעל 14 יום");
    expect(parts[2].message).toContain("מקור לא זמין: Meta");
    expect(parts.every(part => part.message.length <= DAILY_REPORT_MAX_MESSAGE_LENGTH)).toBe(true);
    expect(buildDailyReportMessage(metrics, targets, {})).toContain("דוח 3/3");
  });

  it("hard-limits every SMS even when many sources are unavailable", () => {
    const sources = Object.fromEntries(Array.from({ length: 120 }, (_, index) => [
      `source_${index}`,
      { available: false, label: `מקור חיצוני ארוך ${index}` },
    ]));
    const parts = buildDailyReportMessages(metrics, targets, sources);
    expect(parts.every(part => part.message.length <= DAILY_REPORT_MAX_MESSAGE_LENGTH)).toBe(true);
    expect(parts[2].message.endsWith("…")).toBe(true);
  });

  it("uses lower weights on weekends and holidays while preserving the monthly total", () => {
    expect(getDailyBusinessWeight("2026-09-21")).toBeLessThan(getDailyBusinessWeight("2026-09-02"));
    expect(getDailyBusinessWeight("2026-09-19")).toBeLessThan(getDailyBusinessWeight("2026-09-17"));
    const total = Array.from({ length: 30 }, (_, index) => weightedTargetForDate(350, `2026-09-${String(index + 1).padStart(2, "0")}`) || 0)
      .reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(350, 8);
  });

  it("derives strong-day weights from historical verified events and keeps the monthly goal intact", () => {
    const historyStart = Date.parse("2026-07-01T00:00:00Z");
    const historyEnd = Date.parse("2026-08-31T00:00:00Z");
    const timestamps = Array.from({ length: 30 }, (_, index) => Date.parse(`2026-07-${String((index % 20) + 1).padStart(2, "0")}T09:00:00Z`))
      .concat(Array.from({ length: 20 }, (_, index) => Date.parse(`2026-08-${String((index % 20) + 1).padStart(2, "0")}T09:00:00Z`)));
    const weights = buildHistoricalWeekdayWeights(timestamps, historyStart, historyEnd);
    expect(weights).not.toBeNull();
    const total = Array.from({ length: 30 }, (_, index) => weightedTargetForDate(350, `2026-09-${String(index + 1).padStart(2, "0")}`, weights || undefined) || 0)
      .reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(350, 8);
  });

  it("uses the approved September media plan and calculates planned spend to date", () => {
    const plan = getDailyReportMediaPlan("2026-09-05", 1_000_000);
    expect(plan.totalMonthlyBudgetAgorot).toBe(2_000_000);
    expect(plan.bundleMonthlyBudgetAgorot).toBe(700_000);
    expect(plan.boostMonthlyBudgetAgorot).toBe(35_000);
    expect(weightedTargetToDate(plan.databaseMonthlyBudgetAgorot, "2026-09-05")).toBeGreaterThan(0);
  });
});
