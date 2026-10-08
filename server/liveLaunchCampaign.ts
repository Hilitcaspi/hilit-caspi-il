import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { isPermanentlyBlockedEmail, sendEmailBatch } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl } from "./emailUnsubscribe";
import { buildLiveLaunchEmailDraft, type LiveLaunchAudience as EmailAudience } from "./liveLaunchEmailDrafts";
import { LIVE_OCTOBER_SLUG } from "./liveOctober";
import { liveQuestionToken } from "./liveQuestionAccess";
import { getVibrateSmsBalance, normalizeIsraeliMobile, sendSMSBulkDetailed } from "./vibrate";

/**
 * A deliberately narrow, approval-gated campaign runner for the 31 October live.
 *
 * This module never creates Brevo lists, edits contacts/profiles/tickets, creates a
 * ticket, registers a Zoom attendee, or schedules work.  A normal call is read-only.
 * The only write path is an explicitly approved, time-bounded direct delivery run.
 */
export const LIVE_LAUNCH_CAMPAIGN = "live_launch_2026_10_08";
export const LIVE_LAUNCH_SEND_NOT_BEFORE = Date.parse("2026-10-08T19:00:00+03:00");
export const LIVE_LAUNCH_SEND_EXPIRES_AT = Date.parse("2026-10-08T21:30:00+03:00");
export const LIVE_LAUNCH_SMS_DEFAULT_CAP = 200;

export type LiveLaunchDeliveryPhase = "email19" | "sms19" | "email20" | "sms20" | "email21" | "sms21";
export type LiveLaunchWaveContent = "launch_cold_1900" | "launch_cold_2000" | "launch_cold_2100" | "launch_cold_sms_combo_1900" | "launch_cold_sms_combo_2000" | "launch_cold_sms_combo_2100" | "plus_rsvp";
const DELIVERY_PHASE_WINDOWS: Record<LiveLaunchDeliveryPhase, readonly [number, number]> = {
  email19: [Date.parse("2026-10-08T19:00:00+03:00"), Date.parse("2026-10-08T19:30:00+03:00")],
  sms19: [Date.parse("2026-10-08T19:00:00+03:00"), Date.parse("2026-10-08T19:30:00+03:00")],
  email20: [Date.parse("2026-10-08T20:00:00+03:00"), Date.parse("2026-10-08T20:30:00+03:00")],
  sms20: [Date.parse("2026-10-08T20:00:00+03:00"), Date.parse("2026-10-08T20:30:00+03:00")],
  email21: [Date.parse("2026-10-08T21:00:00+03:00"), Date.parse("2026-10-08T21:30:00+03:00")],
  sms21: [Date.parse("2026-10-08T21:00:00+03:00"), Date.parse("2026-10-08T21:30:00+03:00")],
};
const WAVE_CONTENT = new Set<LiveLaunchWaveContent>(["launch_cold_1900", "launch_cold_2000", "launch_cold_2100", "launch_cold_sms_combo_1900", "launch_cold_sms_combo_2000", "launch_cold_sms_combo_2100", "plus_rsvp"]);

const DAY = 24 * 60 * 60 * 1000;
const EMAIL_REST_WINDOW = 7 * DAY;
const SMS_INTENT_CHECKOUT_WINDOW = 30 * DAY;
const SMS_INTENT_CLICK_WINDOW = 30 * DAY;
const SMS_INTENT_REGISTRATION_WINDOW = 14 * DAY;
const JOURNEY: Record<LiveLaunchSegment, string> = {
  cold: "live_launch26_cold",
  database: "live_launch26_database",
  plus: "live_launch26_plus",
};
const SMS_JOURNEY: Record<LiveLaunchSegment, string> = {
  cold: "live_launch26_sms_cold",
  database: "live_launch26_sms_database",
  plus: "live_launch26_sms_plus",
};

export type LiveLaunchSegment = "cold" | "database" | "plus";
type SuppressionReason =
  | "invalid_email"
  | "crm_unsubscribed"
  | "inactive_or_closed_profile"
  | "profile_marketing_consent"
  | "seed_or_owner_test"
  | "boost_excluded_owner_test"
  | "coaching_or_not_relevant"
  | "recent_marketing_email"
  | "paid_database_not_cold"
  | "ticket_already_held"
  | "database_missing_verification_token"
  | "plus_missing_ticket"
  | "plus_rsvp_already_confirmed"
  | "local_email_blacklist"
  | "brevo_smtp_blocked"
  | "brevo_smtp_unverified"
  | "duplicate_canonical_phone"
  | "already_logged_for_campaign"
  | "prior_sms_campaign"
  | "missing_sms_consent_evidence"
  | "sms_consent_denied"
  | "sms_no_verified_intent";

export type LiveLaunchMember = {
  /** Kept private to the sender; never included in the public dry-run result. */
  email: string;
  phone: string | null;
  firstName: string;
  segment: LiveLaunchSegment;
  leadId: number | null;
  singleId: number | null;
  questionnaireToken: string | null;
  /** 0=checkout, 1=clicked email, 2=completed registration. */
  smsIntentPriority: number;
  /** A current, real, non-revoked Plus ticket.  No ticket is ever issued here. */
  plusTicket: LiveTicket | null;
  smsIntent: boolean;
  smsPreviouslySent: boolean;
  /** Cold leads sharing a paid database/valid-Plus phone are email-only for this launch. */
  smsBlockedByPaidPhone: boolean;
};

type LiveTicket = {
  id: number;
  eventSlug: string;
  email: string;
  voucherCode: string;
  issuedAt: number;
  revokedAt: number | null;
  source: string;
  singleId: number | null;
  attendanceConfirmedAt: number | null;
};

type RawProfile = {
  id: number;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  isActive: unknown;
  isSeed: unknown;
  boostExcluded: unknown;
  isPaid: unknown;
  consentEmailMarketing: unknown;
  isCoachingClient: unknown;
  questionnaireToken: string | null;
  questionnaireCompletedAt: number | null;
  createdAt: number | null;
};
type RawCrm = {
  id: number;
  email: string | null;
  phone: string | null;
  name: string | null;
  status: string | null;
  emailUnsubscribed: unknown;
  createdAt: number | string | null;
};
type RawPlus = { singleId: number; status: string | null; billingStatus: string | null; billingCycleEndsAt: number | null };
type RawPayment = { email: string | null; product: string | null };
type RawPaymentLead = { email: string | null; product: string | null; confirmedAt: number | null; createdAt: number | null };
type RawActivity = { email: string | null; journeyKey: string | null; status: string | null; sentAt: number | null; clickedAt: number | null };

