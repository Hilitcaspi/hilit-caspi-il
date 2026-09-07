import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { crmLeads, emailLog, matches, plusCheckoutIntents, plusPaymentEvents, plusPilotMembers, singles, type Single } from "../drizzle/schema";
import { sendEmail, isPermanentlyBlockedEmail } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl, isEmailMarketingSuppressed } from "./emailUnsubscribe";
import { assessPlusEligibility } from "./plusPilotRouter";

export const PLUS_HOLIDAY_PILOT_COHORT = "holiday_plus_pilot_2026_09";
export const PLUS_HOLIDAY_PILOT_JOURNEY = "plus_holiday_pilot_2026_09";
export const PLUS_PAYMENT_RECOVERY_COHORT = "plus_payment_recovery_2026_09";
export const PLUS_PAYMENT_RECOVERY_JOURNEY = "plus_payment_recovery_2026_09";
export const PLUS_HOLIDAY_PILOT_NEW_COUNTS = { female: 20, male: 15 } as const;
const PLUS_PUBLIC_URL = "https://hilitcaspi.com/database-plus";

type Candidate = {
  single: Single;
  eligibilityScore: number;
  eligibilityReasons: string[];
  tenureDays: number;
};

export function rankPlusHolidayPilotCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) =>
    b.eligibilityScore - a.eligibilityScore
    || b.tenureDays - a.tenureDays
    || Number(a.single.createdAt || 0) - Number(b.single.createdAt || 0)
    || a.single.id - b.single.id,
  );
}

export function selectBalancedPlusHolidayPilotCandidates(candidates: Candidate[]): Candidate[] {
  const ranked = rankPlusHolidayPilotCandidates(candidates);
  return [
    ...ranked.filter(item => item.single.gender === "female").slice(0, PLUS_HOLIDAY_PILOT_NEW_COUNTS.female),
    ...ranked.filter(item => item.single.gender === "male").slice(0, PLUS_HOLIDAY_PILOT_NEW_COUNTS.male),
  ];
}

