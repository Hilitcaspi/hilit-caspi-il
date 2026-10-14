import crypto from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { emailLog } from "../drizzle/schema";
import { OCT14_CAMPAIGN } from "../shared/october14CampaignLinks";
import { isPermanentlyBlockedEmail, sendEmailBatch } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl } from "./emailUnsubscribe";
import {
  canonicalEmail,
  canonicalPhone,
  classifyLiveLaunchAudience,
  readBrevoBlockedRecipientSet,
  type LiveLaunchMember,
  type LiveLaunchRawAudience,
} from "./liveLaunchCampaign";
import { buildOctober14Newsletter } from "./october14Newsletter";
import { buildOctober14SmsDraft } from "./october14SmsDraft";
import { getVibrateSmsBalance, sendSMSBulkDetailed } from "./vibrate";

/**
 * One direct, owner-approved campaign for the evening of 14 October 2026.
 * It is intentionally not attached to the expired 8 October live-launch runner.
 */
export const OCTOBER14_CAMPAIGN = OCT14_CAMPAIGN;
export const OCTOBER14_SEND_NOT_BEFORE = Date.parse("2026-10-14T19:44:00+03:00");
export const OCTOBER14_SEND_EXPIRES_AT = Date.parse("2026-10-14T22:00:00+03:00");
export const OCTOBER14_SMS_CAP = 200;
/** Owner requested a copy revision: public SMS execution is paused until the new copy is approved. */
export const OCTOBER14_SMS_COPY_APPROVED = false;

export type October14Channel = "email" | "sms" | "all";
type ExecuteChannel = Exclude<October14Channel, "all">;
type Cohort = "databaseWarm" | "plusMembers";
type LogState = "processing" | "sent" | "failed";

type ExtendedPlus = LiveLaunchRawAudience["plus"][number] & {
  activatedAt?: number | null;
  lastPaymentAt?: number | null;
};

/** The narrow source shape is injectable so tests never need a database. */
export type October14RawAudience = Omit<LiveLaunchRawAudience, "plus"> & {
  plus: ExtendedPlus[];
};

/** PRIVATE: never serialize these members or `frozen` to an admin/browser response. */
export type October14Member = {
  email: string;
  canonicalEmail: string;
  phone: string | null;
  firstName: string;
  leadId: number | null;
  singleId: number | null;
  cohort: Cohort;
  smsIntent: boolean;
  smsPreviouslySent: boolean;
  smsBlockedByPaidPhone: boolean;
};

export type October14FrozenAudience = {
  /** Private, canonical-recipient hashes. Email cohorts and SMS are deliberately independent. */
  email: { databaseWarm: string[]; plusMembers: string[] };
  sms: string[];
};

export type October14SafeSummary = {
  campaign: typeof OCTOBER14_CAMPAIGN;
  readOnly: true;
  channel: October14Channel;
  databaseWarm: number;
  plusMembers: number;
  smsMembers: number;
  suppressed: number;
  suppressions: Record<string, number>;
  sms: {
    approvedByOwner: boolean;
    cap: typeof OCTOBER14_SMS_CAP;
    policy: string;
  };
};

export type October14PreparedAudience = {
  /** PRIVATE server-only data; never log or return it from a router. */
  members: {
    databaseWarm: October14Member[];
    plusMembers: October14Member[];
    smsMembers: October14Member[];
  };
  /** PRIVATE server-only hashes to hand verbatim into the execution call. */
  frozen: October14FrozenAudience;
  /** Safe to print: aggregate counts and reason counts only. */
  summary: October14SafeSummary;
};

export type October14PrepareOptions = {
  now?: number;
  /** Default is email. Use all only for a single owner review of independent channel freezes. */
  channel?: October14Channel;
  /** Campaign-level owner approval; false by default and never invents individual SMS consent. */
  smsApproved?: boolean;
};

