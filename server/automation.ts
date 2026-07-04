// © 2024–2025 Hilit Caspi. All rights reserved. Proprietary and confidential.
// שיטת ההתאמה, האלגוריתם והתכנים מוגנים בזכויות יוצרים ומהווים סוד מסחרי של הילית כספי.

/**
 * Automation service - handles email sequence scheduling and sending
 *
 * Each journey has 3 emails:
 *   Email 1: sent immediately
 *   Email 2: sent 24 hours later
 *   Email 3: sent 72 hours later (3 days)
 */

import { getDb, resetDb } from "./db";
import { emailLog, crmLeads, productAccessTokens, matches, singles } from "../drizzle/schema";
import { and, eq, lt, gt, isNull, isNotNull, or, sql } from "drizzle-orm";
import { sendEmail, addContactToList } from "./brevo";
import { sendWhatsApp } from "./joni";
import { EMAIL_SEQUENCES, renderTemplate, DNA_PROFILES, type JourneyKey, buildMatchFollowUpEmail } from "./emailTemplates";
import crypto from "crypto";

const SITE_BASE = "https://hilitcaspi.com";

/**
 * Generate a product access token for a buyer and return the personalized link.
 */
async function generateProductAccessToken(
  email: string,
  name: string,
  product: "guide_149" | "course_249"
): Promise<string> {
  const db = await getDb();
  if (!db) return product === "guide_149" ? `${SITE_BASE}/guide` : `${SITE_BASE}/course-sales`;

  // Check if token already exists for this email+product
  const [existing] = await db.select()
    .from(productAccessTokens)
    .where(and(eq(productAccessTokens.email, email), eq(productAccessTokens.product, product)))
    .limit(1);

  if (existing) {
    const path = product === "guide_149" ? "/guide/view" : "/course/view";
    return `${SITE_BASE}${path}?token=${existing.token}`;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
  const now = Date.now();

  await db.insert(productAccessTokens).values({
    token,
    email,
    name,
    product,
    expiresAt,
    accessCount: 0,
    createdAt: now,
  });

  const path = product === "guide_149" ? "/guide/view" : "/course/view";
  return `${SITE_BASE}${path}?token=${token}`;
}

// Delays for standard 3-email sequences
const EMAIL_DELAYS_HOURS_3 = [0, 24, 72]; // email 1, 2, 3
// Delays for extended 6-email sequences (first_step_v2)
const EMAIL_DELAYS_HOURS_6 = [0, 24, 96, 168, 240, 336]; // 0h, 1d, 4d, 7d, 10d, 14d
// Delays for matchmaking welcome 4-email sequence
const EMAIL_DELAYS_HOURS_4_MATCHMAKING = [0, 72, 168, 336]; // 0h, 3d, 7d, 14d
// Delays for guide purchase 4-email sequence (with 48h reminder)
const EMAIL_DELAYS_HOURS_4_GUIDE = [0, 48, 96, 168]; // 0h (delivery), 48h (reminder), 4d (engagement), 7d (upsell)

function getDelaysForSequence(length: number, journeyKey?: string): number[] {
  if (length === 6) return EMAIL_DELAYS_HOURS_6;
  if (length === 4 && journeyKey && journeyKey.includes("matchmaking_welcome")) return EMAIL_DELAYS_HOURS_4_MATCHMAKING;
  if (length === 4 && journeyKey && (journeyKey === "women_guide" || journeyKey === "men_guide")) return EMAIL_DELAYS_HOURS_4_GUIDE;
  return EMAIL_DELAYS_HOURS_3;
}

/**
 * Start an email journey for a contact.
 * Sends email 1 immediately and schedules emails 2 & 3.
 */
export async function startJourney({
  email,
  firstName,
  lastName,
  phone,
  gender,
  dnaType,
  journeyKey,
  leadId,
}: {
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  gender: "female" | "male";
  dnaType?: string;
  journeyKey: JourneyKey;
  leadId?: number;
}): Promise<void> {
  const sequence = EMAIL_SEQUENCES[journeyKey];
  if (!sequence) {
    console.error(`[Automation] Unknown journey key: ${journeyKey}`);
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error("[Automation] Database not available");
    return;
  }

  // Idempotency guard: check if this journey was already started for this email
  // Allow re-sending if the first email was sent more than 30 days ago (user may have re-engaged)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const existingEntries = await db
    .select({ id: emailLog.id, createdAt: emailLog.createdAt })
    .from(emailLog)
    .where(
      and(
        eq(emailLog.recipientEmail, email),
        eq(emailLog.journeyKey, journeyKey),
        eq(emailLog.emailIndex, 1)
      )
    )
    .limit(1);

  if (existingEntries.length > 0) {
    const existingCreatedAt = existingEntries[0].createdAt;
    if (existingCreatedAt > thirtyDaysAgo) {
      console.log(`[Automation] Journey ${journeyKey} already started for ${email} (within 30 days), skipping`);
      return;
    }
    console.log(`[Automation] Journey ${journeyKey} was started >30 days ago for ${email}, allowing re-send`);
  }

  // ── Journey exclusivity rules ──────────────────────────────────────────────
  // Rule 1: V1 and V2 of first_step are mutually exclusive.
  //   If starting V2, block if V1 is already active (within 30 days) and vice versa.
  // Rule 2: free_guide and first_step are mutually exclusive.
  //   If one is already active, don't start the other.
  const exclusiveJourneys: Record<string, string[]> = {
    women_first_step:    ["women_first_step_v2", "women_free_guide"],
    women_first_step_v2: ["women_first_step",    "women_free_guide"],
    women_free_guide:    ["women_first_step",     "women_first_step_v2"],
    men_first_step:      ["men_first_step_v2",    "men_free_guide"],
    men_first_step_v2:   ["men_first_step",       "men_free_guide"],
    men_free_guide:      ["men_first_step",        "men_first_step_v2"],
  };

  const conflictKeys = exclusiveJourneys[journeyKey] ?? [];
  if (conflictKeys.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const conflictEntries = await db
      .select({ id: emailLog.id, journeyKey: emailLog.journeyKey, createdAt: emailLog.createdAt })
      .from(emailLog)
      .where(
        and(
          eq(emailLog.recipientEmail, email),
          eq(emailLog.emailIndex, 1),
          inArray(emailLog.journeyKey, conflictKeys)
        )
      )
      .limit(1);

    if (conflictEntries.length > 0 && conflictEntries[0].createdAt > thirtyDaysAgo) {
      console.log(
        `[Automation] Journey ${journeyKey} blocked for ${email}, conflicting journey ${
          conflictEntries[0].journeyKey
        } is already active`
      );
      return;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Map journeyKey to a human-readable SOURCE value for Brevo
  const JOURNEY_SOURCE_MAP: Record<string, string> = {
    women_first_step_v2:       "שאלון DNA",
    men_first_step_v2:         "שאלון DNA",
    women_first_step:          "שאלון DNA",
    men_first_step:            "שאלון DNA",
    free_guide_nurture:        "מדריך חינמי - Meta",
    meta_lead_dna:             "Meta Lead - שאלון DNA",
    sales_call_lead:           "Meta Lead - שיחת היכרות",
    women_matchmaking_welcome: "מאגר רווקים",
    men_matchmaking_welcome:   "מאגר רווקים",
    women_matchmaking:         "מאגר רווקים",
    men_matchmaking:           "מאגר רווקים",
    women_guide:               "מדריך - רכישה",
    men_guide:                 "מדריך - רכישה",
    women_course:              "קורס - רכישה",
    men_course:                "קורס - רכישה",
    women_transformation:      "ליווי אישי",
    men_transformation:        "ליווי אישי",
    abandoned_guide:           "נטישת עגלה - מדריך",
    abandoned_database:        "נטישת עגלה - מאגר",
    abandoned_course:          "נטישת עגלה - קורס",
    abandoned_coaching:        "נטישת עגלה - ליווי",
  };
  const sourceLabel = JOURNEY_SOURCE_MAP[journeyKey] ?? journeyKey;

  // Add contact to Brevo list
  await addContactToList({
    email,
    firstName,
    lastName,
    phone,
    attributes: {
      DNA_TYPE: dnaType ?? "",
      GENDER: gender,
      SOURCE: sourceLabel,
    },
    listKey: journeyKey,
  });

  // Generate product access link if this is a purchase journey
  let guideLink = `${SITE_BASE}/guide`;
  let courseLink = `${SITE_BASE}/course-sales`;
  if (journeyKey === "women_guide" || journeyKey === "men_guide") {
    guideLink = await generateProductAccessToken(email, firstName, "guide_149");
  } else if (journeyKey === "women_course" || journeyKey === "men_course") {
    courseLink = await generateProductAccessToken(email, firstName, "course_249");
  }

  // Resolve DNA profile details for email personalization
  const dnaProfile = dnaType ? DNA_PROFILES[dnaType] : null;
  const isF = gender === "female";

  // Schedule all emails in the sequence
  const delays = getDelaysForSequence(sequence.length, journeyKey);
  for (let i = 0; i < sequence.length; i++) {
    const template = sequence[i];
    const rendered = renderTemplate(template, {
      firstName,
      dnaType: dnaType ?? "לא ידוע",
      dnaTypeLabel: dnaProfile ? (isF ? dnaProfile.label_f : dnaProfile.label_m) : "לא ידוע",
      dnaTypeSubtitle: dnaProfile?.subtitle ?? "",
      dnaTypeSuperpower: dnaProfile?.superpower ?? "",
      dnaTypeChallenge: dnaProfile?.challenge ?? "",
      dnaTypeMatch: dnaProfile ? (isF ? dnaProfile.match_f : dnaProfile.match_m) : "",
      guideLink,
      courseLink,
    }, email, leadId);

    const scheduledAt = new Date();
    scheduledAt.setHours(scheduledAt.getHours() + delays[i]);

    const insertResult = await db.insert(emailLog).values({
      leadId: leadId ?? null,
      recipientEmail: email,
      recipientName: firstName,
      journeyKey,
      emailIndex: i + 1,
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      textBody: rendered.textBody,
      scheduledAt: scheduledAt.getTime(),
      sentAt: null,
      status: "pending",
      createdAt: Date.now(),
    });
    const insertedId = (insertResult as any)[0]?.insertId ?? (insertResult as any).insertId;
    // Send email 1 immediately
    if (i === 0 && insertedId) {
      await sendScheduledEmail({
        db,
        emailLogId: insertedId,
        email,
        firstName,
        subject: rendered.subject,
        htmlBody: rendered.htmlBody,
        textBody: rendered.textBody,
        journeyKey,
        emailIndex: 1,
      });
    }
  }
}

/**
 * Send a single email and mark it as sent in the log
 */
async function sendScheduledEmail({
  db,
  emailLogId,
  email,
  firstName,
  subject,
  htmlBody,
  textBody,
  journeyKey,
  emailIndex,
}: {
  db: Awaited<ReturnType<typeof getDb>>;
  emailLogId: number;
  email: string;
  firstName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  journeyKey: string;
  emailIndex: number;
}): Promise<void> {
  if (!db) return;
  const result = await sendEmail({
    to: { email, name: firstName },
    subject,
    htmlContent: htmlBody,
    textContent: textBody,
  });
  // Update log entry to mark as sent - use ID to avoid updating duplicate rows
  await db
    .update(emailLog)
    .set({
      sentAt: Date.now(),
      status: result.success ? "sent" : "failed",
      errorMessage: result.error ?? null,
    })
    .where(eq(emailLog.id, emailLogId));;

  if (result.success) {
    console.log(`[Automation] ✓ Sent email ${emailIndex} for journey ${journeyKey} to ${email}`);
  } else {
    console.error(`[Automation] ✗ Failed email ${emailIndex} for journey ${journeyKey} to ${email}:`, result.error);
  }
}

/**
 * Inject tracking pixel and wrap CTA links with click tracking for a given emailLogId
 */
function injectEmailTracking(html: string, emailLogId: number): string {
  const base = SITE_BASE;
  // 1. Inject open-tracking pixel just before </body>
  const pixel = `<img src="${base}/api/email/open/${emailLogId}" width="1" height="1" alt="" style="display:none;border:0;width:1px;height:1px;" />`;
  html = html.replace('</body>', `${pixel}</body>`);
  // 2. Wrap all <a href="..."> links (except unsubscribe and pixel links) with click tracking
  html = html.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*?)>/gi, (match, before, url, after) => {
    // Skip tracking for: unsubscribe, already-tracked, mailto, tel, pixel links
    if (url.includes('/unsubscribe') || url.includes('/api/email/') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return match;
    }
    const trackedUrl = `${base}/api/email/click/${emailLogId}?url=${encodeURIComponent(url)}`;
    return `<a ${before}href="${trackedUrl}"${after}>`;
  });
  return html;
}

/**
 * Process pending scheduled emails - called every 5 minutes by the server
 * Sends any emails where scheduledAt <= now and sentAt is null
 */
export async function processPendingEmails(): Promise<number> {
  let db = await getDb();
  if (!db) return 0;

  const now = Date.now();

  let pending;
  try {
    pending = await db
      .select()
      .from(emailLog)
      .where(
        and(
          eq(emailLog.status, "pending"),
          lt(emailLog.scheduledAt, now)
        )
      )
      .limit(50);
  } catch (err: any) {
    // On connection reset, reset pool and retry once
    if (err?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNRESET') {
      console.warn('[Automation] DB connection reset, reconnecting...');
      resetDb();
      db = await getDb();
      if (!db) return 0;
      pending = await db
        .select()
        .from(emailLog)
        .where(
          and(
            eq(emailLog.status, "pending"),
            lt(emailLog.scheduledAt, now)
          )
        )
        .limit(50);
    } else {
      throw err;
    }
  }

  let sent = 0;
  for (const entry of pending) {
    // Skip if lead has unsubscribed
    if (entry.leadId) {
      const lead = await db
        .select({ emailUnsubscribed: crmLeads.emailUnsubscribed, status: crmLeads.status })
        .from(crmLeads)
        .where(eq(crmLeads.id, entry.leadId))
        .limit(1);

      if (lead[0]?.emailUnsubscribed) {
        // Mark as cancelled (use 'failed' status with note)
        await db.update(emailLog)
          .set({ status: "failed", errorMessage: "unsubscribed", sentAt: Date.now() })
          .where(eq(emailLog.id, entry.id));
        console.log(`[Automation] Skipped email ${entry.emailIndex} for ${entry.recipientEmail} - unsubscribed`);
        continue;
      }

      // Smart stopping: if lead already converted to a higher-value product,
      // skip promotional emails (email 2 and 3) in first_step and guide journeys
      const journeyKey = entry.journeyKey;
      const isPromotionalJourney = journeyKey.includes("first_step") || journeyKey.includes("first_step_v2") || journeyKey.includes("guide");
      const leadStatus = lead[0]?.status;
      const hasConverted = leadStatus === "client_coaching" || leadStatus === "client_database" || leadStatus === "client_guide" || leadStatus === "client_course";
      if (isPromotionalJourney && hasConverted && entry.emailIndex >= 2) {
        await db.update(emailLog)
          .set({ status: "failed", errorMessage: "already_converted", sentAt: Date.now() })
          .where(eq(emailLog.id, entry.id));
        console.log(`[Automation] Skipped email ${entry.emailIndex} for ${entry.recipientEmail} - already converted (${leadStatus})`);
        continue;
      }
    }

    // Atomic claim: mark as 'processing' BEFORE sending to prevent duplicate sends
    // This guards against race conditions when multiple server instances run in parallel
    const claimed = await db
      .update(emailLog)
      .set({ status: "processing" as any })
      .where(
        and(
          eq(emailLog.id, entry.id),
          eq(emailLog.status, "pending")  // only claim if still pending
        )
      );
    // MySQL/TiDB returns [ResultSetHeader, ...] where ResultSetHeader.affectedRows is the count
    const affectedRows = (claimed as any)[0]?.affectedRows ?? (claimed as any).rowsAffected ?? (claimed as any).affectedRows;
    if (affectedRows === 0) {
      // Another instance already claimed this email
      console.log(`[Automation] Email ${entry.id} already claimed by another instance, skipping`);
      continue;
    }
    // Inject open pixel + click tracking before sending
    const trackedHtml = injectEmailTracking(entry.htmlBody, entry.id);
    await sendScheduledEmail({
      db,
      emailLogId: entry.id,
      email: entry.recipientEmail,
      firstName: entry.recipientName ?? "",
      subject: entry.subject,
      htmlBody: trackedHtml,
      textBody: entry.textBody ?? "",
      journeyKey: entry.journeyKey,
      emailIndex: entry.emailIndex,
    });
    sent++;
  }

  if (sent > 0) {
    console.log(`[Automation] Processed ${sent} pending emails`);
  }

  return sent;
}

/**
 * Determine the journey key based on gender and journey type
 */
export function getJourneyKey(
  gender: "female" | "male",
  journeyType: "first_step" | "first_step_v2" | "guide" | "matchmaking" | "matchmaking_welcome" | "transformation" | "course"
): JourneyKey {
  const prefix = gender === "female" ? "women" : "men";
  return `${prefix}_${journeyType}` as JourneyKey;
}


/**
 * Send meeting reminder emails to leads with upcoming meetings.
 * Reminder 1: sent ~24 hours before the meeting
 * Reminder 2: sent ~2 hours before the meeting
 */
export async function processMeetingReminders(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = Date.now();
  let sent = 0;

  const leads = await db
    .select()
    .from(crmLeads)
    .where(
      and(
        isNotNull(crmLeads.meetingAt),
        eq(crmLeads.status, "call_scheduled")
      )
    )
    .limit(100);

  for (const lead of leads) {
    if (!lead.meetingAt) continue;
    const meetingTime = new Date(lead.meetingAt).getTime();
    const timeUntilMeeting = meetingTime - now;

    if (timeUntilMeeting < 0 || timeUntilMeeting > 25 * 60 * 60 * 1000) continue;

    const firstName = lead.name.split(" ")[0];
    const meetingTimeStr = new Date(lead.meetingAt).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const meetingDateStr = new Date(lead.meetingAt).toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    // Reminder 1: 24 hours before (20-25 hours window)
    if (
      !lead.meetingReminder1Sent &&
      timeUntilMeeting <= 25 * 60 * 60 * 1000 &&
      timeUntilMeeting >= 20 * 60 * 60 * 1000
    ) {
      const htmlReminder1 = [
        '<div dir="rtl" style="font-family:Arial;padding:20px;color:#191265;">',
        `<h2>שלום ${firstName}</h2>`,
        `<p>יש לנו פגישה מחר: ${meetingDateStr} בשעה ${meetingTimeStr}</p>`,
        '<a href="https://hilitcaspi.com/single-session" style="background:#ffe27c;color:#191265;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">תיאום מחדש</a>',
        `<p>הילית כספי</p>`,
        '</div>',
      ].join('');
      const r1 = await sendEmail({
        to: { email: lead.email, name: lead.name },
        subject: "תזכורת: הפגישה שלנו מחר",
        htmlContent: htmlReminder1,
      });
      if (r1.success) {
        await db.update(crmLeads).set({ meetingReminder1Sent: true }).where(eq(crmLeads.id, lead.id));
        console.log("[Reminders] Sent 24h reminder to " + lead.email);
        sent++;
      }
    }

    // Reminder 2: 2 hours before (1.5-2.5 hours window)
    if (
      !lead.meetingReminder2Sent &&
      timeUntilMeeting <= 2.5 * 60 * 60 * 1000 &&
      timeUntilMeeting >= 1.5 * 60 * 60 * 1000
    ) {
      const htmlReminder2 = [
        '<div dir="rtl" style="font-family:Arial;padding:20px;color:#191265;">',
        `<h2>שלום ${firstName}!</h2>`,
        `<p>הפגישה שלנו בעוד שעתיים - היום בשעה ${meetingTimeStr}</p>`,
        '<a href="https://wa.me/972552442334" style="background:#25D366;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">וואטסאפ</a>',
        `<p>הילית כספי</p>`,
        '</div>',
      ].join('');
      const r2 = await sendEmail({
        to: { email: lead.email, name: lead.name },
        subject: "הפגישה שלנו בעוד שעתיים!",
        htmlContent: htmlReminder2,
      });
      if (r2.success) {
        await db.update(crmLeads).set({ meetingReminder2Sent: true }).where(eq(crmLeads.id, lead.id));
        console.log("[Reminders] Sent 2h reminder to " + lead.email);
        sent++;
      }
    }
  }

  return sent;
}

/**
 * Process match follow-up emails, sends a warm follow-up 7 days after proposal
 * if one or both parties haven't responded yet.
 * Collects feedback data without creating negative experience.
 */
export async function processMatchFollowUps(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const SITE_BASE = "https://hilitcaspi.com";

  // Find proposed matches from 7+ days ago where at least one party hasn't responded
  // and we haven't sent a follow-up yet
  const pendingMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "proposed"),
        isNull(matches.followUpSentAt),
        sql`${matches.proposedAt} <= ${sevenDaysAgo}`,
        isNotNull(matches.proposedAt)
      )
    )
    .limit(50);

  let sent = 0;

  for (const match of pendingMatches) {
    try {
      // Get both singles
      const [singleA, singleB] = await Promise.all([
        db.select().from(singles).where(eq(singles.id, match.singleAId)).then(r => r[0]),
        db.select().from(singles).where(eq(singles.id, match.singleBId)).then(r => r[0]),
      ]);

      if (!singleA || !singleB) continue;

      let emailsSent = 0;

      // Send to A if they haven't responded
      if (!match.approvedByA && match.approvalTokenA && singleA.email) {
        const yesUrl = `${SITE_BASE}/match/respond?token=${match.approvalTokenA}&response=yes`;
        const noUrl = `${SITE_BASE}/match/respond?token=${match.approvalTokenA}&response=no`;
        const feedbackUrl = `${SITE_BASE}/match/respond?token=${match.approvalTokenA}&response=no`;

        const emailTemplate = buildMatchFollowUpEmail({
          firstName: singleA.firstName,
          matchFirstName: singleB.firstName,
          matchAge: singleB.age,
          matchCity: singleB.city,
          yesUrl,
          noUrl,
          feedbackUrl,
          recipientEmail: singleA.email,
          singleId: singleA.id,
        });

        const result = await sendEmail({
          to: { email: singleA.email, name: singleA.firstName },
          subject: emailTemplate.subject,
          htmlContent: emailTemplate.htmlBody,
          textContent: emailTemplate.textBody,
        });

        if (result.success) {
          emailsSent++;
          console.log(`[MatchFollowUp] Sent to A: ${singleA.email} for match ${match.id}`);
        }
      }

      // Send to B if they haven't responded
      if (!match.approvedByB && match.approvalTokenB && singleB.email) {
        const yesUrl = `${SITE_BASE}/match/respond?token=${match.approvalTokenB}&response=yes`;
        const noUrl = `${SITE_BASE}/match/respond?token=${match.approvalTokenB}&response=no`;
        const feedbackUrl = `${SITE_BASE}/match/respond?token=${match.approvalTokenB}&response=no`;

        const emailTemplate = buildMatchFollowUpEmail({
          firstName: singleB.firstName,
          matchFirstName: singleA.firstName,
          matchAge: singleA.age,
          matchCity: singleA.city,
          yesUrl,
          noUrl,
          feedbackUrl,
          recipientEmail: singleB.email,
          singleId: singleB.id,
        });

        const result = await sendEmail({
          to: { email: singleB.email, name: singleB.firstName },
          subject: emailTemplate.subject,
          htmlContent: emailTemplate.htmlBody,
          textContent: emailTemplate.textBody,
        });

        if (result.success) {
          emailsSent++;
          console.log(`[MatchFollowUp] Sent to B: ${singleB.email} for match ${match.id}`);
        }
      }

      // Mark follow-up as sent (even if only one email was sent)
      if (emailsSent > 0) {
        await db
          .update(matches)
          .set({ followUpSentAt: Date.now() })
          .where(eq(matches.id, match.id));
        sent += emailsSent;

        // Send WhatsApp reminders alongside follow-up emails
        const followUpWaMsg = (firstName: string, matchName: string) =>
          `היי ${firstName}! 💛\nשלחתי לך מייל עם התאמה מיוחדת שמחכה לתשובתך, ${matchName} כבר הגיב בחיוב!\nכדאי לבדוק את תיבת המייל (גם ספאם) וללחוץ על הקישור.\nהילית 💛`;
        if (!match.approvedByA && singleA?.phone) {
          sendWhatsApp(singleA.phone, followUpWaMsg(singleA.firstName, singleB.firstName)).catch(() => {});
        }
        if (!match.approvedByB && singleB?.phone) {
          sendWhatsApp(singleB.phone, followUpWaMsg(singleB.firstName, singleA.firstName)).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`[MatchFollowUp] Error processing match ${match.id}:`, err);
    }
  }

  console.log(`[MatchFollowUp] Processed ${pendingMatches.length} matches, sent ${sent} follow-up emails`);
  return sent;
}

