import { and, eq, inArray, sql } from "drizzle-orm";
import { completedPayments, crmLeads, emailLog, plusPilotMembers, singles } from "../drizzle/schema";
import { isPermanentlyBlockedEmail, sendEmail } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl } from "./emailUnsubscribe";
import { isPlusPilotCoachingClient, loadCoachingClientEmails } from "./plusHolidayPilotCampaign";
import { readBrevoBlockedRecipientSet } from "./liveLaunchCampaign";
import { normalizeIsraeliMobile, sendSMSDetailed } from "./vibrate";

/**
 * Owner-approved Plus re-offer (25.11.2026): the same email and SMS that ran on
 * 25.9, to everyone who joined the database since 25.9 and before 25.11.
 * The offer is the live PLUS coupon (99 ILS, three manual proposals in the first cycle).
 */
export const PLUS_REOFFER_CAMPAIGN = "plus_reoffer_nov26";
export const PLUS_REOFFER_EMAIL_JOURNEY = "plus_reoffer_nov26_email";
export const PLUS_REOFFER_SMS_JOURNEY = "plus_reoffer_nov26_sms";
export const PLUS_REOFFER_JOINED_FROM = Date.parse("2026-09-25T00:00:00+02:00");
export const PLUS_REOFFER_JOINED_BEFORE = Date.parse("2026-11-25T00:00:00+02:00");
const PLUS_URL = "https://hilitcaspi.com/database-plus";
export const PLUS_REOFFER_SUBJECT = "ההשקה שביקשתם: Database Plus נפתח ✦";

const norm = (v: unknown) => String(v || "").trim().toLowerCase();

export function plusReofferUrl(input: { email: string; token: string; source: "email" | "sms" }) {
  const p = new URLSearchParams({
    email: input.email,
    token: input.token,
    coupon: "PLUS",
    utm_source: input.source,
    utm_medium: "reoffer",
    utm_campaign: PLUS_REOFFER_CAMPAIGN,
    utm_content: `plus_reoffer_${input.source}`,
  });
  return `${PLUS_URL}?${p.toString()}`;
}

