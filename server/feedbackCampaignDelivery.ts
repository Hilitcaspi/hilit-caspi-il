import { and, eq, inArray, isNull, like, or } from "drizzle-orm";
import { emailLog, testimonialEvents, testimonialRecords, type TestimonialRecord } from "../drizzle/schema";
import { sendEmail, isPermanentlyBlockedEmail } from "./brevo";
import { getDb } from "./db";
import { buildFeedbackRequestEmail, buildFeedbackUrl } from "./feedbackAutomation";
import { isEmailMarketingSuppressed } from "./emailUnsubscribe";
import { TESTIMONIAL_CAMPAIGN_VARIANTS, type TestimonialCampaignVariant } from "./testimonialService";

export const APPROVED_FEEDBACK_CAMPAIGN_VERSION = "2026-09-v2";
export const APPROVED_FEEDBACK_CAMPAIGN_COUNTS = {
  successful_matches: 216,
  match_success_followup: 33,
  dna_completers: 100,
} as const;

export type ApprovedFeedbackAudience = keyof typeof APPROVED_FEEDBACK_CAMPAIGN_COUNTS;

const CAMPAIGN_PREFIXES: Record<ApprovedFeedbackAudience, string> = {
  successful_matches: `campaign:successful-matches:${APPROVED_FEEDBACK_CAMPAIGN_VERSION}:`,
  match_success_followup: `campaign:match-success-followup:${APPROVED_FEEDBACK_CAMPAIGN_VERSION}:`,
  dna_completers: `campaign:dna-completers:${APPROVED_FEEDBACK_CAMPAIGN_VERSION}:`,
};

const EMAIL_JOURNEYS: Record<ApprovedFeedbackAudience, string> = {
  successful_matches: "testimonial_match_v2",
  match_success_followup: "testimonial_followup_v2",
  dna_completers: "testimonial_dna_v2",
};

type CampaignRecord = TestimonialRecord;

function audienceForRequestKey(requestKey: string | null): ApprovedFeedbackAudience | null {
  if (!requestKey) return null;
  return (Object.keys(CAMPAIGN_PREFIXES) as ApprovedFeedbackAudience[])
    .find(audience => requestKey.startsWith(CAMPAIGN_PREFIXES[audience])) ?? null;
}

function campaignVariantFromSnapshot(sourceSnapshot: string | null): TestimonialCampaignVariant | undefined {
  if (!sourceSnapshot) return undefined;
  try {
    const value = (JSON.parse(sourceSnapshot) as { campaignVariant?: unknown }).campaignVariant;
    return TESTIMONIAL_CAMPAIGN_VARIANTS.includes(value as TestimonialCampaignVariant)
      ? value as TestimonialCampaignVariant
      : undefined;
  } catch {
    return undefined;
  }
}

export function validateApprovedFeedbackCampaignSnapshot(rows: Array<Pick<CampaignRecord, "requestKey" | "contactEmail" | "status" | "scheduledAt" | "requestSentAt">>): void {
  const keys = new Set<string>();
  const emails = new Set<string>();
  const counts: Record<ApprovedFeedbackAudience, number> = { successful_matches: 0, match_success_followup: 0, dna_completers: 0 };
  for (const row of rows) {
    const audience = audienceForRequestKey(row.requestKey);
    if (!audience) throw new Error("Unknown feedback campaign row");
    if (!row.requestKey || keys.has(row.requestKey)) throw new Error("Duplicate feedback campaign key");
    if (emails.has(row.contactEmail.trim().toLowerCase())) throw new Error("Duplicate feedback campaign recipient");
    if (row.status !== "draft" || row.scheduledAt || row.requestSentAt) throw new Error("Feedback campaign is not in a clean draft state");
    keys.add(row.requestKey);
    emails.add(row.contactEmail.trim().toLowerCase());
    counts[audience] += 1;
  }
  for (const audience of Object.keys(APPROVED_FEEDBACK_CAMPAIGN_COUNTS) as ApprovedFeedbackAudience[]) {
    if (counts[audience] !== APPROVED_FEEDBACK_CAMPAIGN_COUNTS[audience]) {
      throw new Error(`Feedback campaign count mismatch for ${audience}`);
    }
  }
}

function trackedEmailContent(htmlContent: string, emailLogId: number, feedbackUrl: string): string {
  const clickUrl = `https://hilitcaspi.com/api/email/click/${emailLogId}?url=${encodeURIComponent(feedbackUrl)}`;
  const pixel = `<img src="https://hilitcaspi.com/api/email/open/${emailLogId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`;
  return htmlContent.replace(feedbackUrl, clickUrl).replace("</body>", `${pixel}</body>`);
}

