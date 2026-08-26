import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import {
  crmTeamTasks,
  matchBoostRequests,
  matches,
  plusPilotMembers,
  singles,
} from "../drizzle/schema";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { getMissingProfileFields } from "./matchmakingMetrics";

const DAY_MS = 24 * 60 * 60 * 1000;
const BOOST_PRICE_AGOROT = 1999;
const MIN_BOOST_SCORE = 70;
const OPEN_BOOST_STATUSES = ["awaiting_payment", "paid", "queued", "reviewing"] as const;
const REVIEWABLE_BOOST_STATUSES = ["paid", "queued", "reviewing"] as const;

export async function syncBoostRequestAfterMatchDecision(
  db: any,
  input: { matchId: number; decision: "approved" | "rejected"; reason?: string; now?: number },
) {
  const now = input.now ?? Date.now();
  await db.transaction(async (tx: any) => {
    await tx.update(matchBoostRequests).set({
      status: input.decision,
      decidedAt: now,
      fulfilledAt: input.decision === "approved" ? now : null,
      decisionReason: input.reason || (input.decision === "approved"
        ? "ההתאמה אושרה ונשלחה בזרימה הרגילה"
        : "ההתאמה נדחתה בבדיקת CRM"),
      updatedAt: now,
    }).where(and(
      eq(matchBoostRequests.matchId, input.matchId),
      inArray(matchBoostRequests.status, [...REVIEWABLE_BOOST_STATUSES]),
    ));
    await tx.update(crmTeamTasks).set({
      status: "done",
      completedAt: now,
      updatedAt: now,
    }).where(and(
      eq(crmTeamTasks.matchId, input.matchId),
      eq(crmTeamTasks.taskType, "match_review"),
      inArray(crmTeamTasks.status, ["todo", "in_progress"]),
    ));
  });
}

async function getVerifiedSingle(email: string, token: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [single] = await db.select().from(singles).where(and(
    eq(singles.email, email.trim().toLowerCase()),
    eq(singles.questionnaireToken, token),
  )).limit(1);
  if (!single) throw new TRPCError({ code: "NOT_FOUND", message: "הקישור האישי אינו תקין" });
  return { db, single };
}