export type LiveLaunchRawAudience = {
  profiles: RawProfile[];
  crm: RawCrm[];
  plus: RawPlus[];
  tickets: LiveTicket[];
  completedPayments: RawPayment[];
  paymentLeads: RawPaymentLead[];
  activity: RawActivity[];
};

type CountBySegment = Record<LiveLaunchSegment, number>;
export type LiveLaunchDryRun = {
  campaign: typeof LIVE_LAUNCH_CAMPAIGN;
  readOnly: true;
  event: { dateTime: "2026-10-31T20:30:00+02:00"; timezone: "Asia/Jerusalem" };
  email: CountBySegment & { total: number };
  sms: {
    verifiedHighIntentBeforeConsent: number;
    verifiedHighIntentBySegment: CountBySegment;
    approvedByExplicitSmsConsent: number;
    cappedAt: number;
    providerUnits256IfDrafted: number;
    unicodeTransportPartsIfDrafted: number;
    disabledWithoutDraftCallback: boolean;
  };
  plus: { activeMissingTicket: number; rsvpAlreadyConfirmed: number };
  suppressions: Record<string, number>;
  policyProvenance: {
    email: string;
    sms: string;
    segmentation: string;
  };
};

export type SmsConsentDecision = { permitted: boolean; provenance: string };
export type LiveLaunchSmsBuilder = (input: {
  audience: LiveLaunchSegment;
  firstName: string;
  /** A signed link is supplied in memory only; it is never persisted by this module. */
  unsubscribeUrl: string;
}) => { message: string };

export type LiveLaunchOptions = {
  /** Defaults to true.  Only execute:true AND dryRun:false can write/send. */
  dryRun?: boolean;
  execute?: boolean;
  now?: number;
  /** A phase is intentionally narrow; absent keeps the reviewed legacy single-run behavior. */
  deliveryPhase?: LiveLaunchDeliveryPhase;
  /** Required on execution; must not outlive the Jerusalem night of 8 October. */
  expiresAt?: number;
  /** Frozen count-only result from the owner-reviewed dry run. Required on execution. */
  frozen?: { email: CountBySegment; smsTotal?: number; audienceDigest?: string; recipientHashes?: string[] };
  limits?: Partial<CountBySegment> & { smsTotal?: number };
  /** Phase parents must opt in to the segments they approved; SMS remains cold-only regardless. */
  allowedSegments?: LiveLaunchSegment[];
  /** A reviewed UTM content label, optionally chosen per frozen recipient in memory. */
  waveContent?: LiveLaunchWaveContent | ((member: Readonly<LiveLaunchMember>) => LiveLaunchWaveContent);
  /** Opt-in only. There is no first-party SMS consent column, so the default denies SMS. */
  smsConsent?: (member: Readonly<LiveLaunchMember>) => Promise<SmsConsentDecision> | SmsConsentDecision;
  /** Parent-owned copy only. No built-in/live hard-coded SMS copy is used. */
  buildSms?: LiveLaunchSmsBuilder;
  /** Optional future template hook for a verified member-specific FRIENDS destination. */
  buildMemberOfferUrl?: (member: Readonly<LiveLaunchMember>) => string | undefined;
  /** Off by default in preview; always enabled by execution revalidation. */
  verifyBrevoSmtpBlacklist?: boolean;
};

export type LiveLaunchDependencies = {
  getDb?: typeof getDb;
  readRawAudience?: (now: number) => Promise<LiveLaunchRawAudience>;
  isPermanentlyBlockedEmail?: (email: string) => boolean;
  /** true=blocked, false=not blocked, unknown=unverified (fail closed for execution). */
  brevoSmtpBlocked?: (email: string) => Promise<true | false | "unknown">;
  sendEmailBatch?: typeof sendEmailBatch;
  sendSMSBulkDetailed?: typeof sendSMSBulkDetailed;
  getVibrateSmsBalance?: typeof getVibrateSmsBalance;
  buildSignedUnsubscribeUrl?: typeof buildSignedUnsubscribeUrl;
  buildLiveLaunchEmailDraft?: typeof buildLiveLaunchEmailDraft;
  liveQuestionToken?: typeof liveQuestionToken;
};

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return Array.isArray(result) ? result as T[] : [];
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function canonicalEmail(value: unknown): string | null {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const [rawLocal, rawDomain] = email.split("@");
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain;
  const local = domain === "gmail.com" ? rawLocal.split("+")[0].replace(/\./g, "") : rawLocal;
  return `${local}@${domain}`;
}

export function canonicalPhone(value: unknown): string | null {
  return normalizeIsraeliMobile(String(value || ""));
}

function firstName(value: unknown): string {
  return String(value || "").trim().split(/\s+/)[0]?.slice(0, 100) || "";
}

function increment(target: Record<string, number>, key: string, amount = 1) {
  target[key] = (target[key] || 0) + amount;
}

function activePlus(row: RawPlus | undefined, now: number) {
  return Boolean(row && ((row.status === "active" && row.billingStatus === "active")
    || (row.status === "active" && row.billingStatus === "cancelled" && Number(row.billingCycleEndsAt || 0) > now)
    || (row.status === "churned" && row.billingStatus === "cancelled" && Number(row.billingCycleEndsAt || 0) > now)));
}

function emptySegmentCounts(): CountBySegment {
  return { cold: 0, database: 0, plus: 0 };
}

function stableMemberOrder(a: LiveLaunchMember, b: LiveLaunchMember) {
  const priority: Record<LiveLaunchSegment, number> = { plus: 0, database: 1, cold: 2 };
  return priority[a.segment] - priority[b.segment]
    || a.email.localeCompare(b.email)
    || (a.singleId || Number.MAX_SAFE_INTEGER) - (b.singleId || Number.MAX_SAFE_INTEGER)
    || (a.leadId || Number.MAX_SAFE_INTEGER) - (b.leadId || Number.MAX_SAFE_INTEGER);
}

/**
 * Pure classification function. It returns contacts only to the caller/runtime;
 * `summarizeLiveLaunchAudience` is the safe aggregate payload for an owner review.
 */
