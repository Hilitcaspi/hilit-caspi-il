import { and, eq, inArray, lte, sql } from "drizzle-orm";
import {
  crmLeads,
  emailLog,
  matches,
  plusPilotMembers,
  productAccessTokens,
  singles,
} from "../drizzle/schema";
import { isPermanentlyBlockedEmail, sendEmail } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl, isEmailMarketingSuppressed } from "./emailUnsubscribe";
import { loadCoachingClientEmails } from "./plusHolidayPilotCampaign";
import { assessPlusEligibility } from "./plusPilotRouter";
import {
  PLUS_RELAUNCH_COHORT,
  PLUS_RELAUNCH_EMAIL_JOURNEY,
  PLUS_RELAUNCH_GUIDE_VALUE_ILS,
  PLUS_RELAUNCH_SMS_JOURNEY,
} from "./plusLaunchOffer";
import { normalizeIsraeliMobile, sendSMSDetailed } from "./vibrate";

const PLUS_PUBLIC_URL = "https://hilitcaspi.com/database-plus";
const INVITATION_WINDOW_MS = 72 * 60 * 60 * 1000;
const PREVIOUS_PLUS_JOURNEYS = [
  "plus_holiday_pilot_2026_09",
  "plus_pilot_sms_2026_09",
  "plus_payment_recovery_2026_09",
  "plus_recovery_sms_2026_09",
  PLUS_RELAUNCH_EMAIL_JOURNEY,
  PLUS_RELAUNCH_SMS_JOURNEY,
];

type RelaunchCandidate = {
  member: typeof plusPilotMembers.$inferSelect;
  single: typeof singles.$inferSelect;
  score: number;
  tenureDays: number;
};

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function buildPlusRelaunchEmail(input: { firstName: string; email: string; token: string }) {
  const checkoutUrl = `${PLUS_PUBLIC_URL}?email=${encodeURIComponent(input.email)}&token=${encodeURIComponent(input.token)}&utm_source=email&utm_medium=plus_relaunch&utm_campaign=${PLUS_RELAUNCH_COHORT}`;
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const subject = "אני רוצה לעבוד אישית על הפרופיל שלך — ויש לי מתנה ל־72 שעות";
  const textContent = `היי ${input.firstName},\n\nכבר ביקשת לשמוע על Database Plus, והפעם חשוב לי להסביר מה באמת שונה בו.\n\nזה לא עוד כפתור או עוד אפליקציה. זה מסלול שבו אני והצוות מפנים יותר עבודה יזומה לפרופיל שלך: עוברים מחדש על הפרופיל וההעדפות, ובכל מחזור פעיל שולחים לפחות שתי הצעות התאמה חדשות שנבדקו בפועל. בנוסף מחכה לך בוסט אחד ללא תשלום נוסף.\n\nלרגל ההשקה, אם מצטרפים דרך הקישור האישי בתוך 72 שעות, מקבלים גם את המדריך המלא „לבחור נכון” בשווי ${PLUS_RELAUNCH_GUIDE_VALUE_ILS} ₪ במתנה.\n\nהמסלול עולה 99 ₪ לחודש בחיוב מתחדש עד ביטול. ההבטחה היא לעבודה ולהצעות שנשלחות; אישור הדדי, דייט או זוגיות תלויים גם בצד השני ואינם מובטחים.\n\nלפרטים ולהצטרפות: ${checkoutUrl}\n\nבאהבה,\nהילית\n\nלהסרה: ${unsubscribeUrl}`;
  const htmlContent = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff3f5;font-family:Arial,sans-serif;color:#2b0a36"><div style="display:none;max-height:0;overflow:hidden">יותר עבודה יזומה סביב הפרופיל שלך, ומתנת השקה ל־72 שעות.</div><div style="max-width:620px;margin:auto;padding:24px 14px"><div style="overflow:hidden;border-radius:26px;box-shadow:0 18px 48px rgba(62,12,47,.12)"><div style="background:linear-gradient(140deg,#260b35,#7b2848);padding:38px 28px;text-align:center;color:white"><div style="font-size:13px;color:#ffbfd2">הילית כספי | Database Plus</div><h1 style="font-size:31px;line-height:1.3;margin:16px 0 10px">אני רוצה לעבוד יותר<br>בשביל ההיכרות שלך</h1><p style="margin:0;color:#f2dce6;line-height:1.7">לא עוד כפתורים. יותר תשומת לב יזומה סביב הפרופיל שלך.</p></div><div style="background:white;padding:32px 28px;font-size:16px;line-height:1.8"><p style="margin-top:0">היי ${input.firstName},</p><p>כבר ביקשת לשמוע על <strong>Database Plus</strong>, והפעם חשוב לי להסביר מה באמת שונה בו.</p><p><strong>זה לא עוד אפליקציה ולא עוד כפתור.</strong> זה מסלול שבו אני והצוות מפנים יותר עבודה יזומה לפרופיל שלך: עוברים מחדש על הפרופיל וההעדפות, ובכל מחזור פעיל שולחים לפחות <strong>שתי הצעות התאמה חדשות שנבדקו בפועל</strong>.</p><div style="display:grid;gap:10px;margin:22px 0"><div style="background:#fff4f7;border:1px solid #ffd5e1;border-radius:16px;padding:16px"><strong>2 הצעות Plus בכל מחזור</strong><br><span style="font-size:14px;color:#6e5b67">הצעות חדשות שנבדקו ונשלחו בפועל.</span></div><div style="background:#fff8ef;border:1px solid #f3dfc8;border-radius:16px;padding:16px"><strong>בוסט אחד ללא תשלום נוסף</strong><br><span style="font-size:14px;color:#6e5b67">הזדמנות נוספת מעבר לשתי הצעות ה־Plus.</span></div></div><div style="background:#2b0a36;color:white;border-radius:18px;padding:20px;text-align:center;margin:24px 0"><div style="font-size:13px;color:#ffbfd2;font-weight:bold">מתנת השקה ל־72 שעות</div><div style="font-size:21px;font-weight:bold;margin-top:6px">המדריך „לבחור נכון” במתנה</div><div style="font-size:14px;color:#f3dce6;margin-top:4px">שווי ${PLUS_RELAUNCH_GUIDE_VALUE_ILS} ₪ · הקישור יישלח לאחר אישור התשלום</div></div><p style="text-align:center"><strong>99 ₪ לחודש</strong>, בחיוב מתחדש עד ביטול.</p><p style="font-size:13px;color:#746a72">ההבטחה היא לעבודה ולהצעות שנשלחות. אישור הדדי, דייט או זוגיות תלויים גם בצד השני ואינם מובטחים.</p><div style="text-align:center;margin:28px 0"><a href="${checkoutUrl}" style="display:inline-block;background:#ff4466;color:white;text-decoration:none;padding:15px 28px;border-radius:999px;font-weight:bold">כן, אני רוצה יותר עבודה סביב הפרופיל שלי</a></div><p>באהבה,<br><strong>הילית</strong></p></div></div><div style="text-align:center;padding:16px;font-size:12px"><a href="${unsubscribeUrl}" style="color:#796d75">הסרה מרשימת הדיוור</a></div></div></body></html>`;
  return { subject, textContent, htmlContent, checkoutUrl };
}

