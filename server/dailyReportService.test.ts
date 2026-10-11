import { describe, expect, it } from "vitest";
import {
  buildDailyReportSettingsUpdate,
  buildManualDailyReportRunKey,
  buildScheduledDailyReportRunKey,
  classifyDailyReportCampaign,
  getDailyReportDeliveryMode,
  isDailyReportLocalMidnight,
  maskRecipient,
  maskRecipients,
  parseRecipientPhones,
  sendDailyReportMessages,
  summarizeSalesIntelligenceForPreview,
} from "./dailyReportService";
import type { SalesIntelligence } from "./salesIntelligence";

function salesDataForPreview(): SalesIntelligence {
  return {
    startDate: 1_000,
    endDate: 3_000,
    generatedAt: 4_000,
    partialToday: false,
    summary: {
      recordedCount: 4,
      recordedRevenueAgorot: 100_000,
      includedCount: 2,
      includedRevenueAgorot: 59_800,
      reviewCount: 1,
      reviewRevenueAgorot: 29_900,
      excludedTests: 1,
      excludedEstimated: 0,
      knownClosingCount: 0,
      knownAcquisitionCount: 0,
      metaSpendAgorot: null,
      otherExpenseAgorot: null,
      totalExpenseAgorot: null,
      balanceAgorot: null,
      expenseComplete: false,
    },
    sales: [
      {
        order: 1,
        paidAt: 1_200,
        day: "2026-10-10",
        product: "database",
        productLabel: "מאגר רווקים",
        amountAgorot: 29_900,
        coupon: null,
        status: "included",
        paymentEvidence: "דיווח תשלום באתר; טרם הוצלב בדוח Grow",
        acquisition: { channel: "ישיר / לא ידוע", campaign: "ללא מקור מתועד", confidence: "unknown" },
        closing: { channel: "ישיר / לא ידוע", campaign: "ללא מקור מתועד", confidence: "unknown" },
        emailAssist: null,
        lagDays: null,
      },
      {
        order: 2,
        paidAt: 2_200,
        day: "2026-10-10",
        product: "plus",
        productLabel: "Database Plus",
        amountAgorot: 29_900,
        coupon: null,
        status: "included",
        paymentEvidence: "דיווח תשלום באתר; טרם הוצלב בדוח Grow",
        acquisition: { channel: "ישיר / לא ידוע", campaign: "ללא מקור מתועד", confidence: "unknown" },
        closing: { channel: "ישיר / לא ידוע", campaign: "ללא מקור מתועד", confidence: "unknown" },
        emailAssist: null,
        lagDays: null,
      },
      {
        order: 3,
        paidAt: 2_400,
        day: "2026-10-10",
        product: "database",
        productLabel: "מאגר רווקים",
        amountAgorot: 29_900,
        coupon: null,
        status: "review",
        paymentEvidence: "דיווח תשלום באתר; טרם הוצלב בדוח Grow",
        acquisition: { channel: "ישיר / לא ידוע", campaign: "ללא מקור מתועד", confidence: "unknown" },
        closing: { channel: "ישיר / לא ידוע", campaign: "ללא מקור מתועד", confidence: "unknown" },
        emailAssist: null,
        lagDays: null,
      },
    ],
    channels: [],
    products: [],
    campaigns: [],
    daily: [],
    insights: [],
    quality: {
      providerReconciled: false,
      attributionNote: "",
      expenseNote: "",
      metaTimezone: "America/Los_Angeles",
      notes: [],
    },
  };
}

