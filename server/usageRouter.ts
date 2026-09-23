import { TRPCError } from "@trpc/server";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { selfServiceEvents } from "../drizzle/schema";
import { getDb } from "./db";
import { router, teamProcedure } from "./_core/trpc";
import {
  USAGE_ACTION_CATALOG,
  USAGE_CATEGORIES,
  TASK_LOG_OBSERVED_SINCE,
  aggregateTaskLog,
  aggregateUsageEvents,
  buildSelfServiceEventKey,
  categorySchema,
  hashActor,
  isAllowedManualAction,
  recordSelfServiceEvent,
} from "./usageMetrics";

/**
 * A documented pre-instrumentation reference from the existing work report.
 * It is intentionally returned separately and is never backfilled into
 * self_service_events, so measured event data remains auditable.
 */
export const DOCUMENTED_USAGE_BASELINE = {
  period: {
    startDate: "2026-09-18",
    endDate: "2026-09-23",
    timeZone: "Asia/Jerusalem",
  },
  totals: {
    tasks: 49,
    minutes: 368,
  },
  byWorkstream: [
    { key: "marketing", labelHe: "שיווק", tasks: 26, minutes: 242 },
    { key: "matchmaking", labelHe: "שידוכים", tasks: 10, minutes: 82.5 },
    { key: "other_short", labelHe: "אחר — משימות קצרות", tasks: 7, minutes: 4 },
    { key: "crm", labelHe: "CRM", tasks: 3, minutes: 14 },
    { key: "payment_boost", labelHe: "תשלומים ו-Boost", tasks: 2, minutes: 25 },
    { key: "infrastructure_direct", labelHe: "תשתיות ישיר", tasks: 1, minutes: 0.5 },
  ],
  noteHe: "הבסיס מתועד מדוח קיים; אין נתוני חיוב או קרדיטים מאומתים. סך הדקות המדווח (368) מעוגל.",
} as const;

const overviewInput = z.object({
  startDate: z.number().int().min(0),
  endDate: z.number().int().min(0),
}).strict().refine(input => input.endDate >= input.startDate, {
  message: "endDate must be greater than or equal to startDate",
  path: ["endDate"],
});

const manualTaskInput = z.object({
  category: categorySchema,
  actionKey: z.string().min(3).max(100),
  channel: z.enum(["manus", "manual"]),
  idempotencyKey: z.string().uuid(),
  occurredAt: z.number().int().min(0).optional(),
}).strict().superRefine((input, ctx) => {
  if (!isAllowedManualAction(input.category, input.actionKey)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["actionKey"],
      message: "actionKey is not allowed for this category",
    });
  }
});

async function readTaskLogObserved() {
  try {
    const content = await readFile(resolve(process.cwd(), "task-log.md"), "utf8");
    return { available: true as const, ...aggregateTaskLog(content) };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        available: false as const,
        since: TASK_LOG_OBSERVED_SINCE,
        counts: 0,
        byAction: [],
        newActionKeys: [],
      };
    }
    throw error;
  }
}

export const usageRouter = router({
  overview: teamProcedure
    .input(overviewInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const duration = input.endDate - input.startDate + 1;
      const previousStartDate = input.startDate - duration;
      const [rows, taskLogObserved] = await Promise.all([db.select({
        actionKey: selfServiceEvents.actionKey,
        category: selfServiceEvents.category,
        channel: selfServiceEvents.channel,
        outcome: selfServiceEvents.outcome,
        durationMs: selfServiceEvents.durationMs,
        promptTokens: selfServiceEvents.promptTokens,
        completionTokens: selfServiceEvents.completionTokens,
        occurredAt: selfServiceEvents.occurredAt,
      }).from(selfServiceEvents).where(and(
        gte(selfServiceEvents.occurredAt, previousStartDate),
        lte(selfServiceEvents.occurredAt, input.endDate),
      )), readTaskLogObserved()]);

      const currentEvents = rows.filter(event => event.occurredAt >= input.startDate);
      const previousEvents = rows.filter(event => event.occurredAt < input.startDate);
      return {
        ...aggregateUsageEvents(currentEvents, previousEvents),
        baseline: DOCUMENTED_USAGE_BASELINE,
        taskLogObserved,
      };
    }),

  catalog: teamProcedure.query(() => ({
    actions: USAGE_ACTION_CATALOG,
  })),

  /**
   * Records only an allowlisted task identity. No notes, title, customer data,
   * model values, or arbitrary metadata can be supplied through this endpoint.
   */
  recordManualTask: teamProcedure
    .input(manualTaskInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const actorHash = hashActor(ctx);
      const eventKey = buildSelfServiceEventKey({
        scope: "manual",
        actionKey: input.actionKey,
        category: input.category,
        channel: input.channel,
        actorHash,
        idempotencyKey: input.idempotencyKey,
      });
      const event = await recordSelfServiceEvent(db, {
        eventKey,
        actionKey: input.actionKey,
        category: input.category,
        channel: input.channel,
        outcome: "completed",
        actorHash,
        occurredAt: input.occurredAt || Date.now(),
      });

      return { success: true, eventKey: event.eventKey };
    }),
});

export { USAGE_CATEGORIES };
