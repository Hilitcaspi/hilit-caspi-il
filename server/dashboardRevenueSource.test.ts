import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(resolve(process.cwd(), "server/dashboardRouter.ts"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");

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
      section("overview: teamProcedure", "overviewWithComparison: teamProcedure"),
      section("overviewWithComparison: teamProcedure", "dailyTrend: teamProcedure"),
      section("dailyTrend: teamProcedure", "channelBreakdown: teamProcedure"),
      section("dailyLeadFunnel: teamProcedure", "sendCompletionSms: teamProcedure"),
    ]) {
      expect(source).toContain("completedPayments");
      expect(source).toContain('eq(completedPayments.amountSource, "grow")');
    }
  });

  it("labels revenue as verified gross sales and explains the Grow net difference", () => {
    expect(dashboardSource).toContain("מכירות ברוטו מאומתות");
    expect(dashboardSource).toContain("נטו לאחר זיכויים ועמלות");
    expect(dashboardSource).toContain("dailyTrend.data.purchases.map");
  });
});
