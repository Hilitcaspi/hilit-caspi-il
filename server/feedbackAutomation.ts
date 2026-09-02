import crypto from "node:crypto";
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import {
  crmLeads,
  feedbackAutomationSettings,
  matches,
  singles,
  testimonialEvents,
  testimonialRecords,
  type FeedbackAutomationSetting,
  type TestimonialRecord,
} from "../drizzle/schema";
import { getDb } from "./db";
import { isPermanentlyBlockedEmail, sendEmail } from "./brevo";
import {
  buildTestimonialDraft,
  normalizeTestimonialEmail,
  type TestimonialProofType,
  type TestimonialSourceType,
  type TestimonialTouchpoint,
} from "./testimonialService";

const SITE_BASE = "https://hilitcaspi.com";
const MATCH_WEEK_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export type FeedbackDeliveryChannel = "email" | "onsite" | "manual";

export function buildFeedbackRequestKey(input: {
  touchpoint: TestimonialTouchpoint;
  subjectId: number | string;
  contactId: number | string;
}): string {
  return `${input.touchpoint}:${input.subjectId}:${input.contactId}`;
}

export function isFeedbackTouchpointEnabled(
  settings: Pick<FeedbackAutomationSetting,
    | "matchImmediateEnabled"
    | "matchWeekReminderEnabled"
    | "dnaResultEnabled"
    | "databaseCompleteEnabled"
    | "guideCompleteEnabled"
    | "courseCompleteEnabled"
    | "productFollowupEnabled"
    | "satisfactionSurveyEnabled"
    | "historicalBatchEnabled">,
  touchpoint: TestimonialTouchpoint,
): boolean {
  if (touchpoint === "match_mutual") return settings.matchImmediateEnabled;
  if (touchpoint === "match_week") return settings.matchWeekReminderEnabled;
  if (touchpoint === "dna_result") return settings.dnaResultEnabled;
  if (touchpoint === "database_complete") return settings.databaseCompleteEnabled;
  if (touchpoint === "guide_complete") return settings.guideCompleteEnabled;
  if (touchpoint === "course_complete") return settings.courseCompleteEnabled;
  if (touchpoint === "product_followup") return settings.productFollowupEnabled;
  if (touchpoint === "representative_sample") return settings.satisfactionSurveyEnabled;
  if (touchpoint === "historical_match") return settings.historicalBatchEnabled;
  return false;
}

export function shouldApplyFeedbackCooldown(touchpoint: TestimonialTouchpoint): boolean {
  return touchpoint !== "match_week" && touchpoint !== "historical_match";
}

export function buildFeedbackUrl(token: string): string {
  return `${SITE_BASE}/testimonial/feedback?token=${encodeURIComponent(token)}`;
}

const PRODUCT_FEEDBACK_CONFIG: Partial<Record<string, { sourceType: TestimonialSourceType; delayDays: number }>> = {
  guide: { sourceType: "guide", delayDays: 7 },
  course: { sourceType: "course", delayDays: 10 },
  bundle_tubav: { sourceType: "bundle", delayDays: 10 },
  bundle_new_year: { sourceType: "bundle", delayDays: 10 },
};

export function feedbackProductPlan(product: string): { sourceType: TestimonialSourceType; delayDays: number } | null {
  return PRODUCT_FEEDBACK_CONFIG[product] ?? null;
}

export async function queueProductFeedbackAfterPurchase(input: {
  product: string;
  transactionId: string;
  contactName: string;
  contactEmail: string;
  paidAt?: number;
}): Promise<{ feedbackUrl: string; created: boolean } | null> {
  const config = feedbackProductPlan(input.product);
  if (!config) return null;
  const paidAt = input.paidAt ?? Date.now();
  const request = await ensurePositiveFeedbackRequest({
    requestKey: buildFeedbackRequestKey({
      touchpoint: "product_followup",
      subjectId: input.transactionId || `${input.product}:${paidAt}`,
      contactId: normalizeTestimonialEmail(input.contactEmail),
    }),
    touchpoint: "product_followup",
    deliveryChannel: "email",
    proofType: "product",
    sourceType: config.sourceType,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    sourceSnapshot: { product: input.product, transactionId: input.transactionId, delayDays: config.delayDays },
    scheduledAt: paidAt + config.delayDays * 24 * 60 * 60 * 1000,
  });
  return request ? { feedbackUrl: request.feedbackUrl, created: request.created } : null;
}

