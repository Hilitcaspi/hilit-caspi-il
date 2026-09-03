import crypto from "crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { emailLog } from "../drizzle/schema";
import { sendEmailBatch, isPermanentlyBlockedEmail } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl } from "./emailUnsubscribe";
import {
  HOLIDAY_BUNDLE_DNA_PREHEADER,
  HOLIDAY_BUNDLE_DNA_SUBJECT,
  buildHolidayBundleDnaNewsletter,
} from "./holidayBundleDnaNewsletter";

export const HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY = "holiday_bundle_dna_2026_09_03";
export const HOLIDAY_BUNDLE_DNA_COUPON = "HOLIDAY10";
export const HOLIDAY_BUNDLE_DNA_OFFER_URL =
  `https://hilitcaspi.com/new-year-love?utm_source=brevo&utm_medium=email&utm_campaign=${HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY}&utm_content=dna_followup&coupon=${HOLIDAY_BUNDLE_DNA_COUPON}#payment`;

type AudienceMember = {
  leadId: number;
  singleId: number | null;
  email: string;
  firstName: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function campaignMeta(state: "queued" | "sent" | "failed" | "suppressed", detail?: string) {
  return JSON.stringify({ campaign: HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY, state, ...(detail ? { detail } : {}) });
}

export async function loadHolidayBundleDnaEligibleAudience(): Promise<AudienceMember[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [rows] = await db.execute(sql`
    SELECT
      cl.id AS lead_id,
      cl.email AS email,
      SUBSTRING_INDEX(TRIM(cl.name), ' ', 1) AS first_name,
      (
        SELECT MIN(s.id)
        FROM singles s
        WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(cl.email))
      ) AS single_id
    FROM crm_leads cl
    WHERE cl.id = (
      SELECT MIN(dna_lead.id)
      FROM crm_leads dna_lead
      WHERE LOWER(TRIM(dna_lead.email)) = LOWER(TRIM(cl.email))
        AND dna_lead.quizSessionId IS NOT NULL
        AND TRIM(dna_lead.quizSessionId) <> ''
    )
      AND cl.email IS NOT NULL
      AND TRIM(cl.email) <> ''
      AND cl.quizSessionId IS NOT NULL
      AND TRIM(cl.quizSessionId) <> ''
      AND EXISTS (
        SELECT 1
        FROM dna_quiz_results dqr
        WHERE dqr.sessionId = cl.quizSessionId
      )
      AND NOT EXISTS (
        SELECT 1
        FROM crm_leads blocked
        WHERE LOWER(TRIM(blocked.email)) = LOWER(TRIM(cl.email))
          AND COALESCE(blocked.emailUnsubscribed, 0) = 1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM completed_payments paid
        WHERE LOWER(TRIM(paid.email)) = LOWER(TRIM(cl.email))
          AND paid.product = 'bundle_new_year'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM singles suppressed
        WHERE LOWER(TRIM(suppressed.email)) = LOWER(TRIM(cl.email))
          AND (
            COALESCE(suppressed.isActive, 0) = 0
            OR COALESCE(suppressed.consentEmailMarketing, 0) = 0
            OR COALESCE(suppressed.isSeed, 0) = 1
          )
      )
  `) as any;

  return (rows || [])
    .map((row: any) => ({
      leadId: Number(row.lead_id),
      singleId: row.single_id ? Number(row.single_id) : null,
      email: normalizeEmail(String(row.email || "")),
      firstName: String(row.first_name || "").trim(),
    }))
    .filter((row: AudienceMember) => row.leadId > 0 && row.email.includes("@") && !isPermanentlyBlockedEmail(row.email));
}

export async function prepareHolidayBundleDnaCampaign() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: emailLog.id })
    .from(emailLog)
    .where(eq(emailLog.journeyKey, HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY))
    .limit(1);
  if (existing.length > 0) throw new Error("Holiday bundle DNA campaign is already queued");

  const audience = await loadHolidayBundleDnaEligibleAudience();
  const now = Date.now();
  const rows = audience.map((member) => {
    const unsubscribeUrl = buildSignedUnsubscribeUrl({
      email: member.email,
      leadId: member.leadId,
      ...(member.singleId ? { singleId: member.singleId } : {}),
    });
    const email = buildHolidayBundleDnaNewsletter({
      firstName: member.firstName,
      offerUrl: HOLIDAY_BUNDLE_DNA_OFFER_URL,
      unsubscribeUrl,
    });
    return {
      leadId: member.leadId,
      recipientEmail: member.email,
      recipientName: member.firstName,
      journeyKey: HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY,
      emailIndex: 1,
      subject: email.subject,
      htmlBody: email.htmlContent,
      textBody: email.textContent,
      scheduledAt: now,
      sentAt: null,
      status: "processing" as const,
      errorMessage: campaignMeta("queued"),
      createdAt: now,
    };
  });
  for (let offset = 0; offset < rows.length; offset += 25) {
    await db.insert(emailLog).values(rows.slice(offset, offset + 25));
  }
  return { total: audience.length, subject: HOLIDAY_BUNDLE_DNA_SUBJECT, preheader: HOLIDAY_BUNDLE_DNA_PREHEADER };
}

