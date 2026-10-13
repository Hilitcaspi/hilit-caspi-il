import { describe, expect, it } from "vitest";
import { presentSalesSource, salesSourceJourney, summarizeSalesSources, explainSalesSourceEvidence } from "../shared/salesSourcePresentation";
const source = (channel: string, campaign = "database", confidence = "UTM בתהליך תשלום מותאם לעסקה") => ({ channel, campaign, confidence });
const sale = (channel: string, campaign = "database", creative: string | null = null) => ({
  closing: source(channel, campaign), acquisition: source("paid_database", "ללא קמפיין"), creative, emailAssist: null,
});
describe("human-readable purchase sources", () => {
  it("recognizes a tagged bio link without claiming a paid ad or original discovery", () => {
    const result = presentSalesSource(sale("Instagram (אורגני/לא ידוע)", "database", "bio_link"));
    expect(result.title).toBe("אינסטגרם · קישור בביו");
    expect(result.detail).toContain("לא ניתן להסיק");
    expect(result.creative).toBeNull();
    expect(result.original).toBeNull();
  });
  it("does not call an untyped Instagram link organic or paid", () => {
    expect(presentSalesSource(sale("Instagram (אורגני/לא ידוע)")).title).toBe("אינסטגרם · סוג הקישור לא נשמר");
  });
  it("explains a generic email tag and shows a recorded email click separately", () => {
    const result = presentSalesSource({ ...sale("Email"), emailAssist: { campaign: "הצעד הראשון לנשים", clicked: true, sameDay: true } });
    expect(result.title).toBe("מייל");
    expect(result.detail).toContain("קליק במייל לפני הרכישה: הצעד הראשון לנשים");
    expect(result.original).toBeNull();
  });
  it("does not invent an email journey when only the generic email tag exists", () => {
    expect(presentSalesSource(sale("Email")).detail).toContain("לא נשמר איזה מייל");
  });
  it("retains known email campaigns", () => {
    const result = presentSalesSource(sale("Email", "השקת מאגר עם מתנת לייב"));
    expect(result.title).toBe("מייל");
    expect(result.original).toBeNull();
  });
  it("does not treat a CRM paid status as an acquisition channel", () => {
    for (const channel of ["ישיר / לא ידוע", "paid_database", "שאלון DNA / מקור לא ידוע"]) {
      const result = presentSalesSource(sale(channel, "ללא מקור מתועד"));
      expect(result.title).toBe("לא ניתן לזהות מאיפה הגיעה הרכישה");
      expect(result.original).toBeNull();
    }
  });
  it("retains documented paid acquisition when email closed the sale", () => {
    const input = { ...sale("Email"), acquisition: source("Meta Ads (ממומן)", "קמפיין מכירה") };
    expect(presentSalesSource(input).original).toEqual({ title: "קמפיין ממומן ב־Meta", campaign: "קמפיין מכירה" });
    expect(input.acquisition.channel).toBe("Meta Ads (ממומן)");
    expect(input.closing.campaign).toBe("database");
  });
  it("retains paid creative and campaign names", () => {
    const result = presentSalesSource(sale("Meta Ads (ממומן)", "קמפיין מכירה", "סרטון מודעה"));
    expect(result.title).toBe("קמפיין ממומן ב־Meta");
    expect(result.detail).toBe("קמפיין מכירה");
    expect(result.creative).toBe("סרטון מודעה");
  });
});