export function buildFeedbackRequestEmail(input: {
  firstName: string;
  sourceType: TestimonialSourceType;
  feedbackUrl: string;
  reminder?: boolean;
}): { subject: string; htmlContent: string; textContent: string } {
  const draft = buildTestimonialDraft({
    firstName: input.firstName,
    sourceType: input.sourceType,
    surveyKind: "positive_experience",
  });
  const subject = input.reminder
    ? `${input.firstName}, אשמח לשמוע איך מתקדמת החוויה שלך`
    : draft.subject;
  const intro = input.reminder
    ? "עבר שבוע מאז החיבור, ואם ההיכרות עדיין ממשיכה אשמח לשמוע בכמה מילים איך זה מרגיש עד עכשיו."
    : draft.body;
  return {
    subject,
    htmlContent: `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;background:#fff3f6;font-family:Arial,sans-serif;color:#432432"><div style="max-width:620px;margin:0 auto;padding:28px 14px"><div style="background:linear-gradient(135deg,#6f3f52,#a75f78);color:#fff;border-radius:28px 28px 0 0;padding:34px 30px"><div style="font-size:13px;letter-spacing:2px;color:#f6d9e4">הילית כספי</div><h1 style="font-size:30px;line-height:1.3;margin:14px 0 0">אשמח לשמוע על החוויה שלך</h1></div><div style="background:#fff;border-radius:0 0 28px 28px;padding:30px;box-shadow:0 18px 50px rgba(102,49,70,.12)"><p style="font-size:17px;line-height:1.8;margin:0">היי ${input.firstName},</p><p style="font-size:17px;line-height:1.8">${intro}</p><div style="background:#fff2f6;border:1px solid #efcad7;border-radius:16px;padding:18px 20px;margin:22px 0"><p style="font-size:16px;line-height:1.8;margin:0"><strong>השיתוף שלך יכול לעזור לעוד אנשים שמחפשים אהבה</strong> להכיר דרך, תהליך וכלים שיכולים לקדם גם אותם.</p></div><p style="font-size:16px;line-height:1.8">בסיום מחכה לך מתנה אישית ממני: <strong>מפת הדייט הבא</strong>. המתנה ניתנת על עצם השיתוף, גם בלי אישור לפרסם.</p><div style="text-align:center;margin:30px 0"><a href="${input.feedbackUrl}" style="display:inline-block;background:#a75f78;color:#fff;text-decoration:none;border-radius:999px;padding:16px 30px;font-size:17px;font-weight:bold">אשמח לשתף ולקבל את המתנה שלי</a></div><p style="font-size:14px;line-height:1.7;color:#795e69">רק אם מתאים לך, אפשר לבחור בטופס בנפרד מה מותר לנו לשתף, היכן ובאיזו זהות. שום דבר לא מתפרסם אוטומטית.</p><p style="font-size:16px;line-height:1.8;margin-top:28px">באהבה,<br><strong>הילית</strong></p></div></div></body></html>`,
    textContent: `היי ${input.firstName},\n\n${intro}\n\nהשיתוף שלך יכול לעזור לעוד אנשים שמחפשים אהבה להכיר דרך, תהליך וכלים שיכולים לקדם גם אותם.\n\nבסיום מחכה לך מתנה אישית ממני: מפת הדייט הבא. המתנה ניתנת על עצם השיתוף, גם בלי אישור לפרסם.\n\n${input.feedbackUrl}\n\nבאהבה,\nהילית`,
  };
}

async function getSettings(): Promise<FeedbackAutomationSetting | null> {
  const db = await getDb();
  if (!db) return null;
  const [settings] = await db.select().from(feedbackAutomationSettings)
    .where(eq(feedbackAutomationSettings.settingName, "default"))
    .limit(1);
  return settings ?? null;
}

async function canEmailContact(email: string): Promise<boolean> {
  const normalizedEmail = normalizeTestimonialEmail(email);
  if (!normalizedEmail || isPermanentlyBlockedEmail(normalizedEmail)) return false;
  const db = await getDb();
  if (!db) return false;
  const [blockedLead] = await db.select({ id: crmLeads.id })
    .from(crmLeads)
    .where(and(
      sql`LOWER(${crmLeads.email}) = ${normalizedEmail}`,
      eq(crmLeads.emailUnsubscribed, true),
    ))
    .limit(1);
  return !blockedLead;
}