export function buildPlusReofferEmail(input: { firstName: string; email: string; token: string }) {
  const firstName = input.firstName;
  const checkoutUrl = plusReofferUrl({ ...input, source: "email" });
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const textContent = `היי ${firstName},

אתם ביקשתם יותר הזדמנויות, יותר קצב ויותר תשומת לב בתוך המאגר. הקשבתי.

אני משיקה את Database Plus, השירות המתקדם והאישי ביותר לחברי המאגר שרוצים שאעבוד על הפרופיל שלהם בקדימות, אבחן עבורם יותר אפשרויות ואפתח עוד דרכים להכיר.

מה מקבלים בכל חודש פעיל?

לפחות שתי הצעות התאמה חדשות שאני בודקת באופן אישי ושולחת בפועל.
בוסט אחד נוסף ללא תשלום נוסף, מעבר להצעות ההתאמה של Plus.
קדימות באיתור, בבדיקת התאמות ובמעבר האישי שלי על הפרופיל.
מענה ועדכון העדפות בעדיפות דרך שירות Plus.
אפשרות להישקל לפינת הרווקים, רק באישור מפורש מראש.

הטבה מיוחדת עד יום רביעי 2.12: מצטרפים ומקבלים במחזור הראשון שלוש הצעות התאמה במקום שתיים.

המחיר הוא 99 ₪ לחודש בחיוב מתחדש עד לביטול.

לכל הפרטים ולהצטרפות:
${checkoutUrl}

ההתחייבות היא להצעות שנבדקו ונשלחו. אישור הדדי, פגישה או זוגיות אינם מובטחים.

באהבה,
הילית

להסרה ממסרים שיווקיים:
${unsubscribeUrl}`;
  const htmlContent = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>ההשקה שביקשתם: Database Plus נפתח ✦</title></head>
<body style="margin:0;background:#eee4d6;font-family:Arial,sans-serif;color:#17213d">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">השירות החדש לחברי המאגר שרוצים יותר הזדמנויות, קדימות ותשומת לב.</div>
  <div style="max-width:640px;margin:0 auto;padding:28px 16px">
    <div style="overflow:hidden;border-radius:28px;box-shadow:0 20px 55px rgba(12,19,39,.16)">
      <div style="background:linear-gradient(145deg,#0c1327 0%,#191265 100%);padding:42px 30px 36px;text-align:center">
        <div style="color:#f4d889;font-size:21px;letter-spacing:9px;line-height:1">✦ ✧ ✦</div>
        <div style="font-size:12px;color:#e8cb91;letter-spacing:1.5px;font-weight:700">HILIT CASPI | OFFICIAL MEMBERSHIP</div>
        <div style="display:inline-block;margin-top:20px;padding:8px 17px;border:1px solid rgba(232,203,145,.55);color:#e8cb91;font-size:13px;font-weight:700">✦ השקה חדשה לחברי המאגר ✦</div>
        <h1 style="margin:18px 0 0;color:#fffaf1;font-size:36px;line-height:1.2">Database Plus נפתח</h1>
        <p style="margin:14px auto 0;max-width:500px;color:#dce1f0;font-size:17px;line-height:1.75">יותר הזדמנויות להכיר, יותר תשומת לב לפרופיל ויותר קצב בתוך המאגר.</p>
      </div>
      <div style="background:#fffaf1;padding:36px 31px;line-height:1.8;font-size:17px">
        <p style="margin-top:0">היי ${firstName},</p>
        <p><strong>ביקשתם יותר הזדמנויות, יותר קצב ויותר תשומת לב בתוך המאגר.</strong> לכן אני משיקה את Database Plus.</p>
        <p>זהו השירות המתקדם לחברי המאגר שרוצים שאעבוד על הפרופיל שלהם בקדימות, אבחן עבורם יותר אפשרויות ואפתח עוד דרכים להכיר.</p>
        <div style="margin:28px 0 14px;text-align:center;color:#9c7436;font-size:13px;font-weight:700;letter-spacing:.8px">מה כולל המנוי בכל חודש פעיל?</div>
        <div style="background:#f7f1e6;border:1px solid #dfcda9;padding:19px 21px;margin:10px 0"><strong style="font-size:19px">לפחות שתי הצעות התאמה חדשות</strong><div style="margin-top:5px;color:#596173;font-size:15px">הצעות שאני בודקת ושולחת בפועל בכל מחזור.</div></div>
        <div style="background:#f7f1e6;border:1px solid #dfcda9;padding:19px 21px;margin:10px 0"><strong style="font-size:19px">בוסט אחד נוסף</strong><div style="margin-top:5px;color:#596173;font-size:15px">הזדמנות נוספת ללא תשלום נוסף, מעבר לשתי ההצעות.</div></div>
        <div style="background:#f7f1e6;border:1px solid #dfcda9;padding:19px 21px;margin:10px 0"><strong style="font-size:19px">קדימות לפרופיל ומענה בעדיפות</strong><div style="margin-top:5px;color:#596173;font-size:15px">קדימות באיתור, בבדיקה, בעדכון ההעדפות ובשירות Plus.</div></div>
        <div style="background:#f7f1e6;border:1px solid #dfcda9;padding:19px 21px;margin:10px 0"><strong style="font-size:19px">אפשרות לפינת הרווקים</strong><div style="margin-top:5px;color:#596173;font-size:15px">רק לאחר אישור מפורש ונפרד של התמונה והטקסט.</div></div>
        <div style="margin:28px 0;padding:24px;border:1px solid #d8b67e;background:#10182f;color:#fffaf1;text-align:center">
          <div style="color:#f4d889;font-size:18px;letter-spacing:7px">✦ ✦ ✦</div>
          <div style="margin-top:8px;font-size:13px;color:#e8cb91;font-weight:700">הטבת השקה מיוחדת עד יום רביעי 2.12</div>
          <div style="margin-top:8px;font-size:23px;font-weight:700;line-height:1.45">מצטרפים ומקבלים במחזור הראשון שלוש הצעות התאמה במקום שתיים</div>
        </div>
        <p style="text-align:center">המחיר הוא <strong>99 ₪ לחודש</strong> בחיוב מתחדש עד לביטול.</p>
        <div style="text-align:center;margin:30px 0"><a href="${checkoutUrl}" style="display:inline-block;background:#d8b67e;color:#10182f;text-decoration:none;font-weight:700;padding:16px 34px;border-radius:999px">לכל הפרטים ולהצטרפות</a></div>
        <p style="font-size:13px;line-height:1.7;color:#6a7080">ההתחייבות היא להצעות שנבדקו ונשלחו. אישור הדדי, פגישה או זוגיות אינם מובטחים.</p>
        <p style="margin-bottom:0">באהבה,<br /><strong>הילית</strong></p>
      </div>
    </div>
    <div style="text-align:center;padding:18px;font-size:12px;color:#777"><a href="${unsubscribeUrl}" style="color:#777">הסרה מרשימת הדיוור</a></div>
  </div>
</body>
</html>`;
  return { subject: PLUS_REOFFER_SUBJECT, htmlContent, textContent, checkoutUrl };
}

export function buildPlusReofferSms(input: { email: string; token: string }) {
  const checkoutUrl = plusReofferUrl({ ...input, source: "sms" });
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const message = `היי, כאן הילית ✨
אתם ביקשתם יותר הזדמנויות ויותר תשומת לב במאגר. הקשבתי.
אני משיקה את Database Plus, מנוי חודשי עם לפחות 2 הצעות התאמה שאני בודקת ושולחת, בוסט נוסף, קדימות לפרופיל ולשירות.
עד יום רביעי 2.12 מצטרפים ומקבלים הצעה שלישית במחזור הראשון, כלומר 3 במקום 2. המחיר 99 ₪ לחודש, מתחדש עד ביטול.
לכל הפרטים ולהצטרפות:
${checkoutUrl}
להסרה:
${unsubscribeUrl}`;
  return { message, checkoutUrl };
}

function tracked(htmlContent: string, logId: number, checkoutUrl: string) {
  const click = `https://hilitcaspi.com/api/email/click/${logId}?url=${encodeURIComponent(checkoutUrl)}`;
  const pixel = `<img src="https://hilitcaspi.com/api/email/open/${logId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`;
  return htmlContent.split(checkoutUrl).join(click).replace("</body>", `${pixel}</body>`);
}