async function isDeliverable(email: string): Promise<boolean> {
  if (isPermanentlyBlockedEmail(email)) return false;
  const suppression = await isEmailMarketingSuppressed(email);
  return !suppression.suppressed;
}

async function sendOneApprovedRecord(record: CampaignRecord, approvedBy: string): Promise<{ audience: ApprovedFeedbackAudience; status: "accepted" | "failed" | "archived" }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const audience = audienceForRequestKey(record.requestKey);
  if (!audience) throw new Error("Unknown feedback campaign row");
  const now = Date.now();
  if (!(await isDeliverable(record.contactEmail))) {
    await db.update(testimonialRecords).set({ status: "archived", archivedAt: now, updatedAt: now })
      .where(and(eq(testimonialRecords.id, record.id), eq(testimonialRecords.status, "draft"), isNull(testimonialRecords.requestSentAt)));
    await db.insert(testimonialEvents).values({ recordId: record.id, eventType: "archived", actorType: "system", actorRef: "feedback-campaign-preflight", metadata: JSON.stringify({ reason: "suppressed_before_send", audience }), createdAt: now });
    return { audience, status: "archived" };
  }

  const claim = await db.update(testimonialRecords).set({
    status: "candidate",
    requestApprovedAt: now,
    requestApprovedBy: approvedBy,
    scheduledAt: null,
    updatedAt: now,
  }).where(and(eq(testimonialRecords.id, record.id), eq(testimonialRecords.status, "draft"), isNull(testimonialRecords.requestSentAt)));
  const claimed = Number((claim as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
  if (claimed !== 1) return { audience, status: "failed" };

  await db.insert(testimonialEvents).values({ recordId: record.id, eventType: "contact_approved", actorType: "team", actorRef: approvedBy, metadata: JSON.stringify({ audience, campaignVersion: APPROVED_FEEDBACK_CAMPAIGN_VERSION }), createdAt: now });
  const firstName = record.contactName.trim().split(/\s+/)[0] || "שלום";
  const feedbackUrl = buildFeedbackUrl(record.publicToken);
  const email = buildFeedbackRequestEmail({
    firstName,
    contactEmail: record.contactEmail,
    sourceType: record.sourceType,
    surveyKind: record.surveyKind,
    feedbackUrl,
    campaignVariant: campaignVariantFromSnapshot(record.sourceSnapshot),
    draftSubject: record.draftSubject,
    draftBody: record.draftBody,
    rewardType: record.rewardType,
  });
  const logInsert = await db.insert(emailLog).values({
    leadId: record.crmLeadId,
    recipientEmail: record.contactEmail,
    recipientName: record.contactName,
    journeyKey: EMAIL_JOURNEYS[audience],
    emailIndex: 1,
    subject: email.subject,
    htmlBody: email.htmlContent,
    textBody: email.textContent,
    scheduledAt: now,
    status: "processing",
    createdAt: now,
  });
  const emailLogId = Number((logInsert as unknown as [{ insertId?: number }])[0]?.insertId ?? 0);
  const htmlContent = emailLogId > 0 ? trackedEmailContent(email.htmlContent, emailLogId, feedbackUrl) : email.htmlContent;
  if (emailLogId > 0) await db.update(emailLog).set({ htmlBody: htmlContent }).where(eq(emailLog.id, emailLogId));

  const delivery = await sendEmail({
    to: { email: record.contactEmail, name: record.contactName },
    subject: email.subject,
    htmlContent,
    textContent: email.textContent,
  });
  if (!delivery.success || delivery.messageId === "blocked") {
    if (emailLogId > 0) await db.update(emailLog).set({ status: "failed", errorMessage: (delivery.error || "provider_rejected").slice(0, 500) }).where(eq(emailLog.id, emailLogId));
    await db.update(testimonialRecords).set({ status: "draft", requestApprovedAt: null, requestApprovedBy: null, updatedAt: Date.now() }).where(and(eq(testimonialRecords.id, record.id), eq(testimonialRecords.status, "candidate"), isNull(testimonialRecords.requestSentAt)));
    return { audience, status: delivery.messageId === "blocked" ? "archived" : "failed" };
  }

  const acceptedAt = Date.now();
  await db.update(testimonialRecords).set({ status: "sent", requestSentAt: acceptedAt, updatedAt: acceptedAt })
    .where(and(eq(testimonialRecords.id, record.id), eq(testimonialRecords.status, "candidate"), isNull(testimonialRecords.requestSentAt)));
  if (emailLogId > 0) await db.update(emailLog).set({ status: "sent", sentAt: acceptedAt }).where(eq(emailLog.id, emailLogId));
  await db.insert(testimonialEvents).values({ recordId: record.id, eventType: "request_marked_sent", actorType: "system", actorRef: "feedback-campaign-delivery", metadata: JSON.stringify({ audience, emailLogId, providerMessageId: delivery.messageId || null }), createdAt: acceptedAt });
  return { audience, status: "accepted" };
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function sendApprovedFeedbackCampaign(input: { approvedBy: string; concurrency?: number }): Promise<{
  total: number;
  accepted: number;
  failed: number;
  archived: number;
  byAudience: Record<ApprovedFeedbackAudience, { accepted: number; failed: number; archived: number }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(testimonialRecords).where(or(
    ...Object.values(CAMPAIGN_PREFIXES).map(prefix => like(testimonialRecords.requestKey, `${prefix}%`)),
  ));
  validateApprovedFeedbackCampaignSnapshot(rows);
  const results = await runWithConcurrency(rows, input.concurrency ?? 5, record => sendOneApprovedRecord(record, input.approvedBy));
  const byAudience: Record<ApprovedFeedbackAudience, { accepted: number; failed: number; archived: number }> = {
    successful_matches: { accepted: 0, failed: 0, archived: 0 },
    match_success_followup: { accepted: 0, failed: 0, archived: 0 },
    dna_completers: { accepted: 0, failed: 0, archived: 0 },
  };
  for (const result of results) byAudience[result.audience][result.status] += 1;
  return {
    total: results.length,
    accepted: results.filter(result => result.status === "accepted").length,
    failed: results.filter(result => result.status === "failed").length,
    archived: results.filter(result => result.status === "archived").length,
    byAudience,
  };
}

export async function getFeedbackCampaignEngagementSummary(): Promise<{
  sent: number;
  emailOpened: number;
  emailClicked: number;
  formOpened: number;
  responded: number;
  byAudience: Record<ApprovedFeedbackAudience, { sent: number; emailOpened: number; emailClicked: number; formOpened: number; responded: number }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const records = await db.select().from(testimonialRecords).where(or(
    ...Object.values(CAMPAIGN_PREFIXES).map(prefix => like(testimonialRecords.requestKey, `${prefix}%`)),
  ));
  const recordIds = records.map(record => record.id);
  const events = recordIds.length
    ? await db.select().from(testimonialEvents).where(and(inArray(testimonialEvents.recordId, recordIds), eq(testimonialEvents.eventType, "form_opened")))
    : [];
  const logs = await db.select().from(emailLog).where(inArray(emailLog.journeyKey, Object.values(EMAIL_JOURNEYS)));
  const formOpenedIds = new Set(events.map(event => event.recordId));
  const byAudience: Record<ApprovedFeedbackAudience, { sent: number; emailOpened: number; emailClicked: number; formOpened: number; responded: number }> = {
    successful_matches: { sent: 0, emailOpened: 0, emailClicked: 0, formOpened: 0, responded: 0 },
    match_success_followup: { sent: 0, emailOpened: 0, emailClicked: 0, formOpened: 0, responded: 0 },
    dna_completers: { sent: 0, emailOpened: 0, emailClicked: 0, formOpened: 0, responded: 0 },
  };
  for (const record of records) {
    const audience = audienceForRequestKey(record.requestKey);
    if (!audience) continue;
    if (record.requestSentAt) byAudience[audience].sent += 1;
    if (formOpenedIds.has(record.id)) byAudience[audience].formOpened += 1;
    if (record.lastResponseAt || ["submitted", "awaiting_consent", "awaiting_verification", "approved", "published"].includes(record.status)) byAudience[audience].responded += 1;
  }
  for (const log of logs) {
    const audience = (Object.keys(EMAIL_JOURNEYS) as ApprovedFeedbackAudience[]).find(key => EMAIL_JOURNEYS[key] === log.journeyKey);
    if (!audience || !log.sentAt) continue;
    if (log.openedAt) byAudience[audience].emailOpened += 1;
    if (log.clickedAt) byAudience[audience].emailClicked += 1;
  }
  return {
    sent: Object.values(byAudience).reduce((sum, item) => sum + item.sent, 0),
    emailOpened: Object.values(byAudience).reduce((sum, item) => sum + item.emailOpened, 0),
    emailClicked: Object.values(byAudience).reduce((sum, item) => sum + item.emailClicked, 0),
    formOpened: Object.values(byAudience).reduce((sum, item) => sum + item.formOpened, 0),
    responded: Object.values(byAudience).reduce((sum, item) => sum + item.responded, 0),
    byAudience,
  };
}
