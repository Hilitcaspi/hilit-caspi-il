import { and, eq, inArray, or } from "drizzle-orm";
import { completedPayments, crmLeads, emailLog, plusPilotMembers, singles } from "../drizzle/schema";
import { isPermanentlyBlockedEmail, sendEmail } from "./brevo";
import { getDb } from "./db";
import { buildSignedUnsubscribeUrl } from "./emailUnsubscribe";
import {
  PLUS_HOLIDAY_LAUNCH_COHORT,
  PLUS_HOLIDAY_LAUNCH_EMAIL_JOURNEY,
  PLUS_HOLIDAY_LAUNCH_EXPIRES_AT,
  PLUS_HOLIDAY_LAUNCH_SMS_JOURNEY,
} from "./plusLaunchOffer";
import { isPlusPilotCoachingClient, loadCoachingClientEmails } from "./plusHolidayPilotCampaign";
import { normalizeIsraeliMobile, sendSMSDetailed } from "./vibrate";

const PLUS_PUBLIC_URL = "https://hilitcaspi.com/database-plus";

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
  const subject = "הטבה מיוחדת מחכה בפנים ✦ השקת Database Plus";
  const textContent = `היי ${input.firstName},

אתם ביקשתם יותר הזדמנויות, יותר קצב ויותר תשומת לב בתוך המאגר. הקשבתי.

אני משיקה את Database Plus, מסלול חודשי אישי בתוך המאגר שבו אני עוברת על הפרופיל בקדימות, בודקת יותר אפשרויות ופותחת עוד דרכים להכיר.

מה מקבלים בכל חודש פעיל?

התחייבות ללפחות שתי הצעות התאמה חדשות שאני בודקת ושולחת בפועל בכל חודש פעיל.

בוסט אחד במתנה! מעבר להצעות ההתאמה של Plus.

קדימות באיתור, בבדיקת התאמות ובמעבר האישי שלי על הפרופיל.

הטבות והזדמנויות מיוחדות שייפתחו רק לחברי Plus.

וכיוון שזו השקה, הכנתי למצטרפים עכשיו הטבה מיוחדת:

רק עכשיו לכבוד ההשקה, מצטרפים ומקבלים בחודש הראשון 3 התאמות במקום 2.

המחיר הוא 99 ₪ לחודש בחיוב מתחדש עד לביטול.

לכל הפרטים ולהצטרפות:
${checkoutUrl}

מספר המקומות ב-Plus מוגבל, כדי שאוכל להעניק לחברי השירות את היחס האישי, הקדימות וכל ההטבות שמגיעות להם. לכן אני ממליצה להצטרף בהקדם.

ההתחייבות היא להצעות שנבדקו ונשלחו. אישור הדדי, פגישה או זוגיות אינם מובטחים.

באהבה,
הילית

להסרה ממסרים שיווקיים:
${unsubscribeUrl}`;
  const htmlContent = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
  <style>
    @keyframes plusSparkle {
      0%, 100% { opacity: .48; text-shadow: 0 0 7px rgba(246,217,155,.35); }
      50% { opacity: 1; text-shadow: 0 0 18px rgba(246,217,155,.95); }
    }
    .sparkle-glow { animation: plusSparkle 2.4s ease-in-out infinite; }
    @media only screen and (max-width: 620px) {
      .shell { width: 100% !important; }
      .stack, .stack-cell { display: block !important; width: 100% !important; }
      .hero-copy { padding: 34px 25px 30px !important; text-align: center !important; box-sizing: border-box !important; }
      .hero-photo { width: 100% !important; max-width: none !important; }
      .body-pad { padding: 30px 22px !important; }
      .benefit-cell { display: block !important; width: 100% !important; padding: 0 0 12px !important; }
      .launch-title { font-size: 29px !important; }
      .hero-title { font-size: 40px !important; }
      .launch-number { font-size: 82px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1e8e2;font-family:Arial,'Helvetica Neue',sans-serif;color:#261a2a">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">השקתי את Database Plus, ובפנים מחכה הטבת השקה מיוחדת לחברי המאגר.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1e8e2">
    <tr><td align="center" style="padding:24px 10px">
      <table role="presentation" class="shell" width="680" cellspacing="0" cellpadding="0" border="0" style="width:680px;max-width:680px;background:#fffaf5;border-radius:30px;overflow:hidden;box-shadow:0 22px 65px rgba(58,20,52,.16)">
        <tr><td style="background:#25102d;padding:12px 24px;text-align:center;color:#ead19a;font-size:11px;letter-spacing:2px;font-weight:700">HILIT CASPI · OFFICIAL MEMBERSHIP</td></tr>
        <tr><td style="background:linear-gradient(135deg,#35103d 0%,#741b59 56%,#a82d68 100%);padding:0">
          <table role="presentation" class="stack" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td class="stack-cell hero-copy" width="57%" valign="middle" style="padding:44px 30px 42px 38px;text-align:right">
                <div class="sparkle-glow" style="color:#f6d99b;font-size:20px;line-height:1.2;letter-spacing:5px;text-shadow:0 0 16px rgba(246,217,155,.55)">✦ ･ ✧ ･ ✦ ･ ✧</div>
                <div style="display:inline-block;margin-top:17px;padding:8px 15px;border:1px solid rgba(247,217,157,.65);border-radius:999px;color:#f6dda8;font-size:12px;font-weight:700">השקה חדשה לחברי המאגר בלבד</div>
                <h1 class="hero-title" style="margin:18px 0 0;color:#fffaf5;font-family:Georgia,'Times New Roman',serif;font-size:46px;line-height:1.02;font-weight:500">Database<br />Plus</h1>
                <p class="launch-title" style="margin:18px 0 0;color:#fff;font-size:27px;line-height:1.25;font-weight:800">יותר מקום לפרופיל.<br />יותר הזדמנויות להכיר.</p>
                <p style="margin:17px 0 0;color:#f5e7ef;font-size:16px;line-height:1.75">המסלול האישי והמתקדם בתוך המאגר, למי שרוצה שאעבוד על הפרופיל בקדימות ואפתח יותר אפשרויות.</p>
                <div style="margin-top:17px;color:#f6dda8;font-size:14px;line-height:1.55;font-weight:800">ויש גם הטבת השקה מיוחדת שמחכה בהמשך ✦</div>
                <div style="margin-top:24px"><a href="${checkoutUrl}" style="display:inline-block;background:#f39ab2;color:#31102e;text-decoration:none;font-size:16px;font-weight:800;padding:15px 25px;border-radius:999px;box-shadow:0 10px 28px rgba(17,7,23,.28)">אני רוצה להצטרף ✦</a></div>
              </td>
              <td class="stack-cell" width="43%" valign="bottom" style="background:#e8d2c5;text-align:center">
                <img class="hero-photo" src="https://hilitcaspi.com/manus-storage/plus-email-hilit-seated_52bbd335.jpg" width="292" alt="הילית כספי" style="display:block;width:100%;max-width:292px;height:auto;border:0" />
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td class="body-pad" style="padding:40px 42px 18px;background:#fffaf5">
          <p style="margin:0 0 14px;font-size:19px;line-height:1.75">היי ${input.firstName},</p>
          <p style="margin:0;font-size:21px;line-height:1.6;font-weight:800;color:#4c1745">אתם ביקשתם יותר הזדמנויות, יותר קצב ויותר תשומת לב בתוך המאגר. הקשבתי.</p>
          <p style="margin:15px 0 0;font-size:17px;line-height:1.8;color:#554a58">Database Plus הוא לא מאגר אחר ולא אפליקציה נוספת. זהו <strong>מסלול חודשי אישי בתוך המאגר הקיים</strong>, שבו הפרופיל מקבל ממני יותר תשומת לב, יותר בדיקות ויותר דרכים להגיע להיכרות חדשה.</p>
          <div style="margin-top:22px;padding:15px 18px;border:1px solid #ead19a;border-radius:16px;background:#fbf3ed;text-align:center;color:#741b59;font-size:16px;line-height:1.6;font-weight:800"><span class="sparkle-glow" style="color:#c89c43">✦</span> וכיוון שזו השקה, הכנתי למצטרפים עכשיו הטבה מיוחדת. עוד רגע מגלים. <span class="sparkle-glow" style="color:#c89c43">✦</span></div>
        </td></tr>
        <tr><td class="body-pad" style="padding:18px 42px 10px;background:#fffaf5">
          <div style="text-align:center;color:#9e6d33;font-size:12px;font-weight:800;letter-spacing:1.4px">מה מקבלים בכל חודש פעיל?</div>
          <h2 style="margin:8px 0 24px;text-align:center;color:#35102f;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:500">יותר הזדמנויות. יותר תשומת לב. יותר קצב.</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td class="benefit-cell" width="50%" valign="top" style="padding:0 6px 12px 0">
                <div style="background:#f8eef1;border:1px solid #ead5de;border-radius:18px;padding:21px;min-height:122px">
                  <div style="color:#b6326c;font-size:22px">01 ✦</div>
                  <div style="margin-top:8px;font-size:19px;font-weight:800;color:#3e1739">התחייבות ללפחות 2 התאמות</div>
                  <div style="margin-top:6px;color:#625462;font-size:15px;line-height:1.65">לפחות שתי הצעות התאמה שאני בודקת באופן אישי ושולחת בפועל בכל חודש פעיל.</div>
                </div>
              </td>
              <td class="benefit-cell" width="50%" valign="top" style="padding:0 0 12px 6px">
                <div style="background:#f8eef1;border:1px solid #ead5de;border-radius:18px;padding:21px;min-height:122px">
                  <div style="color:#b6326c;font-size:22px">02 ✦</div>
                  <div style="margin-top:8px;font-size:19px;font-weight:800;color:#3e1739">בוסט במתנה!</div>
                  <div style="margin-top:6px;color:#625462;font-size:15px;line-height:1.65">בוסט אחד נוסף ללא תשלום, מעבר להצעות ההתאמה של Plus.</div>
                </div>
              </td>
            </tr>
            <tr>
              <td class="benefit-cell" width="50%" valign="top" style="padding:0 6px 12px 0">
                <div style="background:#f8eef1;border:1px solid #ead5de;border-radius:18px;padding:21px;min-height:122px">
                  <div style="color:#b6326c;font-size:22px">03 ✦</div>
                  <div style="margin-top:8px;font-size:19px;font-weight:800;color:#3e1739">קדימות לפרופיל</div>
                  <div style="margin-top:6px;color:#625462;font-size:15px;line-height:1.65">קדימות באיתור, בבדיקת התאמות ובמעבר האישי שלי על הפרופיל.</div>
                </div>
              </td>
              <td class="benefit-cell" width="50%" valign="top" style="padding:0 0 12px 6px">
                <div style="background:#f8eef1;border:1px solid #ead5de;border-radius:18px;padding:21px;min-height:122px">
                  <div style="color:#b6326c;font-size:22px">04 ✦</div>
                  <div style="margin-top:8px;font-size:19px;font-weight:800;color:#3e1739">הטבות בלעדיות לחברי Plus</div>
                  <div style="margin-top:6px;color:#625462;font-size:15px;line-height:1.65">הטבות והזדמנויות מיוחדות שייפתחו רק לחברי השירות.</div>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td class="body-pad" style="padding:24px 42px 10px;background:#fffaf5">
          <div style="position:relative;background:linear-gradient(135deg,#25102d,#66184f 62%,#8e285f);border-radius:24px;padding:34px 25px;text-align:center;box-shadow:0 16px 40px rgba(76,23,69,.22)">
            <div class="sparkle-glow" style="color:#f4d58e;font-size:22px;letter-spacing:7px;text-shadow:0 0 18px rgba(244,213,142,.65)">✧ ･ ✦ ･ ✧ ･ ✦ ･ ✧</div>
            <div style="margin-top:11px;color:#f4d58e;font-size:13px;font-weight:900;letter-spacing:1px">ועכשיו להטבה המיוחדת</div>
            <div style="display:inline-block;margin-top:10px;background:#f4d58e;color:#3b1536;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:900">רק עכשיו לכבוד ההשקה</div>
            <h2 style="margin:15px auto 0;max-width:520px;color:#fffaf5;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.3;font-weight:500">מצטרפים עכשיו ומקבלים בחודש הראשון</h2>
            <div class="launch-number" style="margin-top:2px;color:#f4d58e;font-family:Georgia,'Times New Roman',serif;font-size:94px;line-height:.92;font-weight:700;text-shadow:0 0 24px rgba(244,213,142,.38)">3</div>
            <div style="margin-top:7px;color:#fff;font-size:27px;font-weight:900">התאמות</div>
            <p style="margin:10px auto 0;color:#f2dae8;font-size:18px;line-height:1.65">במקום 2 התאמות בחודש הראשון.</p>
            <div style="margin-top:18px;color:#f4d58e;font-size:26px;font-weight:900">99 ₪ לחודש</div>
            <div style="margin-top:4px;color:#e5d7df;font-size:13px">חיוב חודשי מתחדש עד לביטול</div>
            <div style="margin-top:24px"><a href="${checkoutUrl}" style="display:inline-block;background:#f39ab2;color:#31102e;text-decoration:none;font-size:17px;font-weight:900;padding:17px 34px;border-radius:999px;box-shadow:0 10px 26px rgba(8,3,11,.3)">להצטרפות ל־Database Plus</a></div>
            <div style="margin-top:14px;color:#ead6e2;font-size:12px">מספר המקומות מוגבל כדי לשמור על רמת שירות אישית.</div>
          </div>
        </td></tr>
        <tr><td class="body-pad" style="padding:28px 42px 38px;background:#fffaf5">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #eadbd1;padding-top:22px">
            <tr>
              <td width="88" valign="middle"><img src="https://hilitcaspi.com/manus-storage/plus-email-hilit-full_0acd266d.jpg" width="74" height="74" alt="הילית כספי" style="display:block;width:74px;height:74px;object-fit:cover;object-position:50% 18%;border-radius:50%;border:3px solid #e4c27f" /></td>
              <td valign="middle" style="padding-right:12px;color:#514650;font-size:15px;line-height:1.7"><strong style="color:#3d1738">מספר המקומות ב־Plus מוגבל</strong>, כדי שאוכל להעניק לחברי השירות את היחס האישי, הקדימות וכל ההטבות שמגיעות להם. לכן אני ממליצה להצטרף בהקדם.<br /><span style="color:#8e285f;font-weight:800">באהבה, הילית</span></td>
            </tr>
          </table>
          <p style="margin:22px 0 0;color:#7b7078;font-size:12px;line-height:1.65">ההתחייבות היא להצעות שנבדקו ונשלחו. אישור הדדי, פגישה או זוגיות אינם מובטחים.</p>
        </td></tr>
      </table>
      <div style="padding:18px;text-align:center;font-size:12px;color:#80747a"><a href="${unsubscribeUrl}" style="color:#80747a">הסרה מרשימת הדיוור</a></div>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, htmlContent, textContent, checkoutUrl };
}

