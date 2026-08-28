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
          const approvalUrl = `https://hilitcaspi.com/my-profile?email=${encodeURIComponent(email)}&token=${encodeURIComponent(single.questionnaireToken!)}&tab=matches&focus=boost`;
          try {
            await sendEmail({
              to: { email, name: single.firstName || undefined },
              subject: "הקישור האישי שלך ל־Boost",
              htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#2b1747"><h2 style="color:#191265">Boost מחכה לך באזור האישי</h2><p style="line-height:1.8">ביקשת לפתוח את הפרופיל שלך לאפשרות לשלוח ולקבל Boost.</p><p style="line-height:1.8">לחיצה על הכפתור תפתח ישירות את אזור Boost באזור האישי. שם אפשר לאשר את השירות ולצפות בהתאמות פוטנציאליות, כאשר קיימות.</p><p style="text-align:center;margin:28px 0"><a href="${approvalUrl}" style="display:inline-block;background:linear-gradient(135deg,#a52178,#5d176d);color:white;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold">כניסה ל־Boost באזור האישי</a></p><p style="font-size:13px;line-height:1.7;color:#6f627a">הקישור אישי ומיועד לחבר או חברת מאגר פעילים. אין להעביר אותו לאחרים.</p></div>`,
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
