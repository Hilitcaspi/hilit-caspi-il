import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const dashboardSource = read("client/src/pages/Dashboard.tsx");
const tableSource = read("client/src/components/SalesSourcesTable.tsx");
const serviceSource = read("server/salesIntelligence.ts");
const routerSource = read("server/dashboardRouter.ts");

describe("restored dashboard presentation", () => {
  it("restores the prior marketing layout and removes the confusing journey block", () => {
    expect(dashboardSource).toContain("דשבורד שיווק ומכירות");
    expect(dashboardSource).toContain("דמוגרפיה: מצבה כיום");
    expect(dashboardSource).toContain("Meta Ads — תקציב ותוצאות מדווחות");
    expect(dashboardSource).toContain("SEO ותנועה");
    expect(dashboardSource).not.toContain('id="campaign-journey"');
    expect(dashboardSource).not.toContain("campaignJourney.useQuery");
    expect(dashboardSource).not.toContain("שתי עדשות שיוך");
  });
  it("shows a three-full-day choice, refresh and a simple row per purchase", () => {
    expect(dashboardSource).toContain('label: "3 ימים מלאים"');
    expect(dashboardSource).toContain("setRefreshedAt(Date.now())");
    expect(dashboardSource).toContain("SalesSourcesTable");
    for (const label of ["מאיפה הגיעה כל רכישה", "רוכש", "מוצר", "סכום", "מסלול הרכישה", "מקור ההיכרות המתועד", "סיכום רכישות לפי מקור"]) expect(tableSource).toContain(label);
    expect(tableSource).toContain("sale.closing.channel");
    expect(tableSource).toContain("sale.acquisition.campaign");
    expect(tableSource).toContain('timeZone: "Asia/Jerusalem"');
    expect(tableSource).not.toMatch(/sale\.email\b/);
  });
  it("keeps included income and review rows on one shared source", () => {
    expect(dashboardSource).toContain("trpc.dashboard.salesIntelligence.useQuery");
    expect(dashboardSource).toContain("revenue: intelligence.data.summary.includedRevenueAgorot / 100");
    expect(dashboardSource).toContain("purchases: intelligence.data.summary.includedCount");
    expect(dashboardSource).toContain("intelligence.data.channels.map");
    expect(tableSource).toContain("בדיקת התשלום מול Grow נפרדת מזיהוי מקור ההגעה");
    expect(tableSource).toContain("מודל האתר אינו זהה לייחוס ב־Ads Manager");
    expect(dashboardSource).not.toContain("Grow מאומת");
  });
  it("keeps names opt-in behind the staff route and out of automatic digests", () => {
    const route = routerSource.slice(routerSource.indexOf("salesIntelligence: teamProcedure"), routerSource.indexOf("profitAndLoss: teamProcedure"));
    expect(route.indexOf("guardAdmin(ctx)")).toBeLessThan(route.indexOf("includeBuyerNames: true"));
    expect(serviceSource).toContain("includeBuyerNames = false");
    expect(serviceSource).toContain("includeBuyerNames ? { buyerName:");
    expect(read("server/dailyReportService.ts")).not.toContain("includeBuyerNames: true");
    expect(read("server/salesDailyDigest.ts")).not.toContain("buyerName");
  });
  it("does not restore sending buttons or contradictory revenue figures", () => {
    expect(dashboardSource).not.toContain("sendWeeklyReport");
    expect(dashboardSource).not.toContain("sendCompletionSms");
    expect(dashboardSource).toContain("expensesOnly");
    expect(dashboardSource).toContain("<details");
  });
});

describe("product selector and understandable evidence", () => {
  it("shares product-filtered rows between summary and purchase list", () => {
    expect(tableSource).toContain("useState<SalesProductFilter>(DEFAULT_SALES_PRODUCT)");
    expect(tableSource).toContain("summarizeSalesSources(productSales)");
    expect(tableSource).toContain("summarizeProductSales(productSales)");
    expect(tableSource).toContain("[...productSales].reverse()");
    expect(tableSource).not.toContain("data.summary.includedCount");
    expect(tableSource).toContain("בחירת מוצר ברכישות");
    expect(tableSource).toContain("setSelectedGroup(null)");
  });
  it("hides raw tags behind a second expansion and does not invent acquisition", () => {
    expect(tableSource).toContain("פרטי המדידה (לפי הצורך)");
    expect(tableSource).toContain("explainSalesSourceEvidence(sale)");
    expect(tableSource).toContain("זה לא ערוץ נוסף");
    expect(tableSource).not.toContain("ראיית המקור:");
  });
});