export function buildPlusHolidayPilotEmail(input: { firstName: string; email: string; token: string }): {
  subject: string;
  htmlContent: string;
  textContent: string;
  checkoutUrl: string;
} {
  const checkoutUrl = `${PLUS_PUBLIC_URL}?email=${encodeURIComponent(input.email)}&token=${encodeURIComponent(input.token)}&utm_source=email&utm_medium=pilot_invitation&utm_campaign=${PLUS_HOLIDAY_PILOT_COHORT}`;
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const subject = "נבחרת להשקה הראשונה של Database Plus";
  const textContent = `היי ${input.firstName},\n\nראיתי שנרשמת לרשימת ההמתנה, ואני שמחה לבשר לך שנבחרת להצטרף להשקה הראשונה של Database Plus.\n\nזה השירות המתקדם ביותר שיצרתי לחברי המאגר, וזו הזדמנות מיוחדת לקבל ממני יותר תשומת לב, יותר הזדמנויות ועוד דרך טובה להכיר.\n\nמה מחכה לך ב־Database Plus?\n\nשתי התאמות שאני בוחנת עבורך בכל חודש.\n\nבוסט אחד חינם בכל מחזור, בנוסף לשתי ההתאמות.\n\nיותר תשומת לב לפרופיל שלך בתהליך האיתור וההתאמה.\n\nלכבוד ההשקה והחגים אני שמה גז על ההתאמות לחברי המאגר, כדי לפתוח עבורכם עוד הזדמנויות אמיתיות להכיר.\n\nההצטרפות היא ב־99 ₪ לחודש בחיוב מתחדש עד לביטול. השירות יופעל רק לאחר השלמת התשלום.\n\nלהצטרפות ל־Database Plus: ${checkoutUrl}\n\nבאהבה,\nהילית\n\nלהסרה: ${unsubscribeUrl}`;
  const htmlContent = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;background:#f4ede5;font-family:Arial,sans-serif;color:#2b1816">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">נבחרת להשקה הראשונה של השירות המתקדם ביותר שיצרתי לחברי המאגר.</div>
  <div style="max-width:620px;margin:0 auto;padding:28px 16px">
    <div style="overflow:hidden;border-radius:26px;box-shadow:0 18px 48px rgba(62,34,29,.13)">
      <div style="background:linear-gradient(145deg,#2b1816 0%,#56342c 100%);padding:38px 28px 34px;text-align:center">
        <div style="font-size:13px;color:#e6c99c;letter-spacing:.5px">הילית כספי | מומחית לזוגיות</div>
        <div style="display:inline-block;margin-top:18px;padding:8px 16px;border:1px solid rgba(255,248,239,.35);border-radius:999px;color:#fff8ef;font-size:13px;font-weight:700">נבחרת להשקה הראשונה</div>
        <h1 style="margin:18px 0 0;color:#fff8ef;font-size:32px;line-height:1.25">Database Plus נפתח עבורך</h1>
        <p style="margin:13px auto 0;max-width:470px;color:#eadbd1;font-size:16px;line-height:1.7">הזדמנות חגיגית להכניס יותר תנועה, תשומת לב ואפשרויות חדשות לתהליך ההיכרויות שלך.</p>
      </div>
      <div style="background:#fffdf9;padding:34px 30px;line-height:1.8;font-size:17px">
        <p style="margin-top:0">היי ${input.firstName},</p>
        <p><strong>ראיתי שנרשמת לרשימת ההמתנה, ואני שמחה לבשר לך שנבחרת</strong> להצטרף להשקה הראשונה של Database Plus.</p>
        <p><strong>זה השירות המתקדם ביותר שיצרתי לחברי המאגר.</strong> זו הזדמנות מיוחדת לקבל ממני יותר תשומת לב, יותר הזדמנויות ועוד דרך טובה להכיר.</p>
        <div style="margin:26px 0 16px;text-align:center;color:#6d4438;font-size:14px;font-weight:700;letter-spacing:.2px">מה מחכה לך ב־Database Plus?</div>
        <div style="background:#f4e4d8;border:1px solid #ecd4c3;border-radius:17px;padding:18px 20px;margin:10px 0">
          <div style="font-size:19px;font-weight:700;color:#2b1816">שתי התאמות בכל חודש</div>
          <div style="margin-top:4px;color:#6f5a52;font-size:15px;line-height:1.6">שתי התאמות שאני בוחנת עבורך בכל חודש פעיל.</div>
        </div>
        <div style="background:#f8eee7;border:1px solid #ecd9ca;border-radius:17px;padding:18px 20px;margin:10px 0">
          <div style="font-size:19px;font-weight:700;color:#2b1816">בוסט אחד חינם בכל מחזור</div>
          <div style="margin-top:4px;color:#6f5a52;font-size:15px;line-height:1.6">הזדמנות היכרות נוספת שמצטרפת לשתי ההתאמות ולא מחליפה אותן.</div>
        </div>
        <div style="background:#fbf5ef;border:1px solid #eee0d4;border-radius:17px;padding:18px 20px;margin:10px 0">
          <div style="font-size:19px;font-weight:700;color:#2b1816">יותר תשומת לב לפרופיל שלך</div>
          <div style="margin-top:4px;color:#6f5a52;font-size:15px;line-height:1.6">יותר מקום לפרופיל שלך בתהליך האיתור, המיון ועדכון ההעדפות.</div>
        </div>
        <div style="margin:26px 0;padding:21px 22px;border-radius:17px;background:#2b1816;color:#fff8ef;text-align:center">
          <div style="font-size:13px;color:#e6c99c;font-weight:700">לכבוד ההשקה והחגים</div>
          <div style="margin-top:7px;font-size:20px;font-weight:700;line-height:1.45">אני שמה גז על ההתאמות לחברי המאגר</div>
          <div style="margin-top:6px;color:#eadbd1;font-size:14px;line-height:1.6">כדי לפתוח עבורכם עוד הזדמנויות אמיתיות להכיר.</div>
        </div>
        <p style="text-align:center">ההצטרפות היא ב־<strong>99 ₪ לחודש</strong> בחיוב מתחדש עד לביטול.<br />השירות יופעל רק לאחר השלמת התשלום.</p>
        <div style="text-align:center;margin:30px 0">
          <a href="${checkoutUrl}" style="display:inline-block;background:#d9a7a7;color:#2b1816;text-decoration:none;font-weight:700;padding:16px 32px;border-radius:999px">אני רוצה להצטרף ל־Database Plus</a>
        </div>
        <p style="margin-bottom:0">באהבה,<br /><strong>הילית</strong></p>
      </div>
    </div>
    <div style="text-align:center;padding:18px;font-size:12px;color:#7d6c64"><a href="${unsubscribeUrl}" style="color:#7d6c64">הסרה מרשימת הדיוור</a></div>
  </div>
</body>
</html>`;
  return { subject, htmlContent, textContent, checkoutUrl };
}

export function buildPlusPaymentRecoveryEmail(input: { firstName: string; email: string; token: string }): {
  subject: string;
  htmlContent: string;
  textContent: string;
  checkoutUrl: string;
} {
  const checkoutUrl = `${PLUS_PUBLIC_URL}?email=${encodeURIComponent(input.email)}&token=${encodeURIComponent(input.token)}&utm_source=email&utm_medium=payment_recovery&utm_campaign=${PLUS_PAYMENT_RECOVERY_COHORT}`;
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const subject = "Database Plus נפתח היום. אפשר להשלים את ההצטרפות";
  const textContent = `היי ${input.firstName},\n\nראיתי שניסית בעבר להצטרף ל־Database Plus. באותו זמן העמוד היה בסביבת בדיקה, ולכן חויבת ב־1 ₪ בלבד ולא הוגדר עבורך חיוב Plus של 99 ₪.\n\nההשקה הראשונה מתקיימת היום. במסלול מחכות לך שתי התאמות שאני בוחנת עבורך בכל חודש ובוסט אחד חינם בכל מחזור.\n\nאם תרצה להצטרף, אפשר להשלים כאן תשלום של 99 ₪ לחודש בחיוב מתחדש עד לביטול. השירות יופעל רק לאחר שהתשלום החדש ייקלט בהצלחה:\n${checkoutUrl}\n\nבאהבה,\nהילית\n\nלהסרה: ${unsubscribeUrl}`;
  const htmlContent = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8" /></head><body style="margin:0;background:#f5efe7;font-family:Arial,sans-serif;color:#2b1816"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="background:#2b1816;border-radius:24px 24px 0 0;padding:34px 28px;text-align:center"><div style="font-size:14px;color:#d9b989">הילית כספי | מומחית לזוגיות</div><h1 style="margin:16px 0 0;color:#fff8ef;font-size:31px;line-height:1.25">Database Plus נפתח היום</h1></div><div style="background:#fffdf9;border-radius:0 0 24px 24px;padding:34px 30px;line-height:1.8;font-size:17px"><p style="margin-top:0">היי ${input.firstName},</p><p>ראיתי שניסית בעבר להצטרף ל־Database Plus. באותו זמן העמוד היה בסביבת בדיקה, ולכן חויבת ב־<strong>1 ₪ בלבד</strong> ולא הוגדר עבורך חיוב Plus של 99 ₪.</p><p>ההשקה הראשונה מתקיימת היום. במסלול מחכות לך <strong>שתי התאמות שאני בוחנת עבורך בכל חודש</strong> ו־<strong>בוסט אחד חינם בכל מחזור</strong>.</p><p>אם תרצה להצטרף, אפשר להשלים תשלום של <strong>99 ₪ לחודש</strong> בחיוב מתחדש עד לביטול. השירות יופעל רק לאחר שהתשלום החדש ייקלט בהצלחה.</p><div style="text-align:center;margin:30px 0"><a href="${checkoutUrl}" style="display:inline-block;background:#d9a7a7;color:#2b1816;text-decoration:none;font-weight:700;padding:15px 30px;border-radius:999px">להשלמת התשלום והפעלת Plus</a></div><p style="margin-bottom:0">באהבה,<br /><strong>הילית</strong></p></div><div style="text-align:center;padding:18px;font-size:12px;color:#7d6c64"><a href="${unsubscribeUrl}" style="color:#7d6c64">הסרה מרשימת הדיוור</a></div></div></body></html>`;
  return { subject, htmlContent, textContent, checkoutUrl };
}

