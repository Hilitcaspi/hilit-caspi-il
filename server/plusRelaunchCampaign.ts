import { and, eq, inArray, or } from "drizzle-orm";
import { crmLeads, emailLog, matches, plusPilotMembers, singles } from "../drizzle/schema";
import { isPermanentlyBlockedEmail, sendEmail } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl, isEmailMarketingSuppressed } from "./emailUnsubscribe";
import {
  PLUS_HOLIDAY_LAUNCH_COHORT,
  PLUS_HOLIDAY_LAUNCH_EMAIL_JOURNEY,
  PLUS_HOLIDAY_LAUNCH_EXPIRES_AT,
  PLUS_HOLIDAY_LAUNCH_SMS_JOURNEY,
} from "./plusLaunchOffer";
import { isPlusPilotCoachingClient, loadCoachingClientEmails } from "./plusHolidayPilotCampaign";
import { assessPlusEligibility } from "./plusPilotRouter";
import { normalizeIsraeliMobile, sendSMSDetailed } from "./vibrate";

const PLUS_PUBLIC_URL = "https://hilitcaspi.com/database-plus";
const LAUNCH_DEADLINE_LABEL = "30.9";

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function launchUrl(input: { email: string; token: string; source: "email" | "sms" }) {
  const params = new URLSearchParams({
    email: input.email,
    token: input.token,
    utm_source: input.source,
    utm_medium: "launch",
    utm_campaign: PLUS_HOLIDAY_LAUNCH_COHORT,
    utm_content: `plus_launch_${input.source}`,
  });
  return `${PLUS_PUBLIC_URL}?${params.toString()}`;
}

