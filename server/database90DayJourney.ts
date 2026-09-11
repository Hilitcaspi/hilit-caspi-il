import { and, eq, gte } from "drizzle-orm";
import { emailLog, singles } from "../drizzle/schema";
import { sendEmail } from "./brevo";
import { getDb } from "./db";
import { getMissingProfileFields } from "./matchmakingMetrics";
import { buildSignedUnsubscribeUrl, isEmailMarketingSuppressed } from "./emailUnsubscribe";

const SITE_BASE = "https://hilitcaspi.com";
const JOURNEY_KEY = "database_90_day_v1";
const DAY_MS = 24 * 60 * 60 * 1000;

// The legacy journey name is retained for idempotency, but all generic status/count
// emails from day 14 onward are permanently disabled. Only the day-3 completion
// reminder and the day-7 service explanation remain active.
export const DATABASE_90_DAY_LAUNCH_AT = Date.UTC(2026, 7, 22, 0, 0, 0);

export const DATABASE_90_DAY_STAGES = [
  { index: 1, day: 3 },
  { index: 2, day: 7 },
] as const;

type JourneySingle = typeof singles.$inferSelect;

function profileUrl(single: JourneySingle): string {
  if (!single.questionnaireToken) return `${SITE_BASE}/join`;
  return `${SITE_BASE}/my-profile?email=${encodeURIComponent(single.email || "")}&token=${encodeURIComponent(single.questionnaireToken)}`;
}

function questionnaireUrl(single: JourneySingle): string {
  if (!single.questionnaireToken) return `${SITE_BASE}/join`;
  return `${SITE_BASE}/join/questionnaire?token=${encodeURIComponent(single.questionnaireToken)}`;
}

function emailFrame(content: string, email: string): string {
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email });
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f0eadc;font-family:Arial,sans-serif;color:#191265"><div style="max-width:620px;margin:0 auto;background:#fff"><div style="background:#191265;padding:28px 36px;text-align:center"><div style="color:#ffe27c;font-size:22px;font-weight:900">הילית כספי</div><div style="color:rgba(255,255,255,.7);font-size:13px;margin-top:5px">מאגר הרווקים והרווקות</div></div><div style="padding:34px;line-height:1.8;font-size:16px">${content}</div><div style="background:#191265;padding:20px 32px;text-align:center;color:rgba(255,255,255,.55);font-size:12px">הילית כספי | <a href="${unsubscribeUrl}" style="color:#ffe27c">הסרה ממסרים שיווקיים</a></div></div></body></html>`;
}

function cta(url: string, label: string): string {
  return `<a href="${url}" style="display:block;background:#ffe27c;color:#191265!important;font-weight:800;text-align:center;padding:15px 24px;border-radius:12px;text-decoration:none;margin:24px 0">${label}</a>`;
}

export function buildDatabase90DayEmail(
  stageIndex: number,
  single: JourneySingle,
  missing: string[],
): { subject: string; htmlBody: string; textBody: string; skipReason?: string } {
  const firstName = single.firstName || "היי";
  const personalProfileUrl = profileUrl(single);
  const frame = (content: string) => emailFrame(content, single.email || "");

  if (stageIndex === 1 && missing.length === 0) {
    return { subject: "הפרופיל מלא", htmlBody: "", textBody: "", skipReason: "profile_complete" };
  }

  if (stageIndex === 1) {
    const missingText = missing.join(", ");
    const url = questionnaireUrl(single);
    return {
      subject: `${firstName}, נשארו כמה פרטים כדי שנוכל להתאים לך נכון`,
      htmlBody: frame(`<h2 style="font-size:24px">${firstName}, הפרופיל עדיין לא מלא</h2><p>כדי שנוכל לבדוק התאמות באופן רציני והדדי, חסרים כרגע: <strong>${missingText}</strong>.</p><p>פרופיל מלא עוזר לנו להבין לא רק מי מתאים לך, אלא גם למי את/ה מתאים/ה.</p>${cta(url, "השלמת הפרטים והשאלון")}<p style="font-size:13px;color:#777">התשלום אינו התחייבות למספר התאמות או לתדירות קבועה. התאמה נשלחת כאשר נמצאת התאמה הדדית ורלוונטית.</p>`),
      textBody: `${firstName}, חסרים בפרופיל: ${missingText}. להשלמה: ${url}`,
    };
  }

  if (stageIndex === 2) {
    return {
      subject: `${firstName}, כך פועל תהליך ההתאמה במאגר`,
      htmlBody: frame(`<h2 style="font-size:24px">התאמה טובה צריכה לעבוד לשני הכיוונים</h2><p>אנחנו לא שולחים שמות כדי לעמוד במכסה. כל הצעה נבדקת לפי גיל, אזור, אורח חיים, רצון בילדים, ערכים, שאלון מדעי והעדפות הדדיות.</p><p><strong>299 ש״ח הם דמי הצטרפות למאגר ולתהליך ההתאמה המקצועי.</strong> הם אינם שירות אישי צמוד ואינם התחייבות לכמות או לתדירות קבועה.</p><p>מטרת העל שלנו היא להגדיל בהתמדה את מספר ההזדמנויות המתאימות — בלי להחליף איכות בכמות.</p>${cta(personalProfileUrl, "כניסה לאזור האישי")}`),
      textBody: `${firstName}, כל הצעה נבדקת לשני הכיוונים. אין התחייבות לכמות או לתדירות קבועה. אזור אישי: ${personalProfileUrl}`,
    };
  }

  return {
    subject: "שלב מעקב מבוטל",
    htmlBody: "",
    textBody: "",
    skipReason: "generic_status_email_disabled",
  };
}