export type PlusReofferRecipient = { id: number; email: string; firstName: string; lastName: string; token: string; phone: string | null; gender: string };

/** Read-only audience: joined 25.9 - 24.11, paid+active, marketing consent, not already Plus, none of the suppression lists. */
export async function loadPlusReofferAudience() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [rows, unsub, paidPlus, members, coaching, blocked] = await Promise.all([
    db.select().from(singles).where(and(
      eq(singles.isPaid, true), eq(singles.isActive, true), eq(singles.isSeed, false),
      eq(singles.consentEmailMarketing, true), inArray(singles.gender, ["female", "male"]),
    )),
    db.select({ email: crmLeads.email }).from(crmLeads).where(eq(crmLeads.emailUnsubscribed, true)),
    db.select({ email: completedPayments.email }).from(completedPayments).where(eq(completedPayments.product, "plus")),
    db.select().from(plusPilotMembers),
    loadCoachingClientEmails(db),
    readBrevoBlockedRecipientSet(),
  ]);
  const optOuts = new Set<string>();
  const optResult = await db.execute(sql`SELECT phone FROM sms_optouts`) as unknown as [Array<{ phone: string }>] | Array<{ phone: string }>;
  const optRows = (Array.isArray(optResult[0]) ? optResult[0] : optResult) as Array<{ phone: string }>;
  for (const r of optRows) { const p = normalizeIsraeliMobile(String(r.phone)); optOuts.add(p || String(r.phone)); }
  const unsubSet = new Set(unsub.map(r => norm(r.email)));
  const plusSet = new Set(paidPlus.map(r => norm(r.email)));
  const activePlus = new Set(members.filter(m => m.status === "active" || m.billingStatus === "active").map(m => m.singleId));
  const out: PlusReofferRecipient[] = [];
  for (const s of rows) {
    const email = norm(s.email);
    const created = Number(s.createdAt || 0);
    if (!email.includes("@") || created < PLUS_REOFFER_JOINED_FROM || created >= PLUS_REOFFER_JOINED_BEFORE) continue;
    if (!String(s.questionnaireToken || "").trim()) continue;
    if (unsubSet.has(email) || plusSet.has(email) || activePlus.has(s.id) || blocked.has(email) || isPermanentlyBlockedEmail(email)) continue;
    if (isPlusPilotCoachingClient(s, coaching)) continue;
    const phone = normalizeIsraeliMobile(s.phone || "");
    out.push({ id: s.id, email, firstName: String(s.firstName || "").trim().split(/\s+/)[0] || "שלום", lastName: String(s.lastName || ""), token: String(s.questionnaireToken).trim(), phone: phone && !optOuts.has(phone) ? phone : null, gender: String(s.gender) });
  }
  out.sort((a, b) => a.id - b.id);
  const seenPhones = new Set<string>();
  for (const r of out) { if (r.phone) { if (seenPhones.has(r.phone)) r.phone = null; else seenPhones.add(r.phone); } }
  return out;
}