export type October14RunOptions = October14PrepareOptions & {
  dryRun?: boolean;
  execute?: boolean;
  approvalConfirmed?: boolean;
  /** Must be tonight, no later than 22:00 Asia/Jerusalem. */
  expiresAt?: number;
  /** The private hash set returned by an owner-reviewed prepare call. */
  frozen?: October14FrozenAudience;
};

export type October14CampaignDependencies = {
  getDb?: typeof getDb;
  readRawAudience?: (now: number) => Promise<October14RawAudience>;
  readBrevoBlockedRecipientSet?: () => Promise<Set<string>>;
  isPermanentlyBlockedEmail?: (email: string) => boolean;
  sendEmailBatch?: typeof sendEmailBatch;
  sendSMSBulkDetailed?: typeof sendSMSBulkDetailed;
  getVibrateSmsBalance?: typeof getVibrateSmsBalance;
  buildSignedUnsubscribeUrl?: typeof buildSignedUnsubscribeUrl;
  buildOctober14Newsletter?: typeof buildOctober14Newsletter;
  buildOctober14SmsDraft?: typeof buildOctober14SmsDraft;
};

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return Array.isArray(result) ? result as T[] : [];
}

function increment(target: Record<string, number>, key: string, amount = 1) {
  target[key] = (target[key] || 0) + amount;
}

function stableMemberOrder(a: October14Member, b: October14Member) {
  return a.cohort.localeCompare(b.cohort) || a.canonicalEmail.localeCompare(b.canonicalEmail)
    || (a.singleId || Number.MAX_SAFE_INTEGER) - (b.singleId || Number.MAX_SAFE_INTEGER)
    || (a.leadId || Number.MAX_SAFE_INTEGER) - (b.leadId || Number.MAX_SAFE_INTEGER);
}

function stableSmsOrder(a: October14Member, b: October14Member) {
  const hash = (member: October14Member) => crypto.createHash("sha256")
    .update(`${OCTOBER14_CAMPAIGN}:sms:${member.canonicalEmail}`).digest("hex");
  return hash(a).localeCompare(hash(b));
}

function hasPreviousPlus(row: ExtendedPlus | undefined): boolean {
  if (!row) return false;
  // Waitlist/eligible/invited rows are not paid memberships. Preserve actual
  // prior membership/billing evidence even when a historical timestamp was lost.
  return Boolean(
    ["active", "churned", "cancelled"].includes(String(row.status || "").trim())
    || ["active", "past_due", "cancelled", "ended"].includes(String(row.billingStatus || "").trim())
    || Number(row.activatedAt || 0) > 0
    || Number(row.lastPaymentAt || 0) > 0,
  );
}

function ownJourney(channel: ExecuteChannel, cohort?: Cohort) {
  if (channel === "sms") return "oct14_database/sms";
  return cohort === "plusMembers" ? "oct14_plus/email" : "oct14_database/email";
}

function canonicalActivityEmail(value: unknown) {
  return canonicalEmail(value) || "";
}

/**
 * Keeps the ordinary seven-day rest intact. The old 8 October runner's exception is
 * neutralized before its pure classifier sees activity. SMS additionally exempts only
 * this campaign's paired email, so an approved SMS is not blocked by tonight's email.
 */
function activityForClassification(raw: October14RawAudience, channel: October14Channel) {
  return raw.activity.map(activity => {
    const original = String(activity.journeyKey || "");
    let journeyKey = original;
    if (journeyKey.toLowerCase().startsWith("live_launch26_")) {
      journeyKey = `archived_${journeyKey}`;
    }
    if (channel === "sms" && (original === "oct14_database/email" || original === "oct14_plus/email")) {
      // classifyLiveLaunchAudience only exempts this historical namespace. This is a
      // local input mapping, not a change to (or invocation of) the old runner.
      journeyKey = "live_launch26_oct14_paired_email_exempt";
    }
    return { ...activity, journeyKey };
  });
}

/**
 * Pure audience classification. It deliberately invokes the established classifier
 * with tickets=[]: this campaign is not a ticket dispatch and a previous ticket must
 * not hide an otherwise eligible paid-database member from this separate offer.
 */
