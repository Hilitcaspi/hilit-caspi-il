import crypto from "crypto";
import { and, asc, eq, gt, like, sql } from "drizzle-orm";
import {
  emailLog,
  lifecycleMessageKeys,
  lifecycleRunClaims,
  matchBoostMemberships,
  plusPilotMembers,
  singles,
} from "../drizzle/schema";
import { buildSignedUnsubscribeUrl, isEmailMarketingSuppressed } from "./emailUnsubscribe";
import { getDb } from "./db";
import { ensureBoostCandidatesForSingle, getEligibleBoostOpportunityForSingle } from "./matchBoostRouter";

const DAY_MS = 24 * 60 * 60 * 1000;
const SITE_BASE = "https://hilitcaspi.com";

function affectedRows(result: any): number {
  return Number(result?.[0]?.affectedRows ?? result?.rowsAffected ?? result?.affectedRows ?? 0);
}

function emailHash(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

function israelDateKey(now: number): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(now));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function lifecycleTemplate(input: {
  firstName: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  recipientEmail: string;
}) {
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.recipientEmail });
  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f0eadc;font-family:Rubik,Arial,sans-serif;color:#191265}.wrap{max-width:620px;margin:0 auto;background:#fff}.head{background:linear-gradient(145deg,#76143c,#3c1235);padding:34px 28px;text-align:center;color:#fff}.head b{color:#ffe27c;font-size:13px;letter-spacing:1px}.body{padding:34px 30px;line-height:1.75;font-size:16px}.body h1{font-size:28px;line-height:1.25;margin:0 0 18px}.card{background:#fff5f7;border:1px solid #f1c9d4;border-radius:18px;padding:22px;margin:22px 0}.cta{display:block;background:#191265;color:#fff!important;text-decoration:none;text-align:center;font-weight:800;border-radius:999px;padding:15px 22px;margin:26px 0}.foot{background:#191265;color:#fff;padding:22px;text-align:center;font-size:12px}.foot a{color:#ffe27c}</style></head><body><div class="wrap"><div class="head"><b>HILIT CASPI</b><div style="font-size:22px;font-weight:800;margin-top:8px">מדע של התאמה, עם לב</div></div><div class="body"><h1>${input.firstName}, ${input.headline}</h1>${input.bodyHtml}<a class="cta" href="${input.ctaUrl}">${input.ctaLabel}</a><p style="font-size:14px;color:#625966">באהבה,<br><strong>הילית כספי</strong></p></div><div class="foot">הילית כספי · Relationship Expert &amp; Matchmaker<br><a href="${unsubscribeUrl}">הסרה מרשימת התפוצה</a></div></div></body></html>`;
}

async function hasRecentJourney(db: any, email: string, journeyPattern: string, since: number) {
  const [existing] = await db.select({ id: emailLog.id })
    .from(emailLog)
    .where(and(
      sql`LOWER(${emailLog.recipientEmail}) = ${email.toLowerCase().trim()}`,
      like(emailLog.journeyKey, journeyPattern),
      gt(emailLog.createdAt, since),
      sql`${emailLog.status} IN ('pending','processing','sent')`,
    ))
    .limit(1);
  return Boolean(existing);
}

async function queueLifecycleEmail(db: any, input: {
  email: string;
  firstName: string;
  journeyKey: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  scheduledAt: number;
}): Promise<boolean> {
  const now = Date.now();
  const messageKey = `one:${emailHash(input.email)}:${input.journeyKey}:1`;
  return db.transaction(async (tx: any) => {
    const claim = await tx.execute(sql`
      INSERT IGNORE INTO lifecycle_message_keys (message_key, created_at)
      VALUES (${messageKey}, ${now})
    `);
    if (affectedRows(claim) !== 1) return false;
    const inserted = await tx.insert(emailLog).values({
      leadId: null,
      paymentLeadId: null,
      recipientEmail: input.email.toLowerCase().trim(),
      recipientName: input.firstName,
      journeyKey: input.journeyKey,
      emailIndex: 1,
      subject: input.subject,
      htmlBody: input.htmlBody,
      textBody: input.textBody,
      scheduledAt: input.scheduledAt,
      sentAt: null,
      status: "pending",
      errorMessage: null,
      createdAt: now,
    });
    const emailLogId = Number((inserted as any)[0]?.insertId ?? (inserted as any).insertId ?? 0);
    if (emailLogId) {
      await tx.update(lifecycleMessageKeys).set({ emailLogId })
        .where(eq(lifecycleMessageKeys.messageKey, messageKey));
    }
    return true;
  });
}