export function buildPlusRelaunchEmail(input: { firstName: string; email: string; token: string }) {
  const checkoutUrl = launchUrl({ email: input.email, token: input.token, source: "email" });
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const subject = "ההשקה שביקשתם: Database Plus נפתח ✦";
  const textContent = `היי ${input.firstName},

אתם ביקשתם יותר הזדמנויות, יותר קצב ויותר תשומת לב בתוך המאגר. הקשבתי.

אני משיקה את Database Plus, השירות המתקדם והאישי ביותר לחברי המאגר שרוצים שאעבוד על הפרופיל שלהם בקדימות, אבחן עבורם יותר אפשרויות ואפתח עוד דרכים להכיר.

מה מקבלים בכל חודש פעיל?

לפחות שתי הצעות התאמה חדשות שאני בודקת באופן אישי ושולחת בפועל.

בוסט אחד נוסף ללא תשלום נוסף, מעבר להצעות ההתאמה של Plus.

קדימות באיתור, בבדיקת התאמות ובמעבר האישי שלי על הפרופיל.

מענה ועדכון העדפות בעדיפות דרך שירות Plus.

אפשרות להישקל לפינת הרווקים, רק באישור מפורש מראש.

ולכבוד ההשקה והחגים: כל מי שמצטרף עד ${LAUNCH_DEADLINE_LABEL} מקבל במחזור הראשון שלוש הצעות התאמה במקום שתיים.

המחיר הוא 99 ₪ לחודש בחיוב מתחדש עד לביטול. מספר המקומות מוגבל כדי שאוכל לשמור על רמת השירות האישית שהבטחתי.

לכל הפרטים ולהצטרפות:
${checkoutUrl}

ההתחייבות היא להצעות שנבדקו ונשלחו. אישור הדדי, פגישה או זוגיות אינם מובטחים.

באהבה,
הילית

להסרה ממסרים שיווקיים:
${unsubscribeUrl}`;
  const htmlContent = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${subject}</title></head>
<body style="margin:0;background:#eee9df;font-family:Arial,sans-serif;color:#171717">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">אתם ביקשתם יותר הזדמנויות ויותר תשומת לב. Database Plus נפתח עם הטבת השקה מיוחדת.</div>
  <div style="max-width:640px;margin:0 auto;padding:30px 14px">
    <div style="overflow:hidden;border:1px solid #d5c29b;background:#fffdf8;box-shadow:0 24px 70px rgba(12,12,16,.18)">
      <div style="background:#0b0b10;padding:20px 30px;text-align:center;border-bottom:1px solid #b99755">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#d8bd83;letter-spacing:3px;font-weight:700">HILIT CASPI · PRIVATE MEMBERSHIP</div>
      </div>
      <div style="background:linear-gradient(160deg,#0b0b10 0%,#171324 62%,#21183d 100%);padding:44px 30px 40px;text-align:center">
        <div style="color:#d8bd83;font-size:18px;letter-spacing:7px">✦</div>
        <div style="display:inline-block;margin-top:18px;padding:7px 18px;border-top:1px solid rgba(216,189,131,.8);border-bottom:1px solid rgba(216,189,131,.8);color:#e9d5a9;font-size:12px;letter-spacing:1px">השקה חדשה לחברי המאגר</div>
        <h1 style="margin:24px 0 0;color:#fffdf8;font-family:Georgia,'Times New Roman',serif;font-size:40px;font-weight:400;line-height:1.18">Database Plus</h1>
        <p style="margin:12px auto 0;max-width:500px;color:#f0eadf;font-size:21px;line-height:1.65">יותר הזדמנויות. יותר קדימות.<br />יותר תשומת לב אישית.</p>
      </div>
      <div style="height:5px;background:linear-gradient(90deg,#8f6c30,#f0dba7,#9f7938)"></div>
      <div style="background:#fffdf8;padding:38px 32px;line-height:1.8;font-size:17px">
        <p style="margin-top:0">היי ${input.firstName},</p>
        <p><strong>אתם ביקשתם יותר הזדמנויות, יותר קצב ויותר תשומת לב בתוך המאגר. הקשבתי.</strong></p>
        <p>אני משיקה את <strong>Database Plus</strong>, השירות המתקדם והאישי ביותר לחברי המאגר. זהו מנוי למי שרוצים שאעבוד על הפרופיל שלהם בקדימות, אבחן עבורם יותר אפשרויות ואפתח עוד דרכים להכיר.</p>
        <div style="margin:32px 0 17px;text-align:center;color:#8b692f;font-size:12px;font-weight:700;letter-spacing:1.4px">מה כולל המנוי בכל חודש פעיל</div>
        <div style="border-top:1px solid #d9c7a1;padding:18px 4px 16px"><strong style="font-size:19px;color:#111">01 · לפחות שתי הצעות התאמה חדשות</strong><div style="margin-top:4px;color:#625d54;font-size:15px">הצעות שאני בודקת באופן אישי ושולחת בפועל בכל מחזור.</div></div>
        <div style="border-top:1px solid #d9c7a1;padding:18px 4px 16px"><strong style="font-size:19px;color:#111">02 · בוסט אחד נוסף</strong><div style="margin-top:4px;color:#625d54;font-size:15px">הזדמנות נוספת ללא תשלום נוסף, מעבר להצעות ההתאמה של Plus.</div></div>
        <div style="border-top:1px solid #d9c7a1;padding:18px 4px 16px"><strong style="font-size:19px;color:#111">03 · קדימות לפרופיל ולשירות</strong><div style="margin-top:4px;color:#625d54;font-size:15px">קדימות באיתור, בבדיקת התאמות, בעדכון ההעדפות ובמענה האישי.</div></div>
        <div style="border-top:1px solid #d9c7a1;border-bottom:1px solid #d9c7a1;padding:18px 4px"><strong style="font-size:19px;color:#111">04 · אפשרות לפינת הרווקים</strong><div style="margin-top:4px;color:#625d54;font-size:15px">רק לאחר אישור מפורש ונפרד של התמונה והטקסט.</div></div>
        <div style="margin:32px 0;padding:28px 24px;border:1px solid #b99755;background:#0b0b10;color:#fffdf8;text-align:center">
          <div style="color:#d8bd83;font-size:17px;letter-spacing:5px">✦ ✦ ✦</div>
          <div style="margin-top:13px;font-size:12px;color:#e9d5a9;font-weight:700;letter-spacing:1px">הטבת השקה לכבוד החגים</div>
          <div style="margin-top:10px;font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:400;line-height:1.45">מצטרפים עד ${LAUNCH_DEADLINE_LABEL} ומקבלים במחזור הראשון <strong style="color:#f0d69e">שלוש הצעות התאמה</strong> במקום שתיים</div>
        </div>
        <p style="text-align:center;font-size:18px">המחיר הוא <strong>99 ₪ לחודש</strong> בחיוב מתחדש עד לביטול.<br /><span style="font-size:14px;color:#6b655c">מספר המקומות מוגבל כדי שאוכל לשמור על רמת השירות האישית שהבטחתי.</span></p>
        <div style="text-align:center;margin:32px 0"><a href="${checkoutUrl}" style="display:inline-block;background:#c6a15b;color:#0b0b10;text-decoration:none;font-weight:700;padding:17px 38px;border:1px solid #9c7838;letter-spacing:.3px">לגלות את Database Plus ולהצטרף</a></div>
        <p style="font-size:13px;line-height:1.7;color:#746f66;border-top:1px solid #e1d7c4;padding-top:18px">ההתחייבות היא להצעות שנבדקו ונשלחו. אישור הדדי, פגישה או זוגיות אינם מובטחים.</p>
        <p style="margin-bottom:0">באהבה,<br /><strong>הילית</strong></p>
      </div>
    </div>
    <div style="text-align:center;padding:18px;font-size:12px;color:#777"><a href="${unsubscribeUrl}" style="color:#777">הסרה מרשימת הדיוור</a></div>
  </div>
</body>
</html>`;
  return { subject, htmlContent, textContent, checkoutUrl };
}

export function buildPlusRelaunchSms(input: { email: string; token: string }) {
  const checkoutUrl = launchUrl({ email: input.email, token: input.token, source: "sms" });
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const message = `היי, כאן הילית ✨

אתם ביקשתם יותר הזדמנויות ויותר תשומת לב במאגר. הקשבתי.

אני משיקה את Database Plus, מנוי חודשי עם לפחות 2 הצעות התאמה שאני בודקת ושולחת, בוסט נוסף, קדימות לפרופיל ולשירות.

לכבוד ההשקה והחגים, מצטרפים עד ${LAUNCH_DEADLINE_LABEL} מקבלים הצעה שלישית במחזור הראשון, כלומר 3 במקום 2. המחיר 99 ₪ לחודש, מתחדש עד ביטול. מספר המקומות מוגבל.

לכל הפרטים ולהצטרפות:
${checkoutUrl}

להסרה:
${unsubscribeUrl}`;
  return { message, checkoutUrl };
}

function trackedEmailContent(htmlContent: string, logId: number, checkoutUrl: string) {
  const clickUrl = `https://hilitcaspi.com/api/email/click/${logId}?url=${encodeURIComponent(checkoutUrl)}`;
  const pixel = `<img src="https://hilitcaspi.com/api/email/open/${logId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`;
  return htmlContent.replace(checkoutUrl, clickUrl).replace("</body>", `${pixel}</body>`);
}