export function classifyLiveLaunchAudience(raw: LiveLaunchRawAudience, now = Date.now()): {
  members: LiveLaunchMember[];
  suppressions: Record<string, number>;
  plusMissingTicket: number;
  rsvpAlreadyConfirmed: number;
} {
  const suppressions: Record<string, number> = {};
  let plusMissingTicket = 0;
  let rsvpAlreadyConfirmed = 0;
  const profilesByEmail = new Map<string, RawProfile[]>();
  const crmByEmail = new Map<string, RawCrm[]>();
  const boostEmails = new Set<string>();
  const boostPhones = new Set<string>();
  const plusBySingleId = new Map<number, RawPlus>();
  const completedDatabaseEmails = new Set<string>();
  const coachingEmails = new Set<string>();
  const uncompletedDatabaseCheckout = new Set<string>();
  const clickedRecently = new Set<string>();
  const recentlyMailed = new Set<string>();
  const priorSms = new Set<string>();
  const paidPhones = new Set<string>();
  const ticketsByEmail = new Map<string, LiveTicket[]>();

  for (const profile of raw.profiles) {
    const email = canonicalEmail(profile.email);
    if (email) {
      const existing = profilesByEmail.get(email) || [];
      existing.push(profile);
      profilesByEmail.set(email, existing);
      if (bool(profile.boostExcluded)) boostEmails.add(email);
    }
    const phone = canonicalPhone(profile.phone);
    if (bool(profile.boostExcluded) && phone) boostPhones.add(phone);
  }
  for (const crm of raw.crm) {
    const email = canonicalEmail(crm.email);
    if (!email) continue;
    const existing = crmByEmail.get(email) || [];
    existing.push(crm);
    crmByEmail.set(email, existing);
  }
  for (const plus of raw.plus) plusBySingleId.set(Number(plus.singleId), plus);
  // This is intentionally broader than the email candidates: a cold CRM lead can
  // share a phone with a paid/Plus profile that is correctly suppressed from email.
  // That never blocks the lead's email, but it must not make the phone SMS-eligible.
  for (const profile of raw.profiles) {
    const phone = canonicalPhone(profile.phone);
    if (phone && (bool(profile.isPaid) || activePlus(plusBySingleId.get(Number(profile.id)), now))) paidPhones.add(phone);
  }
  for (const payment of raw.completedPayments) {
    const email = canonicalEmail(payment.email);
    if (!email) continue;
    if (["database", "bundle_new_year"].includes(String(payment.product || ""))) completedDatabaseEmails.add(email);
    if (["coaching", "coaching_mas"].includes(String(payment.product || ""))) coachingEmails.add(email);
  }
  for (const lead of raw.paymentLeads) {
    const email = canonicalEmail(lead.email);
    if (email && lead.product === "database" && !lead.confirmedAt && Number(lead.createdAt || 0) >= now - SMS_INTENT_CHECKOUT_WINDOW) {
      uncompletedDatabaseCheckout.add(email);
    }
  }
  for (const activity of raw.activity) {
    const email = canonicalEmail(activity.email);
    if (!email) continue;
    const journey = String(activity.journeyKey || "").toLowerCase();
    if (activity.status === "sent" && Number(activity.sentAt || 0) >= now - EMAIL_REST_WINDOW && !journey.startsWith("live_launch26_")) {
      recentlyMailed.add(email);
    }
    if (Number(activity.clickedAt || 0) >= now - SMS_INTENT_CLICK_WINDOW) clickedRecently.add(email);
    if ((activity.status === "sent" || activity.status === "processing" || activity.status === "failed") && journey.includes("sms")) {
      priorSms.add(email);
    }
  }
  for (const ticket of raw.tickets) {
    const email = canonicalEmail(ticket.email);
    if (!email || ticket.eventSlug !== LIVE_OCTOBER_SLUG || ticket.revokedAt || ticket.voucherCode.startsWith("TEST-")) continue;
    const rows = ticketsByEmail.get(email) || [];
    // Ticket email is HMAC input; never replace it with the canonical dedupe key.
    rows.push(ticket);
    ticketsByEmail.set(email, rows);
  }

  const candidates: LiveLaunchMember[] = [];
  const allEmails = new Set([...Array.from(profilesByEmail.keys()), ...Array.from(crmByEmail.keys())]);
  for (const email of Array.from(allEmails)) {
    const profiles = profilesByEmail.get(email) || [];
    const crm = crmByEmail.get(email) || [];
    const emailsPhones = new Set(profiles.map(row => canonicalPhone(row.phone)).filter((v): v is string => Boolean(v)));
    for (const row of crm) {
      const phone = canonicalPhone(row.phone);
      if (phone) emailsPhones.add(phone);
    }
    const anyUnsubscribed = crm.some(row => bool(row.emailUnsubscribed));
    const anyInactive = profiles.some(row => !bool(row.isActive));
    const anySeed = profiles.some(row => bool(row.isSeed));
    const anyNoMarketingConsent = profiles.some(row => !bool(row.consentEmailMarketing));
    const boostExcluded = boostEmails.has(email) || Array.from(emailsPhones).some(phone => boostPhones.has(phone));
    const coachingOrNotRelevant = coachingEmails.has(email)
      || profiles.some(row => bool(row.isCoachingClient))
      || crm.some(row => ["client_coaching", "not_relevant"].includes(String(row.status || "")));
    const paidDatabase = completedDatabaseEmails.has(email) || profiles.some(row => bool(row.isPaid));
    const profileWithPlus = profiles.find(row => activePlus(plusBySingleId.get(Number(row.id)), now));
    const activeDatabaseProfile = profiles.find(row => bool(row.isPaid) && bool(row.isActive));
    const tickets = ticketsByEmail.get(email) || [];

    let reason: SuppressionReason | null = null;
    if (anyUnsubscribed) reason = "crm_unsubscribed";
    else if (anyInactive) reason = "inactive_or_closed_profile";
    else if (anySeed) reason = "seed_or_owner_test";
    else if (boostExcluded) reason = "boost_excluded_owner_test";
    else if (anyNoMarketingConsent) reason = "profile_marketing_consent";
    else if (coachingOrNotRelevant) reason = "coaching_or_not_relevant";
    // A current Plus entitlement is a permitted service/member exception to the
    // seven-day marketing rest; every other consent and safety suppression remains.
    else if (recentlyMailed.has(email) && !profileWithPlus) reason = "recent_marketing_email";
    if (reason) {
      increment(suppressions, reason);
      continue;
    }

    const profile = profileWithPlus || activeDatabaseProfile || profiles[0];
    const phone = Array.from(emailsPhones).sort()[0] || null;
    const smsBlockedByPaidPhone = Boolean(phone && paidPhones.has(phone));
    const smsIntent = (uncompletedDatabaseCheckout.has(email) || clickedRecently.has(email)
      || profiles.some(row => Number(row.questionnaireCompletedAt || 0) >= now - SMS_INTENT_REGISTRATION_WINDOW))
      && !smsBlockedByPaidPhone;
    const base = {
      email: String(profile?.email || crm[0]?.email || email).trim().toLowerCase(),
      phone,
      firstName: firstName(profile?.firstName || crm[0]?.name),
      leadId: crm.length ? Number(crm[0].id) : null,
      singleId: profile ? Number(profile.id) : null,
      questionnaireToken: String(profile?.questionnaireToken || "").trim() || null,
      smsIntent,
      smsIntentPriority: uncompletedDatabaseCheckout.has(email) ? 0 : clickedRecently.has(email) ? 1
        : profiles.some(row => Number(row.questionnaireCompletedAt || 0) >= now - SMS_INTENT_REGISTRATION_WINDOW) ? 2 : Number.MAX_SAFE_INTEGER,
      smsPreviouslySent: priorSms.has(email),
      smsBlockedByPaidPhone,
    };
    if (profileWithPlus) {
      const ticket = tickets.find(row => row.source === "plus" && Number(row.singleId) === Number(profileWithPlus.id));
      if (!ticket) {
        plusMissingTicket += 1;
        increment(suppressions, "plus_missing_ticket");
        continue;
      }
      if (ticket.attendanceConfirmedAt) {
        rsvpAlreadyConfirmed += 1;
        increment(suppressions, "plus_rsvp_already_confirmed");
        continue;
      }
      candidates.push({ ...base, segment: "plus", plusTicket: ticket });
      continue;
    }
    if (activeDatabaseProfile) {
      if (!base.questionnaireToken) {
        increment(suppressions, "database_missing_verification_token");
        continue;
      }
      if (tickets.length) {
        increment(suppressions, "ticket_already_held");
        continue;
      }
      candidates.push({ ...base, segment: "database", plusTicket: null });
      continue;
    }
    if (paidDatabase) {
      increment(suppressions, "paid_database_not_cold");
      continue;
    }
    candidates.push({ ...base, segment: "cold", plusTicket: null });
  }

  // A phone belongs to one campaign recipient at most. Segment priority prevents a
  // paid member being displaced by an older cold CRM record sharing that phone.
  const phoneWinners = new Map<string, LiveLaunchMember>();
  const memberCandidates = candidates.sort(stableMemberOrder);
  for (const member of memberCandidates) {
    if (!member.phone) continue;
    if (!phoneWinners.has(member.phone)) phoneWinners.set(member.phone, member);
  }
  const members = memberCandidates.filter(member => {
    if (!member.phone || phoneWinners.get(member.phone) === member) return true;
    increment(suppressions, "duplicate_canonical_phone");
    return false;
  });
  return { members, suppressions, plusMissingTicket, rsvpAlreadyConfirmed };
}

