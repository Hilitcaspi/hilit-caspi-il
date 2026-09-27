import crypto from "crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { discountCodes, emailLog } from "../drizzle/schema";
import {
  DATABASE_NOW_CAMPAIGN,
  DATABASE_NOW_COUPON,
  DATABASE_NOW_EMAIL_JOURNEY,
  DATABASE_NOW_EXPIRES_AT,
  DATABASE_NOW_MAX_USES,
  DATABASE_NOW_PRICE_ILS,
  DATABASE_NOW_SMS_JOURNEY,
  databaseNowOfferUrl,
} from "../shared/databaseHolidayNow";
import { sendEmailBatch, isPermanentlyBlockedEmail } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl } from "./emailUnsubscribe";
import { buildDatabaseHolidayNowNewsletter, DATABASE_NOW_SUBJECT } from "./databaseHolidayNowNewsletter";
import { getVibrateSmsBalance, normalizeIsraeliMobile, sendSMSBulkDetailed } from "./vibrate";

export type DatabaseNowAudienceMember = {
  leadId: number;
  email: string;
  firstName: string;
  phone: string | null;
  highIntent: boolean;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function campaignMeta(state: string, detail?: string) {
  return JSON.stringify({ campaign: DATABASE_NOW_CAMPAIGN, state, ...(detail ? { detail } : {}) });
}

function deterministicUuid(scope: string, values: string[]) {
  const hex = crypto.createHash("sha256").update(`${DATABASE_NOW_CAMPAIGN}:${scope}:${values.join(",")}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function injectTracking(html: string, logId: number) {
  const base = "https://hilitcaspi.com";
  const pixel = `<img src="${base}/api/email/open/${logId}" width="1" height="1" alt="" style="display:none;border:0;width:1px;height:1px;" />`;
  const withPixel = html.replace("</body>", `${pixel}</body>`);
  return withPixel.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*?)>/gi, (match, before, url, after) => {
    if (url.includes("/unsubscribe") || url.includes("/api/email/") || url.startsWith("mailto:") || url.startsWith("tel:")) return match;
    return `<a ${before}href="${base}/api/email/click/${logId}?url=${encodeURIComponent(url)}"${after}>`;
  });
}

export function buildDatabaseHolidayNowSms(input: { firstName?: string | null; email: string }) {
  const firstName = String(input.firstName || "").trim().split(/\s+/)[0];
  const greeting = firstName ? `היי ${firstName}, כאן הילית 💛` : "היי, כאן הילית 💛";
  const offerUrl = databaseNowOfferUrl("sms");
  const message = `${greeting} הבשורה לחג: ל־${DATABASE_NOW_MAX_USES} הראשונים הצעת התאמה ראשונה בתוך 3 ימים מסיום הפרופיל והשאלון ✨ מחכה לך גם הטבת הצטרפות מיוחדת, בתשלום חד־פעמי. קוד ${DATABASE_NOW_COUPON}: ${offerUrl} להסרה: hilitcaspi.com/unsubscribe`;
  return { message, offerUrl, units: Math.ceil(message.trim().length / 256) };
}

export async function loadDatabaseHolidayNowAudience(): Promise<DatabaseNowAudienceMember[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const recentLeadCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentClickCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const restWindowCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [rows] = await db.execute(sql`
    SELECT
      cl.id AS lead_id,
      cl.email AS email,
      SUBSTRING_INDEX(TRIM(cl.name), ' ', 1) AS first_name,
      cl.phone AS phone,
      CASE WHEN
        cl.createdAt >= ${recentLeadCutoff}
        OR EXISTS (
          SELECT 1 FROM email_log el
          WHERE LOWER(TRIM(el.recipientEmail)) = LOWER(TRIM(cl.email))
            AND el.clickedAt IS NOT NULL
            AND el.clickedAt >= ${recentClickCutoff}
        )
        OR EXISTS (
          SELECT 1 FROM payment_leads pl
          WHERE LOWER(TRIM(pl.email)) = LOWER(TRIM(cl.email))
            AND pl.product = 'database'
            AND pl.confirmed_at IS NULL
        )
      THEN 1 ELSE 0 END AS high_intent
    FROM crm_leads cl
    WHERE cl.id = (
      SELECT MAX(latest.id) FROM crm_leads latest
      WHERE LOWER(TRIM(latest.email)) = LOWER(TRIM(cl.email))
    )
      AND cl.email IS NOT NULL
      AND TRIM(cl.email) <> ''
      AND COALESCE(cl.emailUnsubscribed, 0) = 0
      AND cl.status NOT IN ('client_database', 'client_coaching', 'not_relevant')
      AND NOT EXISTS (
        SELECT 1 FROM crm_leads blocked
        WHERE LOWER(TRIM(blocked.email)) = LOWER(TRIM(cl.email))
          AND COALESCE(blocked.emailUnsubscribed, 0) = 1
      )
      AND NOT EXISTS (
        SELECT 1 FROM completed_payments paid
        WHERE LOWER(TRIM(paid.email)) = LOWER(TRIM(cl.email))
          AND paid.product IN ('database', 'bundle_new_year')
      )
      AND NOT EXISTS (
        SELECT 1 FROM singles s
        WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(cl.email))
          AND (
            COALESCE(s.isPaid, 0) = 1
            OR COALESCE(s.isActive, 0) = 0
            OR COALESCE(s.isSeed, 0) = 1
            OR COALESCE(s.consentEmailMarketing, 0) = 0
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_log recent
        WHERE LOWER(TRIM(recent.recipientEmail)) = LOWER(TRIM(cl.email))
          AND recent.status = 'sent'
          AND recent.sentAt >= ${restWindowCutoff}
          AND recent.journeyKey <> ${DATABASE_NOW_EMAIL_JOURNEY}
      )
  `) as any;

  const deduped = new Map<string, DatabaseNowAudienceMember>();
  for (const row of rows || []) {
    const email = normalizeEmail(String(row.email || ""));
    if (!email.includes("@") || isPermanentlyBlockedEmail(email)) continue;
    deduped.set(email, {
      leadId: Number(row.lead_id),
      email,
      firstName: String(row.first_name || "").trim(),
      phone: normalizeIsraeliMobile(String(row.phone || "")),
      highIntent: Boolean(Number(row.high_intent)),
    });
  }
  return Array.from(deduped.values());
}

export async function activateDatabaseHolidayNowCoupon() {
  if (Date.now() >= DATABASE_NOW_EXPIRES_AT) throw new Error("NOW offer has expired; update the deadline before activation");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = {
    fixedPrice: DATABASE_NOW_PRICE_ILS,
    discountPercent: null,
    discountAmount: null,
    product: "database",
    maxUses: DATABASE_NOW_MAX_USES,
    isActive: true,
    expiresAt: DATABASE_NOW_EXPIRES_AT,
    note: "הטבת חג NOW - התאמה ראשונה בתוך 3 ימים מהשלמת הפרופיל והשאלון",
  };
  const [existing] = await db.select({ id: discountCodes.id }).from(discountCodes).where(eq(discountCodes.code, DATABASE_NOW_COUPON)).limit(1);
  if (existing) await db.update(discountCodes).set(values).where(eq(discountCodes.id, existing.id));
  else await db.insert(discountCodes).values({ code: DATABASE_NOW_COUPON, usedCount: 0, createdAt: Date.now(), ...values });
  return { code: DATABASE_NOW_COUPON, price: DATABASE_NOW_PRICE_ILS, expiresAt: DATABASE_NOW_EXPIRES_AT };
}

export async function prepareDatabaseHolidayNowEmail(options: { dryRun?: boolean } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const audience = await loadDatabaseHolidayNowAudience();
  const summary = {
    eligibleEmail: audience.length,
    eligibleSmsHighIntent: audience.filter(row => row.highIntent && row.phone).length,
    eligibleSmsAll: audience.filter(row => row.phone).length,
    dryRun: Boolean(options.dryRun),
  };
  if (options.dryRun) return summary;

  const already = await db.select({ recipientEmail: emailLog.recipientEmail }).from(emailLog)
    .where(eq(emailLog.journeyKey, DATABASE_NOW_EMAIL_JOURNEY));
  const existing = new Set(already.map(row => normalizeEmail(row.recipientEmail)));
  const now = Date.now();
  const rows = audience.filter(member => !existing.has(member.email)).map(member => {
    const content = buildDatabaseHolidayNowNewsletter({
      firstName: member.firstName,
      offerUrl: databaseNowOfferUrl("email"),
      unsubscribeUrl: buildSignedUnsubscribeUrl({ email: member.email, leadId: member.leadId }),
    });
    return {
      leadId: member.leadId,
      recipientEmail: member.email,
      recipientName: member.firstName,
      journeyKey: DATABASE_NOW_EMAIL_JOURNEY,
      emailIndex: 1,
      subject: content.subject,
      htmlBody: content.htmlContent,
      textBody: content.textContent,
      scheduledAt: now,
      sentAt: null,
      status: "processing" as const,
      errorMessage: campaignMeta("queued"),
      createdAt: now,
    };
  });
  for (let offset = 0; offset < rows.length; offset += 100) await db.insert(emailLog).values(rows.slice(offset, offset + 100));
  return { ...summary, queued: rows.length };
}

export async function sendPreparedDatabaseHolidayNowEmail() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const eligible = new Set((await loadDatabaseHolidayNowAudience()).map(row => row.email));
  const queued = await db.select().from(emailLog).where(and(
    eq(emailLog.journeyKey, DATABASE_NOW_EMAIL_JOURNEY),
    eq(emailLog.status, "processing"),
    isNull(emailLog.sentAt),
  ));
  const suppressed = queued.filter(row => !eligible.has(normalizeEmail(row.recipientEmail)));
  if (suppressed.length) await db.update(emailLog).set({ status: "cancelled", sentAt: Date.now(), errorMessage: campaignMeta("suppressed") })
    .where(inArray(emailLog.id, suppressed.map(row => row.id)));
  const deliverable = queued.filter(row => eligible.has(normalizeEmail(row.recipientEmail))).sort((a, b) => a.id - b.id);
  let sent = 0;
  for (let offset = 0; offset < deliverable.length; offset += 1000) {
    const batch = deliverable.slice(offset, offset + 1000);
    const result = await sendEmailBatch({
      subject: DATABASE_NOW_SUBJECT,
      textContent: "הטבת החג למאגר. קישור אישי והסרה נמצאים בגוף המייל.",
      versions: batch.map(row => ({
        to: [{ email: row.recipientEmail, name: row.recipientName || undefined }],
        htmlContent: injectTracking(row.htmlBody, row.id),
        textContent: row.textBody || undefined,
      })),
      idempotencyKey: deterministicUuid("email", batch.map(row => normalizeEmail(row.recipientEmail))),
    });
    if (!result.success) throw new Error(result.error || "Brevo batch failed");
    const sentAt = Date.now();
    await db.update(emailLog).set({ status: "sent", sentAt, errorMessage: campaignMeta("sent") })
      .where(inArray(emailLog.id, batch.map(row => row.id)));
    sent += batch.length;
  }
  return { queued: queued.length, sent, suppressed: suppressed.length };
}

export async function sendDatabaseHolidayNowSms(options: { audience: "high_intent" | "all" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const allAudience = await loadDatabaseHolidayNowAudience();
  const selectedByPhone = new Map<string, DatabaseNowAudienceMember>();
  for (const row of allAudience) {
    if (!row.phone || (options.audience === "high_intent" && !row.highIntent)) continue;
    if (!selectedByPhone.has(row.phone)) selectedByPhone.set(row.phone, row);
  }
  const selected = Array.from(selectedByPhone.values());
  const prior = await db.select({ recipientEmail: emailLog.recipientEmail }).from(emailLog)
    .where(and(eq(emailLog.journeyKey, DATABASE_NOW_SMS_JOURNEY), eq(emailLog.status, "sent")));
  const sentEmails = new Set(prior.map(row => normalizeEmail(row.recipientEmail)));
  const deliverable = selected.filter(row => !sentEmails.has(row.email));
  const prepared = deliverable.map(member => ({ member, sms: buildDatabaseHolidayNowSms(member) }));
  const requiredCredits = prepared.reduce((total, item) => total + item.sms.units, 0);
  const balance = await getVibrateSmsBalance();
  if (balance === null) throw new Error("Unable to verify Vibrate SMS balance");
  if (balance < requiredCredits) throw new Error(`Insufficient Vibrate credits: required=${requiredCredits} available=${balance}`);

  let accepted = 0;
  for (let offset = 0; offset < prepared.length; offset += 500) {
    const batch = prepared.slice(offset, offset + 500);
    const result = await sendSMSBulkDetailed({
      messages: batch.map(item => ({ phone: item.member.phone!, message: item.sms.message })),
      idempotencyKey: deterministicUuid(`sms:${options.audience}`, batch.map(item => item.member.email)),
      campaignId: DATABASE_NOW_CAMPAIGN,
    });
    if (!result.accepted) throw new Error(result.error || "Vibrate bulk failed");
    const sentAt = Date.now();
    await db.insert(emailLog).values(batch.map(item => ({
      leadId: item.member.leadId,
      recipientEmail: item.member.email,
      recipientName: item.member.firstName,
      journeyKey: DATABASE_NOW_SMS_JOURNEY,
      emailIndex: 1,
      subject: "SMS הטבת חג NOW למאגר",
      htmlBody: item.sms.message,
      textBody: item.sms.message,
      scheduledAt: sentAt,
      sentAt,
      status: "sent" as const,
      errorMessage: campaignMeta("provider_accepted", result.providerRunId || undefined),
      createdAt: sentAt,
    })));
    accepted += batch.length;
  }
  return { audience: options.audience, selected: selected.length, accepted, requiredCredits, balanceBefore: balance };
}