export function buildPlusRelaunchSms(input: { email: string; token: string }) {
  const checkoutUrl = launchUrl({ email: input.email, token: input.token, source: "sms" });
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email: input.email });
  const message = `היי, כאן הילית ✨

אתם ביקשתם יותר הזדמנויות ויותר תשומת לב במאגר. הקשבתי.

אני משיקה את Database Plus, מנוי חודשי עם התחייבות ללפחות 2 הצעות התאמה שאני בודקת ושולחת, בוסט במתנה, קדימות לפרופיל והטבות בלעדיות לחברי Plus.

רק עכשיו לכבוד ההשקה, מצטרפים ומקבלים בחודש הראשון 3 התאמות במקום 2. המחיר 99 ₪ לחודש, מתחדש עד ביטול. מספר המקומות מוגבל.

לכל הפרטים ולהצטרפות:
${checkoutUrl}

להסרה:
${unsubscribeUrl}`;
  return { message, checkoutUrl };
}

function trackedEmailContent(htmlContent: string, logId: number, checkoutUrl: string) {
  const clickUrl = `https://hilitcaspi.com/api/email/click/${logId}?url=${encodeURIComponent(checkoutUrl)}`;
  const pixel = `<img src="https://hilitcaspi.com/api/email/open/${logId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`;
  return htmlContent.split(checkoutUrl).join(clickUrl).replace("</body>", `${pixel}</body>`);
}