/**
 * Retry unsent match proposal emails.
 * If a match was proposed 30+ minutes ago and neither party has opened their email,
 * resend the proposal once. This handles cases where the server restarted mid-send.
 */
export async function retryUnsentMatchEmails(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  // Find proposed matches where:
  // - proposed 30+ min ago
  // - neither email was opened (indicates possible non-delivery)
  // - no retry has been attempted yet
  const unsentMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "proposed"),
        isNull(matches.emailAOpenedAt),
        isNull(matches.emailBOpenedAt),
        isNull(matches.emailRetriedAt),
        isNotNull(matches.proposedAt),
        sql`${matches.proposedAt} <= ${thirtyMinutesAgo}`
      )
    )
    .limit(20);
  if (unsentMatches.length === 0) return 0;
  let retried = 0;
  for (const match of unsentMatches) {
    try {
      const [singleA, singleB] = await Promise.all([
        db.select().from(singles).where(eq(singles.id, match.singleAId)).then(r => r[0]),
        db.select().from(singles).where(eq(singles.id, match.singleBId)).then(r => r[0]),
      ]);
      if (!singleA || !singleB) continue;
      if (!singleA.email || !singleB.email) continue;
      if (!match.approvalTokenA || !match.approvalTokenB) continue;
      // Import buildMatchProposalEmail from emailTemplates
      const { buildMatchProposalEmail: buildEmail } = await import("./emailTemplates");
      const score = match.score ?? 0;
      const emailA = buildEmail({
        firstName: singleA.firstName,
        matchFirstName: singleB.firstName,
        matchAge: singleB.age ?? 0,
        matchCity: singleB.city ?? "",
        matchOccupation: singleB.occupation ?? undefined,
        matchDnaType: singleB.dnaType ?? undefined,
        matchPhotoUrl: singleB.photoUrl ?? undefined,
        matchEducation: singleB.education ?? undefined,
        matchHasKids: singleB.hasKids ?? undefined,
        matchNumKids: singleB.numKids ?? undefined,
        matchWantsKids: singleB.wantsKids ?? undefined,
        compatibilityScore: score,
        hilitsNote: match.autoExplanation ?? "",
        yesUrl: `${SITE_BASE}/match/respond?token=${match.approvalTokenA}&response=yes`,
        noUrl: `${SITE_BASE}/match/respond?token=${match.approvalTokenA}&response=no`,
        recipientEmail: singleA.email,
        singleId: singleA.id,
        trackingPixelUrl: `${SITE_BASE}/api/match-open?token=${match.approvalTokenA}&side=a`,
      });
      const emailB = buildEmail({
        firstName: singleB.firstName,
        matchFirstName: singleA.firstName,
        matchAge: singleA.age ?? 0,
        matchCity: singleA.city ?? "",
        matchOccupation: singleA.occupation ?? undefined,
        matchDnaType: singleA.dnaType ?? undefined,
        matchPhotoUrl: singleA.photoUrl ?? undefined,
        matchEducation: singleA.education ?? undefined,
        matchHasKids: singleA.hasKids ?? undefined,
        matchNumKids: singleA.numKids ?? undefined,
        matchWantsKids: singleA.wantsKids ?? undefined,
        compatibilityScore: score,
        hilitsNote: match.autoExplanation ?? "",
        yesUrl: `${SITE_BASE}/match/respond?token=${match.approvalTokenB}&response=yes`,
        noUrl: `${SITE_BASE}/match/respond?token=${match.approvalTokenB}&response=no`,
        recipientEmail: singleB.email,
        singleId: singleB.id,
        trackingPixelUrl: `${SITE_BASE}/api/match-open?token=${match.approvalTokenB}&side=b`,
      });
      const [resA, resB] = await Promise.all([
        sendEmail({ to: { email: singleA.email, name: singleA.firstName }, subject: emailA.subject, htmlContent: emailA.htmlBody }),
        sendEmail({ to: { email: singleB.email, name: singleB.firstName }, subject: emailB.subject, htmlContent: emailB.htmlBody }),
      ]);
      // Mark as retried regardless of send success to avoid infinite loops
      await db.update(matches).set({ emailRetriedAt: Date.now() }).where(eq(matches.id, match.id));
      if (resA.success || resB.success) {
        retried++;
        console.log(`[MatchRetry] Resent match proposal for match ${match.id} (${singleA.firstName} & ${singleB.firstName})`);
      }
    } catch (err) {
      console.error(`[MatchRetry] Error retrying match ${match.id}:`, err);
    }
  }
  if (retried > 0) {
    console.log(`[MatchRetry] Retried ${retried} unsent match proposals`);
  }
  return retried;
}

