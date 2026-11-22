import { describe, expect, it } from "vitest";
import { DEFAULT_SALES_SOURCE_LENS, SALES_SOURCE_LENSES, SALES_SOURCE_TAG_NOTE, salesSourceForLens, summarizeSalesSources, explainSalesSourceEvidence } from "../shared/salesSourcePresentation";
import { splitSalesVisibleDay } from "../shared/salesDayPresentation";
import { filterSalesByProduct, summarizeProductSales } from "../shared/salesProductPresentation";

const source = (channel: string, extras = {}) => ({ channel, campaign: "database", confidence: "תיעוד מקור קודם", ...extras });
const sale = (channel: string, extras = {}) => ({
  closing: source(channel), acquisition: source("ישיר / לא ידוע"),
  status: "included" as "included" | "review", amountAgorot: 29900,
  product: "database", paidAt: Date.parse("2026-11-22T12:00:00+02:00"),
  creative: null as string | null, emailAssist: null, ...extras,
});

describe("explicit purchase closing and acquaintance lenses", () => {
  it("defaults the dashboard source lens to closing and labels both lenses clearly", () => {
    expect(DEFAULT_SALES_SOURCE_LENS).toBe("closing");
    expect(SALES_SOURCE_LENSES).toEqual({ closing: "מאיפה בוצעה הרכישה", acquisition: "מקור ההיכרות" });
    expect(SALES_SOURCE_TAG_NOTE).toContain("אינו הוכחה לקליק היום");
  });

  it("does not group an IG-acquired personal-area Boost under IG in closing mode", () => {
    const input = sale("אזור אישי", {
      product: "match_boost", amountAgorot: 1990,
      closing: source("אזור אישי", { campaign: "Boost באזור האישי", confidence: "בקשת Boost מותאמת לעסקה" }),
      acquisition: source("Instagram (אורגני/לא ידוע)", { content: "bio_link" }),
    });
    expect(salesSourceForLens(input)).toMatchObject({ group: "onsite", primaryLabel: "רכישה מתוך האזור האישי", acquisitionRecorded: true });
    expect(salesSourceForLens(input, "acquisition")).toMatchObject({ group: "instagram", primaryLabel: "אינסטגרם · קישור בביו", closingLabel: "רכישה מתוך האזור האישי" });
    expect(summarizeSalesSources([input], "closing").map(row => row.group)).toEqual(["onsite"]);
    expect(summarizeSalesSources([input], "acquisition").map(row => row.group)).toEqual(["instagram"]);
  });

  it("does not infer a personal-area close from the product or its old IG tag", () => {
    const input = sale("ישיר / לא ידוע", { product: "match_boost", acquisition: source("Instagram (אורגני/לא ידוע)") });
    expect(salesSourceForLens(input).group).toBe("unknown");
    expect(salesSourceForLens(input, "acquisition").group).toBe("instagram");
    expect(explainSalesSourceEvidence(input)).toContain("אין בכך ראיה שהרכישה הנוכחית הגיעה שוב מאותו ערוץ");
    expect(summarizeSalesSources([input], "closing")[0].revenueAgorot).toBe(29900);
  });

  it("groups an IG original plus email close according to the same selected lens", () => {
    const input = sale("Email", { acquisition: source("Instagram (אורגני/לא ידוע)", { medium: "organic_social", content: "reel_launch" }) });
    expect(salesSourceForLens(input, "closing")).toMatchObject({ group: "email", primaryLabel: "מייל", emailClosed: true });
    expect(salesSourceForLens(input, "acquisition")).toMatchObject({ group: "instagram", primaryLabel: "אינסטגרם אורגני · רילס", emailClosed: true });
    for (const lens of ["closing", "acquisition"] as const) {
      const rows = summarizeSalesSources([input], lens);
      expect(rows[0].group).toBe(salesSourceForLens(input, lens).group);
      expect(rows[0]).toMatchObject({ count: 1, revenueAgorot: 29900, emailClosedCount: 1 });
    }
  });

  it("never replaces missing acquisition with a known closing or checkout-copied source", () => {
    const inputs = [sale("Email"), sale("Instagram (אורגני/לא ידוע)", {
      acquisition: source("Instagram (אורגני/לא ידוע)", { confidence: "מקור בעסקה; לא נמצא מקור קודם" }),
    })];
    for (const input of inputs) {
      expect(salesSourceForLens(input, "acquisition")).toMatchObject({ group: "unknown", primaryLabel: "מקור ההיכרות לא מתועד", primaryCampaign: null, acquisitionRecorded: false });
      expect(salesSourceForLens(input, "closing").group).not.toBe("unknown");
    }
    expect(summarizeSalesSources(inputs, "acquisition")[0]).toMatchObject({ label: "מקור ההיכרות לא מתועד", count: 2, revenueAgorot: 59800 });
  });

  it("keeps lifecycle and unverified direct labels unknown in both lenses", () => {
    for (const channel of ["direct", "unknown", "paid_database", "paid_plus", "dna_quiz", "ישיר / לא ידוע", "שאלון DNA / מקור לא ידוע"]) {
      const input = sale(channel, { acquisition: source(channel) });
      expect(salesSourceForLens(input, "closing").group).toBe("unknown");
      expect(salesSourceForLens(input, "acquisition").group).toBe("unknown");
      expect(explainSalesSourceEvidence(input)).toContain("אין בכך הוכחה");
    }
  });

  it("separates bio, story, reel and untyped social tags without declaring unknown organic or paid", () => {
    const inputs = ["bio_link", "story_launch", "reel_launch", null].map(content => sale("Instagram (אורגני/לא ידוע)", { closing: source("Instagram (אורגני/לא ידוע)", { content }) }));
    const summary = summarizeSalesSources(inputs, "closing");
    expect(summary[0].linkTypes.map(row => row.label).sort()).toEqual([
      "אינסטגרם · קישור בביו", "אינסטגרם · סטורי", "אינסטגרם · רילס", "אינסטגרם · סוג הקישור לא נשמר",
    ].sort());
    expect(summary[0]).toMatchObject({ count: 4, revenueAgorot: 119600 });
    expect(summary[0].linkTypes.every(row => !row.label.includes("אורגני") && !row.label.includes("ממומן"))).toBe(true);
    const paid = sale("Meta Ads (ממומן)", { closing: source("Meta Ads (ממומן)", { medium: "paid_social", content: "story_launch" }) });
    expect(salesSourceForLens(paid).group).toBe("meta");
    expect(salesSourceForLens(paid).primaryLabel).not.toContain("סטורי");
  });

  it("keeps matched historical ads in history rather than relabeling onsite closing", () => {
    const input = sale("אזור אישי", { acquisition: source("Meta Ads (ממומן)", {
      campaign: "קמפיין היכרות", confidence: "מקור קודם; תיוג מודעה ייחודי תואם", creative: "מודעה שנמצאה במדויק", content: "raw_tag",
    }) });
    expect(salesSourceForLens(input)).toMatchObject({ group: "onsite", primaryCreative: null, acquisitionCreative: "מודעה שנמצאה במדויק" });
    expect(salesSourceForLens(input, "acquisition")).toMatchObject({ group: "meta", primaryCreative: "מודעה שנמצאה במדויק" });
    expect(explainSalesSourceEvidence(input)).not.toContain("מודעה בחשבון הישראלי");
  });

  it("reconciles cents and included status across both lenses, products and selected Israel day", () => {
    const inputs = [
      sale("Email", { acquisition: source("Instagram (אורגני/לא ידוע)"), amountAgorot: 29901 }),
      sale("אזור אישי", { product: "match_boost", amountAgorot: 1990 }),
      sale("Meta Ads (ממומן)", { status: "review", amountAgorot: 29900 }),
      sale("Email", { paidAt: Date.parse("2026-11-21T12:00:00+02:00") }),
    ];
    const before = structuredClone(inputs);
    const products = filterSalesByProduct(inputs, "database");
    const day = splitSalesVisibleDay(products, Date.parse("2026-11-23T00:00:00+02:00"), Date.parse("2026-11-22T20:00:00+02:00"));
    expect(day.visible).toHaveLength(2);
    expect(day.older).toHaveLength(1);
    for (const scoped of [products, day.visible]) {
      const trusted = summarizeProductSales(scoped);
      for (const lens of ["closing", "acquisition"] as const) {
        const summary = summarizeSalesSources(scoped, lens);
        expect(summary.reduce((sum, row) => sum + row.count, 0)).toBe(trusted.includedCount);
        expect(summary.reduce((sum, row) => sum + row.revenueAgorot, 0)).toBe(trusted.includedRevenueAgorot);
      }
    }
    expect(inputs).toEqual(before);
    expect(summarizeSalesSources([], "closing")).toEqual([]);
    expect(summarizeSalesSources([], "acquisition")).toEqual([]);
  });
});
