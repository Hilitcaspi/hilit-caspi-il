import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { databaseNowDueAt, DATABASE_NOW_TASK_CREATED_BY, DATABASE_NOW_TASK_TITLE } from "./databaseNowFulfillment";

const root = process.cwd();

describe("database NOW fulfillment", () => {
  it("sets the CRM deadline exactly three days after the profile becomes eligible", () => {
    const eligibleAt = Date.UTC(2026, 8, 27, 8, 0, 0);
    expect(databaseNowDueAt(eligibleAt)).toBe(eligibleAt + 3 * 24 * 60 * 60 * 1000);
    expect(DATABASE_NOW_TASK_TITLE).toContain("3 ימים");
    expect(DATABASE_NOW_TASK_CREATED_BY).toContain("database_now");
  });

  it("creates the urgent task both for an already complete buyer and after questionnaire completion", () => {
    const webhook = readFileSync(resolve(root, "server/growWebhook.ts"), "utf8");
    const routers = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    expect(webhook).toContain("ensureDatabaseNowMatchTask");
    expect(webhook).toContain("questionnaireCompletedAt");
    expect(webhook).toContain("purchaseTracking?.couponCode");
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
});
