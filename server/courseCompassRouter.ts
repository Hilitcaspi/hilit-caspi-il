import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { courseCompassLeads, emailLog } from "../drizzle/schema";
import {
  CORE_COMPASS_RESULTS,
  COURSE_COMPASS_VERSION,
  getCompassResultContent,
  type CompassResultKey,
} from "../shared/courseCompass";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import { sendEmail } from "./brevo";
import { getDb } from "./db";

export const COURSE_COMPASS_CONSENT_VERSION = "2026-09-launch-v1";
export const COURSE_COMPASS_BENEFIT_VERSION = "launch-priority-v1";
export const COURSE_COMPASS_EMAIL_JOURNEY = "course_compass_waitlist";

const resultKeySchema = z.enum([
  "future_projection",
  "uncertainty_loop",
  "approval_chase",
  "chemistry_confusion",
  "novelty_pull",
  "safety",
]);
const secondaryResultSchema = z.enum(CORE_COMPASS_RESULTS);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildCourseCompassWaitlistEmail(input: {
  name: string;
  resultKey: CompassResultKey;
}) {
  const safeName = escapeHtml(input.name.trim().split(/\s+/)[0] || "");
  const result = getCompassResultContent(input.resultKey);
  const subject = "זה לא קסם. זה מנגנון שאפשר ללמוד לשנות";
  const preheader = "הפיצוח האישי והקדימות לקורס הדגל נשמרו";
  const greeting = safeName ? `היי ${safeName},` : "היי,";
  const htmlContent = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4eee8;font-family:Arial,'Rubik',sans-serif;color:#2a123c;direction:rtl;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4eee8;"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fffaf6;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(49,14,53,.16);">
      <tr><td align="center" style="padding:34px 26px;background:linear-gradient(135deg,#2b0e38 0%,#641449 58%,#9b245f 100%);">
        <p style="margin:0;color:#f6d08a;font-size:13px;letter-spacing:2px;font-weight:700;">THE COMPASS</p>
        <h1 style="margin:12px 0 0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.2;">הפיצוח שלך נשמר</h1>
        <p style="margin:12px 0 0;color:rgba(255,255,255,.78);font-size:15px;">זה לא קסם. זו הפסיכולוגיה שמאחורי הבחירות שלנו.</p>
      </td></tr>
      <tr><td style="padding:30px 28px 14px;text-align:right;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:700;">${greeting}</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#59485f;">השלמתם את אתגר הפיצוח. המנגנון שבלט אצלכם הוא:</p>
        <div style="border:1px solid #e7d3cc;background:#ffffff;border-radius:22px;padding:22px;margin:0 0 18px;">
          <p style="margin:0 0 6px;color:#9b245f;font-size:13px;font-weight:800;">${escapeHtml(result.label)}</p>
          <p style="margin:0 0 10px;color:#2a123c;font-size:23px;font-weight:800;">${escapeHtml(result.title)}</p>
          <p style="margin:0;color:#66546d;font-size:15px;line-height:1.75;">${escapeHtml(result.summary)}</p>
        </div>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#59485f;"><strong>אתם תוהים איך ידעתי?</strong> זה לא קסם. מאחורי הרבה מהדינמיקות הזוגיות שלנו יש מנגנונים פסיכולוגיים שאפשר לזהות, לפרק ולתרגל אחרת.</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#59485f;">נכנסתם לרשימת ההשקה של קורס הדגל החדש. בקורס אלמד איך לזהות את המנגנונים בזמן אמת, לשנות הרגלים מעשיים ולבנות דרך ברורה יותר לזוגיות. כשהקורס ייפתח, תקבלו לפני כולם את הפרטים, הקדימות והטבת ההשקה.</p>
        <div style="background:#2b0e38;border-radius:18px;padding:18px 20px;margin:22px 0;color:#ffffff;">
          <p style="margin:0;color:#f6d08a;font-weight:800;font-size:14px;">חשוב לדעת</p>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.82);font-size:14px;line-height:1.7;">הקורס והמארז עדיין בבנייה. לא בוצע חיוב ולא נפתחה הזמנה. הודעה מסודרת תישלח לפני הפתיחה.</p>
        </div>
        <p style="margin:22px 0 0;font-size:16px;line-height:1.8;color:#59485f;">באהבה,<br><strong style="color:#2a123c;">הילית כספי</strong></p>
      </td></tr>
      <tr><td align="center" style="padding:18px 24px 24px;color:#8c7d91;font-size:11px;line-height:1.6;">התוצאה היא כלי להתבוננות ולבחירת צעד, לא אבחון של אדם אחר ולא תחליף לייעוץ מקצועי.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const textContent = `${greeting}\n\nהשלמתם את אתגר הפיצוח. המנגנון שבלט אצלכם הוא: ${result.label} — ${result.title}.\n${result.summary}\n\nאתם תוהים איך ידעתי? זה לא קסם. מאחורי הרבה מהדינמיקות הזוגיות שלנו יש מנגנונים פסיכולוגיים שאפשר לזהות, לפרק ולתרגל אחרת.\n\nנכנסתם לרשימת ההשקה של קורס הדגל החדש. בקורס אלמד איך לזהות את המנגנונים בזמן אמת, לשנות הרגלים מעשיים ולבנות דרך ברורה יותר לזוגיות. כשהקורס ייפתח, תקבלו לפני כולם את הפרטים, הקדימות והטבת ההשקה המיוחדת.\n\nהקורס והמארז עדיין בבנייה. לא בוצע חיוב ולא נפתחה הזמנה.\n\nבאהבה,\nהילית כספי\n\nהתוצאה היא כלי להתבוננות ולבחירת צעד, לא אבחון של אדם אחר ולא תחליף לייעוץ מקצועי.`;
  return { subject, preheader, htmlContent, textContent };
}