export async function processBoostOpportunityEmails(options: { now?: number; queueLimit?: number } = {}) {
  const db = await getDb();
  if (!db) return { scanned: 0, queued: 0, createdOptions: 0, skipped: "db_unavailable" };
  const now = options.now ?? Date.now();
  const runKey = `boost-opportunity:${israelDateKey(now)}`;
  const runClaim = await db.execute(sql`
    INSERT IGNORE INTO lifecycle_run_claims (run_key, status, started_at)
    VALUES (${runKey}, 'running', ${now})
  `);
  if (affectedRows(runClaim) !== 1) {
    return { scanned: 0, queued: 0, createdOptions: 0, skipped: "already_ran_today" };
  }
  try {
  const members = await db.select({
    membership: matchBoostMemberships,
    single: singles,
  }).from(matchBoostMemberships)
    .innerJoin(singles, eq(matchBoostMemberships.singleId, singles.id))
    .where(and(
      eq(matchBoostMemberships.status, "active"),
      eq(singles.isActive, true),
      eq(singles.isPaid, true),
    ))
    .orderBy(asc(matchBoostMemberships.eligibleAt), asc(matchBoostMemberships.id))
    .limit(1000);

  let queued = 0;
  let createdOptions = 0;
  const queueLimit = Math.max(1, options.queueLimit ?? 50);
  for (const row of members as any[]) {
    if (queued >= queueLimit) break;
    const single = row.single;
    if (!single?.email || !single?.questionnaireToken) continue;
    const suppression = await isEmailMarketingSuppressed(single.email);
    if (suppression.suppressed) continue;
    if (await hasRecentJourney(db, single.email, "boost_opportunity_v1:%", now - 21 * DAY_MS)) continue;

    createdOptions += await ensureBoostCandidatesForSingle(db, single, now);
    const option = await getEligibleBoostOpportunityForSingle(db, single, undefined, now);
    if (!option) continue;

    const score = Math.max(0, Math.min(100, Math.round(Number(option.score || 0))));
    const link = `${SITE_BASE}/my-profile?email=${encodeURIComponent(single.email)}&token=${encodeURIComponent(single.questionnaireToken)}&tab=boost&boostMatch=${option.id}&utm_source=email&utm_medium=lifecycle&utm_campaign=boost_opportunity#boost-option-${option.id}`;
    const firstName = single.firstName || "";
    const subject = `${firstName}, יש לך Boost של ${score}% שמחכה באזור האישי`;
    const bodyHtml = lifecycleTemplate({
      firstName,
      headline: `יש לך התאמת Boost של ${score}% שמחכה`,
      bodyHtml: `<div class="card"><p style="margin:0 0 8px;font-size:20px;font-weight:900">${score}% התאמה</p><p style="margin:0">מצאנו עבורך אפשרות חדשה במסלול Boost. אפשר להיכנס, לראות את הפרטים האנונימיים ולהחליט אם לשלוח הצעת התאמה.</p></div><p><strong>השליטה נשארת אצלך:</strong> שום הצעה לא נשלחת מהמייל עצמו. הכפתור פותח את ההצעה המדויקת באזור האישי, ושם אפשר לעבור על הפרטים ולאשר.</p>`,
      ctaLabel: "לראות את ה־Boost ולשלוח בעצמי",
      ctaUrl: link,
      recipientEmail: single.email,
    });
    const didQueue = await queueLifecycleEmail(db, {
      email: single.email,
      firstName,
      journeyKey: `boost_opportunity_v1:${option.id}`,
      subject,
      htmlBody: bodyHtml,
      textBody: `${firstName}, יש לך התאמת Boost של ${score}% שמחכה באזור האישי.\n\nלצפייה בפרטים ולשליחה: ${link}\n\nהילית`,
      scheduledAt: now,
    });
    if (didQueue) queued++;
  }
  const result = { scanned: members.length, queued, createdOptions };
  await db.update(lifecycleRunClaims).set({
    status: "completed",
    completedAt: Date.now(),
    resultJson: JSON.stringify(result),
  }).where(eq(lifecycleRunClaims.runKey, runKey));
  return result;
  } catch (error) {
    await db.update(lifecycleRunClaims).set({
      status: "failed",
      completedAt: Date.now(),
      resultJson: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    }).where(eq(lifecycleRunClaims.runKey, runKey));
    throw error;
  }
}

