import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CART_RECOVERY_COUPON,
  EMAIL_SEQUENCES,
} from "./emailTemplates";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("lifecycle marketing automation", () => {
  it("uses a dedicated BACK10 code for every payment recovery journey", () => {
    expect(CART_RECOVERY_COUPON).toBe("BACK10");
    for (const key of [
      "abandoned_guide",
      "abandoned_database",
      "abandoned_course",
      "abandoned_coaching",
      "abandoned_session",
    ] as const) {
      expect(EMAIL_SEQUENCES[key]).toHaveLength(3);
      const copy = EMAIL_SEQUENCES[key].map(item => `${item.subject}\n${item.htmlBody}\n${item.textBody}`).join("\n");
      expect(copy).toContain("BACK10");
      expect(copy).not.toContain("HILIT10");
      expect(copy).not.toMatch(/פג בעוד|פג הלילה|עד חצות|תקף ל-48 שעות|לפני כמה דקות/);
    }
  });

  it("queues recovery through the shared frequency-controlled sender", () => {
    const source = read("server/automation.ts");
    expect(source).toContain("sendFirstImmediately: false");
    expect(source).toContain("frequency_cap_rescheduled");
    expect(source).toContain("eligibleCreatedAfter");
    expect(source).toContain("completedPayments.product, lead.product");
    expect(source).toContain("abandoned_session");
    expect(source).toContain("paymentLeadId: lead.id");
    expect(source).toContain("paymentAttemptCreatedAt: lead.createdAt");
    expect(source).toContain("paymentAttemptProduct: lead.product");
    expect(source).toContain("entry.paymentAttemptCreatedAt ?? attempt?.createdAt");
    expect(source).toContain("freshAttempt?.confirmedAt");
    expect(source).toContain("finalCancellationReason");
    expect(source).toContain("lifecycle_recipient_locks");
    expect(source).toContain("lifecycle_message_keys");
    expect(source).toContain("if (settings && !settings.isEnabled) return 0");
  });

  it("implements the product ladder without pitching coaching to existing coaching buyers", () => {
    const templates = read("server/emailTemplates.ts");
    const webhook = read("server/growWebhook.ts");
    const routers = read("server/routers.ts");
    const automation = read("server/automation.ts");
    expect(templates).toContain("product_ladder_guide_to_course");
    expect(templates).toContain("product_ladder_course_to_session");
    expect(automation).toContain('target_product_already_purchased:${ladderTarget}');
    expect(automation).toContain('return [0, 24, 168]');
    expect(webhook).not.toMatch(/handleCoaching[\s\S]{0,2500}getJourneyKey\(gender, "transformation"\)/);
    expect(webhook.indexOf("mark checkout confirmed before fulfillment")).toBeLessThan(webhook.indexOf("switch (product)"));
    expect(routers).toContain('input.status === "call_done") journeyType = "transformation"');
    expect(routers).not.toContain('input.status === "client_coaching") journeyType = "transformation"');
  });

  it("links each Boost opportunity to its exact card and queues Plus only after dispatch", () => {
    const queue = read("server/lifecycleEmailQueue.ts");
    const dashboard = read("client/src/pages/UserDashboard.tsx");
    const router = read("server/matchBoostRouter.ts");
    const automation = read("server/automation.ts");
    expect(queue).toContain("boostMatch=${option.id}");
    expect(queue).toContain("שליטה נשארת אצלך");
    expect(queue).toContain("scheduledAt: now + 72 * 60 * 60 * 1000");
    expect(automation).toContain("plus_already_active");
    expect(dashboard).toContain("requestedBoostMatchId");
    expect(dashboard).toContain("boost-option-${option.matchId}");
    expect(router).toContain("queuePostBoostPlusUpsell");
    expect(queue).toContain("lifecycle_run_claims");
    expect(queue).toContain('already_ran_today');
    expect(queue).toContain("orderBy(asc(matchBoostMemberships.eligibleAt)");
    expect(queue).toContain("getEligibleBoostOpportunityForSingle(db, single, undefined, now)");
    expect(automation).toContain("getEligibleBoostOpportunityForSingle(db, member, matchId)");
    expect(router).toContain('String(candidate.notes || "").startsWith(BOOST_CANDIDATE_NOTE_MARKER)');
    expect(router).toContain("candidate.singleId === single.id");
    expect(router).toContain("eligibility.candidates.slice(0, MAX_BOOST_OPTIONS).filter");
    expect(dashboard).not.toContain("status.cooldownUntil");
    expect(dashboard).toContain("status.plusBenefitAvailable");
  });

  it("prefills BACK10 on all supported recovery checkout pages", () => {
    for (const page of [
      "client/src/pages/GuideSales.tsx",
      "client/src/pages/CourseSales.tsx",
      "client/src/pages/CoachingSales.tsx",
      "client/src/pages/SingleSessionSales.tsx",
    ]) {
      expect(read(page)).toContain("BACK10");
      expect(read(page)).toContain("prefillCoupon");
    }
  });

  it("keeps the lifecycle Heartbeat disabled until its DB flag is enabled", () => {
    const schema = read("drizzle/schema.ts");
    const migration = read("drizzle/0032_tricky_bucky.sql");
    const server = read("server/_core/index.ts");
    expect(schema).toContain('isEnabled: boolean("is_enabled").notNull().default(false)');
    expect(migration).toContain("'israel-site-lifecycle', false");
    expect(server).toContain("Lifecycle automation is paused");
    expect(server).toContain('timeZone: "Asia/Jerusalem"');
    expect(server).toContain("israelHour !== 19");
  });

  it("prevents first-step and free-guide journeys from running together", () => {
    const source = read("server/automation.ts");
    expect(source).toContain('women_first_step_v2: ["women_first_step",    "free_guide_nurture"]');
    expect(source).toContain('men_first_step_v2:   ["men_first_step",       "free_guide_nurture"]');
    expect(source).toContain('free_guide_nurture:  ["women_first_step", "women_first_step_v2", "men_first_step", "men_first_step_v2"]');
  });

  it("migrates durable lifecycle safety tables and payment-attempt linkage", () => {
    const migration = read("drizzle/0033_lean_shinobi_shaw.sql");
    expect(migration).toContain("CREATE TABLE `lifecycle_message_keys`");
    expect(migration).toContain("CREATE TABLE `lifecycle_recipient_locks`");
    expect(migration).toContain("CREATE TABLE `lifecycle_run_claims`");
    expect(migration).toContain("ADD `paymentLeadId` int");
    const snapshotMigration = read("drizzle/0034_mighty_tony_stark.sql");
    expect(snapshotMigration).toContain("ADD `paymentAttemptCreatedAt` bigint");
    expect(snapshotMigration).toContain("ADD `paymentAttemptProduct` varchar(50)");
  });
});
