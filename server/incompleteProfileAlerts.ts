import { and, desc, eq, gte, lte } from "drizzle-orm";
import { emailLog, singles } from "../drizzle/schema";
import { sendEmail } from "./brevo";
import { getDb } from "./db";
import { HILIT_WHATSAPP, sendWhatsAppViaMake } from "./whatsappWebhook";

const ALERT_AFTER_MS = 24 * 60 * 60 * 1000;
export const INCOMPLETE_PROFILE_ALERT_LAUNCH_AT = Date.parse("2026-08-23T12:00:00Z");
export const INCOMPLETE_PROFILE_ALERT_JOURNEY = "incomplete_profile_24h";

type ProfileCompletenessInput = {
  age?: number | null;
  city?: string | null;
  height?: number | null;
  about?: string | null;
  partnerDescription?: string | null;
  photoUrl?: string | null;
  dnaType?: string | null;
  questionnaireCompletedAt?: number | null;
  occupation?: string | null;
  religiosity?: string | null;
};

export function getMissingProfileFields(profile: ProfileCompletenessInput): string[] {
  const missing: string[] = [];
  if (!profile.age || profile.age <= 0) missing.push("גיל");
  if (!profile.city?.trim()) missing.push("עיר");
  if (!profile.height || profile.height <= 0) missing.push("גובה");
  if (!profile.about?.trim()) missing.push("על עצמי");
  if (!profile.partnerDescription?.trim()) missing.push("מה מחפשים בזוגיות");
  if (!profile.photoUrl?.trim()) missing.push("תמונה");
  if (!profile.dnaType?.trim()) missing.push("שאלון DNA");
  if (!profile.questionnaireCompletedAt) missing.push("שאלון מדעי");
  if (!profile.occupation?.trim()) missing.push("תעסוקה");
  if (!profile.religiosity?.trim()) missing.push("דת");
  return missing;
}

export function buildIncompleteProfileOwnerMessage(input: {
  name: string;
  email: string;
  phone?: string | null;
  missing: string[];
}): string {
  return [
    "⚠️ הצטרפות חדשה עם פרטים חסרים לאחר 24 שעות",
    `שם: ${input.name}`,
    `מייל: ${input.email}`,
    input.phone ? `טלפון: ${input.phone}` : null,
    `חסר: ${input.missing.join(", ")}`,
    "לבדיקה ב־CRM: https://hilitcaspi.com/crm",
  ].filter(Boolean).join("\n");
}

export async function processIncompleteProfileAlerts(options?: {
  now?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return { scanned: 0, sent: 0, skipped: 0, failed: 0 };

  const now = options?.now ?? Date.now();
  const cutoff = now - ALERT_AFTER_MS;
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
  const candidates = await db.select().from(singles)
    .where(and(
      eq(singles.isPaid, true),
      eq(singles.isActive, true),
      gte(singles.subscriptionStartedAt, INCOMPLETE_PROFILE_ALERT_LAUNCH_AT),
      lte(singles.subscriptionStartedAt, cutoff),
    ))
    .orderBy(desc(singles.subscriptionStartedAt))
    .limit(limit);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const profile of candidates) {
    const missing = getMissingProfileFields(profile);
    if (missing.length === 0) {
      skipped++;
      continue;
    }
    const [existing] = await db.select({ id: emailLog.id }).from(emailLog)
      .where(and(
        eq(emailLog.leadId, profile.id),
        eq(emailLog.journeyKey, INCOMPLETE_PROFILE_ALERT_JOURNEY),
        eq(emailLog.emailIndex, 1),
      )).limit(1);
    if (existing) {
      skipped++;
      continue;
    }

    const name = `${profile.firstName} ${profile.lastName || ""}`.trim();
    const message = buildIncompleteProfileOwnerMessage({
      name,
      email: profile.email || "ללא מייל",
      phone: profile.phone,
      missing,
    });
    const [logInsert] = await db.insert(emailLog).values({
      leadId: profile.id,
      recipientEmail: "hilitcaspi@gmail.com",
      recipientName: "הילית כספי",
      journeyKey: INCOMPLETE_PROFILE_ALERT_JOURNEY,
      emailIndex: 1,
      subject: `פרטים חסרים לאחר 24 שעות: ${name}`,
      htmlBody: message.replace(/\n/g, "<br>"),
      textBody: message,
      scheduledAt: now,
      sentAt: null,
      status: "processing",
      createdAt: now,
    });
    const logId = Number((logInsert as any)?.insertId ?? 0);

    const [whatsAppOk, emailResult] = await Promise.all([
      sendWhatsAppViaMake({
        event: "incomplete_profile_alert",
        idempotencyKey: `incomplete-profile-24h-${profile.id}`,
        phone: HILIT_WHATSAPP,
        message,
        metadata: { singleId: profile.id, missingFields: missing },
      }),
      sendEmail({
        to: { email: "hilitcaspi@gmail.com", name: "הילית כספי" },
        subject: `⚠️ פרטים חסרים לאחר 24 שעות: ${name}`,
        htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;"><h2 style="color:#c00;">פרטים חסרים לאחר 24 שעות</h2><p><strong>${name}</strong> (${profile.email || "ללא מייל"})</p><p><strong>חסר:</strong> ${missing.join(", ")}</p><p><a href="https://hilitcaspi.com/crm">כניסה ל־CRM</a></p></div>`,
      }).catch(() => ({ success: false } as any)),
    ]);
    const delivered = whatsAppOk || Boolean((emailResult as any)?.success);
    if (logId) {
      await db.update(emailLog).set({
        status: delivered ? "sent" : "failed",
        sentAt: delivered ? Date.now() : null,
        errorMessage: delivered ? null : "WhatsApp and email delivery failed",
      }).where(eq(emailLog.id, logId));
    }
    if (delivered) sent++;
    else failed++;
  }

  return { scanned: candidates.length, sent, skipped, failed };
}