function trackedEmailContent(htmlContent: string, logId: number, checkoutUrl: string): string {
  const clickUrl = `https://hilitcaspi.com/api/email/click/${logId}?url=${encodeURIComponent(checkoutUrl)}`;
  const pixel = `<img src="https://hilitcaspi.com/api/email/open/${logId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`;
  return htmlContent.replace(checkoutUrl, clickUrl).replace("</body>", `${pixel}</body>`);
}

export async function preparePlusHolidayPilotCohort(): Promise<{ prepared: number; female: number; male: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existingCohort = await db.select({ id: plusPilotMembers.id, singleId: plusPilotMembers.singleId })
    .from(plusPilotMembers)
    .where(eq(plusPilotMembers.pilotCohort, PLUS_HOLIDAY_PILOT_COHORT));
  if (existingCohort.length) {
    const cohortSingles = await db.select({ gender: singles.gender }).from(singles)
      .where(inArray(singles.id, existingCohort.map(row => row.singleId)));
    return {
      prepared: existingCohort.length,
      female: cohortSingles.filter(row => row.gender === "female").length,
      male: cohortSingles.filter(row => row.gender === "male").length,
    };
  }

  const [singleRows, matchRows, memberRows, blockedLeadRows] = await Promise.all([
    db.select().from(singles).where(and(
      eq(singles.isPaid, true),
      eq(singles.isActive, true),
      eq(singles.isSeed, false),
      eq(singles.consentEmailMarketing, true),
      inArray(singles.gender, ["female", "male"]),
    )),
    db.select({
      id: matches.id,
      singleAId: matches.singleAId,
      singleBId: matches.singleBId,
      proposedAt: matches.proposedAt,
      status: matches.status,
      matchDetailStatus: matches.matchDetailStatus,
      returnedToPoolAt: matches.returnedToPoolAt,
    }).from(matches),
    db.select({ singleId: plusPilotMembers.singleId }).from(plusPilotMembers),
    db.select({ email: crmLeads.email }).from(crmLeads).where(eq(crmLeads.emailUnsubscribed, true)),
  ]);
  const existingSingleIds = new Set(memberRows.map(row => row.singleId));
  const blockedEmails = new Set(blockedLeadRows.map(row => String(row.email || "").trim().toLowerCase()));
  const matchesBySingle = new Map<number, any[]>();
  for (const match of matchRows) {
    for (const singleId of [match.singleAId, match.singleBId]) {
      if (!singleId) continue;
      const list = matchesBySingle.get(singleId) || [];
      list.push(match);
      matchesBySingle.set(singleId, list);
    }
  }
  const candidates: Candidate[] = [];
  for (const single of singleRows) {
    const email = String(single.email || "").trim().toLowerCase();
    if (!email.includes("@") || !String(single.questionnaireToken || "").trim() || blockedEmails.has(email) || existingSingleIds.has(single.id)) continue;
    const assessment = assessPlusEligibility(single, matchesBySingle.get(single.id) || []);
    if (!assessment.eligible || assessment.activeMatch || assessment.positiveOutcome || assessment.potentialMatchesUnderReview < 2) continue;
    candidates.push({
      single,
      eligibilityScore: assessment.score,
      eligibilityReasons: assessment.reasons,
      tenureDays: assessment.tenureDays,
    });
  }
  const selected = selectBalancedPlusHolidayPilotCandidates(candidates);
  const female = selected.filter(item => item.single.gender === "female").length;
  const male = selected.filter(item => item.single.gender === "male").length;
  if (female !== PLUS_HOLIDAY_PILOT_NEW_COUNTS.female || male !== PLUS_HOLIDAY_PILOT_NEW_COUNTS.male) {
    throw new Error("Insufficient eligible Plus pilot candidates");
  }
  const now = Date.now();
  await db.insert(plusPilotMembers).values(selected.map(item => ({
    singleId: item.single.id,
    status: "eligible" as const,
    billingStatus: "not_configured" as const,
    eligibilityScore: item.eligibilityScore,
    eligibilityReasons: JSON.stringify(item.eligibilityReasons),
    source: "holiday_pilot_email",
    pilotCohort: PLUS_HOLIDAY_PILOT_COHORT,
    pilotPriceAgorot: 9900,
    monthlyMatchTarget: 2,
    waitlistedAt: now,
    createdAt: now,
    updatedAt: now,
  })));
  return { prepared: selected.length, female, male };
}

