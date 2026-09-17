import crypto from "node:crypto";
import { and, eq, gt, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import {
  crmLeads,
  emailLog,
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
import { buildSignedUnsubscribeUrl, isEmailMarketingSuppressed } from "./emailUnsubscribe";
import { normalizeIsraeliMobile, sendSMSDetailed } from "./vibrate";
import {
  buildTestimonialDraft,
  normalizeTestimonialEmail,
  type TestimonialCampaignVariant,
  type TestimonialProofType,
  type TestimonialRewardType,
  type TestimonialSourceType,
  type TestimonialSurveyKind,
  type TestimonialTouchpoint,
} from "./testimonialService";

const SITE_BASE = "https://hilitcaspi.com";
const MATCH_WEEK_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
const DELIVERY_LEASE_MS = 10 * 60 * 1000;

export const FEEDBACK_EMAIL_JOURNEY = "testimonial_feedback_email_v1";
export const FEEDBACK_SMS_JOURNEY = "testimonial_feedback_sms_v1";

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

export function buildFeedbackSmsMessage(input: { firstName: string; contactEmail: string; feedbackUrl: string }): string {
  const firstName = input.firstName.trim().split(/\s+/)[0] || "שלום";
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.contactEmail });
  return `היי ${firstName}, שמחתי ששניכם אמרתם כן להתאמה 💗 אשמח לשמוע בכמה מילים על החוויה מהמאגר ומהדרך שבה נבחרה ההתאמה. הפידבק שלך יכול לעזור לעוד אנשים להכיר את המאגר ולהצטרף, וכך ליצור יותר הזדמנויות לכולם. למילוי קצר ולקבלת מתנה אישית: ${input.feedbackUrl} הילית\nלהסרה: ${unsubscribeUrl}`;
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
  contactEmail: string;
  sourceType: TestimonialSourceType;
  surveyKind?: TestimonialSurveyKind;
  feedbackUrl: string;
  reminder?: boolean;
  campaignVariant?: TestimonialCampaignVariant;
  draftSubject?: string | null;
  draftBody?: string | null;
  rewardType?: TestimonialRewardType;
}): { subject: string; htmlContent: string; textContent: string } {
  const surveyKind = input.surveyKind ?? "positive_experience";
  const draft = buildTestimonialDraft({
    firstName: input.firstName,
    sourceType: input.sourceType,
    surveyKind,
    campaignVariant: input.campaignVariant,
  });
  const isSatisfactionSurvey = surveyKind === "satisfaction_survey";
  const subject = input.draftSubject?.trim() || (input.reminder
    ? `${input.firstName}, אשמח לשמוע איך מתקדמת החוויה שלך`
    : draft.subject);
  const intro = input.draftBody?.trim() || (input.reminder
    ? "עבר שבוע מאז החיבור, ואם ההיכרות עדיין ממשיכה אשמח לשמוע בכמה מילים איך זה מרגיש עד עכשיו."
    : draft.body);
  const hasReward = (input.rewardType ?? "date_map") !== "none";
  const heading = input.campaignVariant === "match_success_followup"
    ? "אשמח לשמוע מה שלומכם היום"
    : input.campaignVariant === "dna_engaged_nonbuyers"
      ? "אשמח לשמוע איך היה שאלון ה־DNA"
      : "אשמח לשמוע על החוויה שלך";
  const ctaLabel = input.campaignVariant === "match_success_followup"
    ? "לספר מה שלומכם"
    : hasReward
      ? "אשמח לשתף ולקבל את המתנה שלי"
      : "אשמח לשתף";
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.contactEmail });
  if (isSatisfactionSurvey) {
    return {
      subject,
      htmlContent: `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;background:#f7f3ef;font-family:Arial,sans-serif;color:#2a1712"><div style="max-width:620px;margin:0 auto;padding:28px 14px"><div style="background:linear-gradient(135deg,#2a1712,#6f3f52);color:#fff;border-radius:28px 28px 0 0;padding:34px 30px"><div style="font-size:13px;letter-spacing:2px;color:#f3d9df">הילית כספי</div><h1 style="font-size:30px;line-height:1.3;margin:14px 0 0">חשוב לי לשמוע איך הייתה החוויה שלך עד עכשיו</h1></div><div style="background:#fff;border-radius:0 0 28px 28px;padding:30px;box-shadow:0 18px 50px rgba(65,34,44,.12)"><p style="font-size:17px;line-height:1.8;margin:0">היי ${input.firstName},</p><p style="font-size:17px;line-height:1.8">${intro}</p><div style="background:#faf6f3;border:1px solid #eadfd7;border-radius:16px;padding:18px 20px;margin:22px 0"><p style="font-size:16px;line-height:1.8;margin:0"><strong>זהו סקר שביעות רצון קצר ונפרד.</strong> המטרה היא להבין מה עובד ומה נכון לשפר. התשובות נשמרות לצורכי למידה ולא יפורסמו ללא בקשת רשות נפרדת.</p></div><div style="text-align:center;margin:30px 0"><a href="${input.feedbackUrl}" style="display:inline-block;background:#6f3f52;color:#fff;text-decoration:none;border-radius:999px;padding:16px 30px;font-size:17px;font-weight:bold">למילוי הסקר הקצר</a></div><p style="font-size:16px;line-height:1.8;margin-top:28px">תודה על הזמן ועל הכנות,<br><strong>הילית</strong></p><p style="margin:28px 0 0;text-align:center;font-size:12px;color:#8a766d"><a href="${unsubscribeUrl}" style="color:#8a766d;text-decoration:underline">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
      textContent: `היי ${input.firstName},\n\n${intro}\n\nזהו סקר שביעות רצון קצר ונפרד. המטרה היא להבין מה עובד ומה נכון לשפר. התשובות נשמרות לצורכי למידה ולא יפורסמו ללא בקשת רשות נפרדת.\n\nלמילוי הסקר:\n${input.feedbackUrl}\n\nתודה על הזמן ועל הכנות,\nהילית\n\nלהסרה מרשימת התפוצה:\n${unsubscribeUrl}`,
    };
  }
  const rewardHtml = hasReward
    ? `<p style="font-size:16px;line-height:1.8">בסיום מחכה לך מתנה אישית ממני: <strong>מפת הדייט הבא</strong>. המתנה ניתנת על עצם השיתוף, גם בלי אישור לפרסם.</p>`
    : "";
  const rewardText = hasReward
    ? "\n\nבסיום מחכה לך מתנה אישית ממני: מפת הדייט הבא. המתנה ניתנת על עצם השיתוף, גם בלי אישור לפרסם."
    : "";
  return {
    subject,
    htmlContent: `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;background:#fff3f6;font-family:Arial,sans-serif;color:#432432"><div style="max-width:620px;margin:0 auto;padding:28px 14px"><div style="background:linear-gradient(135deg,#6f3f52,#a75f78);color:#fff;border-radius:28px 28px 0 0;padding:34px 30px"><div style="font-size:13px;letter-spacing:2px;color:#f6d9e4">הילית כספי</div><h1 style="font-size:30px;line-height:1.3;margin:14px 0 0">${heading}</h1></div><div style="background:#fff;border-radius:0 0 28px 28px;padding:30px;box-shadow:0 18px 50px rgba(102,49,70,.12)"><p style="font-size:17px;line-height:1.8;margin:0">היי ${input.firstName},</p><p style="font-size:17px;line-height:1.8">${intro}</p><div style="background:#fff2f6;border:1px solid #efcad7;border-radius:16px;padding:18px 20px;margin:22px 0"><p style="font-size:16px;line-height:1.8;margin:0"><strong>החוויה שלך יכולה לעזור לקהילה הזאת לגדול.</strong> הפלטפורמה נולדה כדי לעזור לאנשים למצוא אהבה בדרך אנושית ומדויקת יותר. כשמשתפים חוויה אמיתית ומאפשרים לנו לפרסם אותה, עוד אנשים יכולים להכיר את הדרך, להצטרף לקהילה ולהוסיף עוד הזדמנויות להיכרות ולהתאמות עבור כולם.</p><p style="font-size:16px;line-height:1.8;margin:12px 0 0"><strong>גם כמה מילים שלך יכולות לעזור לאדם נוסף לעשות את הצעד הראשון.</strong></p></div>${rewardHtml}<div style="text-align:center;margin:30px 0"><a href="${input.feedbackUrl}" style="display:inline-block;background:#a75f78;color:#fff;text-decoration:none;border-radius:999px;padding:16px 30px;font-size:17px;font-weight:bold">${ctaLabel}</a></div><p style="font-size:14px;line-height:1.7;color:#795e69">רק אם מתאים לך, אפשר לבחור בטופס בנפרד מה מותר לנו לשתף, היכן ובאיזו זהות. שום דבר לא מתפרסם אוטומטית.</p><p style="font-size:16px;line-height:1.8;margin-top:28px">באהבה,<br><strong>הילית</strong></p><p style="margin:28px 0 0;text-align:center;font-size:12px;color:#9b7b87"><a href="${unsubscribeUrl}" style="color:#9b7b87;text-decoration:underline">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
    textContent: `היי ${input.firstName},\n\n${intro}\n\nהחוויה שלך יכולה לעזור לקהילה הזאת לגדול. הפלטפורמה נולדה כדי לעזור לאנשים למצוא אהבה בדרך אנושית ומדויקת יותר. כשמשתפים חוויה אמיתית ומאפשרים לנו לפרסם אותה, עוד אנשים יכולים להכיר את הדרך, להצטרף לקהילה ולהוסיף עוד הזדמנויות להיכרות ולהתאמות עבור כולם. גם כמה מילים שלך יכולות לעזור לאדם נוסף לעשות את הצעד הראשון.${rewardText}\n\n${input.feedbackUrl}\n\nבאהבה,\nהילית\n\nלהסרה מרשימת התפוצה:\n${unsubscribeUrl}`,
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
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || isPermanentlyBlockedEmail(normalizedEmail)) return false;
  const suppression = await isEmailMarketingSuppressed(normalizedEmail);
  return !suppression.suppressed;
}

