import { describe, expect, it } from "vitest";
import { aggregateVerifiedGrowPayments, israelDateKey, summarizeVerifiedGrowPayments } from "./dashboardRevenue";

describe("dashboard verified Grow revenue", () => {
  it("uses the actual charged amount and excludes payment leads and estimated rows", () => {
    const result = summarizeVerifiedGrowPayments([
      { product: "database", amountAgorot: 29_900, amountSource: "grow", paidAt: 1 },
      { product: "match_boost", amountAgorot: 1_990, amountSource: "grow", paidAt: 2 },
      { product: "bundle_new_year", amountAgorot: 39_900, amountSource: "estimated", paidAt: 3 },
    ]);

    expect(result).toEqual({
      purchases: 2,
      revenue: 318.9,
      productSales: { database: 1, match_boost: 1 },
    });
  });

  it("groups payments by the Israel-local calendar day", () => {
    const lateUtc = Date.parse("2026-08-31T22:30:00.000Z");
    expect(israelDateKey(lateUtc)).toBe("2026-09-01");

    expect(aggregateVerifiedGrowPayments([
      { product: "database", amountAgorot: 29_900, amountSource: "grow", paidAt: lateUtc },
      { product: "match_boost", amountAgorot: 1_990, amountSource: "grow", paidAt: Date.parse("2026-09-01T20:59:59.000Z") },
      { product: "database", amountAgorot: 29_900, amountSource: "grow", paidAt: Date.parse("2026-09-01T21:00:00.000Z") },
    ])).toEqual([
      { date: "2026-09-01", purchases: 2, databasePurchases: 1, revenue: 318.9 },
      { date: "2026-09-02", purchases: 1, databasePurchases: 1, revenue: 299 },
    ]);
  });
});