/** Sends to the owner only. Writes nothing to email_log. */
export async function sendPlusReofferTest(input: { email: string; phone: string; firstName: string; token: string }) {
  const mail = buildPlusReofferEmail({ firstName: input.firstName, email: input.email, token: input.token });
  const e = await sendEmail({ to: { email: input.email, name: input.firstName }, subject: `[טסט] ${mail.subject}`, htmlContent: mail.htmlContent, textContent: mail.textContent });
  const sms = buildPlusReofferSms({ email: input.email, token: input.token });
  const s = await sendSMSDetailed(input.phone, sms.message);
  return { email: e.success, sms: s.accepted, smsError: s.error || null };
}

/** Idempotent: a recipient who already has a "sent" log row for a channel is never sent that channel again. */
export async function sendPlusReofferCampaign(options: { limit?: number; onlyEmails?: string[] } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let audience = await loadPlusReofferAudience();
  if (options.onlyEmails) { const set = new Set(options.onlyEmails.map(norm)); audience = audience.filter(r => set.has(r.email)); }
  if (options.limit) audience = audience.slice(0, options.limit);
  const res = { total: audience.length, emailSent: 0, emailFailed: 0, smsSent: 0, smsFailed: 0, noPhone: 0, alreadySent: 0 };
  for (const r of audience) {
    const name = `${r.firstName} ${r.lastName}`.trim();
    const [existing] = await db.select().from(emailLog).where(and(eq(emailLog.recipientEmail, r.email), eq(emailLog.journeyKey, PLUS_REOFFER_EMAIL_JOURNEY), eq(emailLog.emailIndex, 1))).limit(1);
    if (existing && (existing.status === "sent" || existing.status === "processing")) { res.alreadySent += 1; }
    else {
      const mail = buildPlusReofferEmail({ firstName: r.firstName, email: r.email, token: r.token });
      const now = Date.now();
      const ins = await db.insert(emailLog).values({ recipientEmail: r.email, recipientName: name, journeyKey: PLUS_REOFFER_EMAIL_JOURNEY, emailIndex: 1, subject: mail.subject, htmlBody: mail.htmlContent, textBody: mail.textContent, scheduledAt: now, status: "processing", createdAt: now });
      const logId = Number((ins as unknown as [{ insertId?: number }])[0]?.insertId || 0);
      const html = logId ? tracked(mail.htmlContent, logId, mail.checkoutUrl) : mail.htmlContent;
      if (logId) await db.update(emailLog).set({ htmlBody: html }).where(eq(emailLog.id, logId));
      const d = await sendEmail({ to: { email: r.email, name }, subject: mail.subject, htmlContent: html, textContent: mail.textContent });
      const ok = d.success && d.messageId !== "blocked";
      if (logId) await db.update(emailLog).set({ status: ok ? "sent" : "failed", sentAt: Date.now(), errorMessage: ok ? null : String(d.error || "provider_rejected").slice(0, 500) }).where(eq(emailLog.id, logId));
      if (ok) res.emailSent += 1; else res.emailFailed += 1;
    }
    if (!r.phone) { res.noPhone += 1; continue; }
    const [sExisting] = await db.select().from(emailLog).where(and(eq(emailLog.recipientEmail, r.email), eq(emailLog.journeyKey, PLUS_REOFFER_SMS_JOURNEY), eq(emailLog.emailIndex, 1))).limit(1);
    if (sExisting && (sExisting.status === "sent" || sExisting.status === "processing")) continue;
    const sms = buildPlusReofferSms({ email: r.email, token: r.token });
    const now = Date.now();
    const ins = await db.insert(emailLog).values({ recipientEmail: r.email, recipientName: name, journeyKey: PLUS_REOFFER_SMS_JOURNEY, emailIndex: 1, subject: "SMS הצעת Database Plus", htmlBody: sms.message, textBody: sms.message, scheduledAt: now, status: "processing", createdAt: now });
    const sid = Number((ins as unknown as [{ insertId?: number }])[0]?.insertId || 0);
    const d = await sendSMSDetailed(r.phone, sms.message);
    if (sid) await db.update(emailLog).set({ status: d.accepted ? "sent" : "failed", sentAt: Date.now(), errorMessage: d.accepted ? null : String(d.error || "provider_rejected").slice(0, 500) }).where(eq(emailLog.id, sid));
    if (d.accepted) res.smsSent += 1; else res.smsFailed += 1;
  }
  return res;
}