async function canCreateFeedbackRequest(input: {
  contactEmail: string;
  singleId?: number | null;
  crmLeadId?: number | null;
}): Promise<boolean> {
  const db = await getDb();
  if (!db || !(await canEmailContact(input.contactEmail))) return false;
  const normalizedEmail = normalizeTestimonialEmail(input.contactEmail);
  if (input.singleId) {
    const [single] = await db.select({
      email: singles.email,
      isActive: singles.isActive,
      isSeed: singles.isSeed,
      consentEmailMarketing: singles.consentEmailMarketing,
    }).from(singles).where(eq(singles.id, input.singleId)).limit(1);
    if (!single?.isActive || single.isSeed || !single.consentEmailMarketing || normalizeTestimonialEmail(single.email || "") !== normalizedEmail) {
      return false;
    }
  }
  if (input.crmLeadId) {
    const [lead] = await db.select({ emailUnsubscribed: crmLeads.emailUnsubscribed })
      .from(crmLeads).where(eq(crmLeads.id, input.crmLeadId)).limit(1);
    if (lead?.emailUnsubscribed) return false;
  }
  return true;
}

export function isFeedbackDraftSendable(record: Pick<TestimonialRecord, "status" | "requestSentAt" | "contactEmail">) {
  const normalizedEmail = normalizeTestimonialEmail(record.contactEmail);
  return Boolean(normalizedEmail
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    && !record.requestSentAt
    && ["draft", "candidate", "approved_to_contact"].includes(record.status));
}