export function evaluateBoostEligibility(input: {
  single: any;
  memberMatches: any[];
  plusMember?: any | null;
  boostRequests?: any[];
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const missingFields = getMissingProfileFields(input.single);
  const activeMatch = input.memberMatches.some(match =>
    !match.returnedToPoolAt && (match.status === "proposed" || match.status === "matched"),
  );
  const positiveOutcome = input.memberMatches.some(match =>
    !match.returnedToPoolAt && ["continuing", "together", "relationship", "engaged", "married"].includes(match.matchDetailStatus || ""),
  );
  const candidates = input.memberMatches
    .filter(match =>
      !match.returnedToPoolAt
      && match.status === "pending"
      && Number(match.score || 0) >= MIN_BOOST_SCORE
      && match.candidateEligible !== false,
    )
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const openRequest = (input.boostRequests || []).find(request =>
    OPEN_BOOST_STATUSES.includes(request.status),
  );
  const recentRequest = (input.boostRequests || []).find(request =>
    request.status !== "refunded" && request.status !== "cancelled" && Number(request.requestedAt || 0) > now - 30 * DAY_MS,
  );
  const plusActive = input.plusMember?.status === "active" && input.plusMember?.billingStatus === "active";
  const cycleStart = Number(input.plusMember?.billingCycleStartedAt || 0);
  const plusBenefitUsed = plusActive && cycleStart > 0 && (input.boostRequests || []).some(request =>
    request.source === "plus_included" && Number(request.plusBillingCycleStartedAt || 0) === cycleStart,
  );

  const blockers: string[] = [];
  if (!input.single.isPaid || !input.single.isActive || !input.single.consentMatchmaking) blockers.push("החברות במאגר אינה פעילה");
  if (missingFields.length > 0) blockers.push("יש להשלים את הפרופיל לפני הפעלת בוסט");
  if (!input.single.questionnaireCompletedAt) blockers.push("יש להשלים את השאלון המדעי");
  if (!input.single.photoUrl) blockers.push("יש להוסיף תמונה לפרופיל");
  if (activeMatch) blockers.push("יש לך התאמה פעילה כרגע");
  if (positiveOutcome) blockers.push("הבוסט אינו מוצע בזמן תוצאה זוגית פעילה");
  if (candidates.length === 0) blockers.push("אין כרגע התאמה אפשרית שמתאימה לבדיקת בוסט");
  if (openRequest) blockers.push("בקשת בוסט קודמת עדיין בטיפול");
  if (recentRequest && !openRequest) blockers.push("ניתן להפעיל בוסט אחד בכל 30 יום");

  return {
    eligible: blockers.length === 0,
    blockers,
    activeMatch,
    positiveOutcome,
    candidateCount: candidates.length,
    topCandidate: candidates[0] || null,
    topScore: candidates[0] ? Math.round(Number(candidates[0].score || 0)) : null,
    plusActive,
    plusBenefitAvailable: plusActive && !plusBenefitUsed,
    plusBenefitUsed,
    openRequest: openRequest || null,
  };
}

async function loadBoostContext(db: any, single: any) {
  const [rawMemberMatches, plusRows, requests] = await Promise.all([
    db.select({
      id: matches.id,
      singleAId: matches.singleAId,
      singleBId: matches.singleBId,
      score: matches.score,
      status: matches.status,
      matchDetailStatus: matches.matchDetailStatus,
      returnedToPoolAt: matches.returnedToPoolAt,
      createdAt: matches.createdAt,
    }).from(matches).where(or(eq(matches.singleAId, single.id), eq(matches.singleBId, single.id))),
    db.select().from(plusPilotMembers).where(eq(plusPilotMembers.singleId, single.id)).limit(1),
    db.select().from(matchBoostRequests).where(eq(matchBoostRequests.singleId, single.id)).orderBy(desc(matchBoostRequests.requestedAt)).limit(10),
  ]);
  const candidateIds = Array.from(new Set(rawMemberMatches
    .filter((match: any) => match.status === "pending" && !match.returnedToPoolAt)
    .map((match: any) => match.singleAId === single.id ? match.singleBId : match.singleAId)
    .filter(Boolean))) as number[];
  const [candidateProfiles, candidateActiveMatches] = candidateIds.length > 0 ? await Promise.all([
    db.select().from(singles).where(inArray(singles.id, candidateIds)),
    db.select({
      singleAId: matches.singleAId,
      singleBId: matches.singleBId,
      status: matches.status,
      matchDetailStatus: matches.matchDetailStatus,
      returnedToPoolAt: matches.returnedToPoolAt,
    }).from(matches).where(and(
      isNull(matches.returnedToPoolAt),
      inArray(matches.status, ["proposed", "matched"]),
      or(inArray(matches.singleAId, candidateIds), inArray(matches.singleBId, candidateIds)),
    )),
  ]) : [[], []];
  const candidateProfileMap = new Map<number, any>(candidateProfiles.map((profile: any) => [profile.id, profile]));
  const unavailableCandidateIds = new Set<number>();
  for (const activeMatch of candidateActiveMatches as any[]) {
    if (candidateIds.includes(activeMatch.singleAId)) unavailableCandidateIds.add(activeMatch.singleAId);
    if (candidateIds.includes(activeMatch.singleBId)) unavailableCandidateIds.add(activeMatch.singleBId);
  }
  const memberMatches = rawMemberMatches.map((match: any) => {
    const candidateId = match.singleAId === single.id ? match.singleBId : match.singleAId;
    const profile = candidateProfileMap.get(candidateId);
    const candidateEligible = Boolean(
      profile
      && profile.isPaid
      && profile.isActive
      && profile.consentMatchmaking
      && getMissingProfileFields(profile).length === 0
      && !unavailableCandidateIds.has(candidateId),
    );
    return { ...match, candidateEligible };
  });
  return { memberMatches, plusMember: plusRows[0] || null, requests };
}

export const matchBoostRouter = router({
  listReviewQueue: teamProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const requests = await db.select().from(matchBoostRequests)
      .where(inArray(matchBoostRequests.status, [...REVIEWABLE_BOOST_STATUSES]))
      .orderBy(desc(matchBoostRequests.requestedAt));

    return Promise.all(requests.map(async (request: any) => {
      const [match] = await db.select().from(matches).where(eq(matches.id, request.matchId)).limit(1);
      if (!match) return null;
      const [singleA, singleB, taskRows] = await Promise.all([
        db.select().from(singles).where(eq(singles.id, match.singleAId)).limit(1),
        db.select().from(singles).where(eq(singles.id, match.singleBId)).limit(1),
        db.select().from(crmTeamTasks).where(and(
          eq(crmTeamTasks.matchId, match.id),
          eq(crmTeamTasks.taskType, "match_review"),
          inArray(crmTeamTasks.status, ["todo", "in_progress"]),
        )).orderBy(desc(crmTeamTasks.createdAt)).limit(1),
      ]);
      const requester = request.singleId === match.singleAId ? singleA[0] : singleB[0];
      const candidate = request.singleId === match.singleAId ? singleB[0] : singleA[0];
      const profile = (single: any) => single ? ({
        id: single.id,
        firstName: single.firstName,
        lastName: single.lastName,
        gender: single.gender,
        age: single.age,
        city: single.city,
        height: single.height,
        occupation: single.occupation,
        religiosity: single.religiosity,
        dnaType: single.dnaType,
        photoUrl: single.photoUrl,
        hasKids: single.hasKids,
        wantsKids: single.wantsKids,
        about: single.about,
        partnerDescription: single.partnerDescription,
      }) : null;
      return {
        request: {
          id: request.id,
          source: request.source,
          status: request.status,
          amountAgorot: request.amountAgorot,
          requestedAt: request.requestedAt,
        },
        match: { id: match.id, status: match.status, score: Math.round(Number(match.score || 0)) },
        requester: profile(requester),
        candidate: profile(candidate),
        task: taskRows[0] ? {
          id: taskRows[0].id,
          status: taskRows[0].status,
          assignedTeamMemberId: taskRows[0].assignedTeamMemberId,
        } : null,
      };
    })).then(rows => rows.filter(Boolean));
  }),

  startReview: teamProcedure
    .input(z.object({ requestId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [request] = await db.select().from(matchBoostRequests)
        .where(eq(matchBoostRequests.id, input.requestId)).limit(1);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "בקשת הבוסט לא נמצאה" });
      if (request.status === "reviewing") return { success: true, status: "reviewing" as const };
      if (!REVIEWABLE_BOOST_STATUSES.includes(request.status as any)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "בקשת הבוסט אינה פתוחה לבדיקה" });
      }
      const now = Date.now();
      await db.transaction(async (tx: any) => {
        await tx.update(matchBoostRequests).set({
          status: "reviewing",
          reviewStartedAt: now,
          updatedAt: now,
        }).where(eq(matchBoostRequests.id, request.id));
        await tx.update(crmTeamTasks).set({
          status: "in_progress",
          updatedAt: now,
        }).where(and(
          eq(crmTeamTasks.matchId, request.matchId),
          eq(crmTeamTasks.taskType, "match_review"),
          eq(crmTeamTasks.status, "todo"),
        ));
      });
      return { success: true, status: "reviewing" as const };
    }),

  getMyStatus: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16) }))
    .query(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const context = await loadBoostContext(db, single);
      const eligibility = evaluateBoostEligibility({ single, ...context });
      return {
        eligible: eligibility.eligible,
        blockers: eligibility.blockers,
        candidateCount: eligibility.candidateCount,
        topScore: eligibility.topScore,
        plusActive: eligibility.plusActive,
        plusBenefitAvailable: eligibility.plusBenefitAvailable,
        plusBenefitUsed: eligibility.plusBenefitUsed,
        openRequest: eligibility.openRequest ? {
          id: eligibility.openRequest.id,
          status: eligibility.openRequest.status,
          source: eligibility.openRequest.source,
          requestedAt: eligibility.openRequest.requestedAt,
        } : null,
        priceAgorot: BOOST_PRICE_AGOROT,
        paymentConfigured: Boolean(process.env.GROW_PAGE_CODE_MATCH_BOOST?.trim()),
      };
    }),

  redeemPlusBoost: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16) }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const context = await loadBoostContext(db, single);
      const eligibility = evaluateBoostEligibility({ single, ...context });
      if (!eligibility.plusActive || !eligibility.plusBenefitAvailable) {
        throw new TRPCError({ code: "FORBIDDEN", message: "לא נמצאה הטבת בוסט זמינה במחזור Plus הנוכחי" });
      }
      if (!eligibility.eligible || !eligibility.topCandidate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: eligibility.blockers[0] || "הבוסט אינו זמין כרגע" });
      }

      const now = Date.now();
      const cycleStart = Number(context.plusMember.billingCycleStartedAt);
      const idempotencyKey = `plus:${single.id}:${cycleStart}`;
      try {
        const requestId = await db.transaction(async (tx: any) => {
          const [insertResult] = await tx.insert(matchBoostRequests).values({
            singleId: single.id,
            matchId: eligibility.topCandidate.id,
            source: "plus_included",
            status: "queued",
            amountAgorot: 0,
            idempotencyKey,
            plusBillingCycleStartedAt: cycleStart,
            requestedAt: now,
            expiresAt: now + 7 * DAY_MS,
            createdAt: now,
            updatedAt: now,
          });
          const insertedId = Number((insertResult as any).insertId || 0);
          await tx.insert(crmTeamTasks).values({
            singleId: single.id,
            matchId: eligibility.topCandidate.id,
            taskType: "match_review",
            title: `בוסט התאמה: ${single.firstName} ${single.lastName || ""}`.trim(),
            description: `בוסט Plus חודשי. לבדוק את ההתאמה האפשרית ולאשר או לדחות. ציון: ${Math.round(Number(eligibility.topCandidate.score || 0))}%`,
            priority: "high",
            status: "todo",
            dueAt: now + DAY_MS,
            createdBy: "match_boost_plus",
            createdAt: now,
            updatedAt: now,
          });
          return insertedId;
        });
        return { success: true, requestId, status: "queued" as const };
      } catch (error: any) {
        if (error?.code === "ER_DUP_ENTRY") {
          const [existing] = await db.select().from(matchBoostRequests)
            .where(eq(matchBoostRequests.idempotencyKey, idempotencyKey)).limit(1);
          return { success: true, requestId: existing?.id || 0, status: existing?.status || "queued" };
        }
        throw error;
      }
    }),

  startPaidBoost: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16) }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const context = await loadBoostContext(db, single);
      const eligibility = evaluateBoostEligibility({ single, ...context });
      if (!eligibility.eligible) {
        throw new TRPCError({ code: "BAD_REQUEST", message: eligibility.blockers[0] || "הבוסט אינו זמין כרגע" });
      }
      if (!process.env.GROW_PAGE_CODE_MATCH_BOOST?.trim()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "התשלום לבוסט עדיין אינו מחובר" });
      }
      return {
        configured: true,
        pageCode: process.env.GROW_PAGE_CODE_MATCH_BOOST.trim(),
        amountAgorot: BOOST_PRICE_AGOROT,
        product: "match_boost" as const,
      };
    }),
});
