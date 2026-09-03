import { and, eq, inArray } from "drizzle-orm";
import { completedPayments, crmLeads, emailLog, matches, plusPilotMembers, singles } from "../drizzle/schema";
import { sendEmail } from "./brevo";
import { getDb } from "./db";
import { getMissingProfileFields } from "./matchmakingMetrics";
import { buildSignedUnsubscribeUrl, isEmailMarketingSuppressed } from "./emailUnsubscribe";

const SITE_BASE = "https://hilitcaspi.com";
const JOURNEY_KEY = "database_session_upsell_v1";
const DAY_MS = 24 * 60 * 60 * 1000;
export const DATABASE_SESSION_JOURNEY_LAUNCH_AT = Date.UTC(2026, 7, 23, 0, 0, 0);
export const SEPTEMBER_FOLLOWUP_EXPIRES_AT = Date.UTC(2026, 8, 30, 20, 59, 59);

type SessionJourneySingle = typeof singles.$inferSelect;
type SessionJourneyStats = {
  hasActiveMutualMatch: boolean;
  hasPositiveOutcome: boolean;
};

export function selectSessionJourneyStage(joinedAt: number, now: number, launchAt = DATABASE_SESSION_JOURNEY_LAUNCH_AT): 1 | 2 | null {
  const firstDueAt = Math.max(joinedAt + 14 * DAY_MS, launchAt);
  if (now < firstDueAt) return null;
  return now >= firstDueAt + 14 * DAY_MS ? 2 : 1;
}

export function selectNextSessionJourneyStage(
  joinedAt: number,
  now: number,
  processedStages: ReadonlySet<number>,
  launchAt = DATABASE_SESSION_JOURNEY_LAUNCH_AT,
): 1 | 2 | null {
  const due = selectSessionJourneyStage(joinedAt, now, launchAt);
  if (!due) return null;
  if (!processedStages.has(1)) return 1;
  if (due === 2 && !processedStages.has(2)) return 2;
  return null;
}

export function isEligibleForSessionJourney(input: {
  missingFields: string[];
  purchasedSession: boolean;
  isCoachingClient: boolean;
  hasActiveMutualMatch: boolean;
  hasPositiveOutcome: boolean;
}) {
  return input.missingFields.length === 0
    && !input.purchasedSession
    && !input.isCoachingClient
    && !input.hasActiveMutualMatch
    && !input.hasPositiveOutcome;
}

export function isSeptemberFollowupEnabled(
  now: number,
  enabled = process.env.SEPTEMBER_FOLLOWUP_ENABLED === "true",
) {
  return enabled && now <= SEPTEMBER_FOLLOWUP_EXPIRES_AT;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);
}

function frame(content: string, email: string) {
  const unsubscribe = buildSignedUnsubscribeUrl({ email });
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f0eadc;font-family:Arial,sans-serif;color:#191265"><div style="max-width:620px;margin:0 auto;background:#fff"><div style="background:#191265;padding:28px 36px;text-align:center"><div style="color:#ffe27c;font-size:22px;font-weight:900">הילית כספי</div><div style="color:rgba(255,255,255,.7);font-size:13px;margin-top:5px">מאגר הרווקים והרווקות</div></div><div style="padding:34px;line-height:1.8;font-size:16px">${content}</div><div style="background:#191265;padding:20px 32px;text-align:center;color:rgba(255,255,255,.55);font-size:12px">הילית כספי | <a href="${unsubscribe}" style="color:#ffe27c">הסרה ממסרים שיווקיים</a></div></div></body></html>`;
}

function cta(url: string, label: string) {
  return `<a href="${url}" style="display:block;background:#ffe27c;color:#191265!important;font-weight:800;text-align:center;padding:15px 24px;border-radius:12px;text-decoration:none;margin:24px 0">${label}</a>`;
}