function campaignVariantFromSnapshot(sourceSnapshot: string | null): TestimonialCampaignVariant | undefined {
  if (!sourceSnapshot) return undefined;
  try {
    const value = (JSON.parse(sourceSnapshot) as { campaignVariant?: unknown }).campaignVariant;
    return typeof value === "string" ? value as TestimonialCampaignVariant : undefined;
  } catch {
    return undefined;
  }
}

async function canSendFeedbackRecord(db: any, record: TestimonialRecord) {
  if (!(await canEmailContact(record.contactEmail))) return false;
  if (record.singleId) {
    const [single] = await db.select({ isActive: singles.isActive, consentEmailMarketing: singles.consentEmailMarketing })
      .from(singles).where(eq(singles.id, record.singleId)).limit(1);
    if (!single?.isActive || !single.consentEmailMarketing) return false;
  }
  if (record.crmLeadId) {
    const [lead] = await db.select({ emailUnsubscribed: crmLeads.emailUnsubscribed })
      .from(crmLeads).where(eq(crmLeads.id, record.crmLeadId)).limit(1);
    if (lead?.emailUnsubscribed) return false;
  }
  return true;
}

function trackedFeedbackEmail(htmlContent: string, emailLogId: number, feedbackUrl: string) {
  const clickUrl = `${SITE_BASE}/api/email/click/${emailLogId}?url=${encodeURIComponent(feedbackUrl)}`;
  const pixel = `<img src="${SITE_BASE}/api/email/open/${emailLogId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`;
  return htmlContent.replace(feedbackUrl, clickUrl).replace("</body>", `${pixel}</body>`);
}

