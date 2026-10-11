import crypto from "node:crypto";
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { metaPurchaseDeliveries, metaPurchaseDeliverySettings } from "../drizzle/schema";
import { getDb } from "./db";
import { sendMetaPurchasePayload, type MetaDeliveryResult, type MetaPurchasePayload } from "./_core/metaCapi";
import { META_MAX_ATTEMPTS, META_RETRY_WINDOW_MS, metaRetryDelay, isIsraeliProductionMeasurementRuntime, isFreshMetaEvent } from "../shared/metaPurchasePolicy";

export function metaEventKey(eventId: string): string {
  return crypto.createHash("sha256").update(`israeli-purchase:v1:${eventId}`).digest("hex");
}
function encryptionKey(secret = process.env.JWT_SECRET): Buffer {
  if (!secret) throw new Error("measurement_encryption_unavailable");
  return crypto.createHash("sha256").update(`meta-delivery:v1:${secret}`).digest();
}
export function encryptMetaPayload(payload: MetaPurchasePayload, secret?: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), bytes.toString("base64")].join(".");
}
export function decryptMetaPayload(value: string, secret?: string): MetaPurchasePayload {
  const [iv, tag, bytes] = value.split(".");
  if (!iv || !tag || !bytes) throw new Error("measurement_payload_invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(bytes, "base64")), decipher.final()]).toString("utf8"));
}
export type DeliveryRow = typeof metaPurchaseDeliveries.$inferSelect;
export function metaAttemptOutcome(row: Pick<DeliveryRow, "attemptCount" | "createdAt">,
  result: MetaDeliveryResult, now: number) {
  const expired = now - row.createdAt >= META_RETRY_WINDOW_MS;
  const terminal = result.state === "permanent" || row.attemptCount >= META_MAX_ATTEMPTS;
  return {
    state: result.state === "accepted" ? "accepted" as const
      : expired ? "expired" as const : terminal ? "failed" as const : "pending" as const,
    lastCategory: result.category,
    lastHttpStatus: result.httpStatus ?? null,
    eventsReceived: result.eventsReceived ?? null,
    acceptedAt: result.state === "accepted" ? now : null,
    claimedUntil: null,
    nextAttemptAt: now + metaRetryDelay(row.attemptCount),
    ...((result.state === "accepted" || expired || terminal) ? { payloadEncrypted: null } : {}),
  };
}
function affected(result: unknown) { return Number((result as any)?.[0]?.affectedRows ?? 0); }

/** Must be called exclusively from the verified webhook, never from a public page or a backfill. */
export async function enqueueMetaPurchase(payload: MetaPurchasePayload, product: string) {
  if (!isIsraeliProductionMeasurementRuntime(process.env.NODE_ENV)) return "disabled" as const;
  const db = await getDb();
  if (!db) throw new Error("measurement_database_unavailable");
  const [settings] = await db.select().from(metaPurchaseDeliverySettings).where(eq(metaPurchaseDeliverySettings.id, 1)).limit(1);
  // No configuration yet is a rollout state: preserve immediate delivery until activation.
  if (!settings) return "not_configured" as const;
  if (!settings.enabled) return "disabled" as const;
  const event = payload.data[0], now = Date.now();
  const eventTime = event.event_time * 1000;
  // Explicit activation cutoff also rejects older provider notifications.
  if (!isFreshMetaEvent(eventTime, settings.enabledAt, now)) {
    throw new Error("measurement_event_outside_window");
  }
  const key = metaEventKey(event.event_id);
  await db.insert(metaPurchaseDeliveries).values({
    eventKey: key, product, amountAgorot: Math.round(event.custom_data.value * 100),
    eventTime, payloadEncrypted: encryptMetaPayload(payload), state: "pending",
    nextAttemptAt: now, createdAt: now,
  }).onDuplicateKeyUpdate({ set: { eventKey: key } });
  // Insertion is awaited; legacy webhook acknowledgement is unchanged.
  await processMetaPurchaseDeliveries(1, key);
  return "queued" as const;
}

export async function processMetaPurchaseDeliveries(limit = 10, eventKey?: string) {
  if (!isIsraeliProductionMeasurementRuntime(process.env.NODE_ENV)) return { processed: 0, accepted: 0 };
  const db = await getDb();
  if (!db) throw new Error("measurement_database_unavailable");
  const [settings] = await db.select().from(metaPurchaseDeliverySettings).where(eq(metaPurchaseDeliverySettings.id, 1)).limit(1);
  if (!settings?.enabled) return { processed: 0, accepted: 0 };
  const now = Date.now();
  const pending = and(eq(metaPurchaseDeliveries.state, "pending"),
    lte(metaPurchaseDeliveries.nextAttemptAt, now),
    or(isNull(metaPurchaseDeliveries.claimedUntil), lte(metaPurchaseDeliveries.claimedUntil, now)),
    ...(eventKey ? [eq(metaPurchaseDeliveries.eventKey, eventKey)] : []));
  const rows = await db.select().from(metaPurchaseDeliveries).where(pending)
    .orderBy(asc(metaPurchaseDeliveries.createdAt)).limit(Math.max(1, Math.min(limit, 5)));
  let processed = 0, accepted = 0;
  const deadline = Date.now() + 90_000;
  for (const row of rows) {
    if (Date.now() >= deadline) break;
    const claimedUntil = Date.now() + 120_000;
    const claim = await db.update(metaPurchaseDeliveries).set({ claimedUntil,
      attemptCount: sql`${metaPurchaseDeliveries.attemptCount} + 1` }).where(and(
        eq(metaPurchaseDeliveries.id, row.id), eq(metaPurchaseDeliveries.attemptCount, row.attemptCount), pending));
    if (affected(claim) !== 1) continue;
    processed++;
    const current = { ...row, attemptCount: row.attemptCount + 1 };
    let result: MetaDeliveryResult;
    if (Date.now() - row.createdAt >= META_RETRY_WINDOW_MS
        || Date.now() - row.eventTime >= META_RETRY_WINDOW_MS) {
      result = { state: "permanent", category: "retry_window_expired" };
    } else if (!row.payloadEncrypted) {
      result = { state: "permanent", category: "payload_missing" };
    } else {
      try { result = await sendMetaPurchasePayload(decryptMetaPayload(row.payloadEncrypted)); }
      catch { result = { state: "permanent", category: "payload_unavailable" }; }
    }
    const update = metaAttemptOutcome(current, result, Date.now());
    if (result.category === "retry_window_expired") update.state = "expired";
    const saved = await db.update(metaPurchaseDeliveries).set(update).where(and(
      eq(metaPurchaseDeliveries.id, row.id), eq(metaPurchaseDeliveries.claimedUntil, claimedUntil),
      eq(metaPurchaseDeliveries.attemptCount, current.attemptCount)));
    if (result.state === "accepted" && affected(saved) === 1) accepted++;
  }
  return { processed, accepted };
}

export async function runScheduledMetaPurchaseDelivery(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("measurement_database_unavailable");
  const [settings] = await db.select().from(metaPurchaseDeliverySettings)
    .where(eq(metaPurchaseDeliverySettings.scheduleCronTaskUid, taskUid)).limit(1);
  if (!settings?.enabled) return { processed: 0, accepted: 0, skipped: "unregistered_schedule" };
  return processMetaPurchaseDeliveries(5);
}
/** Aggregate only: never expose keys, payloads, transaction references or contact details. */
export async function metaPurchaseDeliverySummary(start: number, end: number) {
  const db = await getDb();
  if (!db) return { available: false as const, rows: [] };
  const rows = await db.select({ product: metaPurchaseDeliveries.product,
    state: metaPurchaseDeliveries.state, count: sql<number>`count(*)`,
    amountAgorot: sql<number>`sum(${metaPurchaseDeliveries.amountAgorot})`,
  }).from(metaPurchaseDeliveries).where(and(
    sql`${metaPurchaseDeliveries.eventTime} >= ${start}`,
    sql`${metaPurchaseDeliveries.eventTime} < ${end}`,
  )).groupBy(metaPurchaseDeliveries.product, metaPurchaseDeliveries.state);
  return { available: true as const, rows, timezone: "Asia/Jerusalem" as const,
    note: "Provider acceptance is not ad attribution or unique purchase reconciliation." };
}