export function classifyOctober14Audience(raw: October14RawAudience, now = Date.now(), channel: October14Channel = "email") {
  const classified = classifyLiveLaunchAudience({
    ...raw,
    tickets: [],
    activity: activityForClassification(raw, channel),
  } as LiveLaunchRawAudience, now);
  const previousPlusBySingleId = new Map<number, ExtendedPlus>();
  for (const row of raw.plus) previousPlusBySingleId.set(Number(row.singleId), row);

  const databaseWarm: October14Member[] = [];
  const plusMembers: October14Member[] = [];
  const suppressions = { ...classified.suppressions };
  for (const candidate of classified.members) {
    const canonical = canonicalEmail(candidate.email);
    if (!canonical) { increment(suppressions, "invalid_email"); continue; }
    const member: October14Member = {
      email: candidate.email,
      canonicalEmail: canonical,
      phone: canonicalPhone(candidate.phone),
      firstName: candidate.firstName,
      leadId: candidate.leadId,
      singleId: candidate.singleId,
      cohort: candidate.segment === "cold" ? "databaseWarm" : "plusMembers",
      smsIntent: candidate.smsIntent,
      smsPreviouslySent: candidate.smsPreviouslySent,
      smsBlockedByPaidPhone: candidate.smsBlockedByPaidPhone,
    };
    if (candidate.segment === "cold") {
      // Unpaid prospects only. The established classifier has already removed paid
      // database contacts and active Plus accounts from this group.
      if (candidate.smsIntent) databaseWarm.push(member);
      else increment(suppressions, "no_recent_verified_engagement");
    } else if (candidate.segment === "database") {
      // A Plus offer is only for active paid database members with no raw Plus history.
      if (hasPreviousPlus(previousPlusBySingleId.get(Number(candidate.singleId)))) {
        increment(suppressions, "previously_activated_or_billed_plus");
        continue;
      }
      plusMembers.push(member);
    }
    // Existing Plus is candidate.segment === plus and is intentionally never mailed/SMSed.
  }

  const unique = (members: October14Member[], reason: string) => {
    const seen = new Set<string>();
    return members.filter(member => {
      if (seen.has(member.canonicalEmail)) { increment(suppressions, reason); return false; }
      seen.add(member.canonicalEmail);
      return true;
    });
  };
  const warm = unique(databaseWarm, "duplicate_canonical_email");
  const plus = unique(plusMembers, "duplicate_canonical_email");
  const used = new Set(warm.map(member => member.canonicalEmail));
  const disjointPlus = plus.filter(member => {
    if (!used.has(member.canonicalEmail)) return true;
    increment(suppressions, "cross_cohort_duplicate");
    return false;
  });
  return { databaseWarm: warm.sort(stableMemberOrder), plusMembers: disjointPlus.sort(stableMemberOrder), suppressions };
}

