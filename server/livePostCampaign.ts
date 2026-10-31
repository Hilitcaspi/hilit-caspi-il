import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { emailLog, lifecycleMessageKeys } from "../drizzle/schema";
import { isPermanentlyBlockedEmail, sendEmailBatch } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl } from "./emailUnsubscribe";
import { readBrevoBlockedRecipientSet } from "./liveLaunchCampaign";
import { LIVE_OCTOBER_SLUG } from "./liveOctober";
import { buildLivePostEmail, type LivePostEmailVariant } from "./livePostEmail";
import { hasActivePlusCouponEntitlement } from "./couponPolicy";
import { injectRecoveryTracking } from "./purchaseRecoveryCampaign";
import { hasPaidDatabaseMembership } from "../shared/plusDatabaseEligibility";
import { LIVE_POST_OFFER_START } from "../shared/livePostOffer";

/**
 * One scoped after-live marketing email only. This file deliberately does not
 * mount HTTP, create a Heartbeat, queue a global worker, or modify eligibility
 * data. The owner-approved one-shot Manus schedule calls the private guarded
 * runner, which checks production offer readiness before this send engine.
 */
export const LIVE_POST_CAMPAIGN_KEY = "live_2026_10_31_after";
export const LIVE_POST_EVENT_SLUG = LIVE_OCTOBER_SLUG;
export const LIVE_POST_SEND_NOT_BEFORE = LIVE_POST_OFFER_START;
export const LIVE_POST_SEND_EXPIRES_AT = Date.parse("2026-11-01T23:59:59+02:00");
const DATABASE_JOURNEY = `${LIVE_POST_CAMPAIGN_KEY}:database`;
const PLUS_JOURNEY = `${LIVE_POST_CAMPAIGN_KEY}:plus`;

type RawTicket = {
  id: number;
  eventSlug: string;
  email: string | null;
  name: string | null;
  singleId: number | null;
  source: string | null;
  voucherCode: string | null;
  revokedAt: number | null;
  issuedAt: number | null;
};
type RawOpenRegistration = {
  eventSlug: string;
  ticketId: number | null;
  email: string | null;
  firstName: string | null;
  marketingConsent: unknown;
};
type RawProfile = {
  id: number;
  email: string | null;
  firstName: string | null;
  questionnaireToken: string | null;
  isPaid: unknown;
  isActive: unknown;
  isSeed: unknown;
  market: unknown;
  consentEmailMarketing: unknown;
};
type RawCrm = { id: number; email: string | null; emailUnsubscribed: unknown };
type RawPlus = {
  singleId: number;
  status: string | null;
  billingStatus: string | null;
  billingCycleEndsAt: number | null;
};
type RawCompletedPayment = {
  email: string | null;
  product: string | null;
  amountSource: string | null;
};
type RawCampaignActivity = {
  recipientEmail: string | null;
  journeyKey: string | null;
  status: string | null;
};

export type LivePostRawAudience = {
  tickets: RawTicket[];
  openRegistrations: RawOpenRegistration[];
  profiles: RawProfile[];
  crm: RawCrm[];
  plus: RawPlus[];
  completedPayments: RawCompletedPayment[];
  activity: RawCampaignActivity[];
};

export type LivePostMember = {
  /** Never serialize this type to a browser or log it. */
  email: string;
  firstName: string;
  variant: LivePostEmailVariant;
  leadId: number | null;
  singleId: number | null;
  /** Present only for an eligible paid database account receiving LIVEPLUS. */
  questionnaireToken: string | null;
  /** No Zoom attendance evidence is currently read by this campaign. */
  attended: false;
};

export type LivePostPlan = {
  members: LivePostMember[];
  suppressions: Record<string, number>;
};

export type LivePostPreview = {
  campaignKey: typeof LIVE_POST_CAMPAIGN_KEY;
  eventSlug: typeof LIVE_POST_EVENT_SLUG;
  readOnly: true;
  deliveryWindow: { notBefore: number; expiresAt: number; timezone: "Asia/Jerusalem" };
  recipients: { database: number; plus: number; total: number };
  suppressions: Record<string, number>;
};

