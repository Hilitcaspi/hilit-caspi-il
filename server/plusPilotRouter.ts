import { TRPCError } from "@trpc/server";
import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { crmTeamTasks, matchBoostRequests, matches, plusPilotMembers, singles } from "../drizzle/schema";
import { getDb } from "./db";
import { sendEmail } from "./brevo";
import { getMissingProfileFields } from "./matchmakingMetrics";
import { calculatePlusCycleProgress } from "./plusSubscription";
import { calculatePlusPilotCapacity, hasPlusPilotCapacity, isPlusPilotSlotReserved } from "./plusPilotCapacity";
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
  const memberMatches = await db.select({
    id: matches.id,
    singleAId: matches.singleAId,
    singleBId: matches.singleBId,
    proposedAt: matches.proposedAt,
    status: matches.status,
    matchDetailStatus: matches.matchDetailStatus,
    returnedToPoolAt: matches.returnedToPoolAt,
  }).from(matches).where(or(eq(matches.singleAId, singleId), eq(matches.singleBId, singleId)));
  const boostRows = await db.select({ matchId: matchBoostRequests.matchId }).from(matchBoostRequests);
  const boostMatchIds = new Set(boostRows.map((row: any) => Number(row.matchId || 0)).filter(Boolean));
  return memberMatches.map((match: any) => ({
    ...match,
    proposalSource: boostMatchIds.has(match.id) ? "boost" : "manual",
  }));
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
        profile: {
          firstName: single.firstName,
          lastName: single.lastName,
          email: single.email,
          phone: single.phone,
        },
        eligibility,
        cycleProgress: pilot[0] ? calculatePlusCycleProgress(pilot[0], memberMatches) : null,
        paymentConfigured: Boolean(process.env.GROW_PAGE_CODE_PLUS?.trim()),
        benefits: [
          "לפחות שתי הצעות התאמה חדשות שנבדקו ונשלחו בכל מחזור חיוב",
          "בוסט אלגוריתמי אחד כלול בכל מחזור, בנוסף לשתי ההצעות שנבדקו ידנית",
          "קדימות באיתור ובבדיקה ידנית של מועמדים מתאימים",
          "שירות לקוחות Plus בעדיפות דרך המספר העסקי",
          "אפשרות לחשיפה בסושיאל רק לאחר אישור מפורש של הטקסט והתמונה",
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

  updateSocialExposureConsent: publicProcedure
    .input(z.object({
      email: z.string().email(),
      token: z.string().min(16),
      consent: z.enum(["declined", "approved"]),
      photoApproved: z.boolean().default(false),
      copyApproved: z.boolean().default(false),
      approvedText: z.string().max(1500).optional(),
    }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const [member] = await db.select().from(plusPilotMembers)
        .where(eq(plusPilotMembers.singleId, single.id)).limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "יש להצטרף תחילה לרשימת Plus" });
      if (input.consent === "approved" && (!input.photoApproved || !input.copyApproved || !input.approvedText?.trim())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "פרסום דורש אישור נפרד לתמונה ולטקסט שאושר" });
      }
      const now = Date.now();
      await db.update(plusPilotMembers).set({
        socialExposureConsent: input.consent,
        socialConsentAt: now,
        socialPhotoApproved: input.consent === "approved" && input.photoApproved,
        socialCopyApproved: input.consent === "approved" && input.copyApproved,
        socialApprovedText: input.consent === "approved" ? input.approvedText?.trim() : null,
        updatedAt: now,
      }).where(eq(plusPilotMembers.id, member.id));
      return { success: true };
    }),

  requestCancellation: publicProcedure
    .input(z.object({
      email: z.string().email(),
      token: z.string().min(16),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const [member] = await db.select().from(plusPilotMembers)
        .where(eq(plusPilotMembers.singleId, single.id)).limit(1);
      if (!member || member.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "לא נמצא מנוי Plus פעיל" });
      }
      const now = Date.now();
      await db.update(plusPilotMembers).set({
        billingStatus: "cancelled",
        cancelledAt: now,
        nextBillingAt: null,
        updatedAt: now,
      }).where(eq(plusPilotMembers.id, member.id));

      const [openTask] = await db.select({ id: crmTeamTasks.id }).from(crmTeamTasks).where(and(
        eq(crmTeamTasks.singleId, single.id),
        eq(crmTeamTasks.taskType, "plus"),
        or(eq(crmTeamTasks.status, "todo"), eq(crmTeamTasks.status, "in_progress")),
      )).limit(1);
      if (!openTask) {
        await db.insert(crmTeamTasks).values({
          singleId: single.id,
          taskType: "plus",
          title: "Plus: לעצור חיוב עתידי ב־Grow",
          description: `בקשת ביטול התקבלה. מזהה מנוי: ${member.providerSubscriptionId || "לא התקבל"}. סיבה: ${input.reason?.trim() || "לא צוינה"}`,
          priority: "urgent",
          status: "todo",
          dueAt: Math.min(Number(member.billingCycleEndsAt || now), now + 2 * DAY_MS),
          createdBy: "plus_self_service_cancellation",
          createdAt: now,
          updatedAt: now,
        });
      }

      if (single.email) {
        await sendEmail({
          to: { email: single.email, name: single.firstName },
          subject: "בקשת ביטול Database Plus התקבלה",
          htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#292552"><h2 style="color:#191265">בקשת הביטול התקבלה</h2><p style="line-height:1.8">בקשת עצירת החידוש הועברה לטיפול. הטבות Plus יישארו פעילות עד סוף מחזור החיוב הנוכחי.</p><p style="line-height:1.8">החברות הרגילה שלך במאגר נשארת ללא שינוי.</p></div>`,
        });
      }
      return { success: true, accessUntil: member.billingCycleEndsAt || now };
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

    const allMatches = await db.select({
      id: matches.id,
      singleAId: matches.singleAId,
      singleBId: matches.singleBId,
      proposedAt: matches.proposedAt,
    }).from(matches);
    const boostRows = await db.select({ matchId: matchBoostRequests.matchId }).from(matchBoostRequests);
    const boostMatchIds = new Set(boostRows.map(row => Number(row.matchId || 0)).filter(Boolean));
    const countableMatches = allMatches.map(match => ({
      ...match,
      proposalSource: boostMatchIds.has(match.id) ? "boost" : "manual",
    }));
    const enrichedRows = rows.map(row => ({
      ...row,
      cycleProgress: calculatePlusCycleProgress(row.pilot, countableMatches),
    }));
    const counts = Object.fromEntries(PLUS_STATUSES.map(status => [status, rows.filter(row => row.pilot.status === status).length]));
    const invitedBase = counts.invited + counts.active + counts.declined + counts.churned;
    const activatedBase = counts.active + counts.churned;
    const commitment = {
      met: enrichedRows.filter(row => row.pilot.status === "active" && row.cycleProgress.delivered >= row.cycleProgress.target).length,
      atRisk: enrichedRows.filter(row => row.pilot.status === "active" && row.cycleProgress.state === "red").length,
      inProgress: enrichedRows.filter(row => row.pilot.status === "active" && row.cycleProgress.delivered < row.cycleProgress.target && row.cycleProgress.state !== "red").length,
    };
    const capacity = calculatePlusPilotCapacity(rows.map(row => ({
      status: row.pilot.status,
      gender: row.single.gender,
    })));
    return {
      counts,
      commitment,
      capacity,
      waitlistToInviteRate: rows.length > 0 ? Math.round(invitedBase / rows.length * 100) : 0,
      inviteToActiveRate: invitedBase > 0 ? Math.round((counts.active + counts.churned) / invitedBase * 100) : 0,
      retentionRate: activatedBase > 0 ? Math.round(counts.active / activatedBase * 100) : 0,
      rows: enrichedRows,
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
          gender: singles.gender,
        },
      }).from(plusPilotMembers)
        .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
        .where(eq(plusPilotMembers.id, input.id))
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "חבר/ת הפיילוט לא נמצא/ה" });

      const reservingSlot = input.status === "invited" || input.status === "active";
      if (reservingSlot && !isPlusPilotSlotReserved(member.pilot.status)) {
        const capacityRows = await db.select({
          status: plusPilotMembers.status,
          gender: singles.gender,
        }).from(plusPilotMembers)
          .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id));
        if (!hasPlusPilotCapacity(capacityRows, member.single.gender)) {
          const genderLabel = member.single.gender === "female" ? "נשים" : member.single.gender === "male" ? "גברים" : "המגדר הזה";
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: member.single.gender === "female" || member.single.gender === "male"
              ? `מכסת 20 ${genderLabel} בפיילוט Plus מלאה`
              : "יש לעדכן מגדר בפרופיל לפני הזמנה לפיילוט Plus",
          });
        }
      }

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
        const personalUrl = `https://hilitcaspi.com/database-plus?email=${encodeURIComponent(member.single.email)}&token=${encodeURIComponent(member.single.questionnaireToken)}`;
        try {
          await sendEmail({
            to: { email: member.single.email, name: member.single.firstName },
            subject: "הזמנה אישית ל־Database Plus — יותר קדימות, יותר הזדמנויות",
            htmlContent: `
              <div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#fff;color:#292552;padding:28px;border-radius:18px">
                <p style="font-size:12px;font-weight:bold;color:#9a7e15">מסלול אישי עם יותר הזדמנויות להכיר</p>
                <h2 style="color:#191265">היי ${member.single.firstName}, יש לך הזמנה ל־Database Plus</h2>
                <p style="line-height:1.8">Plus מוסיף עבודה יזומה וקדימות סביב הפרופיל שלך: לפחות <strong>שתי הצעות התאמה חדשות שנבדקו ונשלחו בכל מחזור חיוב</strong>, ובנוסף <strong>בוסט אלגוריתמי אחד כלול בכל מחזור</strong>, קדימות בבדיקה האנושית, שירות לקוחות בעדיפות ואפשרות לחשיפה בסושיאל רק לאחר אישור מפורש.</p>
                <p style="line-height:1.8"><strong>99 ש״ח לחודש</strong>, ללא צורך ברכישה קודמת של המאגר ועם אפשרות ביטול בכל עת.</p>
                <p style="line-height:1.8;font-size:13px;color:#666"><strong>חשוב:</strong> ההבטחה היא להצעות שנבדקו ונשלחו. אישור הדדי, דייט או זוגיות תלויים גם בצד השני ואינם מובטחים.</p>
                <p style="text-align:center;margin:28px 0"><a href="${personalUrl}" style="display:inline-block;background:#191265;color:#ffe27c;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold">לפרטים ולהצטרפות</a></p>
                <p style="font-size:12px;color:#777;line-height:1.7">לא יתבצע חיוב ללא אישור תנאי המנוי ומסך התשלום.</p>
              </div>`,
          });
        } catch (error) {
          console.error("[PlusPilot] Failed to send invitation email", error);
        }
      }
      return { success: true };
    }),

  adminUpdateSubscription: teamProcedure
    .input(z.object({
      id: z.number().int().positive(),
      billingStatus: z.enum(["not_configured", "pending", "active", "past_due", "cancelled", "ended"]),
      billingCycleStartedAt: z.number().int().positive().nullable().optional(),
      billingCycleEndsAt: z.number().int().positive().nullable().optional(),
      nextBillingAt: z.number().int().positive().nullable().optional(),
      premiumSupportEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const updates: Record<string, unknown> = {
        billingStatus: input.billingStatus,
        billingCycleStartedAt: input.billingCycleStartedAt,
        billingCycleEndsAt: input.billingCycleEndsAt,
        nextBillingAt: input.nextBillingAt,
        premiumSupportEnabled: input.premiumSupportEnabled,
        cancelledAt: input.billingStatus === "cancelled" ? now : undefined,
        updatedAt: now,
      };
      await db.update(plusPilotMembers).set(updates).where(eq(plusPilotMembers.id, input.id));
      return { success: true };
    }),
});