export function buildPlusRelaunchSms(input: { email: string; token: string }) {
  const checkoutUrl = `${PLUS_PUBLIC_URL}?email=${encodeURIComponent(input.email)}&token=${encodeURIComponent(input.token)}&utm_source=sms&utm_medium=plus_relaunch&utm_campaign=${PLUS_RELAUNCH_COHORT}`;
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const message = `היי, כאן הילית 🤍\n\nכבר ביקשת לשמוע על Database Plus. הפעם בניתי לך הזמנה הרבה יותר ברורה: יותר עבודה אישית סביב הפרופיל, לפחות 2 הצעות חדשות שנבדקו בכל מחזור + בוסט נוסף.\n\nובהצטרפות בתוך 72 שעות: המדריך „לבחור נכון” בשווי ${PLUS_RELAUNCH_GUIDE_VALUE_ILS} ₪ במתנה.\n\n99 ₪ לחודש, אפשר לבטל בכל עת:\n${checkoutUrl}\n\nלהסרה: ${unsubscribeUrl}`;
  return { message, checkoutUrl };
}

async function loadEligibleCandidates(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const now = Date.now();
  const [memberRows, matchRows, sentLogs, blockedLeads, guideRows, coachingEmails] = await Promise.all([
    db.select({ member: plusPilotMembers, single: singles }).from(plusPilotMembers)
      .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
      .where(inArray(plusPilotMembers.status, ["waitlist", "eligible"])),
    db.select({
      id: matches.id,
      singleAId: matches.singleAId,
      singleBId: matches.singleBId,
      proposedAt: matches.proposedAt,
      status: matches.status,
      matchDetailStatus: matches.matchDetailStatus,
      returnedToPoolAt: matches.returnedToPoolAt,
    }).from(matches),
    db.select({ recipientEmail: emailLog.recipientEmail }).from(emailLog)
      .where(inArray(emailLog.journeyKey, PREVIOUS_PLUS_JOURNEYS)),
    db.select({ email: crmLeads.email }).from(crmLeads).where(eq(crmLeads.emailUnsubscribed, true)),
    db.select({ email: productAccessTokens.email }).from(productAccessTokens)
      .where(and(eq(productAccessTokens.product, "guide_149"), sql`${productAccessTokens.expiresAt} > ${now}`)),
    loadCoachingClientEmails(db),
  ]);
  const sentEmails = new Set(sentLogs.map(row => normalizeEmail(row.recipientEmail)));
  const blockedEmails = new Set(blockedLeads.map(row => normalizeEmail(row.email)));
  const guideEmails = new Set(guideRows.map(row => normalizeEmail(row.email)));
  const matchesBySingle = new Map<number, typeof matchRows>();
  for (const match of matchRows) {
    for (const singleId of [match.singleAId, match.singleBId]) {
      const list = matchesBySingle.get(singleId) || [];
      list.push(match);
      matchesBySingle.set(singleId, list);
    }
  }
  const candidates: RelaunchCandidate[] = [];
  for (const row of memberRows) {
    const email = normalizeEmail(row.single.email);
    if (!email.includes("@") || !String(row.single.questionnaireToken || "").trim()) continue;
    if (!row.single.isPaid || !row.single.isActive || row.single.isSeed || !row.single.consentEmailMarketing) continue;
    if (sentEmails.has(email) || blockedEmails.has(email) || guideEmails.has(email) || coachingEmails.has(email)) continue;
    if (isPermanentlyBlockedEmail(email) || (await isEmailMarketingSuppressed(email)).suppressed) continue;
    const assessment = assessPlusEligibility(row.single, matchesBySingle.get(row.single.id) || [], now);
    if (!assessment.eligible || assessment.activeMatch || assessment.positiveOutcome || assessment.potentialMatchesUnderReview < 2) continue;
    candidates.push({ member: row.member, single: row.single, score: assessment.score, tenureDays: assessment.tenureDays });
  }
  return candidates.sort((a, b) => b.score - a.score || b.tenureDays - a.tenureDays || a.single.id - b.single.id);
}