export async function sendFeedbackRequestNow(input: { recordId: number; approvedBy: string }): Promise<{ status: "accepted" | "already_sent" | "archived" | "failed" }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [record] = await db.select().from(testimonialRecords).where(eq(testimonialRecords.id, input.recordId)).limit(1);
  if (!record) throw new Error("Feedback draft was not found");
  if (record.requestSentAt || record.status === "sent") return { status: "already_sent" };
  if (!isFeedbackDraftSendable(record)) throw new Error("Feedback record is not ready for email delivery");

  const now = Date.now();
  if (!(await canSendFeedbackRecord(db, record))) {
    await db.update(testimonialRecords).set({ status: "archived", archivedAt: now, updatedAt: now })
      .where(and(eq(testimonialRecords.id, record.id), isNull(testimonialRecords.requestSentAt)));
    await db.insert(testimonialEvents).values({
      recordId: record.id,
      eventType: "archived",
      actorType: "system",
      actorRef: "testimonial-manual-send-preflight",
      metadata: JSON.stringify({ reason: "suppressed_inactive_or_no_consent" }),
      createdAt: now,
    });
    return { status: "archived" };
  }

  const claim = await db.update(testimonialRecords).set({
    status: "candidate",
    deliveryChannel: "email",
    requestApprovedAt: now,
    requestApprovedBy: input.approvedBy,
    scheduledAt: null,
    updatedAt: now,
  }).where(and(
    eq(testimonialRecords.id, record.id),
    isNull(testimonialRecords.requestSentAt),
    or(eq(testimonialRecords.status, "draft"), eq(testimonialRecords.status, "candidate"), eq(testimonialRecords.status, "approved_to_contact")),
  ));
  const claimed = Number((claim as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
  if (claimed !== 1) return { status: "already_sent" };

  await db.insert(testimonialEvents).values({
    recordId: record.id,
    eventType: "contact_approved",
    actorType: "team",
    actorRef: input.approvedBy,
    metadata: JSON.stringify({ channel: "email", sentFrom: "testimonial_crm" }),
    createdAt: now,
  });

  const feedbackUrl = buildFeedbackUrl(record.publicToken);
  const email = buildFeedbackRequestEmail({
    firstName: record.contactName.trim().split(/\s+/)[0] || "שלום",
    contactEmail: record.contactEmail,
    sourceType: record.sourceType,
    surveyKind: record.surveyKind,
    feedbackUrl,
    reminder: record.touchpoint === "match_week",
    campaignVariant: campaignVariantFromSnapshot(record.sourceSnapshot),
    draftSubject: record.draftSubject,
    draftBody: record.draftBody,
    rewardType: record.rewardType,
  });

  const [existingLog] = await db.select().from(emailLog).where(and(
    inArray(emailLog.journeyKey, ["testimonial_request", FEEDBACK_EMAIL_JOURNEY]),
    eq(emailLog.emailIndex, record.id),
  )).limit(1);
  if (existingLog?.status === "sent" && existingLog.sentAt) {
    await db.update(testimonialRecords).set({ status: "sent", requestSentAt: existingLog.sentAt, updatedAt: Date.now() })
      .where(eq(testimonialRecords.id, record.id));
    return { status: "already_sent" };
  }

  let emailLogId = existingLog?.id || 0;
  if (!emailLogId) {
    const inserted = await db.insert(emailLog).values({
      leadId: record.crmLeadId,
      recipientEmail: record.contactEmail,
      recipientName: record.contactName,
      journeyKey: FEEDBACK_EMAIL_JOURNEY,
      emailIndex: record.id,
      subject: email.subject,
      htmlBody: email.htmlContent,
      textBody: email.textContent,
      scheduledAt: now,
      status: "processing",
      createdAt: now,
    });
    emailLogId = Number((inserted as unknown as [{ insertId?: number }])[0]?.insertId || 0);
  } else {
    await db.update(emailLog).set({ status: "processing", errorMessage: null }).where(eq(emailLog.id, emailLogId));
  }
  const htmlContent = emailLogId ? trackedFeedbackEmail(email.htmlContent, emailLogId, feedbackUrl) : email.htmlContent;
  if (emailLogId) await db.update(emailLog).set({ htmlBody: htmlContent }).where(eq(emailLog.id, emailLogId));

  const delivery = await sendEmail({
    to: { email: record.contactEmail, name: record.contactName },
    subject: email.subject,
    htmlContent,
    textContent: email.textContent,
  });
  if (!delivery.success || delivery.messageId === "blocked") {
    if (emailLogId) await db.update(emailLog).set({ status: "failed", errorMessage: (delivery.error || "provider_rejected").slice(0, 500) }).where(eq(emailLog.id, emailLogId));
    await db.update(testimonialRecords).set({ status: record.status, requestApprovedAt: record.requestApprovedAt, requestApprovedBy: record.requestApprovedBy, requestSentAt: null, updatedAt: Date.now() })
      .where(and(eq(testimonialRecords.id, record.id), isNull(testimonialRecords.requestSentAt)));
    return { status: "failed" };
  }

  const acceptedAt = Date.now();
  await db.update(testimonialRecords).set({ status: "sent", requestSentAt: acceptedAt, updatedAt: acceptedAt })
    .where(and(eq(testimonialRecords.id, record.id), isNull(testimonialRecords.requestSentAt)));
  if (emailLogId) await db.update(emailLog).set({ status: "sent", sentAt: acceptedAt }).where(eq(emailLog.id, emailLogId));
  await db.insert(testimonialEvents).values({
    recordId: record.id,
    eventType: "request_marked_sent",
    actorType: "team",
    actorRef: input.approvedBy,
    metadata: JSON.stringify({ channel: "email", emailLogId, providerMessageId: delivery.messageId || null }),
    createdAt: acceptedAt,
  });
  return { status: "accepted" };
}

export type FeedbackSmsStatus = "accepted" | "already_sent" | "suppressed" | "invalid_phone" | "failed";

export async function sendFeedbackSmsNow(input: { recordId: number; sentBy: string }): Promise<{ status: FeedbackSmsStatus }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [record] = await db.select().from(testimonialRecords).where(eq(testimonialRecords.id, input.recordId)).limit(1);
  if (!record) throw new Error("Feedback record was not found");

  const [existingLog] = await db.select().from(emailLog).where(and(
    eq(emailLog.journeyKey, FEEDBACK_SMS_JOURNEY),
    eq(emailLog.emailIndex, record.id),
  )).limit(1);
  if (existingLog?.status === "sent" && existingLog.sentAt) return { status: "already_sent" };
  if (existingLog?.status === "processing" && existingLog.scheduledAt > Date.now() - DELIVERY_LEASE_MS) {
    return { status: "already_sent" };
  }

  if (!(await canSendFeedbackRecord(db, record))) return { status: "suppressed" };
  const phone = normalizeIsraeliMobile(record.contactPhone || "");
  if (!phone) return { status: "invalid_phone" };

  const now = Date.now();
  const feedbackUrl = buildFeedbackUrl(record.publicToken);
  const message = buildFeedbackSmsMessage({
    firstName: record.contactName,
    contactEmail: record.contactEmail,
    feedbackUrl,
  });
  let smsLogId = existingLog?.id || 0;
  if (!smsLogId) {
    const inserted = await db.insert(emailLog).values({
      leadId: record.crmLeadId,
      recipientEmail: record.contactEmail,
      recipientName: record.contactName,
      journeyKey: FEEDBACK_SMS_JOURNEY,
      emailIndex: record.id,
      subject: "[SMS] בקשת פידבק לאחר התאמה",
      htmlBody: "SMS delivery record",
      textBody: message,
      scheduledAt: now,
      status: "processing",
      createdAt: now,
    });
    smsLogId = Number((inserted as unknown as [{ insertId?: number }])[0]?.insertId || 0);
  } else {
    await db.update(emailLog).set({ status: "processing", scheduledAt: now, errorMessage: null })
      .where(eq(emailLog.id, smsLogId));
  }

  const delivery = await sendSMSDetailed(phone, message);
  const finishedAt = Date.now();
  if (!delivery.accepted) {
    if (smsLogId) {
      await db.update(emailLog).set({
        status: "failed",
        sentAt: finishedAt,
        errorMessage: delivery.error || "provider_rejected",
      }).where(eq(emailLog.id, smsLogId));
    }
    return { status: "failed" };
  }

  if (smsLogId) {
    await db.update(emailLog).set({
      status: "sent",
      sentAt: finishedAt,
      errorMessage: delivery.providerRunId,
    }).where(eq(emailLog.id, smsLogId));
  }
  await db.insert(testimonialEvents).values({
    recordId: record.id,
    eventType: "request_marked_sent",
    actorType: "system",
    actorRef: input.sentBy,
    metadata: JSON.stringify({ channel: "sms", smsLogId, providerRunId: delivery.providerRunId }),
    createdAt: finishedAt,
  });
  return { status: "accepted" };
}