export async function ensurePositiveFeedbackRequest(input: {
  requestKey: string;
  touchpoint: TestimonialTouchpoint;
  deliveryChannel: FeedbackDeliveryChannel;
  proofType: TestimonialProofType;
  sourceType: TestimonialSourceType;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  singleId?: number | null;
  crmLeadId?: number | null;
  matchId?: number | null;
  sourceSnapshot?: Record<string, unknown>;
  scheduledAt?: number | null;
}): Promise<{ record: TestimonialRecord; feedbackUrl: string; created: boolean } | null> {
  const db = await getDb();
  const settings = await getSettings();
  if (!db || !settings?.enabled || !isFeedbackTouchpointEnabled(settings, input.touchpoint)) return null;

  const normalizedEmail = normalizeTestimonialEmail(input.contactEmail);
  if (!normalizedEmail || !(await canEmailContact(normalizedEmail))) return null;

  const [existing] = await db.select().from(testimonialRecords)
    .where(eq(testimonialRecords.requestKey, input.requestKey))
    .limit(1);
  if (existing) return { record: existing, feedbackUrl: buildFeedbackUrl(existing.publicToken), created: false };

  if (input.touchpoint === "guide_complete" || input.touchpoint === "course_complete") {
    const [pendingProductFollowup] = await db.select().from(testimonialRecords)
      .where(and(
        sql`LOWER(${testimonialRecords.contactEmail}) = ${normalizedEmail}`,
        eq(testimonialRecords.sourceType, input.sourceType),
        eq(testimonialRecords.touchpoint, "product_followup"),
        eq(testimonialRecords.status, "approved_to_contact"),
        isNull(testimonialRecords.requestSentAt),
      ))
      .limit(1);
    if (pendingProductFollowup) {
      return {
        record: pendingProductFollowup,
        feedbackUrl: buildFeedbackUrl(pendingProductFollowup.publicToken),
        created: false,
      };
    }
  }

  if (shouldApplyFeedbackCooldown(input.touchpoint)) {
    const cooldownBoundary = Date.now() - settings.cooldownDays * 24 * 60 * 60 * 1000;
    const [recent] = await db.select({ id: testimonialRecords.id })
      .from(testimonialRecords)
      .where(and(
        sql`LOWER(${testimonialRecords.contactEmail}) = ${normalizedEmail}`,
        eq(testimonialRecords.surveyKind, "positive_experience"),
        gt(testimonialRecords.createdAt, cooldownBoundary),
      ))
      .limit(1);
    if (recent) return null;
  }

  const now = Date.now();
  const token = crypto.randomBytes(32).toString("hex");
  const draft = buildTestimonialDraft({ firstName: input.contactName, sourceType: input.sourceType });
  const scheduledAt = Object.prototype.hasOwnProperty.call(input, "scheduledAt")
    ? input.scheduledAt ?? null
    : input.deliveryChannel === "email" ? now : null;
  try {
    const result = await db.insert(testimonialRecords).values({
      publicToken: token,
      requestKey: input.requestKey,
      surveyKind: "positive_experience",
      touchpoint: input.touchpoint,
      deliveryChannel: input.deliveryChannel,
      status: input.deliveryChannel === "onsite" ? "sent" : "approved_to_contact",
      proofType: input.proofType,
      sourceType: input.sourceType,
      singleId: input.singleId ?? null,
      crmLeadId: input.crmLeadId ?? null,
      matchId: input.matchId ?? null,
      contactName: input.contactName,
      contactEmail: normalizedEmail,
      contactPhone: input.contactPhone ?? null,
      sourceSnapshot: input.sourceSnapshot ? JSON.stringify(input.sourceSnapshot) : null,
      draftSubject: draft.subject,
      draftBody: draft.body,
      scheduledAt,
      requestApprovedAt: now,
      requestApprovedBy: "system",
      requestSentAt: input.deliveryChannel === "onsite" ? now : null,
      rewardType: "date_map",
      incentiveDisclosureRequired: true,
      createdAt: now,
      updatedAt: now,
    });
    const recordId = Number((result as unknown as [{ insertId: number }])[0]?.insertId ?? 0);
    await db.insert(testimonialEvents).values({
      recordId,
      eventType: "created",
      actorType: "system",
      actorRef: input.touchpoint,
      metadata: JSON.stringify({ requestKey: input.requestKey, deliveryChannel: input.deliveryChannel }),
      createdAt: now,
    });
    const [record] = await db.select().from(testimonialRecords).where(eq(testimonialRecords.id, recordId)).limit(1);
    return record ? { record, feedbackUrl: buildFeedbackUrl(record.publicToken), created: true } : null;
  } catch (error) {
    const [raceWinner] = await db.select().from(testimonialRecords)
      .where(eq(testimonialRecords.requestKey, input.requestKey))
      .limit(1);
    if (raceWinner) return { record: raceWinner, feedbackUrl: buildFeedbackUrl(raceWinner.publicToken), created: false };
    throw error;
  }
}

export async function markFeedbackRequestSent(recordId: number, providerMessageId?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  await db.update(testimonialRecords).set({ status: "sent", requestSentAt: now, updatedAt: now })
    .where(eq(testimonialRecords.id, recordId));
  await db.insert(testimonialEvents).values({
    recordId,
    eventType: "request_marked_sent",
    actorType: "system",
    actorRef: "feedback-automation",
    metadata: providerMessageId ? JSON.stringify({ providerMessageId }) : null,
    createdAt: now,
  });
}

