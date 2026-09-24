import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inferCampaignUtmAliases, normalizeLandingCategory } from "./dashboardRouter";

const routerSource = readFileSync(resolve(process.cwd(), "server/dashboardRouter.ts"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");

function campaignJourneySection() {
  const start = routerSource.indexOf("campaignJourney: teamProcedure");
  const end = routerSource.indexOf("coachingRevenue: teamProcedure", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return routerSource.slice(start, end);
}

describe("campaign journey attribution", () => {
  it("keeps verified database Grow payments as the revenue source", () => {
    const source = campaignJourneySection();
    expect(source.match(/cp\.amount_source = 'grow'/g)?.length).toBe(2);
    expect(source.match(/cp\.product = 'database'/g)?.length).toBe(2);
    expect(source.match(/cp\.amount_agorot > 100/g)?.length).toBe(2);
  });

  it("uses first CRM touch for the lead cohort and only counts email sent before payment", () => {
    const source = campaignJourneySection();
    expect(source).toContain("PARTITION BY LOWER(TRIM(cl_inner.email))");
    expect(source).toContain("ORDER BY cl_inner.createdAt ASC, cl_inner.id ASC");
    expect(source).toContain("email_any.sentAt <= cp.paid_at");
    expect(source).toContain("email_click.clickedAt <= cp.paid_at");
  });

  it("uses the last CRM touch before each individual payment for direct attribution", () => {
    const source = campaignJourneySection();
    expect(source).toContain("PARTITION BY cp.id");
    expect(source).toContain("ORDER BY cl.createdAt DESC, cl.id DESC");
    expect(source).toContain("cl.createdAt <= cp.paid_at");
    expect(source).toContain("directGrowPurchases");
    expect(source).toContain("directGrowRevenue");
  });

  it("uses campaign_id to join Meta performance to ad destinations", () => {
    const source = campaignJourneySection();
    expect(source).toContain("destinations[campaign.id]");
    expect(source).toContain("campaignId: campaign.id");
  });

  it("prefers UTM values read from Meta creatives over name-based fallback aliases", () => {
    expect(inferCampaignUtmAliases("קהל קר לידים", ["creative_tag"])).toEqual(["creative_tag"]);
    expect(inferCampaignUtmAliases("קהל קר לידים", [])).toEqual(expect.arrayContaining(["lead_cold_measure", "lead_cold_120"]));
  });

  it("never exposes technical UTM fragments as landing-page labels", () => {
    expect(normalizeLandingCategory("/utm_source=facebook&utm_campaign=lead_cold")).toEqual({ category: "unknown", label: "לא זוהה" });
    expect(normalizeLandingCategory("https://hilitcaspi.com/dna-quiz?utm_campaign=lead_cold")).toEqual({ category: "dna_quiz", label: "שאלון DNA" });
  });

  it("labels source-first, direct Grow and email assistance as distinct concepts in the UI", () => {
    expect(dashboardSource).toContain("מקור ראשון (קוהורט)");
    expect(dashboardSource).toContain("רכישה ישירה · Grow");
    expect(dashboardSource).toContain("אינה טוענת שהמייל לבדו יצר את המכירה");
    expect(dashboardSource).toContain("אינה הוכחה שסיבת הרכישה הייתה המודעה האחרונה");
  });

  it("shows the campaign journey once, before the general KPI sections", () => {
    expect(dashboardSource.match(/id="campaign-journey"/g)).toHaveLength(1);
    expect(dashboardSource.indexOf('id="campaign-journey"')).toBeLessThan(
      dashboardSource.indexOf("SECTION 1: TOP KPIs"),
    );
    expect(dashboardSource).toContain("המעקב החדש שסיכמנו");
  });

  it("warns about partial UTM coverage and hides cohort CAC when coverage is weak", () => {
    expect(dashboardSource).toContain("איכות מיפוי מקור ראשון");
    expect(dashboardSource).toContain("cohortMetricsReliable");
    expect(dashboardSource).toContain("לא מוצג · כיסוי UTM חלקי");
    expect(dashboardSource).toContain("היום הנוכחי עדיין חלקי");
  });
});
