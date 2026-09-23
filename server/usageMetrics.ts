import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import type { getDb } from "./db";
import { selfServiceEvents } from "../drizzle/schema";
import { z } from "zod";

export const USAGE_CATEGORIES = ["database", "dashboard", "content", "tracking"] as const;
export const USAGE_CHANNELS = ["self_service", "in_app_ai", "manus", "manual"] as const;
export const USAGE_OUTCOMES = ["completed", "previewed", "drafted", "published", "failed"] as const;

export type UsageCategory = (typeof USAGE_CATEGORIES)[number];
export type UsageChannel = (typeof USAGE_CHANNELS)[number];
export type UsageOutcome = (typeof USAGE_OUTCOMES)[number];

type UsageDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export const USAGE_CATEGORY_LABELS: Record<UsageCategory, string> = {
  database: "מאגר",
  dashboard: "לוח בקרה",
  content: "תוכן",
  tracking: "מעקב",
};

export const USAGE_CHANNEL_LABELS: Record<UsageChannel, string> = {
  self_service: "שירות עצמי",
  in_app_ai: "בינה מלאכותית במערכת",
  manus: "Manus",
  manual: "ידני",
};

/**
 * The only actions that may be added through the manual task endpoint. Event
 * collection itself permits newly shipped actions so that overview can surface
 * them, but a person cannot create arbitrary labels or free-text work logs.
 */
export const USAGE_ACTION_CATALOG = [
  { actionKey: "database.review_queue", category: "database", labelHe: "סקירת תור המאגר" },
  { actionKey: "database.update_match_status", category: "database", labelHe: "עדכון סטטוס התאמה" },
  { actionKey: "database.export_summary", category: "database", labelHe: "ייצוא סיכום מאגר" },
  { actionKey: "match.send", category: "database", labelHe: "שליחת הצעת התאמה" },
  { actionKey: "match.release", category: "database", labelHe: "שחרור התאמה" },
  { actionKey: "match.reminder", category: "database", labelHe: "שליחת תזכורת להתאמה" },
  { actionKey: "profile.update", category: "database", labelHe: "עדכון פרופיל" },
  { actionKey: "profile.activate", category: "database", labelHe: "הפעלת פרופיל" },
  { actionKey: "profile.deactivate", category: "database", labelHe: "השבתת פרופיל" },
  { actionKey: "profile.close", category: "database", labelHe: "סגירת פרופיל" },
  { actionKey: "profile.correct_email", category: "database", labelHe: "תיקון כתובת דוא״ל" },
  { actionKey: "profile.unsubscribe_marketing", category: "database", labelHe: "הסרה מדיוור שיווקי" },
  { actionKey: "dashboard.view_overview", category: "dashboard", labelHe: "צפייה בסקירת מדדים" },
  { actionKey: "dashboard.generate_report", category: "dashboard", labelHe: "הפקת דוח" },
  { actionKey: "dashboard.review_funnel", category: "dashboard", labelHe: "סקירת משפך" },
  { actionKey: "content.create_draft", category: "content", labelHe: "יצירת טיוטת תוכן" },
  { actionKey: "content.update_draft", category: "content", labelHe: "עריכת טיוטת תוכן" },
  { actionKey: "content.publish_content", category: "content", labelHe: "פרסום תוכן" },
  { actionKey: "content.unpublish", category: "content", labelHe: "הסרת תוכן מפרסום" },
  { actionKey: "content.archive", category: "content", labelHe: "העברת תוכן לארכיון" },
  { actionKey: "content.schedule_content", category: "content", labelHe: "תזמון תוכן" },
  { actionKey: "tracking.create_link", category: "tracking", labelHe: "יצירת קישור מעקב" },
  { actionKey: "tracking.review_campaign", category: "tracking", labelHe: "סקירת קמפיין" },
  { actionKey: "tracking.export_metrics", category: "tracking", labelHe: "ייצוא נתוני מעקב" },
] as const satisfies ReadonlyArray<{ actionKey: string; category: UsageCategory; labelHe: string }>;

export const TASK_LOG_OBSERVED_SINCE = "2026-09-24";

/**
 * Deliberately small keyword allowlist for the read-only task-log signal. The
 * parser yields only a predefined action key; it never exposes task headings,
 * descriptions, people, IDs, or any other source text from task-log.md.
 */
