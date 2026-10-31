import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { liveOpenRegistrations } from "../drizzle/liveOpenRegistrationSchema";
import { getDb } from "./db";
import { LIVE_OCTOBER_SLUG, LIVE_START_ISO, ensureLiveTicket, normalizeLiveEmail } from "./liveOctober";
import { isOpenLiveRegistrationDeliveryEnabled, processOpenLiveRegistrationTicket } from "./liveZoomDelivery";

export const LIVE_OPEN_REGISTRATION_CONSENT_VERSION = "live-open-v2-required-email";
const OPEN_REGISTRATION_FLAG = "LIVE_OPEN_REGISTRATION_ENABLED";
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const RATE_LIMIT_MAX_KEYS = 2_000;

type OpenRegistrationDelivery = "sent" | "queued" | "unavailable";
type OpenRegistrationResult = { success: true; delivery: OpenRegistrationDelivery };

const trimmedOptional = (max: number) => z.string().trim().max(max).optional();

/** Public form contract. `isDatabaseMember` is a self-declaration only. */
export const openLiveRegistrationInput = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(5).max(30),
  isDatabaseMember: z.boolean(),
  marketingConsent: z.boolean().refine(value => value === true, {
    message: "כדי להשלים את ההרשמה, יש לאשר קבלת מיילים ועדכונים.",
  }),
  // Honeypot: any non-empty value receives a generic success response with no side effects.
  website: z.string().max(200).optional(),
  utmSource: trimmedOptional(100),
  utmMedium: trimmedOptional(100),
  utmCampaign: trimmedOptional(200),
  utmContent: trimmedOptional(200),
});

export type OpenLiveRegistrationInput = z.infer<typeof openLiveRegistrationInput>;
export type OpenLiveRegistrationContext = { ip?: string | null };

type Ticket = { id: number; email: string; revokedAt?: number | null; source?: string };
type ZoomProcessResult = { processed: number; sent: number; skipped?: string };
type OpenRegistrationDb = any;

type RateEntry = { count: number; resetAt: number };

export type OpenLiveRegistrationDependencies = {
  getDb?: () => Promise<OpenRegistrationDb | null>;
  ensureLiveTicket?: (input: {
    email: string;
    name: string;
    source: "open_registration";
  }) => Promise<Ticket>;
  processOpenLiveRegistrationTicket?: (ticketId: number) => Promise<ZoomProcessResult>;
  deliveryEnabled?: () => boolean;
  now?: () => number;
  rateLimit?: (context: OpenLiveRegistrationContext | undefined, now: number) => boolean;
};