export async function sendPreparedPlusHolidayPilotInvitations(): Promise<{ total: number; accepted: number; failed: number; female: number; male: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ member: plusPilotMembers, single: singles })
    .from(plusPilotMembers)
    .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
    .where(and(
      eq(plusPilotMembers.pilotCohort, PLUS_HOLIDAY_PILOT_COHORT),
      eq(plusPilotMembers.status, "eligible"),
      eq(plusPilotMembers.billingStatus, "not_configured"),
      isNull(plusPilotMembers.invitedAt),
    ));
  const expectedFemale = rows.filter(row => row.single.gender === "female").length;
  const expectedMale = rows.filter(row => row.single.gender === "male").length;
  if (rows.length !== 35 || expectedFemale !== 20 || expectedMale !== 15 || rows.some(row => !String(row.single.questionnaireToken || "").trim())) {
    throw new Error("Plus pilot invitation snapshot mismatch");
  }
  const rowIds = rows.map(row => row.single.id);
  const currentMatches = await db.select({
    id: matches.id,
    singleAId: matches.singleAId,
    singleBId: matches.singleBId,
    proposedAt: matches.proposedAt,
    status: matches.status,
    matchDetailStatus: matches.matchDetailStatus,
    returnedToPoolAt: matches.returnedToPoolAt,
  }).from(matches).where(or(inArray(matches.singleAId, rowIds), inArray(matches.singleBId, rowIds)));
  const matchesBySingle = new Map<number, typeof currentMatches>();
  for (const match of currentMatches) {
    for (const singleId of [match.singleAId, match.singleBId]) {
      if (!singleId || !rowIds.includes(singleId)) continue;
      const memberMatches = matchesBySingle.get(singleId) || [];
      memberMatches.push(match);
      matchesBySingle.set(singleId, memberMatches);
    }
  }
  for (const row of rows) {
    const email = String(row.single.email || "").trim().toLowerCase();
    const assessment = assessPlusEligibility(row.single, matchesBySingle.get(row.single.id) || []);
    const suppressed = isPermanentlyBlockedEmail(email) || (await isEmailMarketingSuppressed(email)).suppressed;
    if (!row.single.isPaid || !row.single.isActive || row.single.isSeed || !row.single.consentEmailMarketing || suppressed
      || !assessment.eligible || assessment.activeMatch || assessment.positiveOutcome || assessment.potentialMatchesUnderReview < 2) {
      throw new Error("Plus pilot recipient is no longer eligible");
    }
  }
  let accepted = 0;
  let failed = 0;
  for (const row of rows) {
    const email = String(row.single.email || "").trim().toLowerCase();
    if (isPermanentlyBlockedEmail(email) || (await isEmailMarketingSuppressed(email)).suppressed) {
      failed += 1;
      continue;
    }
    const existingLog = await db.select().from(emailLog).where(and(
      eq(emailLog.recipientEmail, email),
      eq(emailLog.journeyKey, PLUS_HOLIDAY_PILOT_JOURNEY),
      eq(emailLog.emailIndex, 1),
    )).limit(1);
    if (existingLog[0]?.sentAt) {
      await db.update(plusPilotMembers).set({ status: "invited", invitedAt: existingLog[0].sentAt, updatedAt: Date.now() })
        .where(eq(plusPilotMembers.id, row.member.id));
      accepted += 1;
      continue;
    }
    const firstName = String(row.single.firstName || "שלום").trim().split(/\s+/)[0] || "שלום";
    const content = buildPlusHolidayPilotEmail({ firstName, email, token: String(row.single.questionnaireToken || "") });
    const now = Date.now();
    let logId = existingLog[0]?.id || 0;
    if (!logId) {
      const inserted = await db.insert(emailLog).values({
        recipientEmail: email,
        recipientName: `${row.single.firstName} ${row.single.lastName || ""}`.trim(),
        journeyKey: PLUS_HOLIDAY_PILOT_JOURNEY,
        emailIndex: 1,
        subject: content.subject,
        htmlBody: content.htmlContent,
        textBody: content.textContent,
        scheduledAt: now,
        status: "processing",
        createdAt: now,
      });
      logId = Number((inserted as unknown as [{ insertId?: number }])[0]?.insertId || 0);
    } else {
      await db.update(emailLog).set({ status: "processing", errorMessage: null }).where(eq(emailLog.id, logId));
    }
    const htmlContent = logId ? trackedEmailContent(content.htmlContent, logId, content.checkoutUrl) : content.htmlContent;
    if (logId) await db.update(emailLog).set({ htmlBody: htmlContent }).where(eq(emailLog.id, logId));
    const delivery = await sendEmail({
      to: { email, name: `${row.single.firstName} ${row.single.lastName || ""}`.trim() },
      subject: content.subject,
      htmlContent,
      textContent: content.textContent,
    });
    const sentAt = Date.now();
    if (!delivery.success || delivery.messageId === "blocked") {
      failed += 1;
      if (logId) await db.update(emailLog).set({ status: "failed", sentAt, errorMessage: String(delivery.error || "provider_rejected").slice(0, 500) }).where(eq(emailLog.id, logId));
      continue;
    }
    accepted += 1;
    if (logId) await db.update(emailLog).set({ status: "sent", sentAt }).where(eq(emailLog.id, logId));
    await db.update(plusPilotMembers).set({ status: "invited", invitedAt: sentAt, updatedAt: sentAt })
      .where(and(eq(plusPilotMembers.id, row.member.id), eq(plusPilotMembers.status, "eligible"), isNull(plusPilotMembers.invitedAt)));
  }
  return { total: rows.length, accepted, failed, female: expectedFemale, male: expectedMale };
}