async function loadCampaignCandidates(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const [singleRows, memberRows, blockedRows, coachingEmails, matchRows] = await Promise.all([
    db.select().from(singles).where(and(
      eq(singles.isPaid, true),
      eq(singles.isActive, true),
      eq(singles.isSeed, false),
      eq(singles.consentEmailMarketing, true),
      inArray(singles.gender, ["female", "male"]),
    )),
    db.select().from(plusPilotMembers),
    db.select({ email: crmLeads.email }).from(crmLeads).where(eq(crmLeads.emailUnsubscribed, true)),
    loadCoachingClientEmails(db),
    db.select({
      id: matches.id,
      singleAId: matches.singleAId,
      singleBId: matches.singleBId,
      proposedAt: matches.proposedAt,
      status: matches.status,
      matchDetailStatus: matches.matchDetailStatus,
      returnedToPoolAt: matches.returnedToPoolAt,
    }).from(matches),
  ]);
  const memberBySingleId = new Map(memberRows.map(row => [row.singleId, row]));
  const blockedEmails = new Set(blockedRows.map(row => normalizeEmail(row.email)).filter(Boolean));
  const matchesBySingleId = new Map<number, typeof matchRows>();
  for (const match of matchRows) {
    for (const singleId of [match.singleAId, match.singleBId]) {
      if (!singleId) continue;
      const rows = matchesBySingleId.get(singleId) || [];
      rows.push(match);
      matchesBySingleId.set(singleId, rows);
    }
  }
  return singleRows.filter(single => {
    const email = normalizeEmail(single.email);
    const member = memberBySingleId.get(single.id);
    const eligibility = assessPlusEligibility(single, matchesBySingleId.get(single.id) || []);
    return email.includes("@")
      && Boolean(String(single.questionnaireToken || "").trim())
      && !blockedEmails.has(email)
      && !isPlusPilotCoachingClient(single, coachingEmails)
      && !(member?.status === "active" && member?.billingStatus === "active")
      && eligibility.eligible
      && !eligibility.activeMatch
      && !eligibility.positiveOutcome
      && eligibility.potentialMatchesUnderReview >= 3;
  });
}

