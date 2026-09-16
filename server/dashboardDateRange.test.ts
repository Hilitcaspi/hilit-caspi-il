import { describe, expect, it } from "vitest";
import {
  formatIsraelCalendarDate,
  getCurrentIsraelMonthStart,
  parseIsraelCalendarDate,
} from "../client/src/lib/dashboardDateRange";

describe("dashboard current month range", () => {
  it("starts at midnight on the first day of the month in Israel", () => {
    const now = new Date("2026-09-07T12:00:00.000Z").getTime();
    expect(getCurrentIsraelMonthStart(now)).toBe(new Date("2026-08-31T21:00:00.000Z").getTime());
  });

  it("displays the Israel month start as September 1 rather than the previous UTC date", () => {
    const israelMonthStart = new Date("2026-08-31T21:00:00.000Z").getTime();
    expect(formatIsraelCalendarDate(israelMonthStart)).toBe("2026-09-01");
  });

  it("parses a custom date as midnight in Israel regardless of browser timezone", () => {
    expect(parseIsraelCalendarDate("2026-09-01")).toBe(new Date("2026-08-31T21:00:00.000Z").getTime());
  });
});