export async function preparePlusPaymentRecoveryCandidates(): Promise<{ prepared: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const activeMen = await db.select({ member: plusPilotMembers, single: singles })
    .from(plusPilotMembers)
    .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
    .where(and(eq(singles.gender, "male"), eq(plusPilotMembers.status, "active"), eq(plusPilotMembers.billingStatus, "active")));
  const memberIds = activeMen.map(row => row.member.id);
  const events = memberIds.length ? await db.select().from(plusPaymentEvents)
    .where(inArray(plusPaymentEvents.plusMemberId, memberIds)) : [];
  const paidTotals = new Map<number, number>();
  for (const event of events) {
    if (!["subscription_started", "payment_succeeded"].includes(event.eventType) || !event.providerTransactionId) continue;
    paidTotals.set(event.plusMemberId, (paidTotals.get(event.plusMemberId) || 0) + event.amountAgorot);
  }
  const recoverable = activeMen.filter(row =>
    String(row.single.questionnaireToken || "").trim()
    && (paidTotals.get(row.member.id) || 0) > 0
    && (paidTotals.get(row.member.id) || 0) < 9900,
  );
  if (recoverable.length !== 5 || recoverable.some(row => (paidTotals.get(row.member.id) || 0) !== 100)) {
    throw new Error("Plus payment recovery snapshot mismatch");
  }
  const now = Date.now();
  for (const row of recoverable) {
    const email = String(row.single.email || "").trim().toLowerCase();
    await db.update(plusPilotMembers).set({
      status: "eligible",
      billingStatus: "not_configured",
      pilotCohort: PLUS_PAYMENT_RECOVERY_COHORT,
      pilotPriceAgorot: 9900,
      billingCycleStartedAt: null,
      billingCycleEndsAt: null,
      nextBillingAt: null,
      providerSubscriptionId: null,
      lastPaymentTransactionId: null,
      lastPaymentAt: null,
      premiumSupportEnabled: false,
      invitedAt: null,
      activatedAt: null,
      updatedAt: now,
    }).where(and(eq(plusPilotMembers.id, row.member.id), eq(plusPilotMembers.status, "active"), eq(plusPilotMembers.billingStatus, "active")));
    await db.update(plusCheckoutIntents).set({ status: "failed", updatedAt: now }).where(and(
      eq(plusCheckoutIntents.email, email),
      eq(plusCheckoutIntents.checkoutMode, "sandbox"),
      eq(plusCheckoutIntents.amountAgorot, 100),
    ));
  }
  return { prepared: recoverable.length };
}