const TASK_LOG_ACTION_RULES: ReadonlyArray<{ actionKey: string; keywords: readonly string[] }> = [
  { actionKey: "tracking.review_campaign", keywords: ["utm", "campaign", "meta", "ads", "קמפיין", "ייחוס"] },
  { actionKey: "content.publish_content", keywords: ["publish", "published", "פרסום", "להעלות"] },
  { actionKey: "content.create_draft", keywords: ["draft", "content", "design", "story", "copy", "תוכן", "עיצוב", "סטורי", "קורס"] },
  { actionKey: "database.update_match_status", keywords: ["matchmaking", "match", "boost", "שידוך", "התאמה"] },
  { actionKey: "database.review_queue", keywords: ["crm", "profile", "lead", "מאגר", "פרופיל", "דיוור", "ליד"] },
  { actionKey: "dashboard.generate_report", keywords: ["dashboard", "report", "metrics", "analysis", "דוח", "מדדים", "ניתוח"] },
];

type CatalogAction = (typeof USAGE_ACTION_CATALOG)[number];

const ACTION_BY_KEY = new Map<string, CatalogAction>(
  USAGE_ACTION_CATALOG.map(action => [action.actionKey, action]),
);

const SAFE_METADATA_KEYS = new Set([
  "contentType",
  "entityCount",
  "filterCount",
  "mode",
  "reportType",
  "retry",
  "scope",
  "segment",
  "source",
  "templateKey",
  "version",
  "workflowKey",
]);
const SAFE_METADATA_TOKEN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;
const MAX_METADATA_BYTES = 512;

const categorySchema = z.enum(USAGE_CATEGORIES);
const channelSchema = z.enum(USAGE_CHANNELS);
const outcomeSchema = z.enum(USAGE_OUTCOMES);

export const selfServiceEventSchema = z.object({
  eventKey: z.string().min(12).max(191).regex(/^[A-Za-z0-9:_-]+$/),
  actionKey: z.string().min(3).max(100).regex(/^[a-z0-9][a-z0-9_.-]*$/),
  category: categorySchema,
  channel: channelSchema,
  outcome: outcomeSchema,
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  model: z.string().min(1).max(80).regex(/^[A-Za-z0-9_.:/-]+$/).optional(),
  promptTokens: z.number().int().min(0).max(10_000_000).optional(),
  completionTokens: z.number().int().min(0).max(10_000_000).optional(),
  metadata: z.unknown().optional(),
  actorHash: z.string().length(64).regex(/^[a-f0-9]+$/).optional(),
  // Backward-compatible input for existing callers. It is HMAC-hashed before
  // persistence and never stored or included in any aggregate response.
  actor: z.string().min(1).max(320).optional(),
  occurredAt: z.number().int().min(0),
}).strict();

export type RecordSelfServiceEventInput = z.input<typeof selfServiceEventSchema>;
export type UsageMetricEvent = {
  actionKey: string;
  category: UsageCategory;
  channel: UsageChannel;
  outcome: UsageOutcome;
  durationMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  occurredAt: number;
};

/**
 * Keeps only an explicitly allowlisted, compact aggregate metadata subset.
 * Values cannot contain identifiers, email/phone-like strings, objects, or
 * arrays, so callers cannot accidentally turn this event stream into PII logs.
 */
export function minimizeMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const source = metadata as Record<string, unknown>;
  const compact: Record<string, boolean | number | string> = {};
  for (const key of Object.keys(source).sort()) {
    if (!SAFE_METADATA_KEYS.has(key) || Object.keys(compact).length >= 8) continue;
    const value = source[key];
    let safeValue: boolean | number | string | undefined;

    if (typeof value === "boolean") {
      safeValue = value;
    } else if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1_000_000_000) {
      safeValue = Math.round(value * 1_000) / 1_000;
    } else if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (SAFE_METADATA_TOKEN.test(normalized)) safeValue = normalized;
    }

    if (safeValue === undefined) continue;
    const candidate = { ...compact, [key]: safeValue };
    if (Buffer.byteLength(JSON.stringify(candidate), "utf8") <= MAX_METADATA_BYTES) {
      compact[key] = safeValue;
    }
  }

  return Object.keys(compact).length > 0 ? JSON.stringify(compact) : null;
}

/** A stable, non-reversible actor reference for aggregate usage analysis. */
export function hashActor(ctx: {
  user?: { id?: number | string | null; openId?: string | null } | null;
  teamMember?: { id?: number | string | null } | null;
}): string | undefined {
  const actor = ctx.user
    ? `user:${ctx.user.openId || ctx.user.id || "unknown"}`
    : ctx.teamMember
      ? `team:${ctx.teamMember.id || "unknown"}`
      : undefined;
  if (!actor) return undefined;

  const secret = process.env.USAGE_METRICS_HASH_SALT || "hilit-usage-metrics-v1";
  return crypto.createHmac("sha256", secret).update(actor).digest("hex");
}