export async function preparePlusRelaunchCohort(options: { dryRun?: boolean } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [candidates, memberRows, existingLogs] = await Promise.all([
    loadCampaignCandidates(db),
    db.select().from(plusPilotMembers),
    db.select({ recipientEmail: emailLog.recipientEmail, journeyKey: emailLog.journeyKey, sentAt: emailLog.sentAt })
      .from(emailLog)
      .where(and(
        inArray(emailLog.journeyKey, [PLUS_HOLIDAY_LAUNCH_EMAIL_JOURNEY, PLUS_HOLIDAY_LAUNCH_SMS_JOURNEY]),
        eq(emailLog.status, "sent"),
      )),
  ]);
  const memberBySingleId = new Map(memberRows.map(row => [row.singleId, row]));
  const sentEmails = new Set(existingLogs.filter(row => row.sentAt).map(row => normalizeEmail(row.recipientEmail)));
  const freshCandidates = candidates.filter(single => !sentEmails.has(normalizeEmail(single.email)));
  const summary = {
    prepared: freshCandidates.length,
    female: freshCandidates.filter(row => row.gender === "female").length,
    male: freshCandidates.filter(row => row.gender === "male").length,
    expiresAt: PLUS_HOLIDAY_LAUNCH_EXPIRES_AT,
    dryRun: Boolean(options.dryRun),
  };
  if (options.dryRun) return summary;
  const now = Date.now();
  for (const single of freshCandidates) {
    const existing = memberBySingleId.get(single.id);
    const values = {
      status: "eligible" as const,
      billingStatus: "not_configured" as const,
      source: PLUS_HOLIDAY_LAUNCH_COHORT,
      pilotCohort: PLUS_HOLIDAY_LAUNCH_COHORT,
      pilotPriceAgorot: 9900,
      monthlyMatchTarget: 2,
      invitedAt: null,
      lastEngagedAt: now,
      updatedAt: now,
    };
    if (existing) {
      await db.update(plusPilotMembers).set(values).where(eq(plusPilotMembers.id, existing.id));
    } else {
      await db.insert(plusPilotMembers).values({ singleId: single.id, ...values, waitlistedAt: now, createdAt: now });
    }
  }
  return summary;
}

