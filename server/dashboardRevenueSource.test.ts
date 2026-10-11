import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(
  resolve(process.cwd(), "server/dashboardRouter.ts"),
  "utf8"
);
const dashboardSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Dashboard.tsx"),
  "utf8"
);
const salesTableSource = readFileSync(resolve(process.cwd(), "client/src/components/SalesSourcesTable.tsx"), "utf8");
const weeklyReportSource = readFileSync(
  resolve(process.cwd(), "server/weeklyReport.ts"),
  "utf8"
);

function section(start: string, end: string) {
  const startIndex = routerSource.indexOf(start);
  const endIndex = routerSource.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return routerSource.slice(startIndex, endIndex);
}

describe("dashboard revenue source", () => {
  it("uses verified Grow payments for the overview, trend and daily funnel", () => {
    for (const source of [
      section(
        "overview: teamProcedure",
        "overviewWithComparison: teamProcedure"
      ),
      section(
        "overviewWithComparison: teamProcedure",
        "dailyTrend: teamProcedure"
      ),
      section("dailyTrend: teamProcedure", "channelBreakdown: teamProcedure"),
      section(
        "dailyLeadFunnel: teamProcedure",
        "sendCompletionSms: teamProcedure"
      ),
    ]) {
      expect(source).toContain("completedPayments");
      expect(source).toContain('eq(completedPayments.amountSource, "grow")');
    }
  });

  it("uses the same conservative sales totals and labels provider reconciliation honestly", () => {
    expect(dashboardSource).toContain("intelligence.data.summary.includedRevenueAgorot / 100");
    expect(dashboardSource).toContain("intelligence.data.summary.includedCount");
    expect(salesTableSource).toContain("דיווחי תשלום שהתקבלו באתר");
    expect(salesTableSource).toContain("ההתאמה העצמאית ל־Grow עדיין אינה מאושרת");
    expect(dashboardSource).not.toContain("Grow מאומת");
    expect(salesTableSource).toContain("מודל האתר אינו זהה לייחוס ב־Ads Manager");
    expect(dashboardSource).not.toContain("יחס הכנסות Grow לכל הוצאות Meta");
  });

  it("uses verified Grow payments in the weekly report and separates Meta spend", () => {
    expect(weeklyReportSource).toContain("completedPayments");
    expect(weeklyReportSource).toContain(
      'eq(completedPayments.amountSource, "grow")'
    );
    expect(weeklyReportSource).toContain("profileBoostSpend");
    expect(weeklyReportSource).toContain("ללא ייחוס");
    expect(weeklyReportSource).not.toContain("FROM payment_leads");
    expect(weeklyReportSource).not.toContain("PRODUCT_PRICES");
  });

  it("does not derive follower change from the Instagram follower_count time series", () => {
    const socialSection = section(
      "export async function fetchSocialInsights",
      "export async function fetchMetaAdsInsights"
    );
    expect(socialSection).not.toContain("metric=reach,follower_count");
    expect(socialSection).toContain("followerGrowth: null");
    expect(socialSection).toContain("whatsappGroupSize: null");
    expect(dashboardSource).not.toContain("follower_count");
  });
});
