import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  matchBoostMemberships,
  matchBoostPilotInterests,
  matchBoostRequests,
  matches,
  singles,
} from "../drizzle/schema";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sendEmail } from "./brevo";

export const BOOST_INTEREST_CONSENT_VERSION = "2026-08-27-interest-v1";
const BOOST_LINK_COOLDOWN_MS = 10 * 60 * 1000;

function escapeEmailHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildBoostApprovalLinkEmail(input: { firstName?: string | null; approvalUrl: string }) {
  const firstName = escapeEmailHtml(String(input.firstName || "").trim());
  const greeting = firstName ? `היי ${firstName},` : "היי,";
  const preheader = "אישור קצר יאפשר לך לשלוח ולקבל בקשות Boost דרך האזור האישי";
  const subject = "נפתחה עבורך האפשרות להצטרף ל־Boost";
  const htmlContent = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3ecdf;font-family:Arial,'Rubik',sans-serif;color:#24113f;direction:rtl;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;&#847;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3ecdf;"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 18px 48px rgba(42,16,70,.16);">
      <tr><td align="center" style="background:#191265;padding:28px 24px 22px;">
        <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg" width="72" height="72" alt="הילית כספי" style="display:block;width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #ffe27c;">
        <p style="margin:12px 0 0;color:#ffe27c;font-size:13px;font-weight:700;">Boost לחברי המאגר</p>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:800;">יותר אפשרויות.<br>יותר בחירה בידיים שלכם.</h1>
      </td></tr>
      <tr><td style="padding:30px 28px 14px;text-align:right;">
        <p style="margin:0 0 14px;font-size:18px;font-weight:700;color:#24113f;">${greeting}</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#4b3a59;">ביקשתם יותר התאמות, ואני מקשיבה. Boost מאפשר לראות באזור האישי התאמות פוטנציאליות ולבחור בעצמכם אם לשלוח בקשת התאמה.</p>
        <div style="background:linear-gradient(135deg,#2a125d 0%,#6f176f 58%,#b1247f 100%);border-radius:22px;padding:24px 22px;color:#ffffff;">
          <p style="margin:0 0 12px;color:#ffe27c;font-size:14px;font-weight:800;">מה חשוב לדעת לפני האישור</p>
          <p style="margin:0 0 10px;font-size:15px;line-height:1.7;">✓ האישור וההצטרפות לשירות Boost אינם כרוכים בתשלום נוסף.</p>
          <p style="margin:0 0 10px;font-size:15px;line-height:1.7;">✓ תשלום של 19.99 ₪ מתבצע רק אם בוחרים לשלוח Boost בפועל.</p>
          <p style="margin:0;font-size:15px;line-height:1.7;">✓ ההתאמות נוצרות על ידי האלגוריתם ואינן עוברות אישור אישי של הילית.</p>
        </div>
        <p style="margin:18px 0 0;font-size:15px;line-height:1.8;color:#4b3a59;">האישור יכול להישמר גם אם עדיין חסרים פרטים בפרופיל. הפרופיל יצטרף להצעות Boost רק לאחר השלמת הפרטים והשאלון הנדרשים.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0 10px;">
          <a href="${input.approvalUrl}" style="display:inline-block;background:#ffe27c;color:#191265;text-decoration:none;padding:16px 30px;border-radius:14px;font-size:17px;font-weight:800;box-shadow:0 8px 20px rgba(25,18,101,.18);">כניסה לאזור האישי ואישור Boost</a>
        </td></tr></table>
        <p style="margin:8px 0 0;text-align:center;font-size:13px;line-height:1.7;color:#7a6c82;">הקישור אישי ומאובטח. אין להעביר אותו לאחרים.</p>
      </td></tr>
      <tr><td align="center" style="background:#191265;padding:20px 24px;">
        <p style="margin:0;color:#ffe27c;font-size:14px;font-weight:700;">הילית כספי</p>
        <p style="margin:6px 0 0;color:rgba(255,255,255,.72);font-size:12px;">מאמנת למציאת זוגיות ומנהלת המאגר</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const textContent = `${greeting}\n\nביקשתם יותר התאמות, ואני מקשיבה. Boost מאפשר לראות באזור האישי התאמות פוטנציאליות ולבחור אם לשלוח בקשת התאמה.\n\nהאישור וההצטרפות לשירות Boost אינם כרוכים בתשלום נוסף. 19.99 ₪ נגבים רק אם בוחרים לשלוח Boost בפועל. ההתאמות נוצרות על ידי האלגוריתם ואינן עוברות אישור אישי של הילית.\n\nכניסה לאזור האישי ואישור Boost: ${input.approvalUrl}\n\nהקישור אישי ומאובטח. אין להעביר אותו לאחרים.`;
  return { subject, preheader, htmlContent, textContent };
}

function countByStatus(rows: Array<{ status: string }>) {
  return rows.reduce<Record<string, number>>((totals, row) => {
    totals[row.status] = (totals[row.status] || 0) + 1;
    return totals;
  }, {});
}