export async function sendPreparedPlusRelaunchCampaign(options: { limit?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ member: plusPilotMembers, single: singles })
    .from(plusPilotMembers)
    .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
    .where(and(
      eq(plusPilotMembers.pilotCohort, PLUS_HOLIDAY_LAUNCH_COHORT),
      inArray(plusPilotMembers.status, ["eligible", "invited"]),
      eq(plusPilotMembers.billingStatus, "not_configured"),
    ));
  const blockedRows = await db.select({ email: crmLeads.email }).from(crmLeads).where(eq(crmLeads.emailUnsubscribed, true));
  const blockedEmails = new Set(blockedRows.map(row => normalizeEmail(row.email)).filter(Boolean));
  const ordered = [...rows].sort((a, b) => a.single.id - b.single.id);
  const selected = options.limit ? ordered.slice(0, Math.max(0, options.limit)) : ordered;
  let emailAccepted = 0;
  let emailFailed = 0;
  let smsAccepted = 0;
  let smsFailed = 0;
  let skipped = 0;

  for (let index = 0; index < selected.length; index += 1) {
    const row = selected[index];
    const email = normalizeEmail(row.single.email);
    const token = String(row.single.questionnaireToken || "").trim();
    const phone = normalizeIsraeliMobile(row.single.phone || "");
    const suppressed = !email.includes("@")
      || !token
      || blockedEmails.has(email)
      || isPermanentlyBlockedEmail(email)
      || (await isEmailMarketingSuppressed(email)).suppressed
      || !row.single.isPaid
      || !row.single.isActive
      || row.single.isSeed
      || !row.single.consentEmailMarketing;
    if (suppressed) {
      skipped += 1;
      continue;
    }

    const firstName = String(row.single.firstName || "שלום").trim().split(/\s+/)[0] || "שלום";
    const emailContent = buildPlusRelaunchEmail({ firstName, email, token });
    const [existingEmail] = await db.select().from(emailLog).where(and(
      eq(emailLog.recipientEmail, email),
      eq(emailLog.journeyKey, PLUS_HOLIDAY_LAUNCH_EMAIL_JOURNEY),
      eq(emailLog.emailIndex, 1),
    )).limit(1);
    if (existingEmail?.sentAt && existingEmail.status === "sent") {
      emailAccepted += 1;
    } else {
      const now = Date.now();
      let logId = existingEmail?.id || 0;
      if (!logId) {
        const inserted = await db.insert(emailLog).values({
          recipientEmail: email,
          recipientName: `${row.single.firstName} ${row.single.lastName || ""}`.trim(),
          journeyKey: PLUS_HOLIDAY_LAUNCH_EMAIL_JOURNEY,
          emailIndex: 1,
          subject: emailContent.subject,
          htmlBody: emailContent.htmlContent,
          textBody: emailContent.textContent,
          scheduledAt: now,
          status: "processing",
          createdAt: now,
        });
        logId = Number((inserted as unknown as [{ insertId?: number }])[0]?.insertId || 0);
      } else {
        await db.update(emailLog).set({ status: "processing", errorMessage: null }).where(eq(emailLog.id, logId));
      }
      const htmlContent = logId ? trackedEmailContent(emailContent.htmlContent, logId, emailContent.checkoutUrl) : emailContent.htmlContent;
      if (logId) await db.update(emailLog).set({ htmlBody: htmlContent }).where(eq(emailLog.id, logId));
      const delivery = await sendEmail({
        to: { email, name: `${row.single.firstName} ${row.single.lastName || ""}`.trim() },
        subject: emailContent.subject,
        htmlContent,
        textContent: emailContent.textContent,
      });
      const sentAt = Date.now();
      if (delivery.success && delivery.messageId !== "blocked") {
        emailAccepted += 1;
        if (logId) await db.update(emailLog).set({ status: "sent", sentAt }).where(eq(emailLog.id, logId));
      } else {
        emailFailed += 1;
        if (logId) await db.update(emailLog).set({ status: "failed", sentAt, errorMessage: String(delivery.error || "provider_rejected").slice(0, 500) }).where(eq(emailLog.id, logId));
      }
    }

    const invitationAt = Date.now();
    await db.update(plusPilotMembers).set({ status: "invited", invitedAt: row.member.invitedAt || invitationAt, updatedAt: invitationAt })
      .where(eq(plusPilotMembers.id, row.member.id));

    if (!phone) {
      smsFailed += 1;
      continue;
    }
    const smsContent = buildPlusRelaunchSms({ email, token });
    const [existingSms] = await db.select().from(emailLog).where(and(
      eq(emailLog.recipientEmail, email),
      eq(emailLog.journeyKey, PLUS_HOLIDAY_LAUNCH_SMS_JOURNEY),
      eq(emailLog.emailIndex, 1),
    )).limit(1);
    if (existingSms?.sentAt && existingSms.status === "sent") {
      smsAccepted += 1;
      continue;
    }
    const smsResult = await sendSMSDetailed(phone, smsContent.message);
    const sentAt = Date.now();
    if (existingSms) {
      await db.update(emailLog).set({
        status: smsResult.accepted ? "sent" : "failed",
        subject: "SMS השקת Database Plus",
        textBody: smsContent.message,
        sentAt,
        errorMessage: smsResult.accepted ? null : String(smsResult.error || "provider_rejected").slice(0, 500),
      }).where(eq(emailLog.id, existingSms.id));
    } else {
      await db.insert(emailLog).values({
        recipientEmail: email,
        recipientName: `${row.single.firstName} ${row.single.lastName || ""}`.trim(),
        journeyKey: PLUS_HOLIDAY_LAUNCH_SMS_JOURNEY,
        emailIndex: 1,
        subject: "SMS השקת Database Plus",
        htmlBody: smsContent.message,
        textBody: smsContent.message,
        scheduledAt: sentAt,
        sentAt,
        status: smsResult.accepted ? "sent" : "failed",
        errorMessage: smsResult.accepted ? null : String(smsResult.error || "provider_rejected").slice(0, 500),
        createdAt: sentAt,
      });
    }
    if (smsResult.accepted) smsAccepted += 1;
    else smsFailed += 1;

    if ((index + 1) % 50 === 0 || index + 1 === selected.length) {
      console.log(`[PlusLaunch] processed=${index + 1}/${selected.length} emailAccepted=${emailAccepted} emailFailed=${emailFailed} smsAccepted=${smsAccepted} smsFailed=${smsFailed} skipped=${skipped}`);
    }
  }

  return { total: selected.length, emailAccepted, emailFailed, smsAccepted, smsFailed, skipped };
}

export async function retryFailedPlusRelaunchMessages() {
  return sendPreparedPlusRelaunchCampaign();
}

export async function hasAlreadyReceivedPlusHolidayLaunch(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = normalizeEmail(email);
  const [row] = await db.select({ id: emailLog.id }).from(emailLog).where(and(
    eq(emailLog.recipientEmail, normalized),
    or(
      eq(emailLog.journeyKey, PLUS_HOLIDAY_LAUNCH_EMAIL_JOURNEY),
      eq(emailLog.journeyKey, PLUS_HOLIDAY_LAUNCH_SMS_JOURNEY),
    ),
    eq(emailLog.status, "sent"),
  )).limit(1);
  return Boolean(row);
}
