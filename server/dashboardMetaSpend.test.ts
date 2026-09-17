import { describe, expect, it } from "vitest";
import { formatMetaCalendarDate, normalizeMetaCampaign, summarizeMetaSpend } from "./dashboardMetaSpend";

describe("dashboard Meta spend", () => {
  it("keeps the first day of the Israel month when UTC is still the previous day", () => {
    const israelMonthStart = new Date("2026-08-31T21:00:00.000Z").getTime();
    expect(formatMetaCalendarDate(israelMonthStart)).toBe("2026-09-01");
  });

  it("reports the main account, promoted posts account and combined spend separately", () => {
    expect(summarizeMetaSpend(
      [{ spend: 10_000 }, { spend: 1_380.27 }],
      [{ spend: 2_052.95 }],
    )).toEqual({
      mainSpend: 11_380.27,
      boostsSpend: 2_052.95,
      totalSpend: 13_433.22,
    });
  });

  it("classifies the dedicated profile promotion account independently of campaign name", () => {
    const row = normalizeMetaCampaign({ campaign_name: "שם שרירותי", spend: "55" }, "profile_boosts");
    expect(row.classification).toBe("profile_boosted_post");
    expect(row.accountRole).toBe("profile_boosts");
  });

  it("uses Meta action value rather than a fixed catalogue price", () => {
    const row = normalizeMetaCampaign({
      campaign_name: "sales",
      spend: "100",
      actions: [
        { action_type: "lead", value: "10" },
        { action_type: "lead", value: "2" },
        { action_type: "purchase", value: "2" },
      ],
      action_values: [{ action_type: "purchase", value: "598" }],
    }, "sales_acquisition");
    expect(row.leads).toBe(12);
    expect(row.purchases).toBe(2);
    expect(row.cpl).toBe(8.33);
    expect(row.cpa).toBe(50);
    expect(row.purchaseValue).toBe(598);
    expect(row.metaReportedRoas).toBe(5.98);
  });

  it("leaves purchase-value ROAS unavailable when Meta does not return value", () => {
    const row = normalizeMetaCampaign({
      campaign_name: "lead",
      spend: "100",
      actions: [{ action_type: "purchase", value: "1" }],
    }, "sales_acquisition");
    expect(row.purchaseValue).toBeNull();
    expect(row.metaReportedRoas).toBeNull();
  });
});