/** Read-only source query. Results remain in-process and are never logged. */
export async function readLiveLaunchRawAudience(now = Date.now(), dbOverride?: any): Promise<LiveLaunchRawAudience> {
  const db = dbOverride || await getDb();
  if (!db) throw new Error("Database unavailable");
  const recentEmailAt = now - EMAIL_REST_WINDOW;
  const recentClickAt = now - SMS_INTENT_CLICK_WINDOW;
  const recentCheckoutAt = now - SMS_INTENT_CHECKOUT_WINDOW;
  const [profiles, crm, plus, tickets, completedPayments, paymentLeads, activity] = await Promise.all([
    db.execute(sql`SELECT id, email, phone, firstName, isActive, isSeed, boostExcluded, isPaid, consentEmailMarketing, isCoachingClient, questionnaireToken, questionnaireCompletedAt, createdAt FROM singles`),
    db.execute(sql`SELECT id, email, phone, name, status, emailUnsubscribed, createdAt FROM crm_leads`),
    db.execute(sql`SELECT single_id AS singleId, status, billing_status AS billingStatus, billing_cycle_ends_at AS billingCycleEndsAt FROM plus_pilot_members`),
    db.execute(sql`SELECT id, event_slug AS eventSlug, email, voucher_code AS voucherCode, issued_at AS issuedAt, revoked_at AS revokedAt, source, single_id AS singleId, attendance_confirmed_at AS attendanceConfirmedAt FROM live_october_tickets WHERE event_slug = ${LIVE_OCTOBER_SLUG}`),
    db.execute(sql`SELECT email, product FROM completed_payments`),
    db.execute(sql`SELECT email, product, confirmed_at AS confirmedAt, created_at AS createdAt FROM payment_leads WHERE created_at >= ${recentCheckoutAt} OR confirmed_at IS NULL`),
    db.execute(sql`SELECT recipientEmail AS email, journeyKey, status, sentAt, clickedAt FROM email_log WHERE sentAt >= ${recentEmailAt} OR clickedAt >= ${recentClickAt} OR journeyKey LIKE 'live_launch26_%'`),
  ]);
  return {
    profiles: asRows<RawProfile>(profiles), crm: asRows<RawCrm>(crm), plus: asRows<RawPlus>(plus),
    tickets: asRows<LiveTicket>(tickets), completedPayments: asRows<RawPayment>(completedPayments),
    paymentLeads: asRows<RawPaymentLead>(paymentLeads), activity: asRows<RawActivity>(activity),
  };
}

