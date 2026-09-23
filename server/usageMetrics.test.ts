import { describe, expect, it } from "vitest";
import {
  aggregateTaskLog,
  aggregateUsageEvents,
  buildSelfServiceEventKey,
  israelDayBucket,
  minimizeMetadata,
} from "./usageMetrics";

describe("usage metrics", () => {
  it("builds deterministic, scoped idempotency keys", () => {
    const input = {
      scope: "manual" as const,
      actionKey: "match.send",
      category: "database" as const,
      channel: "manus" as const,
      actorHash: "a".repeat(64),
      idempotencyKey: "e8b7b7d5-2d26-4d09-a779-c85da17a61d1",
    };

    expect(buildSelfServiceEventKey(input)).toBe(buildSelfServiceEventKey(input));
    expect(buildSelfServiceEventKey(input)).toMatch(/^sse_[a-f0-9]{64}$/);
    expect(buildSelfServiceEventKey({ ...input, idempotencyKey: "44b1bedb-7df7-4d54-a4d0-4a0e7e7ebded" }))
      .not.toBe(buildSelfServiceEventKey(input));
    expect(buildSelfServiceEventKey({ ...input, channel: "manual" }))
      .not.toBe(buildSelfServiceEventKey(input));
  });

  it("buckets events by the Israel calendar day across UTC midnight", () => {
    // Israel is UTC+3 during September 2026.
    expect(israelDayBucket(Date.UTC(2026, 8, 23, 20, 59, 59))).toBe("2026-09-23");
    expect(israelDayBucket(Date.UTC(2026, 8, 23, 21, 0, 0))).toBe("2026-09-24");
  });

  it("aggregates dimensions and identifies actions absent from the equal prior period", () => {
    const currentEvents = [
      {
        actionKey: "match.send",
        category: "database" as const,
        channel: "self_service" as const,
        outcome: "completed" as const,
        durationMs: 200,
        promptTokens: 10,
        completionTokens: 5,
        occurredAt: Date.UTC(2026, 8, 24, 9),
      },
      {
        actionKey: "content.create_draft",
        category: "content" as const,
        channel: "in_app_ai" as const,
        outcome: "drafted" as const,
        durationMs: 300,
        promptTokens: 20,
        completionTokens: 7,
        occurredAt: Date.UTC(2026, 8, 24, 10),
      },
      {
        actionKey: "content.create_draft",
        category: "content" as const,
        channel: "in_app_ai" as const,
        outcome: "failed" as const,
        durationMs: null,
        promptTokens: null,
        completionTokens: null,
        occurredAt: Date.UTC(2026, 8, 24, 11),
      },
    ];
    const previousEvents = [{
      actionKey: "match.send",
      category: "database" as const,
      channel: "self_service" as const,
      outcome: "completed" as const,
      occurredAt: Date.UTC(2026, 8, 23, 9),
    }];

    const result = aggregateUsageEvents(currentEvents, previousEvents);
    expect(result.totals).toMatchObject({
      events: 3,
      completed: 1,
      drafted: 1,
      failed: 1,
      durationMs: 500,
      promptTokens: 30,
      completionTokens: 12,
    });
    expect(result.byCategory.find(row => row.category === "content")).toMatchObject({ events: 2, drafted: 1, failed: 1 });
    expect(result.byAction.find(row => row.actionKey === "content.create_draft")).toMatchObject({ labelHe: "יצירת טיוטת תוכן", events: 2 });
    expect(result.byChannel.find(row => row.channel === "in_app_ai")).toMatchObject({ events: 2 });
    expect(result.dailyTrend).toHaveLength(1);
    expect(result.newActionKeys).toEqual(["content.create_draft"]);
  });

  it("minimizes metadata to a compact allowlist and excludes PII-shaped values", () => {
    const minimized = minimizeMetadata({
      email: "person@example.com",
      phone: "+972501234567",
      customerName: "דנה כהן",
      nested: { id: 42 },
      source: "Control_Center",
      entityCount: 4,
      workflowKey: "profile-close-v2",
    });

    expect(minimized).toBe(JSON.stringify({ entityCount: 4, source: "control_center", workflowKey: "profile-close-v2" }));
    expect(minimized).not.toContain("person@example.com");
    expect(minimized).not.toContain("972501234567");
    expect(minimizeMetadata({ source: "person@example.com" })).toBeNull();
    expect(minimizeMetadata({ email: "person@example.com" })).toBeNull();
  });

  it("aggregates task-log observations without returning titles or source text", () => {
    const log = [
      "## Task: title never returned",
      "**After (completed 2026-09-24 10:00 Asia/Jerusalem, duration 1m):** text",
      "קמפיין Meta נבדק",
      "---",
      "## Task: another private heading",
      "**After (completed 2026-09-25 10:00 Asia/Jerusalem, duration 1m):** text",
      "unclassified work",
      "---",
      "## Task: old task",
      "**After (completed 2026-09-23 10:00 Asia/Jerusalem, duration 1m):** text",
      "קמפיין Meta ישן",
    ].join("\n");

    expect(aggregateTaskLog(log)).toEqual({
      since: "2026-09-24",
      counts: 2,
      byAction: [
        { actionKey: "other.new", count: 1 },
        { actionKey: "tracking.review_campaign", count: 1 },
      ],
      newActionKeys: ["other.new"],
    });
  });
});