export async function preparePlusRelaunchCohort(options: { dryRun?: boolean } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Date.now();
  const expiredInvitations = await db.select({ id: plusPilotMembers.id }).from(plusPilotMembers).where(and(
    eq(plusPilotMembers.status, "invited"),
    eq(plusPilotMembers.billingStatus, "not_configured"),
    lte(plusPilotMembers.invitedAt, now - INVITATION_WINDOW_MS),
  ));
  const candidates = await loadEligibleCandidates(db);
  const summary = {
    eligible: candidates.length,
    female: candidates.filter(row => row.single.gender === "female").length,
    male: candidates.filter(row => row.single.gender === "male").length,
    withMobile: candidates.filter(row => Boolean(normalizeIsraeliMobile(String(row.single.phone || "")))).length,
    expiredInvitations: expiredInvitations.length,
    prepared: options.dryRun ? 0 : candidates.length,
  };
  if (options.dryRun) return summary;
  if (expiredInvitations.length > 0) {
    await db.update(plusPilotMembers).set({ status: "declined", endedAt: now, updatedAt: now }).where(inArray(
      plusPilotMembers.id,
      expiredInvitations.map(row => row.id),
    ));
  }
  for (const row of candidates) {
    await db.update(plusPilotMembers).set({
      status: "eligible",
      billingStatus: "not_configured",
      source: "plus_relaunch_guide_bonus",
      pilotCohort: PLUS_RELAUNCH_COHORT,
      pilotPriceAgorot: 9900,
      monthlyMatchTarget: 2,
      invitedAt: null,
      updatedAt: now,
    }).where(and(
      eq(plusPilotMembers.id, row.member.id),
      inArray(plusPilotMembers.status, ["waitlist", "eligible"]),
    ));
  }
  return summary;
}

function trackedEmailContent(htmlContent: string, logId: number, checkoutUrl: string) {
  const clickUrl = `https://hilitcaspi.com/api/email/click/${logId}?url=${encodeURIComponent(checkoutUrl)}`;
  const pixel = `<img src="https://hilitcaspi.com/api/email/open/${logId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`;
  return htmlContent.replace(checkoutUrl, clickUrl).replace("</body>", `${pixel}</body>`);
}

