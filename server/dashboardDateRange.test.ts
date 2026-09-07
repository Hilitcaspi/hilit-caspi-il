import { describe, expect, it } from "vitest";
import { getCurrentIsraelMonthStart } from "../client/src/lib/dashboardDateRange";

describe("dashboard current month range", () => {
  it("starts at midnight on the first day of the month in Israel", () => {
    const now = new Date("2026-09-07T12:00:00.000Z").getTime();
    expect(getCurrentIsraelMonthStart(now)).toBe(new Date("2026-08-31T21:00:00.000Z").getTime());
  });
});
