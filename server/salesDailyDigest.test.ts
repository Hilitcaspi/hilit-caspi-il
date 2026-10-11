import { describe, expect, it } from "vitest";
import { buildSalesDailyDigest, type SalesDailyDigestData } from "./salesDailyDigest";

function makeData(overrides: Partial<SalesDailyDigestData> = {}): SalesDailyDigestData {
  return {
    summary: {
      recordedCount: 4,
      recordedRevenueAgorot: 129_700,
      includedCount: 3,
      includedRevenueAgorot: 119_700,
      reviewCount: 1,
      reviewRevenueAgorot: 10_000,
      excludedTests: 1,
      excludedEstimated: 0,
      knownClosingCount: 2,
      knownAcquisitionCount: 1,
      metaSpendAgorot: null,
      otherExpenseAgorot: null,
      totalExpenseAgorot: null,
      balanceAgorot: null,
      expenseComplete: false,
    },
    sales: [],
    channels: [
      { channel: "Email", count: 2, revenueAgorot: 89_800 },
      { channel: "לא ידוע", count: 1, revenueAgorot: 29_900 },
    ],
    products: [
      { product: "live_plus", label: "LIVE Plus", count: 1, revenueAgorot: 49_900 },
      { product: "database", label: "מאגר", count: 2, revenueAgorot: 69_800 },
    ],
    campaigns: [],
    daily: [{ day: "2026-10-10", count: 3, revenueAgorot: 119_700, reviewCount: 1 }],
    insights: [],
    quality: {
      providerReconciled: false,
      attributionNote: "ייחוס חלקי",
      expenseNote: "הוצאות לא שלמות",
      metaTimezone: "Asia/Jerusalem",
      notes: [],
    },
    ...overrides,
  };
}

describe("buildSalesDailyDigest", () => {
  it("reports every product, including LIVE Plus, and keeps pending review out of trusted revenue", () => {
    const messages = buildSalesDailyDigest(makeData(), "2026-10-10");

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ key: "financial" });
    expect(messages[0]?.message).toContain("3 עסקאות | ₪1,197");
    expect(messages[0]?.message).toContain("LIVE Plus 1 | ₪499");
    expect(messages[0]?.message).toContain("1 דיווחים בסך ₪100 בבירור ולא נכללו");
    expect(messages[0]?.message).not.toContain("₪1,297");
  });

  it("keeps unknown attribution explicit and does not fabricate a campaign", () => {
    const messages = buildSalesDailyDigest(makeData(), "2026-10-10");
    const origins = messages.find(message => message.key === "origins")?.message || "";

    expect(origins).toContain("מקור גיוס: לא ידוע");
    expect(origins).toContain("לא ידוע: גיוס 2 | סגירה 1");
    expect(origins).not.toContain("הלימת פיקסל");
    expect(origins).not.toContain("Purchase");
  });

  it("labels unavailable expenses as unavailable and never claims profit", () => {
    const messages = buildSalesDailyDigest(makeData(), "2026-10-10");
    const financial = messages.find(message => message.key === "financial")?.message || "";

    expect(financial).toContain("הוצאות מתועדות: Meta לא זמין | אחרות לא זמין");
    expect(financial).toContain("תמונת ההוצאות חלקית; לא מוצג רווח");
    expect(financial).toContain("דוח ספק טרם הוצלב");
    expect(financial).not.toContain("רווח:");
  });

  it("shows mapped Meta acquisition and email-assisted closes without comparing Meta conversions to site sales", () => {
    const data = makeData({
      summary: { ...makeData().summary, knownAcquisitionCount: 2 },
      campaigns: [{
        campaign: "קמפיין השקה",
        channel: "Meta Ads (ממומן)",
        count: 2,
        revenueAgorot: 69_800,
        emailClosedCount: 1,
        products: ["database"],
        mapping: "utm",
        spendAgorot: 12_000,
        metaPurchases: 9,
      }],
      insights: [{ title: "מעקב", detail: "נבדקה איכות הייחוס", tone: "neutral" }],
    });

    const origins = buildSalesDailyDigest(data, "2026-10-10").find(message => message.key === "origins")?.message || "";
    expect(origins).toContain("Meta Ads (ממומן) — קמפיין השקה: 2 | ₪698, סגירת מייל 1");
    expect(origins).toContain("תובנה: מעקב — נבדקה איכות הייחוס");
    expect(origins).not.toContain("Meta 9");
    expect(origins).not.toContain("% | תקין");
  });

  it("omits zero-sale Meta spend rows rather than presenting them as acquisition", () => {
    const data = makeData({
      campaigns: [
        {
          campaign: "Meta ללא מכירה",
          channel: "Meta Ads (ממומן)",
          count: 0,
          revenueAgorot: 0,
          emailClosedCount: 0,
          products: [],
          mapping: "meta spend only",
          spendAgorot: 25_000,
          metaPurchases: 3,
        },
        {
          campaign: "רשימת תפוצה",
          channel: "Email",
          count: 1,
          revenueAgorot: 29_900,
          emailClosedCount: 1,
          products: ["database"],
          mapping: "email click",
          spendAgorot: null,
          metaPurchases: null,
        },
      ],
    });

    const origins = buildSalesDailyDigest(data, "2026-10-10").find(message => message.key === "origins")?.message || "";
    expect(origins).toContain("Email — רשימת תפוצה: 1 | ₪299, סגירת מייל 1");
    expect(origins).not.toContain("Meta ללא מכירה");
    expect(origins).not.toContain("₪250");
  });
});