export async function sendPreparedPlusRelaunchCampaign() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ member: plusPilotMembers, single: singles }).from(plusPilotMembers)
    .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
    .where(and(
      eq(plusPilotMembers.pilotCohort, PLUS_RELAUNCH_COHORT),
      inArray(plusPilotMembers.status, ["eligible", "invited"]),
      eq(plusPilotMembers.billingStatus, "not_configured"),
    ));
  const eligible = await loadEligibleCandidates(db);
  const eligibleIds = new Set(eligible.map(row => row.member.id));
  const safeRows = rows.filter(row => eligibleIds.has(row.member.id) || row.member.status === "invited");
  let emailSent = 0;
  let smsSent = 0;
  let failed = 0;
  for (const row of safeRows) {
    const email = normalizeEmail(row.single.email);
    const [existingEmail] = await db.select().from(emailLog).where(and(
      eq(emailLog.recipientEmail, email),
      eq(emailLog.journeyKey, PLUS_RELAUNCH_EMAIL_JOURNEY),
      eq(emailLog.emailIndex, 1),
    )).limit(1);
    let invitedAt = Number(row.member.invitedAt || 0);
    if (!existingEmail?.sentAt) {
      const content = buildPlusRelaunchEmail({ firstName: row.single.firstName || "שלום", email, token: String(row.single.questionnaireToken || "") });
      const now = Date.now();
      const inserted = existingEmail ? null : await db.insert(emailLog).values({
        recipientEmail: email,
        recipientName: `${row.single.firstName} ${row.single.lastName || ""}`.trim(),
        journeyKey: PLUS_RELAUNCH_EMAIL_JOURNEY,
        emailIndex: 1,
        subject: content.subject,
        htmlBody: content.htmlContent,
        textBody: content.textContent,
        scheduledAt: now,
        status: "processing",
        createdAt: now,
      });
      const logId = existingEmail?.id || Number((inserted as any)?.[0]?.insertId || 0);
      const htmlContent = logId ? trackedEmailContent(content.htmlContent, logId, content.checkoutUrl) : content.htmlContent;
      if (logId) await db.update(emailLog).set({ status: "processing", htmlBody: htmlContent, errorMessage: null }).where(eq(emailLog.id, logId));
      const delivery = await sendEmail({ to: { email, name: `${row.single.firstName} ${row.single.lastName || ""}`.trim() }, subject: content.subject, htmlContent, textContent: content.textContent });
      invitedAt = Date.now();
      if (!delivery.success || delivery.messageId === "blocked") {
        failed++;
        if (logId) await db.update(emailLog).set({ status: "failed", sentAt: invitedAt, errorMessage: String(delivery.error || "provider_rejected").slice(0, 500) }).where(eq(emailLog.id, logId));
        continue;
      }
      emailSent++;
      if (logId) await db.update(emailLog).set({ status: "sent", sentAt: invitedAt }).where(eq(emailLog.id, logId));
      await db.update(plusPilotMembers).set({ status: "invited", invitedAt, updatedAt: invitedAt }).where(eq(plusPilotMembers.id, row.member.id));
    }
    const phone = normalizeIsraeliMobile(String(row.single.phone || ""));
    if (!phone) continue;
    const [existingSms] = await db.select().from(emailLog).where(and(
      eq(emailLog.recipientEmail, email),
      eq(emailLog.journeyKey, PLUS_RELAUNCH_SMS_JOURNEY),
      eq(emailLog.emailIndex, 1),
    )).limit(1);
    if (existingSms?.sentAt && existingSms.status === "sent") continue;
    const content = buildPlusRelaunchSms({ email, token: String(row.single.questionnaireToken || "") });
    const now = Date.now();
    const inserted = existingSms ? null : await db.insert(emailLog).values({
      recipientEmail: email,
      recipientName: `${row.single.firstName} ${row.single.lastName || ""}`.trim(),
      journeyKey: PLUS_RELAUNCH_SMS_JOURNEY,
      emailIndex: 1,
      subject: "[SMS] Database Plus — מתנת השקה ל־72 שעות",
      htmlBody: "SMS delivery record",
      textBody: content.message,
      scheduledAt: now,
      status: "processing",
      createdAt: now,
    });
    const logId = existingSms?.id || Number((inserted as any)?.[0]?.insertId || 0);
    const delivery = await sendSMSDetailed(phone, content.message);
    const sentAt = Date.now();
    if (!delivery.accepted) {
      failed++;
      if (logId) await db.update(emailLog).set({ status: "failed", sentAt, errorMessage: delivery.error || "provider_rejected" }).where(eq(emailLog.id, logId));
      continue;
    }
    smsSent++;
    if (logId) await db.update(emailLog).set({ status: "sent", sentAt, errorMessage: delivery.providerRunId }).where(eq(emailLog.id, logId));
  }
  return { total: safeRows.length, emailSent, smsSent, failed };
}
