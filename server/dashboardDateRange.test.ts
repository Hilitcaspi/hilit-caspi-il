import { describe, expect, it } from "vitest";
import {
  endOfIsraelCalendarDate,
  formatIsraelCalendarDate,
  getIsraelCalendarDaysStart,
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

  it("ends a custom date at the next Israel midnight rather than adding a fixed 24 hours", () => {
    const start = parseIsraelCalendarDate("2026-03-27");
    const end = endOfIsraelCalendarDate("2026-03-27");
    expect(end - start + 1).toBe(23 * 60 * 60 * 1000);
    expect(formatIsraelCalendarDate(end)).toBe("2026-03-27");
  });

  it("counts calendar days inclusively for rolling presets", () => {
    const now = new Date("2026-09-17T09:00:00.000Z").getTime();
    expect(formatIsraelCalendarDate(getIsraelCalendarDaysStart(5, now))).toBe("2026-09-13");
  });
});