export const matchBoostPilotRouter = router({
  submitInterest: publicProcedure
    .input(z.object({
      email: z.string().trim().email().max(320),
      requestLink: z.literal(true),
      utmSource: z.string().trim().max(200).optional(),
      utmMedium: z.string().trim().max(200).optional(),
      utmCampaign: z.string().trim().max(200).optional(),
      utmContent: z.string().trim().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const email = input.email.toLowerCase();
      const single = await db.select({
        id: singles.id,
        firstName: singles.firstName,
        email: singles.email,
        isPaid: singles.isPaid,
        isActive: singles.isActive,
        consentMatchmaking: singles.consentMatchmaking,
        questionnaireToken: singles.questionnaireToken,
      })
        .from(singles)
        .where(eq(singles.email, email))
        .limit(1)
        .then(rows => rows[0] || null);
      const membership = single
        ? await db.select({ status: matchBoostMemberships.status })
          .from(matchBoostMemberships)
          .where(eq(matchBoostMemberships.singleId, single.id))
          .limit(1)
          .then(rows => rows[0] || null)
        : null;
      const existingInterest = await db.select({ updatedAt: matchBoostPilotInterests.updatedAt })
        .from(matchBoostPilotInterests)
        .where(eq(matchBoostPilotInterests.email, email))
        .limit(1)
        .then(rows => rows[0] || null);
      const now = Date.now();
      const status = membership?.status === "active" ? "joined" : "interested";
      const canReceiveLink = Boolean(
        single?.isPaid
        && single?.isActive
        && single?.consentMatchmaking
        && single?.questionnaireToken,
      );
      const cooldownElapsed = !existingInterest
        || now - Number(existingInterest.updatedAt || 0) >= BOOST_LINK_COOLDOWN_MS;

      if (canReceiveLink && single) {
        await db.insert(matchBoostPilotInterests).values({
          firstName: single.firstName || "חבר מאגר",
          email,
          phone: null,
          matchedSingleId: single.id,
          contactConsent: true,
          consentVersion: BOOST_INTEREST_CONSENT_VERSION,
          source: "match_boost_approval_link",
          utmSource: input.utmSource || null,
          utmMedium: input.utmMedium || null,
          utmCampaign: input.utmCampaign || null,
          utmContent: input.utmContent || null,
          status,
          createdAt: now,
          updatedAt: now,
        }).onDuplicateKeyUpdate({ set: {
          firstName: single.firstName || "חבר מאגר",
          matchedSingleId: single.id,
          contactConsent: true,
          consentVersion: BOOST_INTEREST_CONSENT_VERSION,
          source: "match_boost_approval_link",
          utmSource: input.utmSource || null,
          utmMedium: input.utmMedium || null,
          utmCampaign: input.utmCampaign || null,
          utmContent: input.utmContent || null,
          status,
          updatedAt: now,
        }});

        if (cooldownElapsed) {
          const approvalUrl = `https://hilitcaspi.com/my-profile?email=${encodeURIComponent(email)}&token=${encodeURIComponent(single.questionnaireToken!)}&tab=boost`;
          const emailContent = buildBoostApprovalLinkEmail({ firstName: single.firstName, approvalUrl });
          try {
            await sendEmail({
              to: { email, name: single.firstName || undefined },
              subject: emailContent.subject,
              htmlContent: emailContent.htmlContent,
              textContent: emailContent.textContent,
            });
          } catch (error) {
            console.error(`[MatchBoost] Failed to send approval link for single ${single.id}`, error);
          }
        }
      }
      return {
        success: true,
        message: "אם כתובת המייל מקושרת לחבר מאגר פעיל, נשלח אליה קישור אישי לאישור שירות Boost. כדאי לבדוק גם בתיקיית קידומי מכירות או בספאם.",
      };
    }),

  overview: teamProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const [interests, memberships, requests, boostMatches] = await Promise.all([
      db.select({ status: matchBoostPilotInterests.status }).from(matchBoostPilotInterests),
      db.select({ status: matchBoostMemberships.status }).from(matchBoostMemberships),
      db.select({ status: matchBoostRequests.status }).from(matchBoostRequests),
      db.select({ status: matches.status, approvedByA: matches.approvedByA, approvedByB: matches.approvedByB })
        .from(matches)
        .where(eq(matches.ownerApprovalToken, "BOOST_ALGORITHMIC")),
    ]);
    return {
      interests: countByStatus(interests as Array<{ status: string }>),
      memberships: countByStatus(memberships as Array<{ status: string }>),
      requests: countByStatus(requests as Array<{ status: string }>),
      sent: boostMatches.length,
      mutualApproval: boostMatches.filter(row => row.approvedByA && row.approvedByB).length,
    };
  }),

  listInterests: teamProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    return db.select({
      interest: matchBoostPilotInterests,
      single: {
        id: singles.id,
        firstName: singles.firstName,
        lastName: singles.lastName,
        isPaid: singles.isPaid,
        isActive: singles.isActive,
      },
      membership: {
        status: matchBoostMemberships.status,
        consentedAt: matchBoostMemberships.consentedAt,
      },
    })
      .from(matchBoostPilotInterests)
      .leftJoin(singles, eq(singles.id, matchBoostPilotInterests.matchedSingleId))
      .leftJoin(matchBoostMemberships, eq(matchBoostMemberships.singleId, matchBoostPilotInterests.matchedSingleId))
      .orderBy(desc(matchBoostPilotInterests.createdAt))
      .limit(200);
  }),
});