function deterministicBatchUuid(recipientEmails: string[]) {
  const hex = crypto
    .createHash("sha256")
    .update(`${HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY}:${recipientEmails.map(normalizeEmail).join(",")}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export async function processHolidayBundleDnaCampaign() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const queued = await db
    .select()
    .from(emailLog)
    .where(and(
      eq(emailLog.journeyKey, HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY),
      eq(emailLog.status, "processing"),
      isNull(emailLog.sentAt),
    ));
  if (queued.length === 0) return { sent: 0, suppressed: 0, complete: true };

  const eligible = new Set((await loadHolidayBundleDnaEligibleAudience()).map((member) => member.email));
  const suppressed = queued.filter((row) => !eligible.has(normalizeEmail(row.recipientEmail)));
  for (let offset = 0; offset < suppressed.length; offset += 200) {
    const chunk = suppressed.slice(offset, offset + 200);
    await db.update(emailLog)
      .set({ status: "cancelled", sentAt: Date.now(), errorMessage: campaignMeta("suppressed") })
      .where(inArray(emailLog.id, chunk.map((row) => row.id)));
  }

  const deliverable = queued
    .filter((row) => eligible.has(normalizeEmail(row.recipientEmail)))
    .sort((a, b) => a.id - b.id);
  let sent = 0;
  for (let offset = 0; offset < deliverable.length; offset += 1000) {
    const batch = deliverable.slice(offset, offset + 1000);
    const result = await sendEmailBatch({
      subject: HOLIDAY_BUNDLE_DNA_SUBJECT,
      textContent: "שאלון ה־DNA היה נקודת הפתיחה. המשך אישי והסרה זמינים בגוף המייל.",
      versions: batch.map((row) => ({
        to: [{ email: row.recipientEmail, name: row.recipientName || undefined }],
        htmlContent: row.htmlBody,
        textContent: row.textBody || undefined,
      })),
      idempotencyKey: deterministicBatchUuid(batch.map((row) => row.recipientEmail)),
    });
    if (!result.success) {
      await db.update(emailLog)
        .set({ errorMessage: campaignMeta("failed", String(result.error || "Brevo batch failed").slice(0, 500)) })
        .where(inArray(emailLog.id, batch.map((row) => row.id)));
      throw new Error(result.error || "Brevo batch failed");
    }
    const sentAt = Date.now();
    await db.update(emailLog)
      .set({ status: "sent", sentAt, errorMessage: campaignMeta("sent") })
      .where(inArray(emailLog.id, batch.map((row) => row.id)));
    sent += batch.length;
  }
  return { sent, suppressed: suppressed.length, complete: true };
}