function liveLaunchUuid(scope: string, values: string[]): string {
  const bytes = crypto.createHash("sha256").update(`${LIVE_LAUNCH_CAMPAIGN}:${scope}:${values.sort().join(",")}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** UTF-16 transport segments: 70/67 for Unicode. Vibrate's billing unit is 256 UTF-16 code units. */
export function smsUnitReport(message: string) {
  const utf16Units = Array.from(message).reduce((total, char) => total + char.length, 0);
  return {
    utf16Units,
    providerUnits256: Math.max(1, Math.ceil(utf16Units / 256)),
    unicodeTransportParts: Math.max(1, Math.ceil(utf16Units / (utf16Units <= 70 ? 70 : 67))),
  };
}

export async function readBrevoBlockedRecipientSet(fetcher: typeof fetch = fetch): Promise<Set<string>> {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("Brevo blocklist configuration unavailable");
  const blocked = new Set<string>();
  for (let offset = 0; offset < 100_000; offset += 100) {
    const response = await fetcher(`https://api.brevo.com/v3/smtp/blockedContacts?limit=100&offset=${offset}`, {
      headers: { "api-key": key, Accept: "application/json" }, signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Brevo blocklist read failed (${response.status})`);
    const data = await response.json() as { contacts?: Array<{ email?: string }>; count?: number };
    if (!Array.isArray(data.contacts)) throw new Error("Brevo blocklist response unavailable");
    for (const contact of data.contacts) {
      const address = canonicalEmail(contact.email);
      if (address) blocked.add(address);
    }
    if (data.contacts.length < 100 || (typeof data.count === "number" && offset + data.contacts.length >= data.count)) return blocked;
  }
  throw new Error("Brevo blocklist pagination limit reached");
}

async function loadAuditedAudience(options: LiveLaunchOptions, dependencies: LiveLaunchDependencies, now: number) {
  const raw = dependencies.readRawAudience ? await dependencies.readRawAudience(now) : await readLiveLaunchRawAudience(now, await (dependencies.getDb || getDb)());
  const classified = classifyLiveLaunchAudience(raw, now);
  const suppressions = { ...classified.suppressions };
  const localBlocked = dependencies.isPermanentlyBlockedEmail || isPermanentlyBlockedEmail;
  const shouldVerifyBrevo = Boolean(options.verifyBrevoSmtpBlacklist);
  const blockedSet = shouldVerifyBrevo && !dependencies.brevoSmtpBlocked ? await readBrevoBlockedRecipientSet() : null;
  const checkBrevo = dependencies.brevoSmtpBlocked || (async (email: string) => blockedSet?.has(canonicalEmail(email) || "") ?? "unknown");
  const deliverable: LiveLaunchMember[] = [];
  for (const member of classified.members) {
    if (localBlocked(member.email)) { increment(suppressions, "local_email_blacklist"); continue; }
    if (shouldVerifyBrevo) {
      const blocked = await checkBrevo(member.email);
      if (blocked === true) { increment(suppressions, "brevo_smtp_blocked"); continue; }
      if (blocked === "unknown") { increment(suppressions, "brevo_smtp_unverified"); continue; }
    }
    deliverable.push(member);
  }
  const smsChannel = Boolean(options.deliveryPhase?.startsWith("sms"));
  const campaignLogged = new Set(raw.activity.filter(row => {
    const journey = String(row.journeyKey || "").toLowerCase();
    return journey.startsWith("live_launch26_")
      && (smsChannel ? journey.includes("sms") : !journey.includes("sms"))
      && ["sent", "processing", "failed"].includes(String(row.status || ""));
  }).map(row => canonicalEmail(row.email)).filter((v): v is string => Boolean(v)));
  const fresh = deliverable.filter(member => {
    if (!campaignLogged.has(canonicalEmail(member.email) || "")) return true;
    increment(suppressions, "already_logged_for_campaign");
    return false;
  });
  const allowed = new Set(options.allowedSegments || ["cold", "database", "plus"]);
  if (smsChannel) { allowed.clear(); allowed.add("cold"); }
  // The approved live waves are new/unpaid cold leads plus (email-only) Plus.
  // Preserve database behavior only for legacy callers with no named phase.
  if (options.deliveryPhase && !smsChannel) allowed.delete("database");
  return { members: fresh.filter(member => allowed.has(member.segment)).sort(stableMemberOrder), suppressions, plusMissingTicket: classified.plusMissingTicket, rsvpAlreadyConfirmed: classified.rsvpAlreadyConfirmed };
}

/** Returns contacts only to a server-side caller. Never serialize this result to an admin/browser response. */
export async function loadLiveLaunchAudience(options: LiveLaunchOptions = {}, dependencies: LiveLaunchDependencies = {}) {
  return loadAuditedAudience({ ...options, dryRun: true }, dependencies, options.now ?? Date.now());
}

function audienceDigest(members: LiveLaunchMember[]) {
  return crypto.createHash("sha256").update(members.map(member => `${member.segment}:${member.email}`).sort().join("\n")).digest("hex");
}

function isSmsPhase(phase: LiveLaunchDeliveryPhase | undefined) {
  return Boolean(phase?.startsWith("sms"));
}

function boundedPreviewMembers(members: LiveLaunchMember[], options: LiveLaunchOptions) {
  const caps: CountBySegment = {
    cold: options.limits?.cold ?? Infinity,
    database: options.limits?.database ?? Infinity,
    plus: options.limits?.plus ?? Infinity,
  };
  return members.filter(member => {
    if (caps[member.segment] <= 0) return false;
    caps[member.segment] -= 1;
    return true;
  });
}

function stableSmsOrder(phase: LiveLaunchDeliveryPhase | undefined, a: LiveLaunchMember, b: LiveLaunchMember) {
  const hash = (member: LiveLaunchMember) => crypto.createHash("sha256")
    .update(`${LIVE_LAUNCH_CAMPAIGN}:${phase || "legacy"}:${canonicalEmail(member.email) || member.email}`).digest("hex");
  return a.smsIntentPriority - b.smsIntentPriority || hash(a).localeCompare(hash(b));
}

function smsCandidates(members: LiveLaunchMember[], phase: LiveLaunchDeliveryPhase | undefined) {
  return members.filter(member => member.segment === "cold" && Boolean(member.phone) && member.smsIntent
    && !member.smsPreviouslySent && !member.smsBlockedByPaidPhone).sort((a, b) => stableSmsOrder(phase, a, b));
}

function waveContentFor(options: LiveLaunchOptions, member: LiveLaunchMember): LiveLaunchWaveContent | undefined {
  const value = typeof options.waveContent === "function" ? options.waveContent(member) : options.waveContent;
  if (value !== undefined && !WAVE_CONTENT.has(value)) throw new Error("Unknown live-launch wave content label");
  return value;
}

function setWaveContent(rawUrl: string, content: LiveLaunchWaveContent): string {
  const htmlEscaped = rawUrl.includes("&amp;");
  const decoded = htmlEscaped ? rawUrl.replace(/&amp;/g, "&") : rawUrl;
  let parsed: URL;
  try { parsed = new URL(decoded); } catch { return rawUrl; }
  if (parsed.origin !== "https://hilitcaspi.com" || ["/unsubscribe", "/u"].includes(parsed.pathname) || parsed.pathname.startsWith("/api/email/")) return rawUrl;
  const hashAt = decoded.indexOf("#");
  const beforeHash = hashAt < 0 ? decoded : decoded.slice(0, hashAt);
  const hash = hashAt < 0 ? "" : decoded.slice(hashAt);
  const questionAt = beforeHash.indexOf("?");
  const path = questionAt < 0 ? beforeHash : beforeHash.slice(0, questionAt);
  const query = questionAt < 0 ? [] : beforeHash.slice(questionAt + 1).split("&").filter(part => !part.startsWith("utm_content="));
  query.push(`utm_content=${encodeURIComponent(content)}`);
  const output = `${path}?${query.join("&")}${hash}`;
  return htmlEscaped ? output.replace(/&/g, "&amp;") : output;
}

function addWaveContent(draft: { subject: string; htmlContent: string; textContent: string; preheader: string }, content: LiveLaunchWaveContent | undefined) {
  if (!content) return draft;
  const htmlContent = draft.htmlContent.replace(/href="([^"]+)"/gi, (_match, url) => `href="${setWaveContent(url, content)}"`);
  const textContent = draft.textContent.replace(/https:\/\/hilitcaspi\.com[^\s<>'"]+/g, url => setWaveContent(url, content));
  return { ...draft, htmlContent, textContent };
}

export function liveLaunchRecipientHash(member: Pick<LiveLaunchMember, "segment" | "email">) {
  return crypto.createHash("sha256").update(`${LIVE_LAUNCH_CAMPAIGN}:${member.segment}:${canonicalEmail(member.email)}`).digest("hex");
}

/** Safe owner-review payload: counts, policy and a non-reversible audience fingerprint only. */
export async function readLiveLaunchDryRun(options: LiveLaunchOptions = {}, dependencies: LiveLaunchDependencies = {}): Promise<LiveLaunchDryRun & { audienceDigest: string; recipientHashes: string[] }> {
  const now = options.now ?? Date.now();
  const audience = await loadAuditedAudience({ ...options, dryRun: true }, dependencies, now);
  const previewMembers = boundedPreviewMembers(audience.members, options);
  const counts = emptySegmentCounts();
  for (const member of previewMembers) counts[member.segment] += 1;
  const intent = smsCandidates(previewMembers, options.deliveryPhase);
  const intentBySegment = emptySegmentCounts();
  for (const member of intent) intentBySegment[member.segment] += 1;
  const consented: LiveLaunchMember[] = [];
  if (options.smsConsent) for (const member of intent) {
    const decision = await options.smsConsent(member);
    if (decision.permitted) consented.push(member);
  }
  const smsDrafts = options.buildSms ? consented.slice(0, Math.min(options.limits?.smsTotal ?? LIVE_LAUNCH_SMS_DEFAULT_CAP, LIVE_LAUNCH_SMS_DEFAULT_CAP))
    .map(member => options.buildSms!({ audience: member.segment, firstName: member.firstName, unsubscribeUrl: "https://hilitcaspi.com/u" }).message) : [];
  const units = smsDrafts.reduce((total, message) => total + smsUnitReport(message).providerUnits256, 0);
  const parts = smsDrafts.reduce((total, message) => total + smsUnitReport(message).unicodeTransportParts, 0);
  return {
    campaign: LIVE_LAUNCH_CAMPAIGN, readOnly: true,
    event: { dateTime: "2026-10-31T20:30:00+02:00", timezone: "Asia/Jerusalem" },
    email: { ...counts, total: counts.cold + counts.database + counts.plus },
    sms: { verifiedHighIntentBeforeConsent: intent.length, verifiedHighIntentBySegment: intentBySegment, approvedByExplicitSmsConsent: consented.length, cappedAt: Math.min(consented.length, options.limits?.smsTotal ?? LIVE_LAUNCH_SMS_DEFAULT_CAP, LIVE_LAUNCH_SMS_DEFAULT_CAP), providerUnits256IfDrafted: units, unicodeTransportPartsIfDrafted: parts, disabledWithoutDraftCallback: !options.buildSms },
    plus: { activeMissingTicket: audience.plusMissingTicket, rsvpAlreadyConfirmed: audience.rsvpAlreadyConfirmed },
    suppressions: audience.suppressions,
    policyProvenance: {
      email: "Profiles require consentEmailMarketing=true; legacy CRM-only contacts follow the existing policy of emailUnsubscribed=false. Any duplicate CRM opt-out, closed/inactive profile, seed, owner-test/boostExcluded anchor, coaching/not_relevant status, local blacklist and recent marketing email suppresses delivery.",
      sms: "The schema has no first-party SMS-consent field. SMS stays disabled unless the caller supplies an explicit, auditable subscriber-rights decision; then it additionally requires verified high purchase intent, a canonical unique phone and no prior campaign SMS.",
      segmentation: "Segments are disjoint: active Plus with an existing non-revoked real ticket and no RSVP confirmation; then paid active database members with a questionnaire verification token and no ticket; then unpaid cold CRM/profile leads. Boost exclusion is a test/owner safeguard, never a marketing-consent signal.",
    },
    audienceDigest: audienceDigest(previewMembers),
    recipientHashes: previewMembers.map(liveLaunchRecipientHash),
  };
}

function memberOfferUrl(member: LiveLaunchMember): string | undefined {
  if (member.segment !== "database" || !member.questionnaireToken) return undefined;
  const params = new URLSearchParams({ coupon: "FRIENDS", email: member.email, token: member.questionnaireToken, utm_source: "newsletter", utm_medium: "email", utm_campaign: "live_oct2026", utm_content: "launch_database_members" });
  return `https://hilitcaspi.com/live?${params.toString()}#tickets`;
}

function rsvpUrl(ticket: LiveTicket, tokenFactory: typeof liveQuestionToken): string {
  const questionToken = tokenFactory(ticket as Parameters<typeof liveQuestionToken>[0]);
  return `https://hilitcaspi.com/live/question?utm_source=newsletter&utm_medium=email&utm_campaign=live_oct2026&utm_content=plus_rsvp#q=${encodeURIComponent(questionToken)}&rsvp=1`;
}

function trackedHtml(html: string, logId: number) {
  const base = "https://hilitcaspi.com";
  const pixel = `<img src="${base}/api/email/open/${logId}" width="1" height="1" alt="" style="display:none;border:0" />`;
  return html.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*?)>/gi, (match, before, url, after) => {
    if (url.includes("/unsubscribe") || url.includes("/api/email/") || url.startsWith("mailto:") || url.startsWith("tel:")) return match;
    return `<a ${before}href="${base}/api/email/click/${logId}?url=${encodeURIComponent(url)}"${after}>`;
  }).replace("</body>", `${pixel}</body>`);
}

