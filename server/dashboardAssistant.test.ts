import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  callerFactory: vi.fn(),
  invokeLLM: vi.fn(),
  getDb: vi.fn(),
  recordSelfServiceEvent: vi.fn(),
  hashActor: vi.fn(),
}));

vi.mock("./dashboardRouter", () => ({
  dashboardRouter: { createCaller: mocks.callerFactory },
}));
vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./usageMetrics", () => ({
  recordSelfServiceEvent: mocks.recordSelfServiceEvent,
  hashActor: mocks.hashActor,
}));

import {
  buildDashboardSnapshot,
  parseDashboardAssistantAnswer,
  reduceDashboardSnapshot,
} from "./dashboardAssistantRouter";

const input = {
  startDate: new Date("2026-09-01T00:00:00.000Z").getTime(),
  endDate: new Date("2026-09-12T23:59:59.000Z").getTime(),
};

const ctx = {
  user: null,
  teamMember: { id: 7, email: "team@example.com", name: "צוות", role: "admin" },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} satisfies TrpcContext;

function fulfilled(value: unknown): PromiseFulfilledResult<unknown> {
  return { status: "fulfilled", value };
}

describe("buildDashboardSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the existing dashboard caller concurrently and returns partial, safe data when one section fails", async () => {
    const caller = {
      overviewWithComparison: vi.fn().mockResolvedValue({
        current: { leads: 20, purchases: 4, revenue: 1200, dna: 8 },
        previous: { leads: 10, purchases: 2, revenue: 600, dna: 5 },
        change: { leads: 100, purchases: 100, revenue: 100, dna: 60 },
        salesComparisonAvailable: true,
      }),
      dailyTrend: vi.fn().mockResolvedValue({
        leads: Array.from({ length: 15 }, (_, index) => ({ day: `2026-09-${String(index + 1).padStart(2, "0")}`, count: index + 1 })),
        revenue: [],
        purchases: [],
      }),
      channelBreakdown: vi.fn().mockResolvedValue([{ channel: "Meta Ads (ממומן)", leads: 12, purchases: 2, revenue: 599 }]),
      campaignJourney: vi.fn().mockRejectedValue(new Error("Meta temporarily unavailable")),
      metaAdsPerformance: vi.fn().mockResolvedValue({
        status: "available",
        totals: { totalPaidMediaSpend: 200, acquisitionSpend: 200, profileBoostSpend: 0, metaReportedPurchases: 3, metaReportedLeads: 15 },
        campaigns: [],
        boosts: [],
      }),
    };
    mocks.callerFactory.mockReturnValue(caller);

    const snapshot = await buildDashboardSnapshot(ctx, input);

    expect(mocks.callerFactory).toHaveBeenCalledWith(ctx);
    for (const procedure of Object.values(caller)) {
      expect(procedure).toHaveBeenCalledWith(input);
    }
    expect(snapshot.availability).toMatchObject({
      overviewWithComparison: true,
      dailyTrend: true,
      channelBreakdown: true,
      campaignJourney: false,
      metaAdsPerformance: true,
    });
    expect(snapshot.failedSections).toEqual(["campaignJourney"]);
    expect(snapshot.dailyTrend?.leads).toHaveLength(12);
    expect(snapshot.dailyTrend?.leads[0]).toMatchObject({ day: "2026-09-04", count: 4 });
    expect(snapshot.campaignJourney).toBeNull();
  });
});

