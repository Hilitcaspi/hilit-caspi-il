import { describe, expect, it } from "vitest";
import {
  buildManualDailyReportRunKey,
  buildScheduledDailyReportRunKey,
  getDailyReportDeliveryMode,
  isDailyReportLocalMidnight,
  maskRecipient,
  maskRecipients,
  parseRecipientPhones,
  sendDailyReportMessages,
} from "./dailyReportService";

describe("daily report delivery safeguards", () => {
  it("uses one deterministic run key per settings row and report date", () => {
    expect(buildScheduledDailyReportRunKey(7, "2026-09-01")).toBe("daily-report:7:2026-09-01");
    expect(buildScheduledDailyReportRunKey(7, "2026-09-01")).toBe(buildScheduledDailyReportRunKey(7, "2026-09-01"));
    expect(buildScheduledDailyReportRunKey(7, "2026-09-02")).not.toBe(buildScheduledDailyReportRunKey(7, "2026-09-01"));
  });

  it("uses a separate deterministic key for a manual three-part backfill", () => {
    expect(buildManualDailyReportRunKey(7, "2026-09-02")).toBe("daily-report:7:manual:2026-09-02:three-part-v1");
  });

  it("never exposes the full recipient in overview responses", () => {
    expect(maskRecipient("0521234567")).toBe("052****67");
    expect(maskRecipient(null)).toBeNull();
  });

  it("parses, deduplicates and masks two approved recipients", () => {
    expect(parseRecipientPhones("0521234567, 0547654321;0521234567")).toEqual(["0521234567", "0547654321"]);
    expect(maskRecipients("0521234567,0547654321")).toEqual(["052****67", "054****21"]);
  });

  it("never sends while disabled or in dry-run mode", () => {
    expect(getDailyReportDeliveryMode({ isEnabled: false, dryRun: false, recipientPhone: "0521234567" })).toBe("disabled");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: true, recipientPhone: "0521234567" })).toBe("dry_run");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: false, recipientPhone: null })).toBe("missing_recipient");
    expect(getDailyReportDeliveryMode({ isEnabled: true, dryRun: false, recipientPhone: "0521234567,0547654321" })).toBe("send");
  });

  it("accepts the summer UTC trigger only when it is midnight in Israel", () => {
    expect(isDailyReportLocalMidnight(Date.parse("2026-09-01T21:00:00Z"))).toBe(true);
    expect(isDailyReportLocalMidnight(Date.parse("2026-09-01T22:00:00Z"))).toBe(false);
  });

  it("accepts the winter UTC trigger only when it is midnight in Israel", () => {
    expect(isDailyReportLocalMidnight(Date.parse("2026-12-01T22:00:00Z"))).toBe(true);
    expect(isDailyReportLocalMidnight(Date.parse("2026-12-01T21:00:00Z"))).toBe(false);
  });

  it("sends all three message parts to both recipients and records partial failure", async () => {
    const calls: string[] = [];
    const deliveries = await sendDailyReportMessages(
      ["0521234567", "0547654321"],
      [
        { key: "sales_targets", message: "one" },
        { key: "campaigns", message: "two" },
        { key: "database", message: "three" },
      ],
      async (phone, message) => {
        calls.push(`${phone}:${message}`);
        return message !== "two" || phone !== "0547654321";
      },
    );
    expect(calls).toHaveLength(6);
    expect(deliveries).toHaveLength(6);
    expect(deliveries.filter(delivery => delivery.sent)).toHaveLength(5);
  });
});
