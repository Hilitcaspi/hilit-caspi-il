import crypto from "node:crypto";
import { and, asc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { liveOctoberTickets, plusPilotMembers } from "../drizzle/schema";
import { liveOpenRegistrations } from "../drizzle/liveOpenRegistrationSchema";
import { sendEmailBatch, isPermanentlyBlockedEmail } from "./brevo";
import { hasActivePlusCouponEntitlement } from "./couponPolicy";
import { getDb } from "./db";
import { LIVE_OCTOBER_SLUG } from "./liveOctober";
import { liveQuestionToken } from "./liveQuestionAccess";
import { buildLiveZoomTicketEmail } from "./liveZoomTicketEmail";
import { decryptZoomJoinUrl, encryptZoomJoinUrl, getRegistrationDisabledMeetingJoin, isZoomLiveDeliveryEnabled, registerApprovedLiveAttendee, zoomLiveConfig } from "./liveZoomApi";

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

/**
 * Scoped readiness for a newly approved open-registration ticket. This does
 * not enable the scheduled queue: that queue still needs its global rollout
 * switch in `processLiveZoomTickets`.
 */
export function isOpenLiveRegistrationDeliveryEnabled(): boolean {
  return Boolean(zoomLiveConfig() && process.env.BREVO_API_KEY?.trim());
}

async function hasOpenRegistrationProof(db: any, ticketId: number): Promise<boolean> {
  const [proof] = await db.select({ id: liveOctoberTickets.id })
    .from(liveOctoberTickets)
    .innerJoin(liveOpenRegistrations, and(
      eq(liveOpenRegistrations.ticketId, liveOctoberTickets.id),
      eq(liveOpenRegistrations.eventSlug, LIVE_OCTOBER_SLUG),
      sql`LOWER(TRIM(${liveOpenRegistrations.email})) = LOWER(TRIM(${liveOctoberTickets.email}))`,
    ))
    .where(and(
      eq(liveOctoberTickets.id, ticketId),
      eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG),
      isNull(liveOctoberTickets.revokedAt),
    )).limit(1);
  return Boolean(proof);
}

/**
 * The only public-registration delivery entry point. The database proof binds
 * a dedicated registration to this ticket and its normalized email; it cannot
 * drain, or authorize, the general ticket queue.
 */
export async function processOpenLiveRegistrationTicket(ticketId: number) {
  if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
    return { processed: 0, sent: 0, skipped: "not_open_registration" as const };
  }
  const db = await getDb();
  if (!db || !await hasOpenRegistrationProof(db, ticketId)) {
    return { processed: 0, sent: 0, skipped: "not_open_registration" as const };
  }
  return processLiveZoomTickets(1, ticketId, true);
}

function validatedSnapshotTicketIds(ticketIds: readonly number[]): number[] {
  if (!Array.isArray(ticketIds) || ticketIds.length === 0 || ticketIds.length > 5000
      || ticketIds.some(id => !Number.isSafeInteger(id) || id < 1)) {
    throw new Error("invalid_live_ticket_snapshot");
  }
  return Array.from(new Set<number>(ticketIds));
}

/** Internal operator-only invocation, not exposed by any HTTP route. The rollout
 * flag is still required; a one-shot operator process must not change site settings.
 * Each invocation attempts at most five tickets from this exact frozen snapshot. */
export async function processApprovedLiveZoomSnapshot(ticketIds: readonly number[], limit = 5) {
  return processLiveZoomTickets(limit, undefined, false, validatedSnapshotTicketIds(ticketIds));
}