function withinExecutionWindow(now: number, expiresAt: number | undefined, phase: LiveLaunchDeliveryPhase | undefined) {
  const [notBefore, endsAt] = phase ? DELIVERY_PHASE_WINDOWS[phase] : [LIVE_LAUNCH_SEND_NOT_BEFORE, LIVE_LAUNCH_SEND_EXPIRES_AT];
  return now >= notBefore && (phase ? now < endsAt : now <= endsAt)
    && Boolean(expiresAt && expiresAt >= now && expiresAt <= LIVE_LAUNCH_SEND_EXPIRES_AT);
}

function selectedPreviewMembers(members: LiveLaunchMember[], options: LiveLaunchOptions) {
  if (!isSmsPhase(options.deliveryPhase)) return boundedPreviewMembers(members, options);
  const cap = Math.min(options.limits?.cold ?? Infinity, options.limits?.smsTotal ?? LIVE_LAUNCH_SMS_DEFAULT_CAP, LIVE_LAUNCH_SMS_DEFAULT_CAP);
  return smsCandidates(members, options.deliveryPhase).slice(0, cap);
}

function selectedExecutionMembers(members: LiveLaunchMember[], options: LiveLaunchOptions, approvedHashes: Set<string> | null) {
  const caps: CountBySegment = {
    cold: Math.min(options.limits?.cold ?? Infinity, options.frozen!.email.cold),
    database: Math.min(options.limits?.database ?? Infinity, options.frozen!.email.database),
    plus: Math.min(options.limits?.plus ?? Infinity, options.frozen!.email.plus),
  };
  const source = isSmsPhase(options.deliveryPhase) ? smsCandidates(members, options.deliveryPhase) : members;
  const result: LiveLaunchMember[] = [];
  for (const member of source) {
    if (approvedHashes && !approvedHashes.has(liveLaunchRecipientHash(member))) continue;
    if (caps[member.segment] <= 0) continue;
    caps[member.segment] -= 1;
    result.push(member);
  }
  if (!isSmsPhase(options.deliveryPhase)) return result;
  const cap = Math.min(options.limits?.smsTotal ?? LIVE_LAUNCH_SMS_DEFAULT_CAP, options.frozen!.smsTotal ?? LIVE_LAUNCH_SMS_DEFAULT_CAP, LIVE_LAUNCH_SMS_DEFAULT_CAP);
  return result.slice(0, cap);
}

