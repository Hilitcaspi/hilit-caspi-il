import { describe, expect, it } from "vitest";
import { presentSalesSource } from "../shared/salesSourcePresentation";
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