/** Side effects are never run unless both the explicit rollout switch and all Zoom secrets are set. */
export async function processLiveZoomTickets(limit = 2, targetTicketId?: number, allowRegisteredOpenSignup = false, approvedSnapshotTicketIds?: readonly number[]) {
  const snapshotIds = approvedSnapshotTicketIds === undefined ? undefined : validatedSnapshotTicketIds(approvedSnapshotTicketIds);
  if (snapshotIds && targetTicketId !== undefined) throw new Error("conflicting_live_ticket_scope");
  const targetedOpenRegistration = targetTicketId !== undefined && allowRegisteredOpenSignup;
  // A target ID alone is never permission to bypass the global rollout.
  if (targetTicketId !== undefined && !targetedOpenRegistration) {
    return { processed: 0, sent: 0, skipped: "not_open_registration" as const };
  }
  if (targetedOpenRegistration ? !isOpenLiveRegistrationDeliveryEnabled() : !isZoomLiveDeliveryEnabled()) {
    return { processed: 0, sent: 0, skipped: "disabled" as const };
  }
  const db = await getDb();
  if (!db) throw new Error("Live Zoom database unavailable");
  if (targetedOpenRegistration && !await hasOpenRegistrationProof(db, targetTicketId!)) {
    return { processed: 0, sent: 0, skipped: "not_open_registration" as const };
  }
  const now = Date.now();
  const tickets = await db.select({ id: liveOctoberTickets.id }).from(liveOctoberTickets).where(and(
    ...(targetedOpenRegistration ? [eq(liveOctoberTickets.id, targetTicketId!)] : []),
    ...(snapshotIds ? [inArray(liveOctoberTickets.id, snapshotIds)] : []),
    eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG),
    isNull(liveOctoberTickets.revokedAt),
    ne(liveOctoberTickets.zoomDeliveryState, "sent"),
    sql`${liveOctoberTickets.voucherCode} not like 'TEST-%'`,
    or(isNull(liveOctoberTickets.zoomClaimedUntil), lt(liveOctoberTickets.zoomClaimedUntil, now)),
    sql`(${liveOctoberTickets.zoomLastError} is null or ${liveOctoberTickets.zoomLastError} not in ('recipient_blocked','inactive_plus','email_inflight','delivery_uncertain'))`,
  )).orderBy(asc(liveOctoberTickets.issuedAt)).limit(Math.max(1, Math.min(limit, 5)));
  let processed = 0, sent = 0;
  // The host may disable registration after a personal link was prepared.
  // Resolve the safe current participant link once per bounded batch, and
  // refresh only unsent tickets. Already-sent tickets are never resent here.
  const simpleMeetingJoin = tickets.length ? await getRegistrationDisabledMeetingJoin() : null;
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
    let phase = "ticket_load";
    try {
      const [ticket] = await db.select().from(liveOctoberTickets).where(eq(liveOctoberTickets.id, id)).limit(1);
      if (!ticket || ticket.revokedAt || ticket.voucherCode.startsWith("TEST-")) continue;
      if (isPermanentlyBlockedEmail(ticket.email)) throw new Error("recipient_blocked");
      // An open-registration proof is the owner-approved event entry. It does
      // not modify a reused Plus ticket, but allows this one scoped delivery
      // even if its former Plus entitlement has ended.
      if (ticket.source === "plus" && !targetedOpenRegistration) {
        phase = "plus_entitlement";
        const [plus] = ticket.singleId ? await db.select({
          status: plusPilotMembers.status, billingStatus: plusPilotMembers.billingStatus,
          billingCycleEndsAt: plusPilotMembers.billingCycleEndsAt,
        }).from(plusPilotMembers).where(eq(plusPilotMembers.singleId, ticket.singleId)).limit(1) : [];
        if (!hasActivePlusCouponEntitlement(plus)) throw new Error("inactive_plus");
      }
      const config = zoomLiveConfig();
      if (!config) throw new Error("configuration_missing");
      let encrypted = ticket.zoomJoinUrlEncrypted;
      let joinMode: "personal" | "meeting" = simpleMeetingJoin ? "meeting" : "personal";
      if (!encrypted || simpleMeetingJoin) {
        phase = "zoom_registration";
        const registered = simpleMeetingJoin || await registerApprovedLiveAttendee({ email: ticket.email, name: ticket.name });
        if (registered.mode === "meeting") joinMode = "meeting";
        phase = "join_encryption";
        encrypted = encryptZoomJoinUrl(registered.joinUrl, config.encryptionKey);
        phase = "registration_persist";
        await db.update(liveOctoberTickets).set({
          zoomRegistrantId: registered.registrantId,
          zoomJoinUrlEncrypted: encrypted,
          zoomDeliveryState: "registered",
          zoomLastError: null,
        }).where(and(eq(liveOctoberTickets.id, id), isNull(liveOctoberTickets.revokedAt)));
      }
      phase = "email_build";
      const joinUrl = decryptZoomJoinUrl(encrypted, config.encryptionKey);
      const email = buildLiveZoomTicketEmail({
        name: ticket.name, joinUrl, source: ticket.source, questionToken: liveQuestionToken(ticket), registrationEmail: ticket.email, joinMode,
      });
      // Persist a review-only state before the external call. Brevo's idempotency lasts only 30 minutes;
      // if a worker dies or the result is ambiguous, automatic retry could send a duplicate later.
      phase = "email_claim";
      await db.update(liveOctoberTickets).set({ zoomLastError: "email_inflight" }).where(eq(liveOctoberTickets.id, id));
      emailAttempted = true;
      phase = "email_send";
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
      const message = error instanceof Error ? error.message : "";
      const safeStatus = /^Zoom (GET|POST|PUT|OAuth) failed \(\d{3}\)$/.test(message) ? message : "";
      const safeReason = message === "Approved Zoom join URL unavailable" ? "approved_join_not_visible"
        : message === "Zoom registrant ID unavailable" ? "registrant_id_not_visible"
        : error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? "upstream_timeout" : "";
      console.warn(`[LiveZoom] ticket ${id}: ${category}; phase=${phase}${safeStatus ? `; ${safeStatus}` : ""}${safeReason ? `; reason=${safeReason}` : ""}`);
    } finally {
      await db.update(liveOctoberTickets).set({ zoomClaimedUntil: null }).where(eq(liveOctoberTickets.id, id));
    }
  }
  return { processed, sent };
}