/** Read-only production source. The full SMS history is intentionally not time-filtered. */
export async function readOctober14RawAudience(now = Date.now(), dbOverride?: any): Promise<October14RawAudience> {
  const db = dbOverride || await getDb();
  if (!db) throw new Error("Audience source unavailable");
  const emailRestAt = now - 7 * 24 * 60 * 60 * 1000;
  const clickIntentAt = now - 30 * 24 * 60 * 60 * 1000;
  const checkoutIntentAt = now - 30 * 24 * 60 * 60 * 1000;
  try {
    const [profiles, crm, plus, completedPayments, paymentLeads, activity] = await Promise.all([
      db.execute(sql`SELECT id, email, phone, firstName, isActive, isSeed, boostExcluded, isPaid, consentEmailMarketing, isCoachingClient, questionnaireToken, questionnaireCompletedAt, createdAt FROM singles`),
      db.execute(sql`SELECT id, email, phone, name, status, emailUnsubscribed, createdAt FROM crm_leads`),
      db.execute(sql`SELECT single_id AS singleId, status, billing_status AS billingStatus, billing_cycle_ends_at AS billingCycleEndsAt, activated_at AS activatedAt, last_payment_at AS lastPaymentAt FROM plus_pilot_members`),
      db.execute(sql`SELECT email, product FROM completed_payments`),
      db.execute(sql`SELECT email, product, confirmed_at AS confirmedAt, created_at AS createdAt FROM payment_leads WHERE created_at >= ${checkoutIntentAt} OR confirmed_at IS NULL`),
      // Older SMS rows must be included: absence from a short activity read is not
      // evidence that a phone has never received campaign SMS.
      db.execute(sql`SELECT recipientEmail AS email, journeyKey, status, sentAt, clickedAt FROM email_log WHERE sentAt >= ${emailRestAt} OR clickedAt >= ${clickIntentAt} OR LOWER(journeyKey) LIKE '%sms%' OR journeyKey LIKE 'live_launch26_%' OR journeyKey IN ('oct14_database/email', 'oct14_plus/email', 'oct14_database/sms')`),
    ]);
    return {
      profiles: asRows(profiles), crm: asRows(crm), plus: asRows<ExtendedPlus>(plus), tickets: [],
      completedPayments: asRows(completedPayments), paymentLeads: asRows(paymentLeads), activity: asRows(activity),
    } as October14RawAudience;
  } catch {
    throw new Error("Audience source unavailable");
  }
}

export function october14RecipientHash(member: Pick<October14Member, "canonicalEmail" | "cohort">, channel: ExecuteChannel) {
  return crypto.createHash("sha256")
    .update(`${OCTOBER14_CAMPAIGN}:${channel}:${member.cohort}:${member.canonicalEmail}`)
    .digest("hex");
}

function selectPriorCampaignLogs(raw: October14RawAudience, channel: ExecuteChannel, cohort?: Cohort) {
  const expected = ownJourney(channel, cohort);
  return new Set(raw.activity
    .filter(row => String(row.journeyKey || "") === expected
      && ["sent", "processing", "failed"].includes(String(row.status || "")))
    .map(row => canonicalActivityEmail(row.email)).filter(Boolean));
}

function smsEligible(members: October14Member[]) {
  const seenPhones = new Set<string>();
  return members.filter(member => {
    if (!member.phone || !member.smsIntent || member.smsPreviouslySent || member.smsBlockedByPaidPhone) return false;
    if (seenPhones.has(member.phone)) return false;
    seenPhones.add(member.phone);
    return true;
  }).sort(stableSmsOrder).slice(0, OCTOBER14_SMS_CAP);
}

async function filterEmailRecipients(
  members: October14Member[],
  raw: October14RawAudience,
  cohort: Cohort,
  dependencies: October14CampaignDependencies,
  suppressions: Record<string, number>,
) {
  const localBlocked = dependencies.isPermanentlyBlockedEmail || isPermanentlyBlockedEmail;
  let blocked: Set<string>;
  try {
    blocked = await (dependencies.readBrevoBlockedRecipientSet || readBrevoBlockedRecipientSet)();
  } catch {
    // Fail closed without exposing a provider error or recipient identity.
    for (const _member of members) increment(suppressions, "brevo_blocklist_unavailable");
    return [] as October14Member[];
  }
  const alreadyLogged = selectPriorCampaignLogs(raw, "email", cohort);
  return members.filter(member => {
    if (localBlocked(member.email)) { increment(suppressions, "local_email_blacklist"); return false; }
    if (blocked.has(member.canonicalEmail)) { increment(suppressions, "brevo_smtp_blocked"); return false; }
    if (alreadyLogged.has(member.canonicalEmail)) { increment(suppressions, "already_logged_for_campaign"); return false; }
    return true;
  });
}

/**
 * Returns private members/frozen hashes plus a PII-free aggregate summary. Calling it
 * does not claim, write, schedule, send, or otherwise contact anyone.
 */