export type LivePostCampaignDependencies = {
  getDb?: typeof getDb;
  readRawAudience?: (now: number) => Promise<LivePostRawAudience>;
  now?: () => number;
  isPermanentlyBlockedEmail?: (email: string) => boolean;
  /** Must return a freshly read complete provider blocklist for every send attempt. */
  readBrevoBlockedRecipientSet?: () => Promise<Set<string>>;
  sendEmailBatch?: typeof sendEmailBatch;
  buildSignedUnsubscribeUrl?: typeof buildSignedUnsubscribeUrl;
  buildLivePostEmail?: typeof buildLivePostEmail;
};

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return Array.isArray(result) ? result as T[] : [];
}

function affectedRows(result: unknown): number {
  const row = Array.isArray(result) ? result[0] : result;
  return Number((row as any)?.affectedRows ?? (row as any)?.rowsAffected ?? 0);
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function increment(values: Record<string, number>, reason: string): void {
  values[reason] = (values[reason] || 0) + 1;
}

/** Canonical keys are for de-duplication only; delivery keeps the stored address. */
export function canonicalLivePostEmail(value: unknown): string | null {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const [rawLocal, rawDomain] = email.split("@");
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain;
  const local = domain === "gmail.com" ? rawLocal.split("+")[0].replace(/\./g, "") : rawLocal;
  return `${local}@${domain}`;
}

function normalizedDeliveryEmail(value: string): string {
  return value.trim().toLowerCase();
}

function displayFirstName(value: unknown): string {
  return String(value || "").trim().split(/\s+/)[0]?.slice(0, 100) || "";
}

function isVerifiedDatabaseOrBundlePayment(payment: RawCompletedPayment): boolean {
  return payment.amountSource === "grow"
    && (payment.product === "database" || payment.product === "bundle_tubav");
}

/** Keep the campaign's paid-member classification aligned with Plus checkout. */
function isPaidActiveDatabaseProfile(profile: RawProfile): boolean {
  const market = typeof profile.market === "string" ? profile.market.toLowerCase() : profile.market;
  return hasPaidDatabaseMembership({
    isPaid: bool(profile.isPaid),
    isActive: bool(profile.isActive),
    isSeed: bool(profile.isSeed),
    market: market == null ? null : market as string,
  });
}

function deterministicUuid(scope: string, email: string): string {
  const bytes = crypto.createHash("sha256")
    .update(`${LIVE_POST_CAMPAIGN_KEY}:${LIVE_POST_EVENT_SLUG}:${scope}:${canonicalLivePostEmail(email) || email}`)
    .digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function recipientMessageKey(email: string): string {
  const digest = crypto.createHash("sha256")
    .update(`${LIVE_POST_CAMPAIGN_KEY}:${LIVE_POST_EVENT_SLUG}:${canonicalLivePostEmail(email) || email}`)
    .digest("hex");
  return `live-post-email:${LIVE_POST_CAMPAIGN_KEY}:${digest}`;
}

function journeyFor(variant: LivePostEmailVariant): string {
  return variant === "database" ? DATABASE_JOURNEY : PLUS_JOURNEY;
}

function validTicket(ticket: RawTicket): boolean {
  return ticket.eventSlug === LIVE_POST_EVENT_SLUG
    && !ticket.revokedAt
    && Boolean(canonicalLivePostEmail(ticket.email))
    && !String(ticket.voucherCode || "").startsWith("TEST-");
}

/**
 * Pure, fail-closed audience planning. Ticket possession is event eligibility
 * only: it never establishes marketing permission. An open-registration opt-in
 * or an existing affirmative profile consent is required independently.
 */
export function planLivePostAudience(raw: LivePostRawAudience, now = Date.now()): LivePostPlan {
  const suppressions: Record<string, number> = {};
  const ticketsByEmail = new Map<string, RawTicket[]>();
  const profilesByEmail = new Map<string, RawProfile[]>();
  const profilesById = new Map<number, RawProfile>();
  const crmByEmail = new Map<string, RawCrm[]>();
  const paymentsByEmail = new Map<string, RawCompletedPayment[]>();
  const activityByEmail = new Map<string, RawCampaignActivity[]>();
  const plusBySingleId = new Map<number, RawPlus[]>();
  const affirmativeOpenConsent = new Set<string>();
  const validTicketIds = new Map<number, RawTicket>();

  for (const ticket of raw.tickets) {
    if (!validTicket(ticket)) continue;
    const canonical = canonicalLivePostEmail(ticket.email)!;
    const rows = ticketsByEmail.get(canonical) || [];
    rows.push(ticket);
    ticketsByEmail.set(canonical, rows);
    validTicketIds.set(Number(ticket.id), ticket);
  }
  for (const registration of raw.openRegistrations) {
    const canonical = canonicalLivePostEmail(registration.email);
    const ticket = registration.ticketId ? validTicketIds.get(Number(registration.ticketId)) : undefined;
    // A registration consent is evidence only when it is cryptographically/normally
    // tied to the same valid event ticket and normalized email.
    if (canonical && ticket && canonicalLivePostEmail(ticket.email) === canonical
      && registration.eventSlug === LIVE_POST_EVENT_SLUG && bool(registration.marketingConsent)) {
      affirmativeOpenConsent.add(canonical);
    }
  }
  for (const profile of raw.profiles) {
    const canonical = canonicalLivePostEmail(profile.email);
    const profileId = Number(profile.id);
    if (Number.isSafeInteger(profileId) && profileId > 0) profilesById.set(profileId, profile);
    if (!canonical) continue;
    const rows = profilesByEmail.get(canonical) || [];
    rows.push(profile);
    profilesByEmail.set(canonical, rows);
  }
  for (const crm of raw.crm) {
    const canonical = canonicalLivePostEmail(crm.email);
    if (!canonical) continue;
    const rows = crmByEmail.get(canonical) || [];
    rows.push(crm);
    crmByEmail.set(canonical, rows);
  }
  for (const payment of raw.completedPayments) {
    const canonical = canonicalLivePostEmail(payment.email);
    if (!canonical) continue;
    const rows = paymentsByEmail.get(canonical) || [];
    rows.push(payment);
    paymentsByEmail.set(canonical, rows);
  }
  for (const row of raw.activity) {
    const canonical = canonicalLivePostEmail(row.recipientEmail);
    if (!canonical) continue;
    const rows = activityByEmail.get(canonical) || [];
    rows.push(row);
    activityByEmail.set(canonical, rows);
  }
  for (const plus of raw.plus) {
    const singleId = Number(plus.singleId);
    if (!Number.isSafeInteger(singleId) || singleId < 1) continue;
    const rows = plusBySingleId.get(singleId) || [];
    rows.push(plus);
    plusBySingleId.set(singleId, rows);
  }

  const members: LivePostMember[] = [];
  for (const [canonical, ticketRows] of Array.from(ticketsByEmail.entries())) {
    const tickets = [...ticketRows].sort((a, b) => Number(b.issuedAt || 0) - Number(a.issuedAt || 0) || Number(a.id) - Number(b.id));
    if (tickets.length !== 1) {
      // Gmail aliases and case normalization can collapse separate ticket rows.
      // Do not pick one or infer a membership for a possibly shared identity.
      increment(suppressions, "ambiguous_canonical_ticket_identity");
      continue;
    }
    const ticket = tickets[0]!;
    const profiles = profilesByEmail.get(canonical) || [];
    const linkedProfile = ticket.singleId ? profilesById.get(Number(ticket.singleId)) : undefined;
    const crm = crmByEmail.get(canonical) || [];
    const payments = paymentsByEmail.get(canonical) || [];
    const activity = activityByEmail.get(canonical) || [];
    const profileIds = new Set(profiles.map(profile => Number(profile.id)).filter(id => Number.isSafeInteger(id) && id > 0));
    const plusRows = Array.from(profileIds).flatMap(id => plusBySingleId.get(id) || []);

    if (activity.some(row => (row.journeyKey === DATABASE_JOURNEY || row.journeyKey === PLUS_JOURNEY)
      && ["sent", "processing", "failed"].includes(String(row.status || "")))) {
      increment(suppressions, "already_logged_for_campaign");
      continue;
    }
    if (ticket.singleId && !linkedProfile) {
      increment(suppressions, "missing_linked_profile");
      continue;
    }
    if (linkedProfile && canonicalLivePostEmail(linkedProfile.email) !== canonical) {
      increment(suppressions, "linked_profile_email_mismatch");
      continue;
    }
    if (crm.some(row => bool(row.emailUnsubscribed))) {
      increment(suppressions, "crm_unsubscribed");
      continue;
    }
    if (profiles.length > 1) {
      increment(suppressions, "ambiguous_profile_identity");
      continue;
    }
    // Any linked closed or test/seed profile vetoes a shared/canonical email.
    // A ticket-bound current-form affirmative consent is handled below; ambiguity
    // must always shrink the audience, never broaden it.
    if (profiles.some(row => !bool(row.isActive))) {
      increment(suppressions, "inactive_profile");
      continue;
    }
    if (profiles.some(row => bool(row.isSeed))) {
      increment(suppressions, "seed_or_test_profile");
      continue;
    }
    // A fresh affirmative consent on the current open-registration form is
    // independent permission. It must not be overwritten by a profile default
    // or historical false value; a current CRM unsubscribe still vetoes above.
    const hasOpenRegistrationConsent = affirmativeOpenConsent.has(canonical);
    if (!hasOpenRegistrationConsent && profiles.some(row => !bool(row.consentEmailMarketing))) {
      increment(suppressions, "profile_marketing_consent_veto");
      continue;
    }
    if (!hasOpenRegistrationConsent && !profiles.some(row => bool(row.consentEmailMarketing))) {
      increment(suppressions, "no_affirmative_marketing_consent");
      continue;
    }

    const paidProfiles = profiles.filter(isPaidActiveDatabaseProfile);
    const hasPaidProfile = paidProfiles.length > 0;
    if (profiles.some(row => bool(row.isPaid)) && !hasPaidProfile) {
      // A paid-looking profile that fails the same active/non-seed/market
      // predicate as Plus checkout is not safe to reclassify as a new lead.
      increment(suppressions, "invalid_database_membership_profile");
      continue;
    }
    const hasVerifiedDatabaseOrBundlePayment = payments.some(isVerifiedDatabaseOrBundlePayment);
    // A verified completed database/bundle payment without an actual paid,
    // active, non-seed account is held: never send a duplicate join offer.
    // Conversely, the existing account is the authority for a Plus offer;
    // legacy paid memberships do not require a fabricated payment row.
    if (!hasPaidProfile && hasVerifiedDatabaseOrBundlePayment) {
      increment(suppressions, "database_membership_conflict");
      continue;
    }
    if (!hasPaidProfile && (ticket.source === "database_live" || ticket.source === "plus")) {
      increment(suppressions, "database_membership_conflict");
      continue;
    }

    let variant: LivePostEmailVariant = "database";
    let singleId: number | null = null;
    if (hasPaidProfile) {
      if (paidProfiles.length !== 1) {
        increment(suppressions, "ambiguous_database_membership");
        continue;
      }
      singleId = Number(paidProfiles[0]!.id);
      if (ticket.singleId && Number(ticket.singleId) !== singleId) {
        // An unlinked open ticket is allowed only with the verified paid account
        // token below. A ticket linked to a different account remains blocked.
        increment(suppressions, "ticket_profile_membership_conflict");
        continue;
      }
      const memberRows = plusBySingleId.get(singleId) || [];
      if (memberRows.length > 1) {
        increment(suppressions, "ambiguous_plus_membership");
        continue;
      }
      const plus = memberRows[0];
      if (hasActivePlusCouponEntitlement(plus, now)) {
        increment(suppressions, "active_plus_member");
        continue;
      }
      // A former Plus subscriber cannot safely receive a new-subscriber first-cycle
      // benefit. Pending/unrecognised Plus states are likewise fail-closed.
      if (plus && (plus.status === "churned" || plus.billingStatus === "cancelled" || plus.billingStatus === "ended")) {
        increment(suppressions, "former_plus_not_new_subscriber");
        continue;
      }
      if (plus) {
        increment(suppressions, "plus_membership_unconfirmed");
        continue;
      }
      if (!String(paidProfiles[0]!.questionnaireToken || "").trim()) {
        // LIVEPLUS must open the already verified paid account, never an
        // anonymous checkout. Hold this account for manual review instead of
        // generating a broken CTA.
        increment(suppressions, "plus_account_token_missing");
        continue;
      }
      variant = "plus";
    } else if (plusRows.length > 0 || ticket.source === "plus") {
      increment(suppressions, "plus_membership_conflict");
      continue;
    }

    const deliveryEmail = normalizedDeliveryEmail(String(ticket.email || ""));
    members.push({
      email: deliveryEmail,
      firstName: displayFirstName(profiles[0]?.firstName || ticket.name),
      variant,
      leadId: crm.length === 1 ? Number(crm[0]!.id) : null,
      singleId,
      questionnaireToken: variant === "plus" ? String(profiles[0]?.questionnaireToken || "").trim() : null,
      attended: false,
    });
  }

  members.sort((a, b) => a.variant.localeCompare(b.variant) || canonicalLivePostEmail(a.email)!.localeCompare(canonicalLivePostEmail(b.email)!));
  return { members, suppressions };
}

/** Read-only source query. This query never trusts the open-form self-declaration. */
export async function readLivePostRawAudience(now = Date.now(), dbOverride?: any): Promise<LivePostRawAudience> {
  void now; // The event is fixed; accepting `now` keeps this reader injectable/testable.
  const db = dbOverride || await getDb();
  if (!db) throw new Error("Database unavailable");
  const [tickets, openRegistrations, profiles, crm, plus, completedPayments, activity] = await Promise.all([
    db.execute(sql`SELECT id, event_slug AS eventSlug, email, name, single_id AS singleId, source, voucher_code AS voucherCode, revoked_at AS revokedAt, issued_at AS issuedAt FROM live_october_tickets WHERE event_slug = ${LIVE_POST_EVENT_SLUG}`),
    db.execute(sql`SELECT event_slug AS eventSlug, ticket_id AS ticketId, email, first_name AS firstName, marketing_consent AS marketingConsent FROM live_open_registrations WHERE event_slug = ${LIVE_POST_EVENT_SLUG}`),
    db.execute(sql`SELECT id, email, firstName, questionnaireToken, isPaid, isActive, isSeed, market, consentEmailMarketing FROM singles`),
    db.execute(sql`SELECT id, email, emailUnsubscribed FROM crm_leads`),
    db.execute(sql`SELECT single_id AS singleId, status, billing_status AS billingStatus, billing_cycle_ends_at AS billingCycleEndsAt FROM plus_pilot_members`),
    db.execute(sql`SELECT email, product, amount_source AS amountSource FROM completed_payments`),
    db.execute(sql`SELECT recipientEmail, journeyKey, status FROM email_log WHERE journeyKey IN (${DATABASE_JOURNEY}, ${PLUS_JOURNEY})`),
  ]);
  return {
    tickets: asRows<RawTicket>(tickets),
    openRegistrations: asRows<RawOpenRegistration>(openRegistrations),
    profiles: asRows<RawProfile>(profiles),
    crm: asRows<RawCrm>(crm),
    plus: asRows<RawPlus>(plus),
    completedPayments: asRows<RawCompletedPayment>(completedPayments),
    activity: asRows<RawCampaignActivity>(activity),
  };
}

async function readAudience(now: number, dependencies: LivePostCampaignDependencies): Promise<LivePostPlan> {
  const raw = dependencies.readRawAudience
    ? await dependencies.readRawAudience(now)
    : await readLivePostRawAudience(now, await (dependencies.getDb || getDb)());
  return planLivePostAudience(raw, now);
}

/** Aggregate-only, PII-free readiness view; it does not contact Brevo. */
export async function readLivePostCampaignPreview(
  options: { now?: number } = {},
  dependencies: LivePostCampaignDependencies = {},
): Promise<LivePostPreview> {
  const now = options.now ?? dependencies.now?.() ?? Date.now();
  const plan = await readAudience(now, dependencies);
  const database = plan.members.filter(member => member.variant === "database").length;
  const plus = plan.members.filter(member => member.variant === "plus").length;
  return {
    campaignKey: LIVE_POST_CAMPAIGN_KEY,
    eventSlug: LIVE_POST_EVENT_SLUG,
    readOnly: true,
    deliveryWindow: { notBefore: LIVE_POST_SEND_NOT_BEFORE, expiresAt: LIVE_POST_SEND_EXPIRES_AT, timezone: "Asia/Jerusalem" },
    recipients: { database, plus, total: database + plus },
    suppressions: plan.suppressions,
  };
}

export function isLivePostSendWindow(now: number): boolean {
  return now >= LIVE_POST_SEND_NOT_BEFORE && now <= LIVE_POST_SEND_EXPIRES_AT;
}

function assertLivePostWindow(now: number): void {
  if (!isLivePostSendWindow(now)) {
    throw new Error("Live post campaign is allowed only from the owner-approved offer start through 2026-11-01 23:59:59 Asia/Jerusalem");
  }
}

async function claimRecipientAndCreateLog(input: {
  db: any;
  member: LivePostMember;
  email: ReturnType<typeof buildLivePostEmail>;
  now: number;
}): Promise<number | null> {
  const messageKey = recipientMessageKey(input.member.email);
  return input.db.transaction(async (tx: any) => {
    const claimed = await tx.execute(sql`
      INSERT IGNORE INTO lifecycle_message_keys (message_key, created_at)
      VALUES (${messageKey}, ${input.now})
    `);
    if (affectedRows(claimed) !== 1) return null;
    const inserted = await tx.insert(emailLog).values({
      leadId: input.member.leadId,
      recipientEmail: input.member.email,
      recipientName: input.member.firstName || null,
      journeyKey: journeyFor(input.member.variant),
      emailIndex: 1,
      subject: input.email.subject,
      htmlBody: input.email.htmlContent,
      textBody: input.email.textContent,
      scheduledAt: input.now,
      sentAt: null,
      status: "processing" as const,
      // This is intentionally review-only. Any process interruption or provider
      // ambiguity after this point is never automatically retried.
      errorMessage: "smtp_attempt_pending_review_if_interrupted",
      createdAt: input.now,
    });
    const id = Number((inserted as any)?.[0]?.insertId ?? (inserted as any)?.insertId ?? 0);
    if (!id) throw new Error("Unable to persist campaign email log");
    await tx.update(lifecycleMessageKeys).set({ emailLogId: id }).where(sql`message_key = ${messageKey}`);
    return id;
  });
}

export type LivePostRunResult = {
  campaignKey: typeof LIVE_POST_CAMPAIGN_KEY;
  sent: { database: number; plus: number; total: number };
  suppressed: Record<string, number>;
  reviewRequired: number;
};

/**
 * Executes a strictly one-shot delivery. For every candidate it re-reads all
 * mutable eligibility facts and Brevo's documented blocked-contact endpoint.
 * No retry path exists after a durable claim reaches an SMTP attempt.
 */
export async function runLivePostCampaign(
  options: { now?: number } = {},
  dependencies: LivePostCampaignDependencies = {},
): Promise<LivePostRunResult> {
  const clock = dependencies.now || Date.now;
  const startNow = options.now ?? clock();
  assertLivePostWindow(startNow);
  const db = await (dependencies.getDb || getDb)();
  if (!db) throw new Error("Database unavailable");
  const initial = await readAudience(startNow, dependencies);
  const permanentBlock = dependencies.isPermanentlyBlockedEmail || isPermanentlyBlockedEmail;
  const readBlocked = dependencies.readBrevoBlockedRecipientSet || readBrevoBlockedRecipientSet;
  const send = dependencies.sendEmailBatch || sendEmailBatch;
  const unsubscribe = dependencies.buildSignedUnsubscribeUrl || buildSignedUnsubscribeUrl;
  const buildEmail = dependencies.buildLivePostEmail || buildLivePostEmail;
  const result: LivePostRunResult = {
    campaignKey: LIVE_POST_CAMPAIGN_KEY,
    sent: { database: 0, plus: 0, total: 0 },
    suppressed: { ...initial.suppressions },
    reviewRequired: 0,
  };

  for (const selected of initial.members) {
    const now = options.now ?? clock();
    assertLivePostWindow(now);
    // Re-plan immediately before every SMTP attempt: payment, membership, Plus,
    // consent, CRM opt-out, revocation, and earlier campaign state can all change.
    const fresh = await readAudience(now, dependencies);
    const member = fresh.members.find(candidate => canonicalLivePostEmail(candidate.email) === canonicalLivePostEmail(selected.email));
    if (!member) {
      increment(result.suppressed, "fresh_eligibility_recheck_failed");
      continue;
    }
    if (permanentBlock(member.email)) {
      increment(result.suppressed, "local_permanent_block");
      continue;
    }
    let blocked: Set<string>;
    try {
      // Deliberately no cache: a later unsubscribe/block must stop the next send.
      blocked = await readBlocked();
    } catch {
      increment(result.suppressed, "brevo_blocklist_unavailable");
      continue;
    }
    if (blocked.has(canonicalLivePostEmail(member.email) || "")) {
      increment(result.suppressed, "brevo_smtp_blocked");
      continue;
    }

    const unsubscribeUrl = unsubscribe({
      email: member.email,
      ...(member.leadId ? { leadId: member.leadId } : {}),
      ...(member.singleId ? { singleId: member.singleId } : {}),
    });
    // `attended` remains false unless a future implementation has verified Zoom
    // attendance evidence. RSVP/registration alone must never make that claim.
    const email = buildEmail({
      firstName: member.firstName,
      variant: member.variant,
      unsubscribeUrl,
      attended: member.attended,
      ...(member.variant === "plus" ? {
        plusEmail: member.email,
        plusToken: member.questionnaireToken!,
      } : {}),
    });
    const logId = await claimRecipientAndCreateLog({ db, member, email, now });
    if (!logId) {
      increment(result.suppressed, "durable_campaign_claim_exists");
      continue;
    }

    try {
      const trackedHtml = injectRecoveryTracking(email.htmlContent, logId);
      await db.update(emailLog).set({ htmlBody: trackedHtml }).where(sql`id = ${logId}`);
      const delivery = await send({
        subject: email.subject,
        textContent: email.textContent,
        versions: [{
          to: [{ email: member.email, name: member.firstName || undefined }],
          htmlContent: trackedHtml,
          textContent: email.textContent,
        }],
        idempotencyKey: deterministicUuid(member.variant, member.email),
      });
      if (!delivery.success) throw new Error("provider_not_accepted");
      await db.update(emailLog).set({
        status: "sent",
        sentAt: options.now ?? clock(),
        errorMessage: delivery.duplicate ? "provider_idempotent_duplicate" : "provider_accepted",
      }).where(sql`id = ${logId}`);
      result.sent[member.variant] += 1;
      result.sent.total += 1;
    } catch {
      // The durable claim remains. A false/timeout/exception is potentially an
      // accepted SMTP request, so this campaign intentionally requires manual
      // provider/log review instead of an automated resend.
      await db.update(emailLog).set({
        status: "failed",
        errorMessage: "review_required_after_smtp_attempt",
      }).where(sql`id = ${logId}`);
      result.reviewRequired += 1;
    }
  }
  return result;
}