export function buildSessionJourneyEmail(
  stage: 1 | 2,
  single: SessionJourneySingle,
  isPlus: boolean,
  options: { now?: number; septemberOfferEnabled?: boolean } = {},
) {
  const firstName = escapeHtml(single.firstName || "היי");
  const now = options.now ?? Date.now();
  const septemberOfferEnabled = stage === 2 && isSeptemberFollowupEnabled(now, options.septemberOfferEnabled);
  const sessionUrl = isPlus
    ? `${SITE_BASE}/single-session?coupon=PLUS50&email=${encodeURIComponent(single.email || "")}&utm_source=database&utm_medium=email&utm_campaign=session_journey&utm_content=plus_450`
    : `${SITE_BASE}/single-session?utm_source=database&utm_medium=email&utm_campaign=session_journey&utm_content=regular_500`;
  const priceBlock = isPlus
    ? `<div style="margin:22px 0;padding:18px;border:1px solid #e4cf67;border-radius:14px;background:#fff9dc"><strong>הטבת Database Plus: 450 ש״ח במקום 500 ש״ח</strong><p style="margin:8px 0 0">הקוד PLUS50 יופעל ויאומת לפי מייל המנוי שלך.</p></div>`
    : `<div style="margin:22px 0;padding:18px;border:1px solid #ded9cc;border-radius:14px;background:#faf9f6"><strong>מחיר הפגישה: 500 ש״ח</strong><p style="margin:8px 0 0">אם מחליטים להמשיך לתהליך ליווי מלא, סכום הפגישה מתקזז לפי תנאי המוצר.</p></div>`;
  const intro = stage === 1
    ? `<h2 style="font-size:24px">${firstName}, רוצה שנכיר אותך מעבר לפרופיל?</h2><p>הפרופיל והשאלון שלך נותנים לנו בסיס חשוב. לפעמים פגישה אישית מאפשרת להבין לעומק את הסיפור, ההעדפות והחסמים שלך, ולדייק גם את העבודה סביב הפרופיל במאגר.</p>`
    : septemberOfferEnabled
      ? `<h2 style="font-size:24px">${firstName}, שלוש דרכים להתקדם בספטמבר</h2><p>אחרי שכבר הצטרפת למאגר, הכנו עמוד נפרד עם אפשרויות נוספות למי שרוצה להעמיק: פגישת היכרות ב־450 ש״ח, קורס דיגיטלי ב־125 ש״ח או מדריך ב־75 ש״ח.</p>`
      : `<h2 style="font-size:24px">${firstName}, אם עדיין נכון לך שנכיר אותך לעומק</h2><p>רצינו להזכיר שפגישת היכרות אישית זמינה למי שרוצה לקבל תמונה מדויקת יותר על הדפוסים, הבחירות והצעד הבא שלו או שלה.</p>`;
  const content = septemberOfferEnabled
    ? `${intro}<p>אלו שירותים נפרדים ואופציונליים. הם אינם משנים את החברות שלך במאגר ואינם רכישה של התאמה או הבטחה למספר התאמות.</p><div style="margin:22px 0;padding:18px;border:1px solid #e4cf67;border-radius:14px;background:#fff9dc"><strong>מבצע ספטמבר עד 30.9.2026</strong><p style="margin:8px 0 0">ההטבות זמינות בעמוד המבצע בלבד ואינן כוללות את המאגר או את תהליכי הליווי.</p></div>${cta(`${SITE_BASE}/september?utm_source=database&utm_medium=email&utm_campaign=september_followup&utm_content=post_registration`, "לצפייה בהצעות ספטמבר")}<p style="font-size:13px;color:#777">אם זה לא מתאים כרגע, אין צורך לעשות דבר. החברות הרגילה במאגר ממשיכה ללא שינוי.</p>`
    : `${intro}<p>הפגישה מתקיימת עם הילית או עם איש מקצוע מהצוות שעבר הכשרה ועובד בליווי שלה. זהו שירות נפרד ואופציונלי, לא רכישה של התאמה ולא הבטחה למספר התאמות.</p>${priceBlock}${cta(sessionUrl, isPlus ? "קביעת פגישת Plus ב־450 ש״ח" : "פרטים וקביעת פגישה")}<p style="font-size:13px;color:#777">אם זה לא מתאים כרגע, אין צורך לעשות דבר. החברות הרגילה במאגר ממשיכה ללא שינוי.</p>`;
  return {
    subject: stage === 1
      ? `${single.firstName || "היי"}, רוצה שנכיר אותך מעבר לפרופיל?`
      : septemberOfferEnabled
        ? `${single.firstName || "היי"}, שלוש דרכים להתקדם בספטמבר`
        : `${single.firstName || "היי"}, תזכורת על פגישת ההיכרות האישית`,
    htmlBody: frame(content, single.email || ""),
    textBody: septemberOfferEnabled
      ? `${single.firstName || "היי"}, לאחר ההצטרפות למאגר אפשר לבחור שירות נפרד ואופציונלי במבצע ספטמבר: פגישה ב־450 ש״ח, קורס ב־125 ש״ח או מדריך ב־75 ש״ח. המבצע אינו כולל את המאגר או ליווי. ${SITE_BASE}/september?utm_source=database&utm_medium=email&utm_campaign=september_followup&utm_content=post_registration`
      : `${single.firstName || "היי"}, פגישת היכרות אישית עם הילית או איש מקצוע מהצוות זמינה כשירות נפרד ואופציונלי. ${isPlus ? "לחברי Plus: 450 ש״ח במקום 500 ש״ח. " : "מחיר: 500 ש״ח. "}${sessionUrl}`,
  };
}