export async function queuePostBoostPlusUpsell(input: {
  db: any;
  sender: any;
  requestId: number;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const sender = input.sender;
  if (!sender?.id || !sender?.email || !sender?.questionnaireToken) return false;
  const [activePlus] = await input.db.select({ id: plusPilotMembers.id })
    .from(plusPilotMembers)
    .where(and(
      eq(plusPilotMembers.singleId, sender.id),
      eq(plusPilotMembers.status, "active"),
      eq(plusPilotMembers.billingStatus, "active"),
    ))
    .limit(1);
  if (activePlus) return false;
  const journeyKey = `boost_plus_upsell_v1:${input.requestId}`;
  if (await hasRecentJourney(input.db, sender.email, journeyKey, now - 90 * DAY_MS)) return false;

  const firstName = sender.firstName || "";
  const link = `${SITE_BASE}/database-plus?email=${encodeURIComponent(sender.email)}&token=${encodeURIComponent(sender.questionnaireToken)}&utm_source=email&utm_medium=lifecycle&utm_campaign=boost_to_plus`;
  const subject = `${firstName}, שלחת Boost. רוצה יותר הזדמנויות בכל חודש?`;
  const bodyHtml = lifecycleTemplate({
    firstName,
    headline: "אחרי ה־Boost, יש מסלול שממשיך לעבוד איתך",
    bodyHtml: `<p>שלחת הצעת Boost בעצמך. אם התחושה של עוד אפשרויות ועוד שליטה מתאימה לך, Database Plus הוא השלב הבא.</p><div class="card"><p style="margin:0 0 8px"><strong>99 ₪ לחודש, בחיוב מתחדש עד לביטול</strong></p><p style="margin:0">לפחות שתי הצעות התאמה חדשות בכל חודש פעיל, Boost אחד נוסף ללא תשלום וקדימות בבדיקת הפרופיל והאפשרויות.</p></div><p>זהו מסלול המשך לחברי המאגר בלבד. אפשר לקרוא את כל התנאים ולהחליט בעמוד ההצטרפות.</p>`,
    ctaLabel: "לבדוק אם Database Plus מתאים לי",
    ctaUrl: link,
    recipientEmail: sender.email,
  });
  const queued = await queueLifecycleEmail(input.db, {
    email: sender.email,
    firstName,
    journeyKey,
    subject,
    htmlBody: bodyHtml,
    textBody: `${firstName}, אחרי שליחת ה־Boost אפשר להמשיך ל־Database Plus: לפחות שתי הצעות התאמה בחודש פעיל, Boost אחד נוסף וקדימות, ב־99 ₪ לחודש בחיוב מתחדש עד לביטול.\n\nלפרטים: ${link}\n\nהילית`,
    scheduledAt: now + 72 * 60 * 60 * 1000,
  });
  return queued;
}