function hashActorIdentifier(actor: string): string {
  const secret = process.env.USAGE_METRICS_HASH_SALT || "hilit-usage-metrics-v1";
  return crypto.createHmac("sha256", secret).update(`legacy:${actor}`).digest("hex");
}

/** Builds a deterministic event key from an opaque idempotency operation. */
export function buildSelfServiceEventKey(input: {
  scope: "manual" | "self_service";
  actionKey: string;
  category: UsageCategory;
  channel: UsageChannel;
  actorHash?: string;
  idempotencyKey: string;
}): string {
  const canonical = JSON.stringify({
    actionKey: input.actionKey,
    actorHash: input.actorHash || null,
    category: input.category,
    channel: input.channel,
    idempotencyKey: input.idempotencyKey,
    scope: input.scope,
    version: 1,
  });
  return `sse_${crypto.createHash("sha256").update(canonical).digest("hex")}`;
}

/** Inserts once by the schema's unique eventKey; a duplicate deliberately changes nothing. */
export async function recordSelfServiceEvent(
  db: UsageDb,
  event: RecordSelfServiceEventInput,
): Promise<{ eventKey: string; metadataJson: string | null }> {
  const parsed = selfServiceEventSchema.parse(event);
  const metadataJson = minimizeMetadata(parsed.metadata);
  const actorHash = parsed.actorHash || (parsed.actor ? hashActorIdentifier(parsed.actor) : undefined);

  await db.insert(selfServiceEvents).values({
    eventKey: parsed.eventKey,
    actionKey: parsed.actionKey,
    category: parsed.category,
    channel: parsed.channel,
    outcome: parsed.outcome,
    durationMs: parsed.durationMs,
    model: parsed.model,
    promptTokens: parsed.promptTokens,
    completionTokens: parsed.completionTokens,
    metadataJson,
    actorHash,
    occurredAt: parsed.occurredAt,
    createdAt: Date.now(),
  }).onDuplicateKeyUpdate({
    // MySQL has no DO NOTHING. Setting the unique key to itself preserves the
    // original row, including its timestamp and all aggregate fields.
    set: { eventKey: sql`${selfServiceEvents.eventKey}` },
  });

  return { eventKey: parsed.eventKey, metadataJson };
}

/** Telemetry must never turn a completed CRM/content action into a false failure. */
export async function recordSelfServiceEventSafely(
  db: UsageDb,
  event: RecordSelfServiceEventInput,
): Promise<boolean> {
  try {
    await recordSelfServiceEvent(db, event);
    return true;
  } catch (error) {
    console.warn("[UsageMetrics] Could not record aggregate event", error);
    return false;
  }
}

export function getCatalogAction(actionKey: string): CatalogAction | undefined {
  return ACTION_BY_KEY.get(actionKey);
}

export function isAllowedManualAction(category: UsageCategory, actionKey: string): boolean {
  return ACTION_BY_KEY.get(actionKey)?.category === category;
}

export type TaskLogObserved = {
  available: boolean;
  since: string;
  counts: number;
  byAction: Array<{ actionKey: string; count: number }>;
  newActionKeys: string[];
};

function classifyTaskLogAction(source: string): string {
  const normalized = source.toLocaleLowerCase("en-US");
  for (const rule of TASK_LOG_ACTION_RULES) {
    if (rule.keywords.some(keyword => normalized.includes(keyword))) return rule.actionKey;
  }
  return "other.new";
}

/**
 * Aggregates completed task-log records since a fixed observation date. Source
 * text is used transiently for keyword matching and is intentionally omitted
 * from the return value.
 */
export function aggregateTaskLog(content: string, since = TASK_LOG_OBSERVED_SINCE): Omit<TaskLogObserved, "available"> {
  const counts = new Map<string, number>();
  const blocks = content.split(/^---\s*$/m);

  for (const block of blocks) {
    const completed = block.match(/^\*\*After \(completed\s+(\d{4}-\d{2}-\d{2})\b[^)]*\):/mi);
    if (!completed || completed[1] < since) continue;
    const actionKey = classifyTaskLogAction(block);
    counts.set(actionKey, (counts.get(actionKey) || 0) + 1);
  }

  const byAction = Array.from(counts.entries())
    .map(([actionKey, count]) => ({ actionKey, count }))
    .sort((left, right) => right.count - left.count || left.actionKey.localeCompare(right.actionKey));
  return {
    since,
    counts: byAction.reduce((total, action) => total + action.count, 0),
    byAction,
    newActionKeys: byAction
      .map(action => action.actionKey)
      .filter(actionKey => !ACTION_BY_KEY.has(actionKey)),
  };
}

