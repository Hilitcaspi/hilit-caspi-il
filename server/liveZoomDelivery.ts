import crypto from "node:crypto";
import { and, asc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { liveOctoberTickets, plusPilotMembers } from "../drizzle/schema";
import { sendEmailBatch, isPermanentlyBlockedEmail } from "./brevo";
import { hasActivePlusCouponEntitlement } from "./couponPolicy";
import { getDb } from "./db";
import { LIVE_OCTOBER_SLUG } from "./liveOctober";
import { liveQuestionToken } from "./liveQuestionAccess";
import { buildLiveZoomTicketEmail } from "./liveZoomTicketEmail";
import { decryptZoomJoinUrl, encryptZoomJoinUrl, isZoomLiveDeliveryEnabled, registerApprovedLiveAttendee, zoomLiveConfig } from "./liveZoomApi";

function affectedRows(result: unknown): number {
  const item = (result as any)?.[0] ?? result as any;
  return Number(item?.affectedRows ?? item?.rowsAffected ?? 0);
}

export function liveEmailIdempotencyKey(ticketId: number): string {
  const bytes = crypto.createHash("sha256").update(`live-zoom-ticket:${ticketId}:v1`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ticketJoinUrl(ticket: {
  voucherCode: string; revokedAt: number | null; zoomDeliveryState: string;
  zoomJoinUrlEncrypted: string | null;
}): string | null {
  if (ticket.revokedAt || ticket.voucherCode.startsWith("TEST-") || ticket.zoomDeliveryState !== "sent"
      || !ticket.zoomJoinUrlEncrypted) return null;
  const key = zoomLiveConfig()?.encryptionKey;
  if (!key) return null;
  try { return decryptZoomJoinUrl(ticket.zoomJoinUrlEncrypted, key); }
  catch { return null; }
}

/** Side effects are never run unless both the explicit rollout switch and all Zoom secrets are set. */
export async function processLiveZoomTickets(limit = 2) {
  if (!isZoomLiveDeliveryEnabled()) return { processed: 0, sent: 0, skipped: "disabled" as const };
  const db = await getDb();
  if (!db) throw new Error("Live Zoom database unavailable");
  const now = Date.now();
  const tickets = await db.select({ id: liveOctoberTickets.id }).from(liveOctoberTickets).where(and(
    eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG),
    isNull(liveOctoberTickets.revokedAt),
    ne(liveOctoberTickets.zoomDeliveryState, "sent"),
    sql`${liveOctoberTickets.voucherCode} not like 'TEST-%'`,
    or(isNull(liveOctoberTickets.zoomClaimedUntil), lt(liveOctoberTickets.zoomClaimedUntil, now)),
    sql`(${liveOctoberTickets.zoomLastError} is null or ${liveOctoberTickets.zoomLastError} not in ('recipient_blocked','inactive_plus','email_inflight','delivery_uncertain'))`,
  )).orderBy(asc(liveOctoberTickets.issuedAt)).limit(Math.max(1, Math.min(limit, 5)));
  let processed = 0, sent = 0;
  for (const { id } of tickets) {
    const claimTime = Date.now();
    const claim = await db.update(liveOctoberTickets).set({
      zoomClaimedUntil: claimTime + 180_000,
      zoomAttemptCount: sql`${liveOctoberTickets.zoomAttemptCount} + 1`,
    }).where(and(
      eq(liveOctoberTickets.id, id), isNull(liveOctoberTickets.revokedAt),
      ne(liveOctoberTickets.zoomDeliveryState, "sent"),
      or(isNull(liveOctoberTickets.zoomClaimedUntil), lt(liveOctoberTickets.zoomClaimedUntil, claimTime)),
    ));
    if (affectedRows(claim) !== 1) continue;
    processed++;
    let emailAttempted = false;
    try {
      const [ticket] = await db.select().from(liveOctoberTickets).where(eq(liveOctoberTickets.id, id)).limit(1);
      if (!ticket || ticket.revokedAt || ticket.voucherCode.startsWith("TEST-")) continue;
      if (isPermanentlyBlockedEmail(ticket.email)) throw new Error("recipient_blocked");
      if (ticket.source === "plus") {
        const [plus] = ticket.singleId ? await db.select({
          status: plusPilotMembers.status, billingStatus: plusPilotMembers.billingStatus,
          billingCycleEndsAt: plusPilotMembers.billingCycleEndsAt,
        }).from(plusPilotMembers).where(eq(plusPilotMembers.singleId, ticket.singleId)).limit(1) : [];
        if (!hasActivePlusCouponEntitlement(plus)) throw new Error("inactive_plus");
      }
      const config = zoomLiveConfig();
      if (!config) throw new Error("configuration_missing");
      let encrypted = ticket.zoomJoinUrlEncrypted;
      if (!encrypted) {
        const registered = await registerApprovedLiveAttendee({ email: ticket.email, name: ticket.name });
        encrypted = encryptZoomJoinUrl(registered.joinUrl, config.encryptionKey);
        await db.update(liveOctoberTickets).set({
          zoomRegistrantId: registered.registrantId,
          zoomJoinUrlEncrypted: encrypted,
          zoomDeliveryState: "registered",
          zoomLastError: null,
        }).where(and(eq(liveOctoberTickets.id, id), isNull(liveOctoberTickets.revokedAt)));
      }
      const joinUrl = decryptZoomJoinUrl(encrypted, config.encryptionKey);
      const email = buildLiveZoomTicketEmail({
        name: ticket.name, joinUrl, source: ticket.source, questionToken: liveQuestionToken(ticket), registrationEmail: ticket.email,
      });
      // Persist a review-only state before the external call. Brevo's idempotency lasts only 30 minutes;
      // if a worker dies or the result is ambiguous, automatic retry could send a duplicate later.
      await db.update(liveOctoberTickets).set({ zoomLastError: "email_inflight" }).where(eq(liveOctoberTickets.id, id));
      emailAttempted = true;
      const delivered = await sendEmailBatch({
        subject: email.subject,
        textContent: email.textContent,
        versions: [{ to: [{ email: ticket.email, name: ticket.name }], htmlContent: email.htmlContent, textContent: email.textContent }],
        idempotencyKey: liveEmailIdempotencyKey(ticket.id),
      });
      if (!delivered.success) throw new Error("email_delivery_failed");
      await db.update(liveOctoberTickets).set({
        zoomDeliveryState: "sent", zoomEmailSentAt: Date.now(),
        zoomEmailMessageId: delivered.messageIds?.[0] || (delivered.duplicate ? "brevo-idempotent-duplicate" : null),
        zoomLastError: null,
      }).where(and(eq(liveOctoberTickets.id, id), isNull(liveOctoberTickets.revokedAt)));
      sent++;
    } catch (error) {
      // An error may carry a URL or email from upstream. Only fixed categories may enter the database or log.
      const category = error instanceof Error && error.message === "recipient_blocked" ? "recipient_blocked"
        : error instanceof Error && error.message === "inactive_plus" ? "inactive_plus"
        : emailAttempted ? "delivery_uncertain" : "delivery_retryable";
      await db.update(liveOctoberTickets).set({ zoomLastError: category }).where(eq(liveOctoberTickets.id, id));
      console.warn(`[LiveZoom] ticket ${id}: ${category}`);
    } finally {
      await db.update(liveOctoberTickets).set({ zoomClaimedUntil: null }).where(eq(liveOctoberTickets.id, id));
    }
  }
  return { processed, sent };
}
