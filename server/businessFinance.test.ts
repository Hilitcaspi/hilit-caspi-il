import { describe, expect, it } from "vitest";
import { calculatePnlSummary } from "./businessFinance";

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
});