export async function sendFeedbackOutreachNow(input: { recordId: number; sentBy: string; includeSms: boolean }) {
  const email = await sendFeedbackRequestNow({ recordId: input.recordId, approvedBy: input.sentBy });
  const sms = input.includeSms
    ? await sendFeedbackSmsNow({ recordId: input.recordId, sentBy: input.sentBy })
    : { status: "suppressed" as const };
  return { email: email.status, sms: sms.status };
}

export async function sendFeedbackRequestBatch(input: { recordIds: number[]; approvedBy: string; concurrency?: number }) {
  const uniqueIds = Array.from(new Set(input.recordIds));
  if (uniqueIds.length === 0 || uniqueIds.length > 150) throw new Error("Choose between 1 and 150 feedback drafts");
  const results: Array<{ status: "accepted" | "already_sent" | "archived" | "failed" }> = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(input.concurrency ?? 4, uniqueIds.length) }, async () => {
    while (cursor < uniqueIds.length) {
      const id = uniqueIds[cursor++];
      results.push(await sendFeedbackRequestNow({ recordId: id, approvedBy: input.approvedBy }));
    }
  });
  await Promise.all(workers);
  return {
    total: uniqueIds.length,
    accepted: results.filter(result => result.status === "accepted").length,
    alreadySent: results.filter(result => result.status === "already_sent").length,
    archived: results.filter(result => result.status === "archived").length,
    failed: results.filter(result => result.status === "failed").length,
  };
}

