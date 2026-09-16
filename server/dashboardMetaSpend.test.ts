import { describe, expect, it } from "vitest";
import { formatMetaCalendarDate, summarizeMetaSpend } from "./dashboardMetaSpend";

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
});