/**
 * Post-match lifecycle follow-ups.
 * After both parties approve a match (status=matched):
 *  - After 7 days: send a "how's it going?" email + option to return to pool
 *  - After 30 days: send a "still out there?" email + option to return to pool
 * Singles remain OUT of the matching pool until they explicitly click "return to pool"
 * (which sets returnedToPoolAt on the match row and re-enables them via isActive).
 */
export async function processMatchedPairFollowUps(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const SITE_BASE = "https://hilitcaspi.com";
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let sent = 0;

  // Find matched pairs that need a follow-up
  const matchedPairs = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "matched"),
        isNull(matches.returnedToPoolAt), // still out of pool
        isNotNull(matches.matchedAt),
        or(
          // Week follow-up: matched 7+ days ago, not yet sent
          and(
            isNull(matches.matchWeekFollowupSentAt),
            sql`${matches.matchedAt} <= ${oneWeekAgo}`
          ),
          // Month follow-up: matched 30+ days ago, week was sent, month not yet sent
          and(
            isNotNull(matches.matchWeekFollowupSentAt),
            isNull(matches.matchMonthFollowupSentAt),
            sql`${matches.matchedAt} <= ${oneMonthAgo}`
          )
        )
      )
    )
    .limit(50);

  for (const match of matchedPairs) {
    try {
      const [singleA, singleB] = await Promise.all([
        db.select().from(singles).where(eq(singles.id, match.singleAId)).then(r => r[0]),
        db.select().from(singles).where(eq(singles.id, match.singleBId)).then(r => r[0]),
      ]);
      if (!singleA || !singleB) continue;

      const isWeekFollowup = !match.matchWeekFollowupSentAt;
      const returnUrl = `${SITE_BASE}/match/return-to-pool?matchId=${match.id}`;

      const buildEmail = (firstName: string, matchFirstName: string, recipientEmail: string) => {
        if (isWeekFollowup) {
          return {
            subject: `${firstName}, איך הולך עם ${matchFirstName}? 💛`,
            html: `
              <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#191265;">
                <h2>היי ${firstName} 💛</h2>
                <p>עבר שבוע מאז שהתחברתם עם ${matchFirstName}.</p>
                <p>אני מקווה שהפגישה הייתה מיוחדת!</p>
                <p>אם ההתאמה הצליחה ואתם ממשיכים יחד - אשמח לשמוע! 🎉</p>
                <p>אם לא יצא לכם להתקדם ואתם רוצים לחזור למאגר, לחצו כאן:</p>
                <p style="text-align:center;">
                  <a href="${returnUrl}" style="background:#191265;color:#ffe27c;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
                    חזרה למאגר
                  </a>
                </p>
                <p style="color:#999;font-size:12px;">הילית כספי | מאמנת זוגיות</p>
              </div>`,
          };
        } else {
          return {
            subject: `${firstName}, עבר חודש - איפה אתם? 💛`,
            html: `
              <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#191265;">
                <h2>היי ${firstName} 💛</h2>
                <p>עבר חודש מאז שהתאמתם עם ${matchFirstName}.</p>
                <p>אם ההתאמה לא הצליחה ואתם רוצים לחזור למאגר ולקבל התאמות חדשות, לחצו כאן:</p>
                <p style="text-align:center;">
                  <a href="${returnUrl}" style="background:#191265;color:#ffe27c;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
                    חזרה למאגר
                  </a>
                </p>
                <p>אם ההתאמה הצליחה - מזל טוב! 🎊 אשמח לשמוע.</p>
                <p style="color:#999;font-size:12px;">הילית כספי | מאמנת זוגיות</p>
              </div>`,
          };
        }
      };

      let emailsSent = 0;

      if (singleA.email) {
        const tpl = buildEmail(singleA.firstName, singleB.firstName, singleA.email);
        const res = await sendEmail({
          to: { email: singleA.email, name: singleA.firstName },
          subject: tpl.subject,
          htmlContent: tpl.html,
        });
        if (res.success) emailsSent++;
      }

      if (singleB.email) {
        const tpl = buildEmail(singleB.firstName, singleA.firstName, singleB.email);
        const res = await sendEmail({
          to: { email: singleB.email, name: singleB.firstName },
          subject: tpl.subject,
          htmlContent: tpl.html,
        });
        if (res.success) emailsSent++;
      }

      if (emailsSent > 0) {
        const now = Date.now();
        if (isWeekFollowup) {
          await db.update(matches).set({ matchWeekFollowupSentAt: now }).where(eq(matches.id, match.id));
        } else {
          await db.update(matches).set({ matchMonthFollowupSentAt: now }).where(eq(matches.id, match.id));
        }
        sent += emailsSent;
        console.log(`[MatchedFollowUp] Sent ${isWeekFollowup ? "week" : "month"} follow-up for match ${match.id} (${singleA.firstName} & ${singleB.firstName})`);
      }
    } catch (err) {
      console.error(`[MatchedFollowUp] Error for match ${match.id}:`, err);
    }
  }

  console.log(`[MatchedFollowUp] Processed ${matchedPairs.length} matched pairs, sent ${sent} emails`);
  return sent;
}