function israelCalendarDateParts(now: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value || 0);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function israelMidnightUtc(year: number, month: number, day: number) {
  const target = Date.UTC(year, month - 1, day);
  let candidate = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const value = (type: string) => Number(parts.find(part => part.type === type)?.value || 0);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    candidate -= represented - target;
  }
  return candidate;
}

export function recentIsraelCalendarWindow(now = Date.now(), days = 3) {
  const today = israelCalendarDateParts(now);
  const startCalendar = new Date(Date.UTC(today.year, today.month - 1, today.day - Math.max(1, days) + 1));
  const endCalendar = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
  return {
    startAt: israelMidnightUtc(startCalendar.getUTCFullYear(), startCalendar.getUTCMonth() + 1, startCalendar.getUTCDate()),
    endAt: israelMidnightUtc(endCalendar.getUTCFullYear(), endCalendar.getUTCMonth() + 1, endCalendar.getUTCDate()),
  };
}

export async function prepareRecentMutualFeedbackRequests(input: {
  now?: number;
  days?: number;
  execute: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = input.now ?? Date.now();
  const { startAt, endAt } = recentIsraelCalendarWindow(now, input.days ?? 3);
  const recentMatches = await db.select().from(matches).where(and(
    gte(matches.proposedAt, startAt),
    lt(matches.proposedAt, endAt),
    eq(matches.approvedByA, true),
    eq(matches.approvedByB, true),
  ));
  const singleIds = Array.from(new Set(recentMatches.flatMap(match => [match.singleAId, match.singleBId]).filter(Boolean)));
  const people = singleIds.length ? await db.select().from(singles).where(inArray(singles.id, singleIds)) : [];
  const personById = new Map(people.map(person => [person.id, person]));
  const existing = recentMatches.length ? await db.select({
    matchId: testimonialRecords.matchId,
    singleId: testimonialRecords.singleId,
    contactEmail: testimonialRecords.contactEmail,
  }).from(testimonialRecords).where(
    inArray(testimonialRecords.status, ["draft", "candidate", "approved_to_contact", "sent", "submitted", "awaiting_consent", "awaiting_verification", "approved", "published"]),
  ) : [];
  const existingKeys = new Set(existing.map(row => `${row.matchId}:${row.singleId}`));
  const existingSingleIds = new Set(existing.map(row => row.singleId).filter(Boolean));
  const existingEmails = new Set(existing.map(row => normalizeTestimonialEmail(row.contactEmail || "")).filter(Boolean));

  let eligible = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedConsentOrStatus = 0;
  const recordIds: number[] = [];
  for (const match of recentMatches) {
    for (const singleId of [match.singleAId, match.singleBId]) {
      const person = personById.get(singleId);
      const key = `${match.id}:${singleId}`;
      const normalizedEmail = normalizeTestimonialEmail(person?.email || "");
      if (existingKeys.has(key) || existingSingleIds.has(singleId) || (normalizedEmail && existingEmails.has(normalizedEmail))) {
        skippedExisting += 1;
        continue;
      }
      if (!person?.email || !(await canCreateFeedbackRequest({ contactEmail: person.email, singleId: person.id }))) {
        skippedConsentOrStatus += 1;
        continue;
      }
      eligible += 1;
      if (!input.execute) continue;
      const request = await ensurePositiveFeedbackRequest({
        requestKey: buildFeedbackRequestKey({ touchpoint: "match_mutual", subjectId: match.id, contactId: person.id }),
        touchpoint: "match_mutual",
        deliveryChannel: "email",
        proofType: "success",
        sourceType: "match",
        contactName: person.firstName,
        contactEmail: person.email,
        contactPhone: person.phone,
        singleId: person.id,
        matchId: match.id,
        sourceSnapshot: {
          matchedAt: match.matchedAt,
          proposedAt: match.proposedAt,
          campaignVariant: "match_testimonial_request",
          cohort: "recent_mutual_three_israel_days",
        },
        scheduledAt: now,
      });
      if (request?.created) {
        created += 1;
        recordIds.push(request.record.id);
        existingKeys.add(key);
        existingSingleIds.add(person.id);
        existingEmails.add(normalizedEmail);
      }
    }
  }
  return {
    startAt,
    endAt,
    pairs: recentMatches.length,
    recipients: recentMatches.length * 2,
    eligible,
    created,
    skippedExisting,
    skippedConsentOrStatus,
    recordIds,
  };
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
  if (!normalizedEmail || !(await canCreateFeedbackRequest({
    contactEmail: normalizedEmail,
    singleId: input.singleId,
    crmLeadId: input.crmLeadId,
  }))) return null;

  const [existing] = await db.select().from(testimonialRecords)
    .where(eq(testimonialRecords.requestKey, input.requestKey))
    .limit(1);
  if (existing) {
    if (["archived", "revoked"].includes(existing.status)) return null;
    return { record: existing, feedbackUrl: buildFeedbackUrl(existing.publicToken), created: false };
  }

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
        inArray(testimonialRecords.status, ["draft", "candidate", "approved_to_contact", "sent", "submitted", "awaiting_consent", "awaiting_verification", "approved", "published"]),
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
      if (!person.email || person.isSeed || !person.isActive || !person.consentEmailMarketing) continue;
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
        sourceSnapshot: { matchedAt: match.matchedAt, matchStillActive: true, campaignVariant: "match_testimonial_reminder" },
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
  smsAccepted: number;
  smsFailed: number;
}> {
  const db = await getDb();
  const settings = await getSettings();
  if (!db || !settings?.enabled) return { enabled: false, queued: 0, sent: 0, failed: 0, smsAccepted: 0, smsFailed: 0 };
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
  let smsAccepted = 0;
  let smsFailed = 0;
  for (const record of due) {
    const result = await sendFeedbackOutreachNow({
      recordId: record.id,
      sentBy: "feedback-automation",
      includeSms: record.touchpoint === "match_mutual",
    });
    if (result.email === "accepted") sent += 1;
    else if (result.email === "failed") failed += 1;
    if (result.sms === "accepted") smsAccepted += 1;
    else if (result.sms === "failed") smsFailed += 1;
  }
  return { enabled: true, queued, sent, failed, smsAccepted, smsFailed };
}

export async function runScheduledFeedbackAutomation(taskUid: string, now = Date.now()): Promise<{
  enabled: boolean;
  queued: number;
  sent: number;
  failed: number;
  smsAccepted: number;
  smsFailed: number;
  skipped?: "orphan" | "disabled";
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [settings] = await db.select().from(feedbackAutomationSettings)
    .where(eq(feedbackAutomationSettings.scheduleCronTaskUid, taskUid))
    .limit(1);
  if (!settings) return { enabled: false, queued: 0, sent: 0, failed: 0, smsAccepted: 0, smsFailed: 0, skipped: "orphan" };
  if (!settings.enabled) return { enabled: false, queued: 0, sent: 0, failed: 0, smsAccepted: 0, smsFailed: 0, skipped: "disabled" };
  return processFeedbackAutomation(now);
}