describe("acquisition summary and collapsed journey", () => {
  const counted = (channel: string, campaign = "database", creative: string | null = null) => ({ ...sale(channel, campaign, creative), status: "included" as const, amountAgorot: 29900 });
  it("assigns an email-closed purchase to a documented Meta acquisition once", () => {
    const input = { ...counted("Email"), acquisition: source("Meta Ads (ממומן)", "קמפיין גיוס") };
    expect(salesSourceJourney(input)).toMatchObject({ group: "meta", emailClosed: true, acquisitionRecorded: true, acquisitionCampaign: "קמפיין גיוס" });
    expect(summarizeSalesSources([input])).toEqual([{ group: "meta", label: "קמפיינים ממומנים ב־Meta", count: 1, revenueAgorot: 29900, emailClosedCount: 1, closingOnlyCount: 0, linkTypes: [] }]);
  });
  it("uses the email fallback when the old source is missing or only copied from checkout", () => {
    const input = { ...counted("Email"), acquisition: source("Meta Ads (ממומן)", "קמפיין", "מקור בעסקה; לא נמצא מקור קודם") };
    expect(salesSourceJourney(input)).toMatchObject({ group: "email", acquisitionRecorded: false, acquisitionCampaign: null });
  });
  it("does not use a recorded email touch as the source that recruited someone to email", () => {
    const input = { ...counted("Email"), acquisition: source("Email", "מייל קודם", "מקור ראשוני נפרד שנשמר בהרשמה") };
    expect(salesSourceJourney(input)).toMatchObject({ group: "email", acquisitionRecorded: false, acquisitionCampaign: null, emailClosed: true });
    expect(summarizeSalesSources([input])[0]).toMatchObject({ count: 1, emailClosedCount: 1, closingOnlyCount: 1 });
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

describe("plain-language evidence", () => {
  it("explains Facebook with a raw tag without inventing a paid campaign", () => {
    const input = sale("Facebook (אורגני/לא ידוע)", "database", "rem_db");
    expect(presentSalesSource(input).title).toBe("פייסבוק · סוג הקישור לא נשמר");
    expect(explainSalesSourceEvidence(input)).toContain("אינה מסווגת");
    expect(presentSalesSource(input).creative).toBe("rem_db");
    expect(salesSourceJourney(input).acquisitionRecorded).toBe(false);
  });
  it("separates unknown first exposure from the recorded closing channel", () => {
    const input = sale("Facebook (אורגני/לא ידוע)");
    expect(salesSourceJourney(input).acquisitionLabel).toContain("לא מתועד");
    expect(salesSourceJourney(input).group).toBe("facebook");
  });
  it("never calls an unknown source a direct sale or a paid ad", () => {
    expect(salesSourceJourney(sale("ישיר / לא ידוע")).label).toBe("מקור לא מזוהה");
    expect(explainSalesSourceEvidence(sale("ישיר / לא ידוע"))).toContain("אין בכך הוכחה");
  });
});


describe("specific social link and visible source labels", () => {
  it("shows exact email journey without opening details", () => {
    const input = { ...sale("Email"), emailAssist: { campaign: "הצעד הראשון לגברים", clicked: true, sameDay: true } };
    expect(salesSourceJourney(input).primaryLabel).toBe("מייל");
    expect(salesSourceJourney({...input,acquisition:source("Email")} ).primaryLabel).toBe("מייל");
  });
  it("distinguishes explicit organic posts, stories, reels, bio and social reply", () => {
    for (const [medium, content, expected] of [
      ["organic_social", "story_live", "אינסטגרם אורגני · סטורי"],
      ["organic_social", "post_live", "אינסטגרם אורגני · פוסט"],
      ["organic_social", "reel_live", "אינסטגרם אורגני · רילס"],
      ["organic_social", "bio_link", "אינסטגרם אורגני · קישור בביו"],
      ["social_reply", "database", "אינסטגרם אורגני · מענה אישי בסושיאל"],
    ]) {
      const input = sale("Instagram (אורגני/לא ידוע)");
      input.closing = { ...input.closing, ...{medium, content} };
      expect(presentSalesSource(input).title).toBe(expected);
      expect(salesSourceJourney(input).primaryLabel).toBe(expected);
    }
  });
  it("does not make generic social or retargeting-looking names proof of organic or paid", () => {
    const input = { ...sale("Facebook (אורגני/לא ידוע)", "rem_db", "rem_db"), closing: {...source("Facebook (אורגני/לא ידוע)","rem_db"),medium:"social"} };
    expect(presentSalesSource(input).title).toBe("פייסבוק · סוג הקישור לא נשמר");
    expect(salesSourceJourney(input).primaryCampaign).toBeNull();
  });
  it("keeps a mapped paid story a paid ad, not an organic story", () => {
    const input = { ...sale("Meta Ads (ממומן)", "קמפיין מכירה", "מודעה"), closing: {...source("Meta Ads (ממומן)", "קמפיין מכירה", "מזהה מודעה תואם"),medium:"paid",content:"story_live"} };
    expect(salesSourceJourney(input)).toMatchObject({primaryLabel:"קמפיין ממומן ב־Meta",primaryCampaign:"קמפיין מכירה",primaryCreative:"מודעה",group:"meta"});
  });
  it("keeps social subtypes separate within the source summary and counts once", () => {
    const inputs = ["story_live","bio_link","rem_db"].map(content => ({...sale("Instagram (אורגני/לא ידוע)","database",content),status:"included" as const,amountAgorot:29900}));
    const totals = summarizeSalesSources(inputs);
    expect(totals[0].linkTypes).toHaveLength(3);
    expect(totals[0].count).toBe(3);
    expect(totals[0].revenueAgorot).toBe(89700);
  });
});
