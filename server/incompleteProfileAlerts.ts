import { and, desc, eq, gte, lte } from "drizzle-orm";
import { emailLog, singles } from "../drizzle/schema";
import { sendEmail } from "./brevo";
import { getDb } from "./db";
import { sendSMS } from "./vibrate";
import { calculateAgeFromBirthDate } from "../shared/profileValidation";

const ALERT_AFTER_MS = 24 * 60 * 60 * 1000;
const HILIT_ALERT_PHONE = "0544530975";
const HILIT_ALERT_EMAIL = "hilitcaspi@gmail.com";

export const INCOMPLETE_PROFILE_ALERT_LAUNCH_AT = Date.parse("2026-08-23T12:00:00Z");
export const INCOMPLETE_PROFILE_ALERT_JOURNEY = "incomplete_profile_24h";
export const INCOMPLETE_PROFILE_ALERT_SMS_JOURNEY = "incomplete_profile_24h_sms";

type ProfileCompletenessInput = {
  age?: number | null;
  birthDate?: string | null;
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
  const ageFromBirthDate = profile.birthDate ? calculateAgeFromBirthDate(profile.birthDate) : null;
  if ((!profile.age || profile.age <= 0) && !ageFromBirthDate) missing.push("גיל");
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

type AlertChannel = "email" | "sms";

async function prepareChannelLog(input: {
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  profileId: number;
  name: string;
  journeyKey: string;
  channel: AlertChannel;
  subject: string;
  message: string;
  now: number;
}): Promise<{ id: number; alreadySent: boolean }> {
  const [existing] = await input.db.select({ id: emailLog.id, status: emailLog.status })
    .from(emailLog)
    .where(and(
      eq(emailLog.leadId, input.profileId),
      eq(emailLog.journeyKey, input.journeyKey),
      eq(emailLog.emailIndex, 1),
    ))
    .orderBy(desc(emailLog.createdAt))
    .limit(1);

  if (existing?.status === "sent") return { id: existing.id, alreadySent: true };

  if (existing) {
    await input.db.update(emailLog).set({
      status: "processing",
      scheduledAt: input.now,
      errorMessage: null,
    }).where(eq(emailLog.id, existing.id));
    return { id: existing.id, alreadySent: false };
  }

  const [insert] = await input.db.insert(emailLog).values({
    leadId: input.profileId,
    recipientEmail: input.channel === "email" ? HILIT_ALERT_EMAIL : `sms:${HILIT_ALERT_PHONE}`,
    recipientName: "הילית כספי",
    journeyKey: input.journeyKey,
    emailIndex: 1,
    subject: input.subject,
    htmlBody: input.message.replace(/\n/g, "<br>"),
    textBody: input.message,
    scheduledAt: input.now,
    sentAt: null,
    status: "processing",
    createdAt: input.now,
  });
  return { id: Number((insert as any)?.insertId ?? 0), alreadySent: false };
}

async function finishChannelLog(input: {
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  id: number;
  ok: boolean;
  errorMessage: string;
}) {
  if (!input.id) return;
  await input.db.update(emailLog).set({
    status: input.ok ? "sent" : "failed",
    sentAt: input.ok ? Date.now() : null,
    errorMessage: input.ok ? null : input.errorMessage,
  }).where(eq(emailLog.id, input.id));
}

export async function processIncompleteProfileAlerts(options?: {
  now?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return { scanned: 0, sent: 0, skipped: 0, failed: 0, smsSent: 0, emailSent: 0 };

  const now = options?.now ?? Date.now();
  const cutoff = now - ALERT_AFTER_MS;
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);

  // consentMatchmaking separates valid paid members, including profiles hidden by
  // an activation race, from profiles that were deliberately removed or opted out.
  const candidates = await db.select().from(singles)
    .where(and(
      eq(singles.isPaid, true),
      eq(singles.consentMatchmaking, true),
      gte(singles.subscriptionStartedAt, INCOMPLETE_PROFILE_ALERT_LAUNCH_AT),
      lte(singles.subscriptionStartedAt, cutoff),
    ))
    .orderBy(desc(singles.subscriptionStartedAt))
    .limit(limit);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let smsSent = 0;
  let emailSent = 0;

  for (const profile of candidates) {
    const missing = getMissingProfileFields(profile);
    if (missing.length === 0) {
      skipped++;
      continue;
    }

    const name = `${profile.firstName} ${profile.lastName || ""}`.trim();
    const subject = `פרטים חסרים לאחר 24 שעות: ${name}`;
    const message = buildIncompleteProfileOwnerMessage({
      name,
      email: profile.email || "ללא מייל",
      phone: profile.phone,
      missing,
    });

    const [emailLogState, smsLogState] = await Promise.all([
      prepareChannelLog({
        db,
        profileId: profile.id,
        name,
        journeyKey: INCOMPLETE_PROFILE_ALERT_JOURNEY,
        channel: "email",
        subject,
        message,
        now,
      }),
      prepareChannelLog({
        db,
        profileId: profile.id,
        name,
        journeyKey: INCOMPLETE_PROFILE_ALERT_SMS_JOURNEY,
        channel: "sms",
        subject,
        message,
        now,
      }),
    ]);

    if (emailLogState.alreadySent && smsLogState.alreadySent) {
      skipped++;
      continue;
    }

    const [emailOk, smsOk] = await Promise.all([
      emailLogState.alreadySent
        ? Promise.resolve(true)
        : sendEmail({
            to: { email: HILIT_ALERT_EMAIL, name: "הילית כספי" },
            subject: `⚠️ ${subject}`,
            htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;"><h2 style="color:#c00;">פרטים חסרים לאחר 24 שעות</h2><p><strong>${name}</strong> (${profile.email || "ללא מייל"})</p><p><strong>חסר:</strong> ${missing.join(", ")}</p><p><a href="https://hilitcaspi.com/crm">כניסה ל־CRM</a></p></div>`,
            textContent: message,
          }).then(result => Boolean(result.success)).catch(() => false),
      smsLogState.alreadySent ? Promise.resolve(true) : sendSMS(HILIT_ALERT_PHONE, message),
    ]);

    await Promise.all([
      emailLogState.alreadySent ? Promise.resolve() : finishChannelLog({
        db,
        id: emailLogState.id,
        ok: emailOk,
        errorMessage: "Brevo email delivery request failed",
      }),
      smsLogState.alreadySent ? Promise.resolve() : finishChannelLog({
        db,
        id: smsLogState.id,
        ok: smsOk,
        errorMessage: "Vibrate SMS delivery request failed",
      }),
    ]);

    if (!emailLogState.alreadySent && emailOk) emailSent++;
    if (!smsLogState.alreadySent && smsOk) smsSent++;

    if (emailOk && smsOk) sent++;
    else failed++;
  }

  return { scanned: candidates.length, sent, skipped, failed, smsSent, emailSent };
}