describe("reduceDashboardSnapshot", () => {
  it("whitelists aggregate fields and removes IDs, PII, recent leads, and raw UTM aliases", () => {
    const snapshot = reduceDashboardSnapshot({
      overviewWithComparison: fulfilled({
        current: { leads: 3, purchases: 1, revenue: 299, dna: 2 },
        previous: { leads: 2, purchases: 1, revenue: 299, dna: 1 },
        change: { leads: 50, purchases: 0, revenue: 0, dna: 100 },
        salesComparisonAvailable: true,
        journeyAttribution: [{ campaign: "raw_utm_should_not_exist" }],
      }),
      dailyTrend: fulfilled({
        leads: [{ day: "2026-09-01", count: 3 }],
        revenue: [{ day: "2026-09-01", amount: 299 }],
        purchases: [{ day: "2026-09-01", count: 1 }],
      }),
      channelBreakdown: fulfilled([{
        channel: "Meta Ads (ממומן)",
        leads: 3,
        purchases: 1,
        revenue: 299,
        campaigns: [{ name: "raw_utm_should_not_exist" }],
        spend: 90,
        prevLeads: 2,
        prevPurchases: 0,
        prevRevenue: 0,
        metaSpendAvailable: true,
        salesComparisonAvailable: true,
      }]),
      campaignJourney: fulfilled({
        status: "available",
        rows: [{
          campaignId: "120248699100040673",
          campaignName: "קמפיין מכירות",
          utmAliases: ["raw_utm_should_not_exist"],
          objective: "OUTCOME_SALES",
          status: "active",
          spend: 90,
          metaLeads: 4,
          metaPurchases: 1,
          crmLeads: 3,
          growBuyers: 1,
          growPurchases: 1,
          growRevenue: 299,
          buyersWithEmailBeforePurchase: 1,
          buyersWithEmailClickBeforePurchase: 0,
          directGrowBuyers: 1,
          directGrowPurchases: 1,
          directGrowRevenue: 299,
        }],
        recentLeads: [{ id: 1, email: "person@example.com", phone: "0501234567" }],
      }),
      metaAdsPerformance: fulfilled({
        status: "available",
        totals: { totalPaidMediaSpend: 90, acquisitionSpend: 90, profileBoostSpend: 0, metaReportedPurchases: 1, metaReportedLeads: 4 },
        campaigns: [{
          id: "120248699100040673",
          name: "קמפיין מכירות",
          objective: "OUTCOME_SALES",
          spend: 90,
          impressions: 1000,
          reach: 700,
          clicks: 20,
          leads: 4,
          purchases: 1,
          purchaseValue: 299,
        }],
        boosts: [],
      }),
    }, input);

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("120248699100040673");
    expect(serialized).not.toContain("raw_utm_should_not_exist");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).not.toContain("0501234567");
    expect(serialized).not.toContain("recentLeads");
    expect(snapshot.campaignJourney?.rows[0]).toEqual(expect.objectContaining({
      campaign: "קמפיין מכירות",
      firstTouchGrow: expect.objectContaining({ revenue: 299 }),
      lastTouchGrow: expect.objectContaining({ revenue: 299 }),
      emailAssist: expect.objectContaining({ buyersWithEmailBeforePurchase: 1 }),
    }));
    expect(snapshot.metaAdsPerformance?.campaigns[0]).not.toHaveProperty("id");
    expect(snapshot.campaignJourney?.rows[0]).not.toHaveProperty("utmAliases");
    expect(snapshot.channelBreakdown[0]).not.toHaveProperty("campaigns");
  });

  it("caps every snapshot array at twelve rows", () => {
    const manyRows = Array.from({ length: 20 }, (_, index) => ({
      day: `2026-09-${String(index + 1).padStart(2, "0")}`,
      count: index,
      amount: index,
      channel: "Meta Ads (ממומן)",
      campaignName: `Campaign ${index}`,
      name: `Campaign ${index}`,
      objective: "OUTCOME_SALES",
      status: "active",
      spend: index,
    }));
    const snapshot = reduceDashboardSnapshot({
      overviewWithComparison: fulfilled({}),
      dailyTrend: fulfilled({ leads: manyRows, revenue: manyRows, purchases: manyRows }),
      channelBreakdown: fulfilled(manyRows),
      campaignJourney: fulfilled({ status: "available", rows: manyRows }),
      metaAdsPerformance: fulfilled({ status: "available", totals: {}, campaigns: manyRows, boosts: manyRows }),
    }, input);

    expect(snapshot.dailyTrend?.leads).toHaveLength(12);
    expect(snapshot.dailyTrend?.revenue).toHaveLength(12);
    expect(snapshot.dailyTrend?.purchases).toHaveLength(12);
    expect(snapshot.channelBreakdown).toHaveLength(12);
    expect(snapshot.campaignJourney?.rows).toHaveLength(12);
    expect(snapshot.metaAdsPerformance?.campaigns).toHaveLength(12);
    expect(snapshot.metaAdsPerformance?.boosts).toHaveLength(12);
  });
});

describe("parseDashboardAssistantAnswer", () => {
  const validAnswer = {
    answer: "ההכנסות המאומתות ב-Grow עלו בחלון הנתונים.",
    keyFindings: ["נרשמה עלייה בהכנסות Grow."],
    cautions: ["נתוני Meta מדווחים בנפרד."],
    suggestedQuestions: ["איך השתנה המגע הראשון?"],
    dataWindow: "01.09.2026–12.09.2026",
    confidence: "medium",
  };

  it("parses only a strict valid answer", () => {
    expect(parseDashboardAssistantAnswer(JSON.stringify(validAnswer))).toEqual(validAnswer);
  });

  it("rejects malformed JSON and unexpected fields", () => {
    expect(() => parseDashboardAssistantAnswer("not json")).toThrow("תשובת העוזר לא התקבלה בפורמט תקין");
    expect(() => parseDashboardAssistantAnswer(JSON.stringify({ ...validAnswer, question: "do not echo" })))
      .toThrow("תשובת העוזר לא עמדה במבנה הנדרש");
  });
});
