import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DATABASE_NOW_EXPIRES_AT, isDatabaseNowAttribution } from "../shared/databaseHolidayNow";
import { databaseNowDueAt, databaseNowSlaState, DATABASE_NOW_TASK_CREATED_BY, DATABASE_NOW_TASK_TITLE } from "./databaseNowFulfillment";

const root = process.cwd();

describe("database NOW fulfillment", () => {
  it("sets the CRM deadline exactly three days after the profile becomes eligible", () => {
    const eligibleAt = Date.UTC(2026, 8, 27, 8, 0, 0);
    expect(databaseNowDueAt(eligibleAt)).toBe(eligibleAt + 3 * 24 * 60 * 60 * 1000);
    expect(DATABASE_NOW_TASK_TITLE).toContain("3 ימים");
    expect(DATABASE_NOW_TASK_CREATED_BY).toContain("database_now");
  });

  it("keeps NOW active through the end of 1 October in Israel", () => {
    expect(DATABASE_NOW_EXPIRES_AT).toBe(Date.parse("2026-10-01T20:59:59.000Z"));
  });

  it("recognizes NOW by coupon or campaign attribution independently", () => {
    expect(isDatabaseNowAttribution({ couponCode: "now" })).toBe(true);
    expect(isDatabaseNowAttribution({ couponCode: "LOVE10", utmCampaign: "database_holiday_now_sep27" })).toBe(true);
    expect(isDatabaseNowAttribution({ couponCode: "LOVE10", utmCampaign: "database_purchase" })).toBe(false);
  });

  it("classifies every operational SLA stage deterministically", () => {
    const now = Date.UTC(2026, 8, 28, 8, 0, 0);
    const eligibleAt = now - 24 * 60 * 60 * 1000;
    const dueAt = databaseNowDueAt(eligibleAt);
    expect(databaseNowSlaState({}, now)).toBe("awaiting_profile");
    expect(databaseNowSlaState({ eligibleAt, dueAt }, now)).toBe("active");
    expect(databaseNowSlaState({ eligibleAt, dueAt: now + 12 * 60 * 60 * 1000 }, now)).toBe("due_soon");
    expect(databaseNowSlaState({ eligibleAt, dueAt: now - 1 }, now)).toBe("overdue");
    expect(databaseNowSlaState({ eligibleAt, dueAt: now - 1, firstMatchSentAt: now - 2 }, now)).toBe("fulfilled");
  });

  it("creates the urgent task both for an already complete buyer and after questionnaire completion", () => {
    const webhook = readFileSync(resolve(root, "server/growWebhook.ts"), "utf8");
    const routers = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    expect(webhook).toContain("ensureDatabaseNowMatchTask");
    expect(webhook).toContain("questionnaireCompletedAt");
    expect(webhook).toContain("purchaseTracking?.couponCode");
    expect(webhook).toContain("purchaseTracking?.utmCampaign");
    expect(routers).toContain('[completeQuestionnaire] Failed to create NOW SLA task:');
    expect(routers).toContain("eligibleAt: now");
  });

  it("persists coupon and UTM on payment attempts and verified Grow payments", () => {
    const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const routers = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    const webhook = readFileSync(resolve(root, "server/growWebhook.ts"), "utf8");
    expect(schema.match(/couponCode:\s+varchar\("coupon_code"/g)).toHaveLength(2);
    expect(routers).toContain("couponCode: input.couponCode?.trim().toUpperCase() || null");
    expect(routers).not.toContain("Increment usage counter");
    expect(webhook).toContain("couponCode: purchaseTracking?.couponCode || null");
    expect(webhook).toContain("usedCount: sql`${discountCodes.usedCount} + 1`");
    expect(webhook).toContain("purchaseTracking.couponCode && !purchaseTracking.confirmedAt");
  });

  it("exposes a dedicated NOW dashboard tab sourced from verified payments", () => {
    const operations = readFileSync(resolve(root, "server/operationsRouter.ts"), "utf8");
    const crm = readFileSync(resolve(root, "client/src/pages/CRMMatchmaking.tsx"), "utf8");
    const section = readFileSync(resolve(root, "client/src/components/DatabaseNowSlaSection.tsx"), "utf8");
    expect(operations).toContain("nowSlaDashboard");
    expect(operations).toContain("FROM completed_payments");
    expect(operations).toContain("coupon_code");
    expect(operations).toContain("utm_campaign");
    expect(operations).toContain("match_delivery_events");
    expect(crm).toContain('id: "now"');
    expect(crm).toContain("<DatabaseNowSlaSection />");
    expect(section).toContain("רוכשי NOW · התחייבות 3 ימים");
  });
});
