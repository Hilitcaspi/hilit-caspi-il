import { describe, expect, it } from "vitest";
import {
  dailyReportOptionalCountTargetSchema,
  dailyReportOptionalRevenueTargetAgorotSchema,
} from "./dailyReportRouter";

describe("daily report settings validation", () => {
  it("accepts a monthly revenue target of 140,000 shekels in agorot", () => {
    expect(dailyReportOptionalRevenueTargetAgorotSchema.safeParse(14_000_000).success).toBe(true);
  });

  it("keeps quantity targets separate from the larger revenue range", () => {
    expect(dailyReportOptionalCountTargetSchema.safeParse(350).success).toBe(true);
    expect(dailyReportOptionalCountTargetSchema.safeParse(14_000_000).success).toBe(false);
  });
});