export async function prepareOctober14Audience(
  options: October14PrepareOptions = {},
  dependencies: October14CampaignDependencies = {},
): Promise<October14PreparedAudience> {
  const now = options.now ?? Date.now();
  const channel = options.channel ?? "email";
  let raw: October14RawAudience;
  try {
    raw = dependencies.readRawAudience
      ? await dependencies.readRawAudience(now)
      : await readOctober14RawAudience(now, await (dependencies.getDb || getDb)());
  } catch {
    throw new Error("Audience source unavailable");
  }
  const suppressions: Record<string, number> = {};
  let databaseWarm: October14Member[] = [];
  let plusMembers: October14Member[] = [];
  let smsMembers: October14Member[] = [];

  if (channel === "email" || channel === "all") {
    const classified = classifyOctober14Audience(raw, now, "email");
    Object.entries(classified.suppressions).forEach(([key, count]) => increment(suppressions, key, count));
    databaseWarm = await filterEmailRecipients(classified.databaseWarm, raw, "databaseWarm", dependencies, suppressions);
    plusMembers = await filterEmailRecipients(classified.plusMembers, raw, "plusMembers", dependencies, suppressions);
  }
  if (channel === "sms" || channel === "all") {
    const classified = classifyOctober14Audience(raw, now, "sms");
    Object.entries(classified.suppressions).forEach(([key, count]) => increment(suppressions, key, count));
    if (options.smsApproved) {
      const logged = selectPriorCampaignLogs(raw, "sms");
      smsMembers = smsEligible(classified.databaseWarm).filter(member => {
        if (logged.has(member.canonicalEmail)) { increment(suppressions, "already_logged_for_campaign"); return false; }
        return true;
      });
    }
  }

  const suppressed = Object.values(suppressions).reduce((total, count) => total + count, 0);
  return {
    members: { databaseWarm, plusMembers, smsMembers },
    frozen: {
      email: {
        databaseWarm: databaseWarm.map(member => october14RecipientHash(member, "email")),
        plusMembers: plusMembers.map(member => october14RecipientHash(member, "email")),
      },
      sms: smsMembers.map(member => october14RecipientHash(member, "sms")),
    },
    summary: {
      campaign: OCTOBER14_CAMPAIGN, readOnly: true, channel,
      databaseWarm: databaseWarm.length, plusMembers: plusMembers.length, smsMembers: smsMembers.length,
      suppressed, suppressions,
      sms: {
        approvedByOwner: Boolean(options.smsApproved), cap: OCTOBER14_SMS_CAP,
        policy: "SMS requires explicit campaign approval plus existing CRM/profile marketing eligibility, verified purchase intent, a canonical unique phone, no paid-phone overlap and full-history prior-SMS suppression.",
      },
    },
  };
}