export async function sendPreparedPlusPaymentRecoveryEmails(): Promise<{ total: number; accepted: number; failed: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ member: plusPilotMembers, single: singles })
    .from(plusPilotMembers)
    .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
    .where(and(
      eq(plusPilotMembers.pilotCohort, PLUS_PAYMENT_RECOVERY_COHORT),
      eq(plusPilotMembers.status, "eligible"),
      eq(plusPilotMembers.billingStatus, "not_configured"),
      isNull(plusPilotMembers.invitedAt),
    ));
  if (rows.length !== 5 || rows.some(row => row.single.gender !== "male" || !String(row.single.questionnaireToken || "").trim())) {
    throw new Error("Plus payment recovery email snapshot mismatch");
  }
  const recoveryMemberIds = rows.map(row => row.member.id);
  const recoveryEmails = rows.map(row => String(row.single.email || "").trim().toLowerCase());
  const [recoveryEvents, recoveryIntents] = await Promise.all([
    db.select().from(plusPaymentEvents).where(inArray(plusPaymentEvents.plusMemberId, recoveryMemberIds)),
    db.select().from(plusCheckoutIntents).where(inArray(plusCheckoutIntents.email, recoveryEmails)),
  ]);
  const recoveryTotals = new Map<number, number>();
  for (const event of recoveryEvents) {
    if (!["subscription_started", "payment_succeeded"].includes(event.eventType) || !event.providerTransactionId) continue;
    recoveryTotals.set(event.plusMemberId, (recoveryTotals.get(event.plusMemberId) || 0) + event.amountAgorot);
  }
  const validFailedSandboxIntents = new Set(recoveryIntents
    .filter(intent => intent.checkoutMode === "sandbox" && intent.status === "failed" && intent.amountAgorot === 100)
    .map(intent => intent.email.trim().toLowerCase()));
  for (const row of rows) {
    const email = String(row.single.email || "").trim().toLowerCase();
    const suppressed = isPermanentlyBlockedEmail(email) || (await isEmailMarketingSuppressed(email)).suppressed;
    if (!row.single.isPaid || !row.single.isActive || row.single.isSeed || !row.single.consentEmailMarketing || suppressed
      || recoveryTotals.get(row.member.id) !== 100 || !validFailedSandboxIntents.has(email)) {
      throw new Error("Plus payment recovery recipient snapshot changed");
    }
  }
  let accepted = 0;
  let failed = 0;
  for (const row of rows) {
    const email = String(row.single.email || "").trim().toLowerCase();
    if (isPermanentlyBlockedEmail(email) || (await isEmailMarketingSuppressed(email)).suppressed) {
      failed += 1;
      continue;
    }
    const existingLog = await db.select().from(emailLog).where(and(
      eq(emailLog.recipientEmail, email),
      eq(emailLog.journeyKey, PLUS_PAYMENT_RECOVERY_JOURNEY),
      eq(emailLog.emailIndex, 1),
    )).limit(1);
    if (existingLog[0]?.sentAt) {
      await db.update(plusPilotMembers).set({ status: "invited", invitedAt: existingLog[0].sentAt, updatedAt: Date.now() })
        .where(eq(plusPilotMembers.id, row.member.id));
      accepted += 1;
      continue;
    }
    const firstName = String(row.single.firstName || "שלום").trim().split(/\s+/)[0] || "שלום";
    const content = buildPlusPaymentRecoveryEmail({ firstName, email, token: String(row.single.questionnaireToken) });
    const now = Date.now();
    const inserted = await db.insert(emailLog).values({
      recipientEmail: email,
      recipientName: `${row.single.firstName} ${row.single.lastName || ""}`.trim(),
      journeyKey: PLUS_PAYMENT_RECOVERY_JOURNEY,
      emailIndex: 1,
      subject: content.subject,
      htmlBody: content.htmlContent,
      textBody: content.textContent,
      scheduledAt: now,
      status: "processing",
      createdAt: now,
    });
    const logId = Number((inserted as unknown as [{ insertId?: number }])[0]?.insertId || 0);
    const htmlContent = logId ? trackedEmailContent(content.htmlContent, logId, content.checkoutUrl) : content.htmlContent;
    if (logId) await db.update(emailLog).set({ htmlBody: htmlContent }).where(eq(emailLog.id, logId));
    const delivery = await sendEmail({ to: { email, name: `${row.single.firstName} ${row.single.lastName || ""}`.trim() }, subject: content.subject, htmlContent, textContent: content.textContent });
    const sentAt = Date.now();
    if (!delivery.success || delivery.messageId === "blocked") {
      failed += 1;
      if (logId) await db.update(emailLog).set({ status: "failed", sentAt, errorMessage: String(delivery.error || "provider_rejected").slice(0, 500) }).where(eq(emailLog.id, logId));
      continue;
    }
    accepted += 1;
    if (logId) await db.update(emailLog).set({ status: "sent", sentAt }).where(eq(emailLog.id, logId));
    await db.update(plusPilotMembers).set({ status: "invited", invitedAt: sentAt, updatedAt: sentAt })
      .where(and(eq(plusPilotMembers.id, row.member.id), eq(plusPilotMembers.status, "eligible"), isNull(plusPilotMembers.invitedAt)));
  }
  return { total: rows.length, accepted, failed };
}