/**
 * Executes only after an owner has displayed/reviewed a dry-run payload and passes
 * execute:true, dryRun:false, its frozen counts/digest and an expiry tonight. No retry
 * path exists: an ambiguous provider call remains review-required in email_log.
 */
export async function runLiveLaunchCampaign(options: LiveLaunchOptions = {}, dependencies: LiveLaunchDependencies = {}) {
  const dryRun = options.dryRun ?? true;
  if (dryRun || !options.execute) return readLiveLaunchDryRun({ ...options, dryRun: true }, dependencies);
  const now = options.now ?? Date.now();
  if (!withinExecutionWindow(now, options.expiresAt, options.deliveryPhase)) throw new Error("Live launch execution is allowed only in its approved Jerusalem phase window until the supplied same-night expiry");
  if (!options.frozen) throw new Error("A displayed frozen dry-run payload is required before execution");
  const review = await readLiveLaunchDryRun({ ...options, dryRun: true, verifyBrevoSmtpBlacklist: true }, dependencies);
  const approvedHashes = options.frozen.recipientHashes ? new Set(options.frozen.recipientHashes) : null;
  if (!approvedHashes) {
    for (const segment of ["cold", "database", "plus"] as const) if (review.email[segment] !== options.frozen.email[segment]) throw new Error("Audience counts changed since review; display a new dry run");
    if (!options.frozen.audienceDigest || review.audienceDigest !== options.frozen.audienceDigest) throw new Error("Audience composition changed since review; display a new dry run");
  }

  const audience = await loadAuditedAudience({ ...options, dryRun: true, verifyBrevoSmtpBlacklist: true }, dependencies, now);
  const selected = selectedExecutionMembers(audience.members, options, approvedHashes);
  const db = await (dependencies.getDb || getDb)();
  if (!db) throw new Error("Database unavailable");
  const runKey = options.deliveryPhase ? `${LIVE_LAUNCH_CAMPAIGN}:${options.deliveryPhase}` : LIVE_LAUNCH_CAMPAIGN;
  const claim = await db.execute(sql`INSERT IGNORE INTO lifecycle_run_claims (run_key, status, started_at, result_json) VALUES (${runKey}, 'running', ${now}, ${JSON.stringify({ state: "review_required_if_interrupted", phase: options.deliveryPhase || "legacy", approvedDigest: options.frozen.audienceDigest || null })})`);
  const claimResult = Array.isArray(claim) ? claim[0] : claim;
  if (Number((claimResult as any)?.affectedRows || 0) !== 1) throw new Error("Campaign already claimed; inspect provider results before any further action");
  const send = dependencies.sendEmailBatch || sendEmailBatch;
  const signedUnsubscribe = dependencies.buildSignedUnsubscribeUrl || buildSignedUnsubscribeUrl;
  const draftBuilder = dependencies.buildLiveLaunchEmailDraft || buildLiveLaunchEmailDraft;
  const tokenFactory = dependencies.liveQuestionToken || liveQuestionToken;
  const result = { review, email: { sent: 0, suppressed: audience.members.length - selected.length, reviewRequired: 0 }, sms: { accepted: 0, selected: 0, providerUnits256: 0, reviewRequired: 0 } };

  // A named phase sends exactly one channel. The absent legacy phase preserves the
  // original combined execution for previously reviewed callers.
  if (!isSmsPhase(options.deliveryPhase)) {
    for (const segment of ["plus", "database", "cold"] as const) {
      const segmentMembers = selected.filter(member => member.segment === segment);
      for (let offset = 0; offset < segmentMembers.length; offset += 100) {
        const batch = segmentMembers.slice(offset, offset + 100);
        const records: Array<{ member: LiveLaunchMember; id: number; html: string; text: string; subject: string; waveContent?: LiveLaunchWaveContent }> = [];
        const emailLog = (await import("../drizzle/schema")).emailLog;
        for (const member of batch) {
          const unsubscribeUrl = signedUnsubscribe({ email: member.email, ...(member.leadId ? { leadId: member.leadId } : {}), ...(member.singleId ? { singleId: member.singleId } : {}) });
          const waveContent = waveContentFor(options, member);
          const draft = addWaveContent(draftBuilder({ audience: segment as EmailAudience, firstName: member.firstName, unsubscribeUrl,
            ...(segment === "plus" && member.plusTicket ? { rsvpUrl: rsvpUrl(member.plusTicket, tokenFactory) } : {}),
            ...(segment === "database" ? { memberOfferUrl: options.buildMemberOfferUrl?.(member) || memberOfferUrl(member) } : {}),
          }), waveContent);
          records.push({ member, id: 0, html: draft.htmlContent, text: draft.textContent, subject: draft.subject, waveContent });
        }
        await db.insert(emailLog).values(records.map(record => ({
          leadId: record.member.leadId, recipientEmail: record.member.email, recipientName: record.member.firstName || null,
          journeyKey: JOURNEY[segment], emailIndex: 1, subject: record.subject, htmlBody: record.html, textBody: record.text,
          scheduledAt: now, sentAt: null, status: "processing" as const,
          errorMessage: JSON.stringify({ campaign: LIVE_LAUNCH_CAMPAIGN, phase: options.deliveryPhase || "legacy", utmContent: record.waveContent || null, state: "inflight_review_if_uncertain" }), createdAt: now,
        })));
        const claimedRows = asRows<{ id: number; recipientEmail: string }>(await db.execute(sql`SELECT id, recipientEmail FROM email_log WHERE journeyKey = ${JOURNEY[segment]} AND status = 'processing' AND recipientEmail IN (${sql.join(batch.map(member => sql`${member.email}`), sql`, `)})`));
        const idsByEmail = new Map(claimedRows.map(row => [row.recipientEmail, Number(row.id)]));
        for (const record of records) {
          record.id = idsByEmail.get(record.member.email) || 0;
          if (!record.id) throw new Error("Unable to claim campaign email log row");
          record.html = trackedHtml(record.html, record.id);
        }
        await db.execute(sql`UPDATE email_log SET htmlBody = CASE id ${sql.join(records.map(record => sql`WHEN ${record.id} THEN ${record.html}`), sql` `)} END WHERE id IN (${sql.join(records.map(record => sql`${record.id}`), sql`, `)})`);
        const delivery = await send({ subject: records[0]?.subject || "", textContent: records[0]?.text, versions: records.map(record => ({ to: [{ email: record.member.email, name: record.member.firstName || undefined }], htmlContent: record.html, textContent: record.text })), idempotencyKey: liveLaunchUuid(`email:${segment}:${options.deliveryPhase || "legacy"}`, records.map(record => record.member.email)) });
        if (!delivery.success) {
          await db.update((await import("../drizzle/schema")).emailLog).set({ status: "failed", errorMessage: sql`JSON_SET(COALESCE(errorMessage, '{}'), '$.state', 'review_required_provider_result_uncertain')` }).where(sql`journeyKey = ${JOURNEY[segment]} AND status = 'processing' AND sentAt IS NULL`);
          result.email.reviewRequired += records.length;
          continue;
        }
        const ids = records.map(record => record.id);
        await db.update((await import("../drizzle/schema")).emailLog).set({ status: "sent", sentAt: Date.now(), errorMessage: sql`JSON_SET(COALESCE(errorMessage, '{}'), '$.state', ${delivery.duplicate ? "provider_idempotent_duplicate" : "provider_accepted"})` }).where(sql`id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
        result.email.sent += records.length;
      }
    }
  }

  if (isSmsPhase(options.deliveryPhase) || !options.deliveryPhase) {
    // SMS remains opt-in/copy-less, and a phase is defensively cold-only even if a
    // caller accidentally asks for database or Plus segments.
    const cap = Math.min(options.limits?.smsTotal ?? LIVE_LAUNCH_SMS_DEFAULT_CAP, options.frozen.smsTotal ?? LIVE_LAUNCH_SMS_DEFAULT_CAP, LIVE_LAUNCH_SMS_DEFAULT_CAP);
    const sms = [] as Array<{ member: LiveLaunchMember; message: string }>;
    const seenPhones = new Set<string>();
    for (const member of (isSmsPhase(options.deliveryPhase) ? selected : smsCandidates(selected, options.deliveryPhase))) {
      if (!member.phone || member.segment !== "cold" || !member.smsIntent || member.smsPreviouslySent || member.smsBlockedByPaidPhone || seenPhones.has(member.phone) || sms.length >= cap) continue;
      if (!options.smsConsent || !options.buildSms) continue;
      const consent = await options.smsConsent(member);
      if (!consent.permitted) continue;
      seenPhones.add(member.phone);
      sms.push({ member, message: options.buildSms({ audience: member.segment, firstName: member.firstName, unsubscribeUrl: "https://hilitcaspi.com/u" }).message });
    }
    if (sms.length) {
      const credits = sms.reduce((total, row) => total + smsUnitReport(row.message).providerUnits256, 0);
      const balance = await (dependencies.getVibrateSmsBalance || getVibrateSmsBalance)();
      if (balance === null || balance < credits) throw new Error("Unable to verify sufficient Vibrate SMS units");
      const emailLog = (await import("../drizzle/schema")).emailLog;
      const smsContent = Array.from(new Set(sms.map(row => waveContentFor(options, row.member) || null)));
      await db.insert(emailLog).values(sms.map(row => ({
        leadId: row.member.leadId, recipientEmail: row.member.email, recipientName: null,
        journeyKey: SMS_JOURNEY.cold, emailIndex: 1, subject: "SMS campaign delivery", htmlBody: "", textBody: null,
        scheduledAt: now, sentAt: null, status: "processing" as const,
        errorMessage: JSON.stringify({ campaign: LIVE_LAUNCH_CAMPAIGN, phase: options.deliveryPhase || "legacy", utmContent: waveContentFor(options, row.member) || null, state: "inflight_review_if_uncertain" }), createdAt: now,
      })));
      const phaseCampaignId = `${LIVE_LAUNCH_CAMPAIGN}:${options.deliveryPhase || "legacy"}`;
      const delivered = await (dependencies.sendSMSBulkDetailed || sendSMSBulkDetailed)({ messages: sms.map(row => ({ phone: row.member.phone!, message: row.message })), idempotencyKey: liveLaunchUuid(`sms:${options.deliveryPhase || "legacy"}`, sms.map(row => row.member.phone!)), campaignId: phaseCampaignId });
      if (!delivered.accepted) {
        await db.update(emailLog).set({ status: "failed", errorMessage: sql`JSON_SET(COALESCE(errorMessage, '{}'), '$.state', 'review_required_provider_result_uncertain')` }).where(sql`journeyKey = ${SMS_JOURNEY.cold} AND status = 'processing' AND sentAt IS NULL`);
        result.sms = { accepted: 0, selected: sms.length, providerUnits256: credits, reviewRequired: sms.length };
      } else {
        await db.update(emailLog).set({ status: "sent", sentAt: Date.now(), errorMessage: sql`JSON_SET(COALESCE(errorMessage, '{}'), '$.state', 'provider_accepted', '$.providerRunId', ${delivered.providerRunId})` }).where(sql`journeyKey = ${SMS_JOURNEY.cold} AND status = 'processing' AND sentAt IS NULL`);
        result.sms = { accepted: sms.length, selected: sms.length, providerUnits256: credits, reviewRequired: 0 };
      }
    }
  }
  await db.execute(sql`UPDATE lifecycle_run_claims SET status = 'completed', completed_at = ${Date.now()}, result_json = ${JSON.stringify({ email: result.email, sms: result.sms })} WHERE run_key = ${runKey}`);
  return result;
}
