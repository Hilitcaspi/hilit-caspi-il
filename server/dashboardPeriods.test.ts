import { describe, expect, it } from "vitest";
import { endOfIsraelCalendarDate, parseIsraelCalendarDate } from "../client/src/lib/dashboardDateRange";
import { hasVerifiedGrowCoverage, previousComparisonPeriod, previousEqualPeriod } from "./dashboardPeriods";

describe("dashboard comparison periods", () => {
  it("creates an immediately preceding, equal and non-overlapping period", () => {
    const current = { startDate: 1_000, endDate: 1_999 };
    const previous = previousEqualPeriod(current.startDate, current.endDate);
    expect(previous).toEqual({ startDate: 0, endDate: 999 });
    expect(previous.endDate).toBe(current.startDate - 1);
    expect(previous.endDate - previous.startDate).toBe(current.endDate - current.startDate);
  });

  it("rejects an inverted range", () => {
    expect(() => previousEqualPeriod(2_000, 1_000)).toThrow("Invalid dashboard date range");
  });

  it("compares month-to-date with the same calendar dates in the previous month", () => {
    const previous = previousComparisonPeriod(
      parseIsraelCalendarDate("2026-09-01"),
      endOfIsraelCalendarDate("2026-09-16"),
    );
    expect(previous).toEqual({
      startDate: parseIsraelCalendarDate("2026-08-01"),
      endDate: endOfIsraelCalendarDate("2026-08-16"),
      basis: "same_dates_previous_month",
    });
  });

  it("clamps a full month to the last day of a shorter previous month", () => {
    const previous = previousComparisonPeriod(
      parseIsraelCalendarDate("2026-03-01"),
      endOfIsraelCalendarDate("2026-03-31"),
    );
    expect(previous).toEqual({
      startDate: parseIsraelCalendarDate("2026-02-01"),
      endDate: endOfIsraelCalendarDate("2026-02-28"),
      basis: "same_dates_previous_month",
    });
  });

  it("keeps rolling ranges on the immediately preceding equal period", () => {
    const startDate = parseIsraelCalendarDate("2026-09-12");
    const endDate = endOfIsraelCalendarDate("2026-09-16");
    expect(previousComparisonPeriod(startDate, endDate)).toEqual({
      ...previousEqualPeriod(startDate, endDate),
      basis: "previous_equal_period",
    });
  });

  it("marks pre-backfill Grow periods as incomplete", () => {
    expect(hasVerifiedGrowCoverage({
      startDate: parseIsraelCalendarDate("2026-08-01"),
      endDate: endOfIsraelCalendarDate("2026-08-16"),
    })).toBe(false);
    expect(hasVerifiedGrowCoverage({
      startDate: parseIsraelCalendarDate("2026-08-22"),
      endDate: endOfIsraelCalendarDate("2026-08-31"),
    })).toBe(true);
  });
});
