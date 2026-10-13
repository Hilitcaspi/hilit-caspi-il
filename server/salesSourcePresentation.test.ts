import { describe, expect, it } from "vitest";
import { presentSalesSource, salesSourceJourney, summarizeSalesSources } from "../shared/salesSourcePresentation";
const source = (channel: string, campaign = "database", confidence = "UTM בתהליך תשלום מותאם לעסקה") => ({ channel, campaign, confidence });
const sale = (channel: string, campaign = "database", creative: string | null = null) => ({
  closing: source(channel, campaign), acquisition: source("paid_database", "ללא קמפיין"), creative, emailAssist: null,
});
describe("human-readable purchase sources", () => {
  it("recognizes a tagged bio link without claiming a paid ad or original discovery", () => {
    const result = presentSalesSource(sale("Instagram (אורגני/לא ידוע)", "database", "bio_link"));
    expect(result.title).toBe("אינסטגרם · קישור בביו");
    expect(result.detail).toContain("אינה ראיה");
    expect(result.creative).toBeNull();
    expect(result.original).toBeNull();
  });
  it("does not call an untyped Instagram link organic or paid", () => {
    expect(presentSalesSource(sale("Instagram (אורגני/לא ידוע)")).title).toBe("אינסטגרם · סוג הקישור לא זוהה");
  });
  it("explains a generic email tag and shows a recorded email click separately", () => {
    const result = presentSalesSource({ ...sale("Email"), emailAssist: { campaign: "הצעד הראשון לנשים", clicked: true, sameDay: true } });
    expect(result.title).toBe("מייל · הזמנה להצטרף למאגר");
    expect(result.detail).toContain("קליק במייל לפני הרכישה: הצעד הראשון לנשים");
    expect(result.original).toBeNull();
  });
  it("does not invent an email journey when only the generic email tag exists", () => {
    expect(presentSalesSource(sale("Email")).detail).toContain("המייל המדויק לא זוהה");
  });
  it("retains known email campaigns", () => {
    const result = presentSalesSource(sale("Email", "השקת מאגר עם מתנת לייב"));
    expect(result.title).toContain("השקת מאגר עם מתנת לייב");
  });
  it("does not treat a CRM paid status as an acquisition channel", () => {
    for (const channel of ["ישיר / לא ידוע", "paid_database", "שאלון DNA / מקור לא ידוע"]) {
      const result = presentSalesSource(sale(channel, "ללא מקור מתועד"));
      expect(result.title).toBe("מקור הרכישה לא נשמר");
      expect(result.original).toBeNull();
    }
  });
  it("retains documented paid acquisition when email closed the sale", () => {
    const input = { ...sale("Email"), acquisition: source("Meta Ads (ממומן)", "קמפיין מכירה") };
    expect(presentSalesSource(input).original).toEqual({ title: "מודעה ממומנת ב־Meta", campaign: "קמפיין מכירה" });
    expect(input.acquisition.channel).toBe("Meta Ads (ממומן)");
    expect(input.closing.campaign).toBe("database");
  });
  it("retains paid creative and campaign names", () => {
    const result = presentSalesSource(sale("Meta Ads (ממומן)", "קמפיין מכירה", "סרטון מודעה"));
    expect(result.title).toBe("מודעה ממומנת ב־Meta");
    expect(result.detail).toBe("קמפיין מכירה");
    expect(result.creative).toBe("סרטון מודעה");
  });
});

describe("acquisition summary and collapsed journey", () => {
  const counted = (channel: string, campaign = "database", creative: string | null = null) => ({ ...sale(channel, campaign, creative), status: "included" as const, amountAgorot: 29900 });
  it("assigns an email-closed purchase to a documented Meta acquisition once", () => {
    const input = { ...counted("Email"), acquisition: source("Meta Ads (ממומן)", "קמפיין גיוס") };
    expect(salesSourceJourney(input)).toMatchObject({ group: "meta", emailClosed: true, acquisitionRecorded: true, acquisitionCampaign: "קמפיין גיוס" });
    expect(summarizeSalesSources([input])).toEqual([{ group: "meta", label: "Meta ממומן", count: 1, revenueAgorot: 29900, emailClosedCount: 1, closingOnlyCount: 0 }]);
  });
  it("uses the email fallback when the old source is missing or only copied from checkout", () => {
    const input = { ...counted("Email"), acquisition: source("Meta Ads (ממומן)", "קמפיין", "מקור בעסקה; לא נמצא מקור קודם") };
    expect(salesSourceJourney(input)).toMatchObject({ group: "email", acquisitionRecorded: false, acquisitionCampaign: null });
  });
  it("groups a documented Instagram acquisition with a subsequent email close", () => {
    const input = { ...counted("Email"), acquisition: source("Instagram (אורגני/לא ידוע)") };
    expect(salesSourceJourney(input)).toMatchObject({ group: "instagram", emailClosed: true, acquisitionCampaign: null });
  });
  it("counts email assists only when Email is actually the closing channel", () => {
    const input = { ...counted("Meta Ads (ממומן)", "קמפיין"), emailAssist: { campaign: "מסע", clicked: true, sameDay: true } };
    expect(summarizeSalesSources([input])[0]!.emailClosedCount).toBe(0);
  });
  it("excludes review rows and reconciles counts and cents for mixed products", () => {
    const inputs = [
      { ...counted("Email"), acquisition: source("Meta Ads (ממומן)", "קמפיין") },
      counted("Instagram (אורגני/לא ידוע)", "database", "bio_link"),
      { ...counted("ישיר / לא ידוע"), amountAgorot: 29901 },
      { ...counted("Meta Ads (ממומן)", "קמפיין"), status: "review" as const },
      { ...counted("אזור אישי"), amountAgorot: 4500 },
    ];
    const totals = summarizeSalesSources(inputs);
    expect(totals.reduce((sum, row) => sum + row.count, 0)).toBe(4);
    expect(totals.reduce((sum, row) => sum + row.revenueAgorot, 0)).toBe(94201);
    expect(totals.reduce((sum, row) => sum + row.emailClosedCount, 0)).toBe(1);
    expect(totals.find(row => row.group === "unknown")!.count).toBe(1);
  });
  it("returns no invented zero-value channels for an empty period", () => {
    expect(summarizeSalesSources([])).toEqual([]);
  });
});