function eventStart(): number {
  return Date.parse(LIVE_START_ISO);
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function rateKey(ip: string): string {
  // A hash is sufficient for a short in-process abuse bucket and never retains a raw IP.
  return crypto.createHash("sha256").update("live-open-registration-rate:v1\0").update(ip).digest("base64url");
}

function createRateLimiter() {
  const entries = new Map<string, RateEntry>();
  return (context: OpenLiveRegistrationContext | undefined, now: number): boolean => {
    const ip = context?.ip?.trim();
    if (!ip) return true;

    for (const [key, entry] of Array.from(entries.entries())) {
      if (entry.resetAt <= now) entries.delete(key);
    }
    if (entries.size >= RATE_LIMIT_MAX_KEYS && !entries.has(rateKey(ip))) {
      // Degrade safely under an abuse flood instead of allowing unbounded memory growth.
      return false;
    }

    const key = rateKey(ip);
    const existing = entries.get(key);
    if (!existing || existing.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }
    if (existing.count >= RATE_LIMIT_MAX_REQUESTS) return false;
    existing.count += 1;
    return true;
  };
}

function publicUnavailableError() {
  return new Error("ההרשמה אינה זמינה כעת");
}

async function findRegistration(db: OpenRegistrationDb, email: string) {
  const [registration] = await db.select({
    id: liveOpenRegistrations.id,
    firstName: liveOpenRegistrations.firstName,
    lastName: liveOpenRegistrations.lastName,
    ticketId: liveOpenRegistrations.ticketId,
  }).from(liveOpenRegistrations).where(and(
    eq(liveOpenRegistrations.eventSlug, LIVE_OCTOBER_SLUG),
    eq(liveOpenRegistrations.email, email),
  )).limit(1);
  return registration as { id: number; firstName: string; lastName: string; ticketId: number | null } | undefined;
}

async function insertRegistration(db: OpenRegistrationDb, input: OpenLiveRegistrationInput, email: string, now: number) {
  await db.insert(liveOpenRegistrations).values({
    eventSlug: LIVE_OCTOBER_SLUG,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email,
    phone: input.phone.trim(),
    isDatabaseMember: input.isDatabaseMember,
    marketingConsent: input.marketingConsent,
    consentVersion: LIVE_OPEN_REGISTRATION_CONSENT_VERSION,
    // Consent is captured only at first registration. Duplicate form submits never update it.
    consentedAt: input.marketingConsent ? now : null,
    registeredAt: now,
    ticketId: null,
    utmSource: emptyToNull(input.utmSource),
    utmMedium: emptyToNull(input.utmMedium),
    utmCampaign: emptyToNull(input.utmCampaign),
    utmContent: emptyToNull(input.utmContent),
  });
}

async function attachTicket(db: OpenRegistrationDb, registrationId: number, ticketId: number) {
  // Only the initially-null ticket link may be set. All submitted contact and consent fields stay immutable.
  await db.update(liveOpenRegistrations).set({ ticketId }).where(and(
    eq(liveOpenRegistrations.id, registrationId),
    sql`${liveOpenRegistrations.ticketId} is null`,
  ));
}

/**
 * Dependency factory for unit tests. Production callers use the exported functions below.
 * It neither reads nor writes member profiles and does not invoke any provider directly.
 */
export function createOpenLiveRegistrationService(dependencies: OpenLiveRegistrationDependencies = {}) {
  const loadDb = dependencies.getDb ?? getDb;
  const issueTicket = dependencies.ensureLiveTicket ?? ensureLiveTicket;
  const processTicket = dependencies.processOpenLiveRegistrationTicket ?? processOpenLiveRegistrationTicket;
  const deliveryEnabled = dependencies.deliveryEnabled ?? isOpenLiveRegistrationDeliveryEnabled;
  const now = dependencies.now ?? Date.now;
  const rateLimit = dependencies.rateLimit ?? createRateLimiter();

  function openLiveRegistrationStatus() {
    const start = eventStart();
    return {
      // The owner-approved form is available by default until the event. An
      // explicit false is the only configuration that closes it early.
      open: process.env[OPEN_REGISTRATION_FLAG] !== "false" && now() < start,
      // This is deliberately the scoped open-signup readiness flag, not the global queue rollout flag.
      deliveryEnabled: deliveryEnabled(),
      eventStart: start,
    };
  }

  async function registerOpenLive(rawInput: OpenLiveRegistrationInput, context?: OpenLiveRegistrationContext): Promise<OpenRegistrationResult> {
    const input = openLiveRegistrationInput.parse(rawInput);
    const status = openLiveRegistrationStatus();
    if (!status.open) throw publicUnavailableError();

    // Decoy submissions must look successful, but must never write a lead, ticket or provider record.
    if (input.website?.trim()) return { success: true, delivery: "queued" };
    const currentTime = now();
    if (!rateLimit(context, currentTime)) throw publicUnavailableError();

    const db = await loadDb();
    if (!db) throw publicUnavailableError();
    const email = normalizeLiveEmail(input.email);

    // Retries use stored name/contact state only. They never overwrite contact,
    // UTM, consent, ticket source, or an existing paid/Plus entitlement.
    let registration: Awaited<ReturnType<typeof findRegistration>>;
    try {
      registration = await findRegistration(db, email);
    } catch {
      throw publicUnavailableError();
    }
    if (!registration) {
      try {
        await insertRegistration(db, input, email, currentTime);
      } catch {
        // Only a confirmed event+email row can be acknowledged as a duplicate.
        // A real persistence outage remains an honest, generic unavailable error.
        try {
          registration = await findRegistration(db, email);
        } catch {
          throw publicUnavailableError();
        }
        if (!registration) throw publicUnavailableError();
      }
      if (!registration) {
        try {
          registration = await findRegistration(db, email);
        } catch {
          throw publicUnavailableError();
        }
      }
    }
    if (!registration) return { success: true, delivery: "queued" };

    let ticket: Ticket;
    if (registration.ticketId) {
      // A later retry is safe: the targeted processor's claim/sent state makes
      // it a no-op after delivery and never broadens to other tickets.
      ticket = { id: registration.ticketId, email };
    } else {
      try {
        // `ensureLiveTicket` retains any active paid/Plus ticket instead of
        // mutating its source or name. A revoked ticket is never resurrected.
        ticket = await issueTicket({
          email,
          name: `${registration.firstName.trim()} ${registration.lastName.trim()}`.trim(),
          source: "open_registration",
        });
      } catch {
        // Keep the captured row available for a later retry; do not pretend it
        // was delivered or mutate the lead.
        return { success: true, delivery: "unavailable" };
      }
      if (!ticket || ticket.revokedAt) return { success: true, delivery: "unavailable" };

      try {
        await attachTicket(db, registration.id, ticket.id);
      } catch {
        // The next retry reuses the event-email ticket safely and attempts only
        // to fill the null proof link.
        return { success: true, delivery: "queued" };
      }
    }
    if (ticket.revokedAt) return { success: true, delivery: "unavailable" };

    if (!status.deliveryEnabled) return { success: true, delivery: "unavailable" };
    try {
      // This targeted helper is proof-gated inside liveZoomDelivery; it never drains the general ticket queue.
      const result = await processTicket(ticket.id);
      return { success: true, delivery: result.sent > 0 ? "sent" : "queued" };
    } catch {
      // Delivery is best-effort. The row and ticket remain queued for staff review without exposing provider details.
      return { success: true, delivery: "queued" };
    }
  }

  return { openLiveRegistrationStatus, registerOpenLive };
}

const runtimeService = createOpenLiveRegistrationService();

export function openLiveRegistrationStatus() {
  return runtimeService.openLiveRegistrationStatus();
}

export async function registerOpenLive(input: OpenLiveRegistrationInput, context?: OpenLiveRegistrationContext): Promise<OpenRegistrationResult> {
  return runtimeService.registerOpenLive(input, context);
}