async function loadCampaignCandidates(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const [singleRows, memberRows, blockedRows, coachingEmails, paidPlusRows] = await Promise.all([
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
    db.select({ email: completedPayments.email }).from(completedPayments)
      .where(eq(completedPayments.product, "plus")),
  ]);
  const memberBySingleId = new Map(memberRows.map(row => [row.singleId, row]));
  const blockedEmails = new Set(blockedRows.map(row => normalizeEmail(row.email)).filter(Boolean));
  const paidPlusEmails = new Set(paidPlusRows.map(row => normalizeEmail(row.email)).filter(Boolean));
  return singleRows.filter(single => {
    const email = normalizeEmail(single.email);
    const member = memberBySingleId.get(single.id);
    return email.includes("@")
      && Boolean(String(single.questionnaireToken || "").trim())
      && !blockedEmails.has(email)
      && !paidPlusEmails.has(email)
      && !isPlusPilotCoachingClient(single, coachingEmails)
      && !(member?.status === "active" && member?.billingStatus === "active");
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
  const [blockedRows, paidPlusRows] = await Promise.all([
    db.select({ email: crmLeads.email }).from(crmLeads).where(eq(crmLeads.emailUnsubscribed, true)),
    db.select({ email: completedPayments.email }).from(completedPayments)
      .where(eq(completedPayments.product, "plus")),
  ]);
  const blockedEmails = new Set(blockedRows.map(row => normalizeEmail(row.email)).filter(Boolean));
  const paidPlusEmails = new Set(paidPlusRows.map(row => normalizeEmail(row.email)).filter(Boolean));
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
      || paidPlusEmails.has(email)
      || isPermanentlyBlockedEmail(email)
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