export function israelDayBucket(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

type UsageCounts = {
  events: number;
  completed: number;
  previewed: number;
  drafted: number;
  published: number;
  failed: number;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
};

export type UsageOverview = {
  totals: UsageCounts;
  byCategory: Array<UsageCounts & { category: UsageCategory; labelHe: string }>;
  byAction: Array<UsageCounts & { actionKey: string; labelHe: string }>;
  byChannel: Array<UsageCounts & { channel: UsageChannel; labelHe: string }>;
  dailyTrend: Array<UsageCounts & { date: string }>;
  newActionKeys: string[];
};

function emptyCounts(): UsageCounts {
  return {
    events: 0,
    completed: 0,
    previewed: 0,
    drafted: 0,
    published: 0,
    failed: 0,
    durationMs: 0,
    promptTokens: 0,
    completionTokens: 0,
  };
}

function addEvent(counts: UsageCounts, event: UsageMetricEvent): void {
  counts.events += 1;
  counts[event.outcome] += 1;
  counts.durationMs += event.durationMs || 0;
  counts.promptTokens += event.promptTokens || 0;
  counts.completionTokens += event.completionTokens || 0;
}

function sortMetricRows<T extends UsageCounts>(rows: T[]): T[] {
  return rows.sort((left, right) => right.events - left.events);
}

/**
 * Pure aggregation used by the router and tests. previousEvents must cover the
 * immediately preceding equal-duration range; only its action keys are used.
 */
export function aggregateUsageEvents(
  currentEvents: readonly UsageMetricEvent[],
  previousEvents: readonly UsageMetricEvent[] = [],
): UsageOverview {
  const totals = emptyCounts();
  const categories = new Map<UsageCategory, UsageCounts>();
  const actions = new Map<string, UsageCounts>();
  const channels = new Map<UsageChannel, UsageCounts>();
  const days = new Map<string, UsageCounts>();

  for (const event of currentEvents) {
    addEvent(totals, event);

    const categoryCounts = categories.get(event.category) || emptyCounts();
    addEvent(categoryCounts, event);
    categories.set(event.category, categoryCounts);

    const actionCounts = actions.get(event.actionKey) || emptyCounts();
    addEvent(actionCounts, event);
    actions.set(event.actionKey, actionCounts);

    const channelCounts = channels.get(event.channel) || emptyCounts();
    addEvent(channelCounts, event);
    channels.set(event.channel, channelCounts);

    const date = israelDayBucket(event.occurredAt);
    const dayCounts = days.get(date) || emptyCounts();
    addEvent(dayCounts, event);
    days.set(date, dayCounts);
  }

  const previousActionKeys = new Set(previousEvents.map(event => event.actionKey));
  const newActionKeys = Array.from(actions.keys()).filter(actionKey => !previousActionKeys.has(actionKey)).sort();

  return {
    totals,
    byCategory: sortMetricRows(Array.from(categories.entries()).map(([category, counts]) => ({
      category,
      labelHe: USAGE_CATEGORY_LABELS[category],
      ...counts,
    }))),
    byAction: sortMetricRows(Array.from(actions.entries()).map(([actionKey, counts]) => ({
      actionKey,
      labelHe: getCatalogAction(actionKey)?.labelHe || actionKey,
      ...counts,
    }))),
    byChannel: sortMetricRows(Array.from(channels.entries()).map(([channel, counts]) => ({
      channel,
      labelHe: USAGE_CHANNEL_LABELS[channel],
      ...counts,
    }))),
    dailyTrend: Array.from(days.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((left, right) => left.date.localeCompare(right.date)),
    newActionKeys,
  };
}

export function splitEventsForOverview(
  events: readonly UsageMetricEvent[],
  startDate: number,
  endDate: number,
): { currentEvents: UsageMetricEvent[]; previousEvents: UsageMetricEvent[]; previousStartDate: number } {
  const duration = endDate - startDate + 1;
  const previousStartDate = startDate - duration;
  return {
    currentEvents: events.filter(event => event.occurredAt >= startDate && event.occurredAt <= endDate),
    previousEvents: events.filter(event => event.occurredAt >= previousStartDate && event.occurredAt < startDate),
    previousStartDate,
  };
}

export { categorySchema, channelSchema, outcomeSchema };