export async function processDatabaseSessionJourney(options: { now?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = options.now ?? Date.now();
  const limit = options.limit ?? 30;

  const cohort = await db.select().from(singles).where(and(
    eq(singles.isPaid, true),
    eq(singles.isActive, true),
    eq(singles.consentEmailMarketing, true),
    eq(singles.isSeed, false),
    eq(singles.market, "il"),
  ));
  if (cohort.length === 0) return { evaluated: 0, sent: 0, skipped: 0, failed: 0 };

  const ids = cohort.map(single => single.id);
  const [sessionPayments, plusRows, sideA, sideB, existingLogs, unsubscribedRows] = await Promise.all([
    db.select({ email: completedPayments.email }).from(completedPayments).where(eq(completedPayments.product, "session")),
    db.select().from(plusPilotMembers).where(inArray(plusPilotMembers.singleId, ids)),
    db.select({ id: matches.id, singleAId: matches.singleAId, singleBId: matches.singleBId, approvedByA: matches.approvedByA, approvedByB: matches.approvedByB, matchDetailStatus: matches.matchDetailStatus }).from(matches).where(inArray(matches.singleAId, ids)),
    db.select({ id: matches.id, singleAId: matches.singleAId, singleBId: matches.singleBId, approvedByA: matches.approvedByA, approvedByB: matches.approvedByB, matchDetailStatus: matches.matchDetailStatus }).from(matches).where(inArray(matches.singleBId, ids)),
    db.select({ recipientEmail: emailLog.recipientEmail, emailIndex: emailLog.emailIndex, status: emailLog.status }).from(emailLog).where(eq(emailLog.journeyKey, JOURNEY_KEY)),
    db.select({ email: crmLeads.email }).from(crmLeads).where(eq(crmLeads.emailUnsubscribed, true)),
  ]);

  const sessionBuyers = new Set(sessionPayments.map(row => row.email.trim().toLowerCase()));
  const plusBySingle = new Map(plusRows.map(row => [row.singleId, row]));
  const matchMap = new Map<number, (typeof sideA)[number]>();
  [...sideA, ...sideB].forEach(match => matchMap.set(match.id, match));
  const allMatches = Array.from(matchMap.values());
  const processed = new Set(existingLogs.filter(log => log.status !== "failed").map(log => `${log.recipientEmail.toLowerCase()}:${log.emailIndex}`));
  const unsubscribed = new Set(unsubscribedRows.map(row => row.email.trim().toLowerCase()));

  let evaluated = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const single of [...cohort].sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))) {
    if (evaluated >= limit) break;
    if (!single.email) continue;
    const suppression = await isEmailMarketingSuppressed(single.email);
    if (suppression.suppressed) { skipped++; continue; }
    if (unsubscribed.has(single.email.trim().toLowerCase())) { skipped++; continue; }
    const joinedAt = Number(single.subscriptionStartedAt || single.createdAt || 0);
    if (!joinedAt) continue;
    const emailKey = single.email.toLowerCase();
    const processedStages = new Set<number>([1, 2].filter(stage => processed.has(`${emailKey}:${stage}`)));
    const stage = selectNextSessionJourneyStage(joinedAt, now, processedStages);
    if (!stage) continue;

    const relevant = allMatches.filter(match => match.singleAId === single.id || match.singleBId === single.id);
    const stats: SessionJourneyStats = {
      hasActiveMutualMatch: relevant.some(match => match.approvedByA && match.approvedByB && match.matchDetailStatus !== "ended"),
      hasPositiveOutcome: relevant.some(match => ["dating", "together"].includes(match.matchDetailStatus || "")),
    };
    const eligible = isEligibleForSessionJourney({
      missingFields: getMissingProfileFields(single as any),
      purchasedSession: sessionBuyers.has(single.email.toLowerCase()),
      isCoachingClient: Boolean((single as any).isCoachingClient),
      ...stats,
    });
    if (!eligible) { skipped++; continue; }
    evaluated++;

    const plus = plusBySingle.get(single.id);
    const isPlus = Boolean(plus && plus.status === "active" && (plus.billingStatus === "active" || (plus.billingStatus === "cancelled" && Number(plus.billingCycleEndsAt || 0) > now)));
    const template = buildSessionJourneyEmail(stage, single, isPlus, { now });
    const createdAt = Date.now();
    const insertResult = await db.insert(emailLog).values({ recipientEmail: single.email, recipientName: single.firstName, journeyKey: JOURNEY_KEY, emailIndex: stage, subject: template.subject, htmlBody: template.htmlBody, textBody: template.textBody, scheduledAt: createdAt, status: "processing", createdAt });
    const logId = Number((insertResult as any)[0]?.insertId || 0);
    const result = await sendEmail({ to: { email: single.email, name: single.firstName }, subject: template.subject, htmlContent: template.htmlBody, textContent: template.textBody });
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
