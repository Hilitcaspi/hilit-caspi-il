import { TRPCError } from "@trpc/server";
import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { matches, plusPilotMembers, singles } from "../drizzle/schema";
import { getDb } from "./db";
import { sendEmail } from "./brevo";
import { getMissingProfileFields } from "./matchmakingMetrics";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";

const PLUS_STATUSES = ["waitlist", "eligible", "invited", "active", "declined", "churned"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export function assessPlusEligibility(single: any, memberMatches: any[], now = Date.now()) {
  const missingFields = getMissingProfileFields(single);
  const tenureDays = Math.max(0, Math.floor((now - Number(single.createdAt || now)) / DAY_MS));
  const activeMatch = memberMatches.some(match =>
    !match.returnedToPoolAt && (match.status === "proposed" || match.status === "matched"),
  );
  const positiveOutcome = memberMatches.some(match =>
    !match.returnedToPoolAt && ["continuing", "together", "relationship", "engaged", "married"].includes(match.matchDetailStatus || ""),
  );
  const potentialMatchesUnderReview = memberMatches.filter(match =>
    !match.returnedToPoolAt && match.status === "pending",
  ).length;

  let score = 0;
  const reasons: string[] = [];
  const blockers: string[] = [];
  if (single.isPaid && single.isActive) { score += 15; reasons.push("חברות פעילה במאגר"); }
  else blockers.push("הפרופיל אינו חבר פעיל בתשלום");
  if (missingFields.length === 0) { score += 35; reasons.push("פרופיל מלא ואיכותי"); }
  else blockers.push(`חסרים בפרופיל: ${missingFields.join(", ")}`);
  if (single.questionnaireCompletedAt) { score += 15; reasons.push("השאלון המדעי הושלם"); }
  if (single.photoUrl) { score += 10; reasons.push("תמונה מאושרת"); }
  if (tenureDays >= 14) { score += 10; reasons.push("לפחות 14 ימים במאגר"); }
  if (!positiveOutcome) score += 10;
  if (!activeMatch) score += 5;

  return {
    eligible: score >= 80 && blockers.length === 0 && !positiveOutcome,
    score,
    reasons,
    blockers,
    tenureDays,
    activeMatch,
    positiveOutcome,
    potentialMatchesUnderReview,
  };
}

async function getVerifiedSingle(email: string, token: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [single] = await db.select().from(singles)
    .where(and(
      eq(singles.questionnaireToken, token),
      eq(singles.email, email.trim().toLowerCase()),
    ))
    .limit(1);
  if (!single) throw new TRPCError({ code: "NOT_FOUND", message: "הקישור האישי אינו תקין" });
  return { db, single };
}

async function getMemberMatches(db: any, singleId: number) {
  return db.select({
    id: matches.id,
    status: matches.status,
    matchDetailStatus: matches.matchDetailStatus,
    returnedToPoolAt: matches.returnedToPoolAt,
  }).from(matches).where(or(eq(matches.singleAId, singleId), eq(matches.singleBId, singleId)));
}

function assertAdmin(ctx: any) {
  if (!ctx.user && !ctx.teamMember) throw new TRPCError({ code: "FORBIDDEN" });
  if (ctx.user && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}

export const plusPilotRouter = router({
  getMyStatus: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16) }))
    .query(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const [pilot, memberMatches] = await Promise.all([
        db.select().from(plusPilotMembers).where(eq(plusPilotMembers.singleId, single.id)).limit(1),
        getMemberMatches(db, single.id),
      ]);
      const eligibility = assessPlusEligibility(single, memberMatches);
      return {
        status: pilot[0]?.status || "none",
        pilot: pilot[0] || null,
        eligibility,
        benefits: [
          "תמונת מצב אנונימית של מועמדים שנמצאים בבדיקה — ללא חשיפת זהות לפני אישור הדדי",
          "בדיקת פרופיל והעדפות חודשית כדי לשפר את איכות ההזדמנויות",
          "קדימות בבדיקת התאמות אפשריות — ללא הבטחה לכמות או לתדירות קבועה",
        ],
      };
    }),

  joinWaitlist: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16), source: z.string().max(100).default("personal_area") }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const now = Date.now();
      const [existing] = await db.select().from(plusPilotMembers)
        .where(eq(plusPilotMembers.singleId, single.id)).limit(1);
      if (existing) {
        await db.update(plusPilotMembers).set({ lastEngagedAt: now, updatedAt: now })
          .where(eq(plusPilotMembers.id, existing.id));
        return { success: true, status: existing.status, alreadyRegistered: true };
      }
      const memberMatches = await getMemberMatches(db, single.id);
      const eligibility = assessPlusEligibility(single, memberMatches, now);
      const status = eligibility.eligible ? "eligible" : "waitlist";
      await db.insert(plusPilotMembers).values({
        singleId: single.id,
        status,
        eligibilityScore: eligibility.score,
        eligibilityReasons: JSON.stringify({ reasons: eligibility.reasons, blockers: eligibility.blockers }),
        source: input.source,
        waitlistedAt: now,
        lastEngagedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, status, alreadyRegistered: false };
    }),

  adminOverview: teamProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      pilot: plusPilotMembers,
      single: {
        id: singles.id,
        firstName: singles.firstName,
        lastName: singles.lastName,
        email: singles.email,
        phone: singles.phone,
        gender: singles.gender,
        age: singles.age,
        city: singles.city,
        photoUrl: singles.photoUrl,
      },
    }).from(plusPilotMembers)
      .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
      .orderBy(desc(plusPilotMembers.updatedAt));

    const counts = Object.fromEntries(PLUS_STATUSES.map(status => [status, rows.filter(row => row.pilot.status === status).length]));
    const invitedBase = counts.invited + counts.active + counts.declined + counts.churned;
    const activatedBase = counts.active + counts.churned;
    return {
      counts,
      waitlistToInviteRate: rows.length > 0 ? Math.round(invitedBase / rows.length * 100) : 0,
      inviteToActiveRate: invitedBase > 0 ? Math.round((counts.active + counts.churned) / invitedBase * 100) : 0,
      retentionRate: activatedBase > 0 ? Math.round(counts.active / activatedBase * 100) : 0,
      rows,
    };
  }),

  adminUpdateStatus: teamProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(PLUS_STATUSES),
      pilotCohort: z.string().max(100).optional(),
      pilotPriceAgorot: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const [member] = await db.select({
        pilot: plusPilotMembers,
        single: {
          firstName: singles.firstName,
          email: singles.email,
          questionnaireToken: singles.questionnaireToken,
        },
      }).from(plusPilotMembers)
        .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
        .where(eq(plusPilotMembers.id, input.id))
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "חבר/ת הפיילוט לא נמצא/ה" });

      await db.update(plusPilotMembers).set({
        status: input.status,
        pilotCohort: input.pilotCohort,
        pilotPriceAgorot: input.pilotPriceAgorot,
        invitedAt: input.status === "invited" ? now : undefined,
        activatedAt: input.status === "active" ? now : undefined,
        endedAt: input.status === "declined" || input.status === "churned" ? now : undefined,
        updatedAt: now,
      }).where(eq(plusPilotMembers.id, input.id));

      if (input.status === "invited" && member.single.email && member.single.questionnaireToken) {
        const personalUrl = `https://hilitcaspi.com/my-profile?email=${encodeURIComponent(member.single.email)}&token=${encodeURIComponent(member.single.questionnaireToken)}`;
        try {
          await sendEmail({
            to: { email: member.single.email, name: member.single.firstName },
            subject: "הזמנה לפיילוט Database Plus",
            htmlContent: `
              <div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#fff;color:#292552;padding:28px;border-radius:18px">
                <h2 style="color:#191265">היי ${member.single.firstName}, יש לך הזמנה לפיילוט Database Plus</h2>
                <p style="line-height:1.8">הפיילוט נועד לתת יותר שקיפות, בדיקת העדפות חודשית וקדימות בבדיקת התאמות אפשריות.</p>
                <p style="line-height:1.8"><strong>חשוב:</strong> Plus אינו מבטיח מספר התאמות או תדירות קבועה, ואינו חושף זהות של אדם לפני אישור הדדי.</p>
                <p style="text-align:center;margin:28px 0"><a href="${personalUrl}" style="display:inline-block;background:#191265;color:white;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold">לצפייה באזור האישי</a></p>
                <p style="font-size:12px;color:#777;line-height:1.7">ההזמנה היא לקבוצה מצומצמת לצורך מדידה ושיפור לפני פתיחה רחבה.</p>
              </div>`,
          });
        } catch (error) {
          console.error("[PlusPilot] Failed to send invitation email", error);
        }
      }
      return { success: true };
    }),
});
