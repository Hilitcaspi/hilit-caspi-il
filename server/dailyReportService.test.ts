import { describe, expect, it } from "vitest";
import { buildScheduledDailyReportRunKey, getDailyReportDeliveryMode, maskRecipient } from "./dailyReportService";

describe("daily report delivery safeguards", () => {
  it("uses one deterministic run key per settings row and report date", () => {
    expect(buildScheduledDailyReportRunKey(7, "2026-09-01")).toBe("daily-report:7:2026-09-01");
    expect(buildScheduledDailyReportRunKey(7, "2026-09-01")).toBe(buildScheduledDailyReportRunKey(7, "2026-09-01"));
    expect(buildScheduledDailyReportRunKey(7, "2026-09-02")).not.toBe(buildScheduledDailyReportRunKey(7, "2026-09-01"));
  });

  it("never exposes the full recipient in overview responses", () => {
    expect(maskRecipient("0521234567")).toBe("052****67");
    expect(maskRecipient(null)).toBeNull();
  });

  it("never sends while disabled or in dry-run mode", () => {
    expect(getDailyReportDeliveryMode({ isEnabled: false, dryRun: false, recipientPhone: "0521234567" })).toBe("disabled");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: true, recipientPhone: "0521234567" })).toBe("dry_run");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: false, recipientPhone: null })).toBe("missing_recipient");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: false, recipientPhone: "0521234567" })).toBe("send");
  });
});