describe("daily report delivery safeguards", () => {
  it("classifies Meta campaigns into the approved budget families", () => {
    expect(classifyDailyReportCampaign({ name: "קהל חם | מכירה | database אוגוסט", objective: "OUTCOME_SALES" })).toBe("database");
    expect(classifyDailyReportCampaign({ name: "sales | שאלון DNA | באנדל חג", objective: "OUTCOME_SALES" })).toBe("bundle");
    expect(classifyDailyReportCampaign({ name: "קהל חם רכשו | מכירה - בוסט", objective: "OUTCOME_SALES" })).toBe("boost");
    expect(classifyDailyReportCampaign({ name: "קהל קר | Lead | שאלון dna", objective: "OUTCOME_LEADS" })).toBe("other");
  });

  it("uses one deterministic run key per settings row and report date", () => {
    expect(buildScheduledDailyReportRunKey(7, "2026-09-01")).toBe("daily-report:7:2026-09-01");
    expect(buildScheduledDailyReportRunKey(7, "2026-09-01")).toBe(buildScheduledDailyReportRunKey(7, "2026-09-01"));
    expect(buildScheduledDailyReportRunKey(7, "2026-09-02")).not.toBe(buildScheduledDailyReportRunKey(7, "2026-09-01"));
  });

  it("uses a separate deterministic key for a manual three-part backfill", () => {
    expect(buildManualDailyReportRunKey(7, "2026-09-02")).toBe("daily-report:7:manual:2026-09-02:three-part-v1");
  });

  it("never exposes the full recipient in overview responses", () => {
    expect(maskRecipient("0521234567")).toBe("052****67");
    expect(maskRecipient(null)).toBeNull();
  });

  it("parses, deduplicates and masks two approved recipients", () => {
    expect(parseRecipientPhones("0521234567, 0547654321;0521234567")).toEqual(["0521234567", "0547654321"]);
    expect(maskRecipients("0521234567,0547654321")).toEqual(["052****67", "054****21"]);
  });

  it("never sends while disabled or in dry-run mode", () => {
    expect(getDailyReportDeliveryMode({ isEnabled: false, dryRun: false, recipientPhone: "0521234567" })).toBe("disabled");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: true, recipientPhone: "0521234567" })).toBe("dry_run");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: false, recipientPhone: null })).toBe("missing_recipient");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: false, recipientPhone: "0521234567,0547654321" })).toBe("send");
  });

  it("does not disable an active report when targets are edited", () => {
    const update = buildDailyReportSettingsUpdate({
      databaseMonthlyMinTarget: 350,
      databaseMonthlyStretchTarget: 400,
      databaseMonthlyBudgetAgorot: 1_000_000,
      revenueMonthlyTargetAgorot: 14_000_000,
    }, 123);
    expect(update).not.toHaveProperty("isEnabled");
    expect(update).not.toHaveProperty("dryRun");
    expect(update).toMatchObject({
      timezone: "Asia/Jerusalem",
      deliveryHour: 0,
      deliveryMinute: 0,
      updatedAt: 123,
    });
  });

  it("accepts the summer UTC trigger only when it is midnight in Israel", () => {
    expect(isDailyReportLocalMidnight(Date.parse("2026-09-01T21:00:00Z"))).toBe(true);
    expect(isDailyReportLocalMidnight(Date.parse("2026-09-01T22:00:00Z"))).toBe(false);
  });

  it("accepts the winter UTC trigger only when it is midnight in Israel", () => {
    expect(isDailyReportLocalMidnight(Date.parse("2026-12-01T22:00:00Z"))).toBe(true);
    expect(isDailyReportLocalMidnight(Date.parse("2026-12-01T21:00:00Z"))).toBe(false);
  });

  it("sends all three message parts to both recipients and records partial failure", async () => {
    const calls: string[] = [];
    const deliveries = await sendDailyReportMessages(
      ["0521234567", "0547654321"],
      [
        { key: "sales_targets", message: "one" },
        { key: "campaigns", message: "two" },
        { key: "database", message: "three" },
      ],
      async (phone, message) => {
        calls.push(`${phone}:${message}`);
        return message !== "two" || phone !== "0547654321";
      },
    );
    expect(calls).toHaveLength(6);
    expect(deliveries).toHaveLength(6);
    expect(deliveries.filter(delivery => delivery.accepted)).toHaveLength(5);
  });

  it("uses only included shared-ledger rows for CRM preview amount, count and product cards", () => {
    const summary = summarizeSalesIntelligenceForPreview(salesDataForPreview());

    expect(summary.revenueAgorot).toBe(59_800);
    expect(summary.salesPurchases).toBe(2);
    expect(summary.database).toEqual({ count: 1, revenueAgorot: 29_900 });
    expect(summary).not.toMatchObject({ revenueAgorot: 89_700 });
  });
});