async function queueWeekMatchRequests(now: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const eligibleMatches = await db.select().from(matches)
    .where(and(
      eq(matches.status, "matched"),
      eq(matches.approvedByA, true),
      eq(matches.approvedByB, true),
      isNull(matches.returnedToPoolAt),
      lte(matches.matchedAt, now - MATCH_WEEK_DELAY_MS),
      gt(matches.matchedAt, now - 180 * 24 * 60 * 60 * 1000),
    ))
    .limit(200);
  let created = 0;
  for (const match of eligibleMatches) {
    const people = await db.select().from(singles)
      .where(or(eq(singles.id, match.singleAId), eq(singles.id, match.singleBId)));
    for (const person of people) {
      if (!person.email || person.isSeed || !person.isActive) continue;
      const request = await ensurePositiveFeedbackRequest({
        requestKey: buildFeedbackRequestKey({ touchpoint: "match_week", subjectId: match.id, contactId: person.id }),
        touchpoint: "match_week",
        deliveryChannel: "email",
        proofType: "progress",
        sourceType: "match",
        contactName: person.firstName,
        contactEmail: person.email,
        contactPhone: person.phone,
        singleId: person.id,
        matchId: match.id,
        sourceSnapshot: { matchedAt: match.matchedAt, matchStillActive: true },
        scheduledAt: now,
      });
      if (request?.created) created += 1;
    }
  }
  return created;
}

export async function processFeedbackAutomation(now = Date.now()): Promise<{
  enabled: boolean;
  queued: number;
  sent: number;
  failed: number;
}> {
  const db = await getDb();
  const settings = await getSettings();
  if (!db || !settings?.enabled) return { enabled: false, queued: 0, sent: 0, failed: 0 };
  const queued = settings.matchWeekReminderEnabled ? await queueWeekMatchRequests(now) : 0;
  const due = await db.select().from(testimonialRecords)
    .where(and(
      eq(testimonialRecords.status, "approved_to_contact"),
      eq(testimonialRecords.deliveryChannel, "email"),
      isNull(testimonialRecords.requestSentAt),
      lte(testimonialRecords.scheduledAt, now),
    ))
    .limit(settings.maxEmailsPerRun);
  let sent = 0;
  let failed = 0;
  for (const record of due) {
    if (!(await canEmailContact(record.contactEmail))) continue;
    const claim = await db.update(testimonialRecords)
      .set({ status: "sent", requestSentAt: now, updatedAt: now })
      .where(and(
        eq(testimonialRecords.id, record.id),
        eq(testimonialRecords.status, "approved_to_contact"),
        isNull(testimonialRecords.requestSentAt),
      ));
    const affectedRows = Number((claim as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
    if (affectedRows !== 1) continue;
    const email = buildFeedbackRequestEmail({
      firstName: record.contactName.trim().split(/\s+/)[0] || "שלום",
      sourceType: record.sourceType,
      feedbackUrl: buildFeedbackUrl(record.publicToken),
      reminder: record.touchpoint === "match_week",
    });
    const delivery = await sendEmail({
      to: { email: record.contactEmail, name: record.contactName },
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent,
    });
    if (delivery.success) {
      sent += 1;
      await db.insert(testimonialEvents).values({
        recordId: record.id,
        eventType: "request_marked_sent",
        actorType: "system",
        actorRef: "feedback-automation",
        metadata: delivery.messageId ? JSON.stringify({ providerMessageId: delivery.messageId }) : null,
        createdAt: now,
      });
    } else {
      failed += 1;
      await db.update(testimonialRecords)
        .set({ status: "approved_to_contact", requestSentAt: null, updatedAt: Date.now() })
        .where(eq(testimonialRecords.id, record.id));
    }
  }
  return { enabled: true, queued, sent, failed };
}

export async function runScheduledFeedbackAutomation(taskUid: string, now = Date.now()): Promise<{
  enabled: boolean;
  queued: number;
  sent: number;
  failed: number;
  skipped?: "orphan" | "disabled";
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [settings] = await db.select().from(feedbackAutomationSettings)
    .where(eq(feedbackAutomationSettings.scheduleCronTaskUid, taskUid))
    .limit(1);
  if (!settings) return { enabled: false, queued: 0, sent: 0, failed: 0, skipped: "orphan" };
  if (!settings.enabled) return { enabled: false, queued: 0, sent: 0, failed: 0, skipped: "disabled" };
  return processFeedbackAutomation(now);
}