/**
 * Cart Abandonment Detection
 * 
 * Checks payment_leads table for people who initiated a purchase (filled in the form)
 * but never completed payment (no paymentRef in crmLeads or singles table).
 * 
 * Logic:
 * 1. Find payment_leads created 1-2 hours ago (gives time to complete payment)
 * 2. Check if they have a paymentRef in crmLeads or singles (meaning they paid)
 * 3. If not paid → start the appropriate abandoned_* journey
 * 4. Only trigger once per email+product (startJourney has idempotency guard)
 */
export async function processCartAbandonment(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;       // 1 hour ago
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;  // 2 hours ago (window: 1-2h old leads)

  // Find payment_leads created between 1-2 hours ago
  const { paymentLeads, singles } = await import("../drizzle/schema");
  
  const recentLeads = await db
    .select()
    .from(paymentLeads)
    .where(
      and(
        lt(paymentLeads.createdAt, oneHourAgo),
        gt(paymentLeads.createdAt, twoHoursAgo)
      )
    )
    .limit(50);

  if (recentLeads.length === 0) return 0;

  let triggered = 0;

  for (const lead of recentLeads) {
    // Check if this person already paid (has paymentRef in crmLeads)
    const [crmLead] = await db
      .select({ paymentRef: crmLeads.paymentRef, status: crmLeads.status })
      .from(crmLeads)
      .where(eq(crmLeads.email, lead.email))
      .limit(1);

    // If they have a paymentRef or are already a client, skip
    if (crmLead?.paymentRef) continue;
    if (crmLead?.status && ["client_database", "client_guide", "client_course", "client_coaching"].includes(crmLead.status)) continue;

    // For database product, also check if they're in the singles table with isPaid=true
    if (lead.product === "database") {
      const [single] = await db
        .select({ isPaid: singles.isPaid })
        .from(singles)
        .where(eq(singles.email, lead.email))
        .limit(1);
      if (single?.isPaid) continue;
    }

    // For coaching/coaching_mas, also check leads table for paid_coaching/paid_coaching_mas source
    // (coaching webhook doesn't always update crmLeads)
    if (lead.product === "coaching" || lead.product === "coaching_mas" || lead.product === "session") {
      const { leads: leadsTable } = await import("../drizzle/schema");
      const [paidCoaching] = await db
        .select({ id: leadsTable.id })
        .from(leadsTable)
        .where(and(
          eq(leadsTable.email, lead.email),
          or(
            eq(leadsTable.source, "paid_coaching"),
            eq(leadsTable.source, "paid_coaching_mas")
          )
        ))
        .limit(1);
      if (paidCoaching) continue;
    }

    // Map product to abandoned journey key
    const productToJourney: Record<string, JourneyKey> = {
      database: "abandoned_database",
      guide: "abandoned_guide",
      course: "abandoned_course",
      coaching: "abandoned_coaching",
      coaching_mas: "abandoned_coaching",
      session: "abandoned_coaching",
    };

    const journeyKey = productToJourney[lead.product];
    if (!journeyKey) continue;

    // Start the abandoned cart journey (idempotency guard inside prevents duplicates)
    const firstName = lead.name.split(" ")[0];
    const lastName = lead.name.split(" ").slice(1).join(" ") || "";

    try {
      await startJourney({
        email: lead.email,
        firstName,
        lastName,
        phone: lead.phone,
        gender: "female", // Default to female (majority of audience)
        journeyKey,
        leadId: crmLead ? undefined : undefined,
      });
      triggered++;
      console.log(`[CartAbandonment] Started ${journeyKey} for ${lead.email} (product: ${lead.product})`);
    } catch (err) {
      console.error(`[CartAbandonment] Failed to start journey for ${lead.email}:`, err);
    }
  }

  return triggered;
}