export const courseCompassRouter = router({
  joinWaitlist: publicProcedure
    .input(z.object({
      sessionId: z.string().trim().min(16).max(64),
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(320),
      phone: z.string().trim().max(20).optional(),
      resultKey: resultKeySchema,
      secondaryResultKey: secondaryResultSchema.nullable().optional(),
      selectedAction: z.string().trim().max(100).optional(),
      waitlistConsent: z.literal(true),
      marketingConsent: z.boolean().default(false),
      utmSource: z.string().trim().max(100).optional(),
      utmMedium: z.string().trim().max(100).optional(),
      utmCampaign: z.string().trim().max(200).optional(),
      utmContent: z.string().trim().max(200).optional(),
      utmTerm: z.string().trim().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const now = Date.now();
      const email = input.email.toLowerCase();
      const values = {
        sessionId: input.sessionId,
        name: input.name,
        email,
        phone: input.phone || null,
        resultKey: input.resultKey,
        secondaryResultKey: input.secondaryResultKey || null,
        selectedAction: input.selectedAction || null,
        waitlistConsent: true,
        marketingConsent: input.marketingConsent,
        consentVersion: COURSE_COMPASS_CONSENT_VERSION,
        benefitVersion: COURSE_COMPASS_BENEFIT_VERSION,
        status: "waitlist" as const,
        utmSource: input.utmSource || null,
        utmMedium: input.utmMedium || null,
        utmCampaign: input.utmCampaign || null,
        utmContent: input.utmContent || null,
        utmTerm: input.utmTerm || null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(courseCompassLeads).values(values).onDuplicateKeyUpdate({
        set: {
          sessionId: values.sessionId,
          name: values.name,
          email: values.email,
          phone: values.phone,
          resultKey: values.resultKey,
          secondaryResultKey: values.secondaryResultKey,
          selectedAction: values.selectedAction,
          waitlistConsent: true,
          marketingConsent: values.marketingConsent,
          consentVersion: values.consentVersion,
          benefitVersion: values.benefitVersion,
          status: "waitlist",
          utmSource: values.utmSource,
          utmMedium: values.utmMedium,
          utmCampaign: values.utmCampaign,
          utmContent: values.utmContent,
          utmTerm: values.utmTerm,
          updatedAt: now,
        },
      });

      const [existingConfirmation] = await db.select({ id: emailLog.id })
        .from(emailLog)
        .where(and(
          eq(emailLog.recipientEmail, email),
          eq(emailLog.journeyKey, COURSE_COMPASS_EMAIL_JOURNEY),
          eq(emailLog.emailIndex, 1),
        ))
        .limit(1);

      let confirmationSent = Boolean(existingConfirmation);
      if (!existingConfirmation) {
        const emailContent = buildCourseCompassWaitlistEmail({
          name: input.name,
          resultKey: input.resultKey,
        });
        const insertResult = await db.insert(emailLog).values({
          recipientEmail: email,
          recipientName: input.name,
          journeyKey: COURSE_COMPASS_EMAIL_JOURNEY,
          emailIndex: 1,
          subject: emailContent.subject,
          htmlBody: emailContent.htmlContent,
          textBody: emailContent.textContent,
          scheduledAt: now,
          status: "processing",
          createdAt: now,
        });
        const logId = Number((insertResult as unknown as Array<{ insertId?: number }>)[0]?.insertId || 0);
        const sent = await sendEmail({
          to: { email, name: input.name },
          subject: emailContent.subject,
          htmlContent: emailContent.htmlContent,
          textContent: emailContent.textContent,
        });
        confirmationSent = sent.success;
        if (logId) {
          await db.update(emailLog).set({
            status: sent.success ? "sent" : "failed",
            sentAt: sent.success ? Date.now() : null,
            errorMessage: sent.success ? null : (sent.error || "send_failed").slice(0, 500),
          }).where(eq(emailLog.id, logId));
        }
      }

      return {
        ok: true,
        alreadyJoined: Boolean(existingConfirmation),
        confirmationSent,
        version: COURSE_COMPASS_VERSION,
      };
    }),

  adminList: teamProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, marketingConsent: 0, byResult: {}, rows: [] };
    const rows = await db.select({
      id: courseCompassLeads.id,
      name: courseCompassLeads.name,
      email: courseCompassLeads.email,
      phone: courseCompassLeads.phone,
      resultKey: courseCompassLeads.resultKey,
      selectedAction: courseCompassLeads.selectedAction,
      marketingConsent: courseCompassLeads.marketingConsent,
      status: courseCompassLeads.status,
      utmSource: courseCompassLeads.utmSource,
      utmCampaign: courseCompassLeads.utmCampaign,
      createdAt: courseCompassLeads.createdAt,
    }).from(courseCompassLeads)
      .orderBy(desc(courseCompassLeads.createdAt))
      .limit(150);

    const byResult = rows.reduce<Record<string, number>>((totals, row) => {
      totals[row.resultKey] = (totals[row.resultKey] || 0) + 1;
      return totals;
    }, {});
    return {
      total: rows.length,
      marketingConsent: rows.filter(row => row.marketingConsent).length,
      byResult,
      rows,
    };
  }),
});
