import { describe, expect, it } from "vitest";
import { calculatePnlSummary, prorateMonthlyAmountAgorot } from "./businessFinance";

const categories = ["processing", "refund", "payroll", "other"] as const;

describe("business finance", () => {
  it("uses actual revenue, separates refunds and sums operating expenses", () => {
    const result = calculatePnlSummary(
      [
        { product: "database", purchases: 10, revenue: 2990 },
        { product: "session", purchases: 2, revenue: 1000 },
      ],
      500,
      [
        { category: "refund", amountAgorot: 29900 },
        { category: "processing", amountAgorot: 12000 },
        { category: "payroll", amountAgorot: 100000 },
      ],
      categories,
    );

    expect(result.grossRevenue).toBe(3990);
    expect(result.netRevenue).toBe(3691);
    expect(result.manualExpenses).toBe(1120);
    expect(result.totalExpenses).toBe(1620);
    expect(result.operatingProfit).toBe(2071);
  });

  it("calculates unit economics without division by zero", () => {
    const empty = calculatePnlSummary([], 0, [], categories);
    expect(empty.margin).toBe(0);
    expect(empty.unitEconomics.marketingCac).toBe(0);

    const active = calculatePnlSummary(
      [{ product: "database", purchases: 10, revenue: 2990 }],
      500,
      [{ category: "processing", amountAgorot: 10000 }],
      categories,
    );
    expect(active.unitEconomics.averageRevenuePerPurchase).toBe(299);
    expect(active.unitEconomics.marketingCac).toBe(50);
    expect(active.unitEconomics.returnOnAdSpend).toBe(5.98);
    expect(active.unitEconomics.contributionPerPurchase).toBe(239);
  });

  it("includes recurring off-site income and costs without distorting website unit economics", () => {
    const result = calculatePnlSummary(
      [{ product: "database", purchases: 10, revenue: 2990 }],
      500,
      [],
      categories,
      [
        { itemType: "income", category: "external_coaching", amountAgorot: 1_000_000 },
        { itemType: "expense", category: "external_coaching_cost", amountAgorot: 200_000 },
        { itemType: "expense", category: "payroll", amountAgorot: 500_000 },
      ],
    );

    expect(result.productRevenue).toBe(2990);
    expect(result.manualRevenue).toBe(10_000);
    expect(result.grossRevenue).toBe(12_990);
    expect(result.recurringExpenses).toBe(7000);
    expect(result.operatingProfit).toBe(5490);
    expect(result.unitEconomics.averageRevenuePerPurchase).toBe(299);
    expect(result.unitEconomics.returnOnAdSpend).toBe(5.98);
  });

  it("prorates monthly recurring items to the selected period", () => {
    const augustStart = Date.UTC(2026, 7, 1);
    const augustEnd = Date.UTC(2026, 7, 31, 23, 59, 59, 999);
    const firstHalfEnd = Date.UTC(2026, 7, 15, 23, 59, 59, 999);

    expect(prorateMonthlyAmountAgorot(500_000, augustStart, augustEnd, augustStart)).toBe(500_000);
    expect(prorateMonthlyAmountAgorot(500_000, augustStart, firstHalfEnd, augustStart)).toBe(241_935);
    expect(prorateMonthlyAmountAgorot(500_000, augustStart, augustEnd, Date.UTC(2026, 8, 1))).toBe(0);
  });
});