function deterministicUuid(scope: string, hashes: string[]) {
  const bytes = crypto.createHash("sha256").update(`${OCTOBER14_CAMPAIGN}:${scope}:${hashes.slice().sort().join(",")}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function trackedHtml(html: string, logId: number) {
  const base = "https://hilitcaspi.com";
  const pixel = `<img src="${base}/api/email/open/${logId}" width="1" height="1" alt="" style="display:none;border:0" />`;
  return html.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*?)>/gi, (match, before, url, after) => {
    if (url.includes("/unsubscribe") || url.includes("/api/email/") || url.startsWith("mailto:") || url.startsWith("tel:")) return match;
    return `<a ${before}href="${base}/api/email/click/${logId}?url=${encodeURIComponent(url)}"${after}>`;
  }).replace("</body>", `${pixel}</body>`);
}

function executionAllowed(options: October14RunOptions, now: number) {
  return options.execute === true
    && options.approvalConfirmed === true
    && options.dryRun === false
    && typeof options.expiresAt === "number"
    && now >= OCTOBER14_SEND_NOT_BEFORE
    && now <= OCTOBER14_SEND_EXPIRES_AT
    && options.expiresAt >= now
    && options.expiresAt <= OCTOBER14_SEND_EXPIRES_AT;
}

function affectedRows(value: unknown) {
  const result = Array.isArray(value) ? value[0] : value;
  return Number((result as { affectedRows?: number } | undefined)?.affectedRows || 0);
}

function safeFailureMetadata(state: string, extra: Record<string, unknown> = {}) {
  // No recipient, telephone, body, or provider error text belongs in operation output.
  return JSON.stringify({ campaign: OCTOBER14_CAMPAIGN, state, ...extra });
}

async function insertEmailBatch(
  db: any,
  cohort: Cohort,
  members: October14Member[],
  now: number,
  dependencies: October14CampaignDependencies,
) {
  const signer = dependencies.buildSignedUnsubscribeUrl || buildSignedUnsubscribeUrl;
  const draftBuilder = dependencies.buildOctober14Newsletter || buildOctober14Newsletter;
  const journeyKey = ownJourney("email", cohort);
  const records = members.map(member => {
    const unsubscribeUrl = signer({
      email: member.email,
      ...(member.leadId ? { leadId: member.leadId } : {}),
      ...(member.singleId ? { singleId: member.singleId } : {}),
    });
    const draft = draftBuilder({
      audience: cohort === "plusMembers" ? "plus_members" : "database_warm",
      unsubscribeUrl,
      firstName: member.firstName,
    });
    return { member, id: 0, draft };
  });
  await db.insert(emailLog).values(records.map(record => ({
    leadId: record.member.leadId,
    recipientEmail: record.member.email,
    recipientName: record.member.firstName || null,
    journeyKey,
    emailIndex: 1,
    subject: record.draft.subject,
    htmlBody: record.draft.htmlContent,
    textBody: record.draft.textContent,
    scheduledAt: now,
    sentAt: null,
    status: "processing" as const,
    errorMessage: safeFailureMetadata("inflight_review_if_uncertain"),
    createdAt: now,
  })));
  const claimed = asRows<{ id: number; recipientEmail: string }>(await db.execute(sql`
    SELECT id, recipientEmail FROM email_log
    WHERE journeyKey = ${journeyKey} AND status = 'processing' AND scheduledAt = ${now}
      AND recipientEmail IN (${sql.join(members.map(member => sql`${member.email}`), sql`, `)})
  `));
  const ids = new Map(claimed.map(row => [String(row.recipientEmail).toLowerCase(), Number(row.id)]));
  for (const record of records) {
    record.id = ids.get(record.member.email.toLowerCase()) || 0;
    if (!record.id) throw new Error("Unable to claim campaign delivery record");
    record.draft.htmlContent = trackedHtml(record.draft.htmlContent, record.id);
    await db.update(emailLog).set({ htmlBody: record.draft.htmlContent }).where(eq(emailLog.id, record.id));
  }
  return { journeyKey, records };
}

async function markLogs(db: any, ids: number[], status: LogState, metadata: string, sentAt?: number) {
  if (!ids.length) return;
  await db.update(emailLog).set({ status, ...(sentAt ? { sentAt } : {}), errorMessage: metadata })
    .where(inArray(emailLog.id, ids));
}

function selectFrozenMembers(members: October14Member[], frozen: string[], channel: ExecuteChannel) {
  const allowed = new Set(frozen);
  return members.filter(member => allowed.has(october14RecipientHash(member, channel)));
}

export type October14RunResult = {
  readOnly?: true;
  summary?: October14SafeSummary;
  emailAccepted: number;
  smsAccepted: number;
  reviewRequired: number;
  suppressed: number;
};

/**
 * Direct execution only. It has no retry path: a failed/ambiguous provider batch leaves
 * its lifecycle claim running and only those current record IDs marked review-required.
 */
export async function runOctober14Campaign(
  options: October14RunOptions = {},
  dependencies: October14CampaignDependencies = {},
): Promise<October14RunResult> {
  const now = options.now ?? Date.now();
  const channel = (options.channel ?? "email") as ExecuteChannel;
  if (channel !== "email" && channel !== "sms") throw new Error("Execution requires exactly one channel");
  if (channel === "sms" && options.execute === true && options.dryRun === false && !OCTOBER14_SMS_COPY_APPROVED) {
    throw new Error("SMS copy is awaiting renewed owner approval; no public SMS execution is permitted");
  }
  if (options.dryRun !== false || options.execute !== true) {
    const prepared = await prepareOctober14Audience({ ...options, now, channel }, dependencies);
    return { readOnly: true, summary: prepared.summary, emailAccepted: 0, smsAccepted: 0, reviewRequired: 0, suppressed: prepared.summary.suppressed };
  }
  if (!executionAllowed(options, now)) {
    throw new Error("October 14 execution requires explicit confirmed approval within the approved Jerusalem window and same-night expiry");
  }
  if (!options.frozen) throw new Error("A frozen owner-reviewed audience is required before execution");

  // Re-read all eligibility at send time. The frozen hashes can only reduce, never add.
  const prepared = await prepareOctober14Audience({ ...options, now, channel }, dependencies);
  const selected = channel === "email"
    ? {
      databaseWarm: selectFrozenMembers(prepared.members.databaseWarm, options.frozen.email.databaseWarm, "email"),
      plusMembers: selectFrozenMembers(prepared.members.plusMembers, options.frozen.email.plusMembers, "email"),
    }
    : { smsMembers: selectFrozenMembers(prepared.members.smsMembers, options.frozen.sms, "sms") };
  const selectedDatabaseWarm = channel === "email" ? selected.databaseWarm || [] : [];
  const selectedPlusMembers = channel === "email" ? selected.plusMembers || [] : [];
  const selectedSmsMembers = channel === "sms" ? selected.smsMembers || [] : [];
  const selectedCount = channel === "email"
    ? selectedDatabaseWarm.length + selectedPlusMembers.length
    : selectedSmsMembers.length;
  const suppressed = prepared.summary.suppressed + (channel === "email"
    ? prepared.members.databaseWarm.length + prepared.members.plusMembers.length - selectedCount
    : prepared.members.smsMembers.length - selectedCount);

  const db = await (dependencies.getDb || getDb)();
  if (!db) throw new Error("Database unavailable");
  const runKey = `${OCTOBER14_CAMPAIGN}:${channel}`;
  const claim = await db.execute(sql`INSERT IGNORE INTO lifecycle_run_claims (run_key, status, started_at, result_json) VALUES (${runKey}, 'running', ${now}, ${safeFailureMetadata("review_required_if_interrupted", { channel })})`);
  if (affectedRows(claim) !== 1) throw new Error("Campaign channel already claimed; manual review is required before any further delivery");

  const result: October14RunResult = { emailAccepted: 0, smsAccepted: 0, reviewRequired: 0, suppressed };
  if (channel === "email") {
    const send = dependencies.sendEmailBatch || sendEmailBatch;
    for (const [cohort, members] of [["databaseWarm", selectedDatabaseWarm], ["plusMembers", selectedPlusMembers]] as const) {
      for (let offset = 0; offset < members.length; offset += 100) {
        const batch = members.slice(offset, offset + 100);
        const { records } = await insertEmailBatch(db, cohort, batch, now, dependencies);
        const ids = records.map(record => record.id);
        let delivery: Awaited<ReturnType<typeof sendEmailBatch>>;
        try {
          delivery = await send({
            subject: records[0]?.draft.subject || "",
            textContent: records[0]?.draft.textContent,
            versions: records.map(record => ({
              to: [{ email: record.member.email, name: record.member.firstName || undefined }],
              htmlContent: record.draft.htmlContent,
              textContent: record.draft.textContent,
            })),
            idempotencyKey: deterministicUuid(`email:${cohort}`, records.map(record => october14RecipientHash(record.member, "email"))),
          });
        } catch {
          delivery = { success: false };
        }
        // A duplicate without one ID per submitted version is ambiguous. Do not infer
        // acceptance and never retry automatically.
        const accepted = delivery.success && Array.isArray(delivery.messageIds)
          && delivery.messageIds.length === records.length;
        if (!accepted) {
          await markLogs(db, ids, "failed", safeFailureMetadata("review_required_provider_result_uncertain", { channel, cohort }));
          result.reviewRequired += ids.length;
          return result; // leave lifecycle claim running: fail closed after this batch
        }
        await markLogs(db, ids, "sent", safeFailureMetadata("provider_accepted_not_delivered", {
          channel, cohort, providerMessageIds: delivery.messageIds,
        }), Date.now());
        result.emailAccepted += ids.length;
      }
    }
  } else {
    if (!options.smsApproved) throw new Error("SMS requires explicit owner campaign approval");
    const members = selectedSmsMembers;
    const draft = dependencies.buildOctober14SmsDraft || buildOctober14SmsDraft;
    const preparedSms = members.map(member => ({ member, message: draft().message }));
    const providerUnits = preparedSms.reduce((total, item) => total + Math.ceil(item.message.length / 256), 0);
    const balance = await (dependencies.getVibrateSmsBalance || getVibrateSmsBalance)();
    // Preflight occurs before creating processing logs or calling the provider.
    if (balance === null || balance < providerUnits) throw new Error("Unable to verify sufficient SMS balance");
    if (preparedSms.length) {
      await db.insert(emailLog).values(preparedSms.map(item => ({
        leadId: item.member.leadId,
        recipientEmail: item.member.email,
        recipientName: null,
        journeyKey: ownJourney("sms"),
        emailIndex: 1,
        subject: "October 14 SMS campaign",
        htmlBody: "",
        textBody: null,
        scheduledAt: now,
        sentAt: null,
        status: "processing" as const,
        errorMessage: safeFailureMetadata("inflight_review_if_uncertain", {
          channel,
          smsConsentProvenance: "crm_profile_marketing_eligibility_and_verified_intent",
        }),
        createdAt: now,
      })));
      const claimed = asRows<{ id: number; recipientEmail: string }>(await db.execute(sql`
        SELECT id, recipientEmail FROM email_log
        WHERE journeyKey = ${ownJourney("sms")} AND status = 'processing' AND scheduledAt = ${now}
          AND recipientEmail IN (${sql.join(members.map(member => sql`${member.email}`), sql`, `)})
      `));
      const idsByEmail = new Map(claimed.map(row => [String(row.recipientEmail).toLowerCase(), Number(row.id)]));
      const ids = members.map(member => idsByEmail.get(member.email.toLowerCase()) || 0);
      if (ids.some(id => !id)) throw new Error("Unable to claim campaign delivery record");
      let delivery: Awaited<ReturnType<typeof sendSMSBulkDetailed>>;
      try {
        delivery = await (dependencies.sendSMSBulkDetailed || sendSMSBulkDetailed)({
          messages: preparedSms.map(item => ({ phone: item.member.phone!, message: item.message })),
          idempotencyKey: deterministicUuid("sms", members.map(member => october14RecipientHash(member, "sms"))),
          campaignId: `${OCTOBER14_CAMPAIGN}:sms`,
        });
      } catch {
        delivery = { accepted: false, providerRunId: null, error: "provider_exception" };
      }
      if (!delivery.accepted) {
        await markLogs(db, ids, "failed", safeFailureMetadata("review_required_provider_result_uncertain", { channel }));
        result.reviewRequired += ids.length;
        return result; // do not complete the claim or attempt another batch
      }
      await markLogs(db, ids, "sent", safeFailureMetadata("provider_accepted_not_delivered", {
        channel, providerRunId: delivery.providerRunId,
      }), Date.now());
      result.smsAccepted = ids.length;
    }
  }
  await db.execute(sql`UPDATE lifecycle_run_claims SET status = 'completed', completed_at = ${Date.now()}, result_json = ${safeFailureMetadata("completed", { emailAccepted: result.emailAccepted, smsAccepted: result.smsAccepted, reviewRequired: result.reviewRequired, suppressed: result.suppressed })} WHERE run_key = ${runKey}`);
  return result;
}