export async function processDatabase90DayJourney(options: { now?: number; limit?: number } = {}): Promise<{
  evaluated: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = options.now ?? Date.now();
  const limit = options.limit ?? 100;

  const cohort = await db.select().from(singles).where(and(
    eq(singles.isPaid, true),
    eq(singles.isActive, true),
    eq(singles.consentEmailMarketing, true),
    eq(singles.isSeed, false),
    eq(singles.market, "il"),
    gte(singles.createdAt, DATABASE_90_DAY_LAUNCH_AT),
  ));

  if (cohort.length === 0) return { evaluated: 0, sent: 0, skipped: 0, failed: 0 };

  const existingLogs = await db.select({
    recipientEmail: emailLog.recipientEmail,
    emailIndex: emailLog.emailIndex,
    status: emailLog.status,
  }).from(emailLog).where(eq(emailLog.journeyKey, JOURNEY_KEY));
  const processed = new Set(existingLogs
    .filter(log => log.status !== "failed")
    .map(log => `${log.recipientEmail.toLowerCase()}:${log.emailIndex}`));

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let evaluated = 0;

  for (const single of cohort) {
    if (evaluated >= limit) break;
    if (!single.email) continue;
    const recipientEmail = single.email;
    const suppression = await isEmailMarketingSuppressed(recipientEmail);
    if (suppression.suppressed) { skipped++; continue; }
    const joinedAt = Number(single.subscriptionStartedAt || single.createdAt || 0);
    if (!joinedAt) continue;
    const ageDays = Math.floor((now - joinedAt) / DAY_MS);
    const due = [...DATABASE_90_DAY_STAGES].reverse().find(stage => ageDays >= stage.day);
    if (!due || processed.has(`${recipientEmail.toLowerCase()}:${due.index}`)) continue;
    evaluated++;

    const missing = getMissingProfileFields(single as any);
    const template = buildDatabase90DayEmail(due.index, single, missing);
    const createdAt = Date.now();

    if (template.skipReason) {
      await db.insert(emailLog).values({
        recipientEmail,
        recipientName: single.firstName,
        journeyKey: JOURNEY_KEY,
        emailIndex: due.index,
        subject: template.subject,
        htmlBody: "",
        textBody: template.skipReason,
        scheduledAt: createdAt,
        sentAt: createdAt,
        status: "cancelled",
        errorMessage: template.skipReason,
        createdAt,
      });
      skipped++;
      continue;
    }

    const insertResult = await db.insert(emailLog).values({
      recipientEmail,
      recipientName: single.firstName,
      journeyKey: JOURNEY_KEY,
      emailIndex: due.index,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      scheduledAt: createdAt,
      status: "processing",
      createdAt,
    });
    const logId = Number((insertResult as any)[0]?.insertId || 0);

    const result = await sendEmail({
      to: { email: recipientEmail, name: single.firstName },
      subject: template.subject,
      htmlContent: template.htmlBody,
      textContent: template.textBody,
    });

    if (result.success) {
      if (logId) await db.update(emailLog).set({ status: "sent", sentAt: Date.now(), errorMessage: null }).where(eq(emailLog.id, logId));
      sent++;
    } else {
      if (logId) await db.update(emailLog).set({ status: "failed", errorMessage: result.error || "send_failed" }).where(eq(emailLog.id, logId));
      failed++;
    }
  }

  return { evaluated, sent, skipped, failed };
}
