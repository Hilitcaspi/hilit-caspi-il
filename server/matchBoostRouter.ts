import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import {
  crmTeamTasks,
  matchBoostConsentEvents,
  matchBoostMemberships,
  matchBoostPilotInterests,
  matchBoostRequests,
  matchmakingAnswers,
  matches,
  plusPilotMembers,
  singles,
} from "../drizzle/schema";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import { computeFullScore, passesHardFilters } from "./compatibility";
import { getDb } from "./db";
import { sendEmail } from "./brevo";
import { buildMatchProposalEmail } from "./emailTemplates";
import { getMissingProfileFields } from "./matchmakingMetrics";
import { sendInitialMatchWhatsAppsOnce } from "./matchWhatsApp";

const DAY_MS = 24 * 60 * 60 * 1000;
export const BOOST_PRICE_AGOROT = 1990;
const LEGACY_BOOST_PRICE_AGOROT = 1999;
export const MIN_BOOST_SCORE = 60;
const MAX_BOOST_OPTIONS = 6;
export const BOOST_CANDIDATE_NOTE_MARKER = "[BOOST_CANDIDATE]";
export const BOOST_CONSENT_VERSION = "2026-08-27-v1";
const OPEN_BOOST_STATUSES = ["paid", "queued", "reviewing"] as const;
const REVIEWABLE_BOOST_STATUSES = ["paid", "queued", "reviewing"] as const;

function boostCheckoutSigningSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET unavailable for Boost checkout binding");
  return secret;
}

export function createBoostCheckoutReference(requestId: number, singleId: number) {
  const payload = `${requestId}.${singleId}`;
  const signature = crypto.createHmac("sha256", boostCheckoutSigningSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function parseBoostCheckoutReference(reference: string) {
  const [requestIdRaw, singleIdRaw, signature] = String(reference || "").split(".");
  const requestId = Number(requestIdRaw);
  const singleId = Number(singleIdRaw);
  if (!Number.isInteger(requestId) || requestId <= 0 || !Number.isInteger(singleId) || singleId <= 0 || !signature) return null;
  const payload = `${requestId}.${singleId}`;
  const expected = crypto.createHmac("sha256", boostCheckoutSigningSecret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return { requestId, singleId };
}

function hasActiveBoostConsent(membership: any) {
  return Boolean(
    membership
    && membership.status === "active"
    && membership.consentVersion === BOOST_CONSENT_VERSION
    && membership.algorithmicDisclosureAccepted
    && membership.anonymousProfileAccepted
    && membership.termsAccepted,
  );
}

function getBoostProfileReadiness(single: any) {
  const missingFields = getMissingProfileFields(single);
  const scientificQuestionnaireComplete = Boolean(single.questionnaireCompletedAt);
  const photoStored = Boolean(single.photoUrl);
  return {
    profileComplete: missingFields.length === 0,
    scientificQuestionnaireComplete,
    photoStored,
    ready: missingFields.length === 0 && scientificQuestionnaireComplete && photoStored,
    missingFieldsCount: missingFields.length,
  };
}

function parseAnswersJson(raw: unknown) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function selectOnDemandBoostCandidates(input: {
  single: any;
  candidateProfiles: any[];
  memberships: any[];
  answersBySingle: Map<number, any[]>;
  existingCandidateIds?: Set<number>;
  unavailableCandidateIds?: Set<number>;
  now?: number;
  limit?: number;
}) {
  const now = input.now ?? Date.now();
  const existingCandidateIds = input.existingCandidateIds ?? new Set<number>();
  const unavailableCandidateIds = input.unavailableCandidateIds ?? new Set<number>();
  const membershipBySingle = new Map<number, any>(input.memberships.map((membership: any) => [membership.singleId, membership]));
  const answersA = input.answersBySingle.get(input.single.id) ?? [];

  return input.candidateProfiles
    .flatMap((candidate: any) => {
      if (!candidate || candidate.id === input.single.id || existingCandidateIds.has(candidate.id) || unavailableCandidateIds.has(candidate.id)) return [];
      const membership = membershipBySingle.get(candidate.id);
      const recentActivityAt = Number(membership?.lastActiveAt || membership?.consentedAt || 0);
      if (
        !candidate.isPaid
        || !candidate.isActive
        || !candidate.consentMatchmaking
        || !getBoostProfileReadiness(candidate).ready
        || !hasActiveBoostConsent(membership)
        || recentActivityAt < now - 90 * DAY_MS
        || !passesHardFilters(input.single, candidate).pass
        || !passesHardFilters(candidate, input.single).pass
      ) return [];

      const breakdown = computeFullScore(
        input.single,
        candidate,
        answersA,
        input.answersBySingle.get(candidate.id) ?? [],
      );
      if (breakdown.total < MIN_BOOST_SCORE) return [];
      return [{ candidate, score: breakdown.total, breakdown }];
    })
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, input.limit ?? MAX_BOOST_OPTIONS);
}

async function ensureBoostCandidatesForSingle(db: any, single: any, now = Date.now()) {
  const [membershipRows, memberMatches, requests] = await Promise.all([
    db.select().from(matchBoostMemberships).where(eq(matchBoostMemberships.singleId, single.id)).limit(1),
    db.select().from(matches).where(or(eq(matches.singleAId, single.id), eq(matches.singleBId, single.id))),
    db.select().from(matchBoostRequests).where(eq(matchBoostRequests.singleId, single.id)).orderBy(desc(matchBoostRequests.requestedAt)).limit(10),
  ]);
  const membership = membershipRows[0];
  if (!hasActiveBoostConsent(membership) || !getBoostProfileReadiness(single).ready) return 0;
  if (!single.isPaid || !single.isActive || !single.consentMatchmaking) return 0;
  if (memberMatches.some((match: any) => !match.returnedToPoolAt && ["proposed", "matched"].includes(match.status))) return 0;
  if (requests.some((request: any) =>
    OPEN_BOOST_STATUSES.includes(request.status)
    || (request.status !== "refunded" && request.status !== "cancelled" && request.status !== "awaiting_payment" && Number(request.requestedAt || 0) > now - 30 * DAY_MS)
  )) return 0;

  await db.update(matchBoostMemberships).set({ lastActiveAt: now, updatedAt: now })
    .where(eq(matchBoostMemberships.singleId, single.id));

  const memberships = await db.select().from(matchBoostMemberships).where(eq(matchBoostMemberships.status, "active"));
  const candidateIds = memberships
    .filter((candidateMembership: any) => candidateMembership.singleId !== single.id && hasActiveBoostConsent(candidateMembership))
    .map((candidateMembership: any) => candidateMembership.singleId);
  if (candidateIds.length === 0) return 0;

  const [candidateProfiles, activeMatches, answerRows] = await Promise.all([
    db.select().from(singles).where(and(
      inArray(singles.id, candidateIds),
      eq(singles.isActive, true),
      eq(singles.isPaid, true),
      eq(singles.consentMatchmaking, true),
    )),
    db.select({ singleAId: matches.singleAId, singleBId: matches.singleBId }).from(matches).where(and(
      isNull(matches.returnedToPoolAt),
      inArray(matches.status, ["proposed", "matched"]),
      or(inArray(matches.singleAId, candidateIds), inArray(matches.singleBId, candidateIds)),
    )),
    db.select().from(matchmakingAnswers).where(inArray(matchmakingAnswers.singleId, [single.id, ...candidateIds])),
  ]);

  const unavailableCandidateIds = new Set<number>();
  for (const activeMatch of activeMatches as any[]) {
    if (candidateIds.includes(activeMatch.singleAId)) unavailableCandidateIds.add(activeMatch.singleAId);
    if (candidateIds.includes(activeMatch.singleBId)) unavailableCandidateIds.add(activeMatch.singleBId);
  }
  const existingCandidateIds = new Set<number>(memberMatches.map((match: any) =>
    match.singleAId === single.id ? match.singleBId : match.singleAId,
  ));
  const answersBySingle = new Map<number, any[]>((answerRows as any[]).map((row: any) => [row.singleId, parseAnswersJson(row.answersJson)]));
  const ranked = selectOnDemandBoostCandidates({
    single,
    candidateProfiles,
    memberships,
    answersBySingle,
    existingCandidateIds,
    unavailableCandidateIds,
    now,
  });

  let created = 0;
  for (const option of ranked) {
    const candidate = option.candidate;
    const existing = await db.select({ id: matches.id }).from(matches).where(or(
      and(eq(matches.singleAId, single.id), eq(matches.singleBId, candidate.id)),
      and(eq(matches.singleAId, candidate.id), eq(matches.singleBId, single.id)),
    )).limit(1);
    if (existing[0]) continue;
    const [insertResult] = await db.insert(matches).values({
      singleId: single.id,
      matchedSingleId: candidate.id,
      singleAId: single.id,
      singleBId: candidate.id,
      score: option.score,
      scoreBreakdown: JSON.stringify({ ...option.breakdown, algorithm: "v8.0", source: "boost_on_demand" }),
      notes: `${BOOST_CANDIDATE_NOTE_MARKER} נוצרה כאפשרות אנונימית לפי דרישה; לא נשלחה הודעה ולא בוצע חיוב`,
      proposedAt: now,
      status: "pending",
      updatedAt: now,
    } as any);
    const insertedId = Number((insertResult as any)?.insertId || 0);
    const duplicateRows = await db.select({ id: matches.id }).from(matches).where(or(
      and(eq(matches.singleAId, single.id), eq(matches.singleBId, candidate.id)),
      and(eq(matches.singleAId, candidate.id), eq(matches.singleBId, single.id)),
    )).orderBy(matches.id);
    if (insertedId && duplicateRows[0]?.id !== insertedId) {
      await db.delete(matches).where(and(eq(matches.id, insertedId), eq(matches.status, "pending")));
      continue;
    }
    created++;
  }
  return created;
}

const EDUCATION_LABELS: Record<string, string> = {
  high_school: "תיכון",
  vocational: "הכשרה מקצועית",
  technician: "הנדסאי/ת",
  student: "סטודנט/ית",
  bachelor: "תואר ראשון",
  master: "תואר שני",
  phd: "דוקטורט",
  other: "השכלה אחרת",
};
const MARITAL_LABELS: Record<string, string> = { single: "רווק/ה", divorced: "גרוש/ה", widowed: "אלמן/ה" };
const RELIGIOSITY_LABELS: Record<string, string> = { secular: "חילוני/ת", traditional: "מסורתי/ת", religious: "דתי/ת", orthodox: "חרדי/ת", datlash: "דתל״ש/ית" };
const SMOKING_LABELS: Record<string, string> = { no: "לא מעשן/ת", occasionally: "מעשן/ת מדי פעם", yes: "מעשן/ת" };
const WANTS_KIDS_LABELS: Record<string, string> = { yes: "רוצה ילדים", no: "לא רוצה ילדים נוספים", open: "פתוח/ה בנושא ילדים" };

function broadRegion(city: string | null | undefined) {
  const value = String(city || "").trim();
  const north = ["חיפה", "קריית", "קרית", "עכו", "נהריה", "כרמיאל", "טבריה", "צפת", "עפולה", "יקנעם", "זכרון יעקב"];
  const sharon = ["נתניה", "כפר סבא", "רעננה", "הוד השרון", "הרצליה", "רמת השרון", "חדרה", "פרדס חנה"];
  const jerusalem = ["ירושלים", "מבשרת", "מעלה אדומים", "בית שמש", "מודיעין"];
  const south = ["באר שבע", "אשדוד", "אשקלון", "נתיבות", "שדרות", "אילת", "דימונה", "ערד"];
  if (north.some(item => value.includes(item))) return "צפון וחיפה";
  if (sharon.some(item => value.includes(item))) return "השרון";
  if (jerusalem.some(item => value.includes(item))) return "ירושלים והסביבה";
  if (south.some(item => value.includes(item))) return "דרום";
  return "מרכז והשפלה";
}

function occupationCategory(occupation: string | null | undefined) {
  const value = String(occupation || "").toLowerCase();
  if (/הייטק|תוכנ|מהנדס|data|product|סייבר|מפתח/.test(value)) return "טכנולוגיה והנדסה";
  if (/רופא|אחות|טיפול|פסיכ|עובד.*סוציא|בריאות|תרפ/.test(value)) return "טיפול ובריאות";
  if (/מורה|חינוך|מרצה|גננ|הוראה|אקדמ/.test(value)) return "חינוך ואקדמיה";
  if (/מנהל|ניהול|משאבי אנוש|שיווק|מכירות|עסק/.test(value)) return "ניהול ועסקים";
  if (/עורך דין|משפט|רו״ח|רואה חשבון|פיננס|כלכל/.test(value)) return "מקצועות חופשיים ופיננסים";
  if (/מעצב|אמנ|מוזיק|צילום|כתיב|יציר/.test(value)) return "יצירה ותקשורת";
  return "תחום מקצועי אחר";
}

function parseScoreBreakdown(raw: unknown): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => Number.isFinite(Number(value)))
      .map(([key, value]) => [key, Number(value)]));
  } catch {
    return {};
  }
}

export function buildAnonymousBoostCard(candidate: any, match: any) {
  const scores = parseScoreBreakdown(match?.scoreBreakdown);
  const dimensions: Array<[string, string]> = [
    ["questionnaire", "התאמה חזקה בשאלון המדעי"],
    ["general", "התאמה טובה בדפוסי זוגיות"],
    ["dna", "חיבור משלים בסגנון הזוגי"],
    ["lifeStage", "שלב חיים דומה"],
    ["age", "התאמה הדדית בטווחי הגיל"],
    ["religiosity", "זיקה דתית ואורח חיים תואמים"],
    ["kids", "כיוון דומה בנושא משפחה וילדים"],
    ["city", "התאמה בהעדפות המרחק"],
    ["practicality", "התאמה טובה בתנאים המעשיים"],
    ["education", "רקע לימודי תואם"],
  ];
  const reasons = dimensions
    .filter(([key]) => Number(scores[key] || 0) >= 70)
    .sort(([a], [b]) => Number(scores[b] || 0) - Number(scores[a] || 0))
    .map(([, label]) => label)
    .slice(0, 4);
  const fallbackReasons = [
    "עברתם את כל תנאי הסף ההדדיים",
    "שניכם משתתפים באופן פעיל במסלול Boost",
    "הפרופילים והשאלונים שלכם מלאים",
  ];
  for (const reason of fallbackReasons) {
    if (reasons.length >= 3) break;
    reasons.push(reason);
  }
  const considerations = dimensions
    .filter(([key]) => scores[key] > 0 && scores[key] < 60)
    .sort(([a], [b]) => Number(scores[a] || 0) - Number(scores[b] || 0))
    .map(([, label]) => label.replace("התאמה חזקה", "פער מסוים").replace("התאמה טובה", "פער מסוים").replace("תואמים", "דורשים פתיחות"))
    .slice(0, 2);

  return {
    age: candidate.age,
    region: broadRegion(candidate.city),
    occupation: occupationCategory(candidate.occupation),
    education: EDUCATION_LABELS[candidate.education] || "לא צוין",
    height: candidate.height || null,
    maritalStatus: MARITAL_LABELS[candidate.maritalStatus] || "לא צוין",
    hasKids: candidate.hasKids ? "יש ילדים" : "ללא ילדים",
    smoking: SMOKING_LABELS[candidate.smokingStatus] || "לא צוין",
    religiosity: RELIGIOSITY_LABELS[candidate.religiosity] || "לא צוין",
    relationshipIntent: WANTS_KIDS_LABELS[candidate.wantsKids] || "מחפש/ת קשר רציני",
    score: Math.round(Number(match?.score || 0)),
    reasons,
    considerations,
    disclosure: "הצעת Boost אלגוריתמית, לא נבדקה ידנית על ידי הילית",
  };
}

export async function syncBoostRequestAfterMatchDecision(
  db: any,
  input: { matchId: number; decision: "approved" | "rejected"; reason?: string; now?: number },
) {
  const now = input.now ?? Date.now();
  const statusFilter = input.decision === "rejected"
    ? inArray(matchBoostRequests.status, ["paid", "queued", "reviewing", "approved"] as const)
    : inArray(matchBoostRequests.status, REVIEWABLE_BOOST_STATUSES);
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
      statusFilter,
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
  membership?: any | null;
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
    OPEN_BOOST_STATUSES.includes(request.status)
    && !(request.status === "awaiting_payment" && Number(request.expiresAt || 0) > 0 && Number(request.expiresAt) <= now),
  );
  const recentRequest = (input.boostRequests || []).find(request =>
    request.status !== "refunded"
    && request.status !== "cancelled"
    && request.status !== "awaiting_payment"
    && Number(request.requestedAt || 0) > now - 30 * DAY_MS,
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
  if (!hasActiveBoostConsent(input.membership)) blockers.push("יש להצטרף למסלול Boost ולאשר את תנאי השירות");
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
    candidates,
    topCandidate: candidates[0] || null,
    topScore: candidates[0] ? Math.round(Number(candidates[0].score || 0)) : null,
    plusActive,
    plusBenefitAvailable: plusActive && !plusBenefitUsed,
    plusBenefitUsed,
    openRequest: openRequest || null,
  };
}

function hasReusablePaidBoostCredit(request: any) {
  return request?.source === "paid"
    && request?.status === "refunded"
    && String(request?.decisionReason || "").startsWith("boost_credit_available");
}

async function loadBoostContext(db: any, single: any) {
  const [rawMemberMatches, plusRows, requests, membershipRows] = await Promise.all([
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
    db.select().from(matchBoostMemberships).where(eq(matchBoostMemberships.singleId, single.id)).limit(1),
  ]);
  const candidateIds = Array.from(new Set(rawMemberMatches
    .filter((match: any) => match.status === "pending" && !match.returnedToPoolAt)
    .map((match: any) => match.singleAId === single.id ? match.singleBId : match.singleAId)
    .filter(Boolean))) as number[];
  const [candidateProfiles, candidateActiveMatches, candidateMemberships] = candidateIds.length > 0 ? await Promise.all([
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
    db.select().from(matchBoostMemberships).where(inArray(matchBoostMemberships.singleId, candidateIds)),
  ]) : [[], [], []];
  const candidateProfileMap = new Map<number, any>(candidateProfiles.map((profile: any) => [profile.id, profile]));
  const candidateMembershipMap = new Map<number, any>((candidateMemberships as any[]).map((membership: any) => [membership.singleId, membership]));
  const unavailableCandidateIds = new Set<number>();
  for (const activeMatch of candidateActiveMatches as any[]) {
    if (candidateIds.includes(activeMatch.singleAId)) unavailableCandidateIds.add(activeMatch.singleAId);
    if (candidateIds.includes(activeMatch.singleBId)) unavailableCandidateIds.add(activeMatch.singleBId);
  }
  const memberMatches = rawMemberMatches.map((match: any) => {
    const candidateId = match.singleAId === single.id ? match.singleBId : match.singleAId;
    const profile = candidateProfileMap.get(candidateId);
    const candidateMembership = candidateMembershipMap.get(candidateId);
    const recentActivityAt = Number(candidateMembership?.lastActiveAt || candidateMembership?.consentedAt || 0);
    const hardFilterResult = profile ? passesHardFilters(single, profile) : { pass: false };
    const reverseHardFilterResult = profile ? passesHardFilters(profile, single) : { pass: false };
    const candidateEligible = Boolean(
      profile
      && profile.isPaid
      && profile.isActive
      && profile.consentMatchmaking
      && getMissingProfileFields(profile).length === 0
      && Boolean(profile.questionnaireCompletedAt)
      && Boolean(profile.photoUrl)
      && !unavailableCandidateIds.has(candidateId)
      && hasActiveBoostConsent(candidateMembership)
      && recentActivityAt >= Date.now() - 90 * DAY_MS
      && hardFilterResult.pass
      && reverseHardFilterResult.pass,
    );
    return { ...match, candidateEligible, candidateProfile: profile || null };
  });
  return {
    memberMatches,
    plusMember: plusRows[0] || null,
    membership: membershipRows[0] || null,
    requests,
  };
}

export async function preparePaidBoostCheckout(input: {
  email: string;
  token: string;
  termsAccepted: true;
  matchId?: number;
}) {
  const { db, single } = await getVerifiedSingle(input.email, input.token);
  const context = await loadBoostContext(db, single);
  const eligibility = evaluateBoostEligibility({ single, ...context });
  const selectedCandidate = input.matchId
    ? eligibility.candidates.find((candidate: any) => candidate.id === input.matchId)
    : eligibility.topCandidate;
  if (!eligibility.eligible || !selectedCandidate) {
    throw new TRPCError({ code: "BAD_REQUEST", message: eligibility.blockers[0] || "הבוסט אינו זמין כרגע" });
  }

  const now = Date.now();
  const idempotencyKey = `paid-checkout:${single.id}:${crypto.randomUUID()}`;
  const requestId = await db.transaction(async (tx: any) => {
    const [insertResult] = await tx.insert(matchBoostRequests).values({
      singleId: single.id,
      matchId: selectedCandidate.id,
      source: "paid",
      status: "awaiting_payment",
      amountAgorot: BOOST_PRICE_AGOROT,
      idempotencyKey,
      requestedAt: now,
      expiresAt: now + 30 * 60 * 1000,
      decisionReason: `checkout_terms:${BOOST_CONSENT_VERSION}`,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(matchBoostConsentEvents).values({
      singleId: single.id,
      eventType: "consent_updated",
      consentVersion: BOOST_CONSENT_VERSION,
      algorithmicDisclosureAccepted: true,
      anonymousProfileAccepted: true,
      termsAccepted: true,
      source: "paid_boost_checkout",
      createdAt: now,
    });
    await tx.update(matchBoostMemberships).set({ lastActiveAt: now, updatedAt: now })
      .where(eq(matchBoostMemberships.singleId, single.id));
    return Number((insertResult as any).insertId || 0);
  });
  if (!requestId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "לא ניתן היה לפתוח בקשת Boost" });
  return {
    requestId,
    checkoutReference: createBoostCheckoutReference(requestId, single.id),
    singleId: single.id,
    fullName: `${single.firstName || ""} ${single.lastName || ""}`.trim(),
    email: String(single.email || input.email).trim().toLowerCase(),
    phone: String(single.phone || "").trim(),
  };
}

export async function cancelPaidBoostCheckout(requestId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(matchBoostRequests).set({
    status: "cancelled",
    decisionReason: `checkout_cancelled:${reason}`.slice(0, 1000),
    updatedAt: Date.now(),
  }).where(and(eq(matchBoostRequests.id, requestId), eq(matchBoostRequests.status, "awaiting_payment")));
}

export async function fulfillPaidBoostPayment(input: {
  email: string;
  transactionId: string;
  amountAgorot: number;
  checkoutReference?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (![BOOST_PRICE_AGOROT, LEGACY_BOOST_PRICE_AGOROT].some(amount => Math.abs(input.amountAgorot - amount) <= 1)) {
    throw new Error(`Unexpected Boost payment amount: ${input.amountAgorot}`);
  }
  const normalizedEmail = input.email.trim().toLowerCase();
  const [single] = await db.select().from(singles).where(eq(singles.email, normalizedEmail)).limit(1);
  if (!single) throw new Error(`Boost payment received for unknown member: ${normalizedEmail}`);

  const [existingByTransaction] = input.transactionId
    ? await db.select().from(matchBoostRequests)
        .where(eq(matchBoostRequests.providerTransactionId, input.transactionId)).limit(1)
    : [];
  let request = existingByTransaction;
  if (!request && input.checkoutReference) {
    const bound = parseBoostCheckoutReference(input.checkoutReference);
    if (!bound || bound.singleId !== single.id) throw new Error("Invalid Boost checkout reference");
    [request] = await db.select().from(matchBoostRequests).where(and(
      eq(matchBoostRequests.id, bound.requestId),
      eq(matchBoostRequests.singleId, single.id),
      eq(matchBoostRequests.source, "paid"),
      eq(matchBoostRequests.status, "awaiting_payment"),
    )).limit(1);
    if (!request) throw new Error("Bound Boost checkout is not awaiting payment");
  }
  if (!request && !input.checkoutReference) {
    [request] = await db.select().from(matchBoostRequests).where(and(
      eq(matchBoostRequests.singleId, single.id),
      eq(matchBoostRequests.source, "paid"),
      eq(matchBoostRequests.status, "awaiting_payment"),
    )).orderBy(desc(matchBoostRequests.requestedAt)).limit(1);
  }
  if (!request) throw new Error(`No pending Boost checkout found for ${normalizedEmail}`);
  if (request.status === "approved" && request.fulfilledAt) {
    return { success: true, delivered: true, creditAvailable: false, requestId: request.id };
  }
  if (hasReusablePaidBoostCredit(request)) {
    return { success: true, delivered: false, creditAvailable: true, requestId: request.id };
  }

  const now = Date.now();
  if (request.status === "awaiting_payment") {
    await db.update(matchBoostRequests).set({
      status: "paid",
      amountAgorot: input.amountAgorot || BOOST_PRICE_AGOROT,
      providerTransactionId: input.transactionId || request.providerTransactionId,
      paidAt: now,
      decisionReason: "grow_payment_confirmed_pending_final_eligibility",
      updatedAt: now,
    }).where(and(eq(matchBoostRequests.id, request.id), eq(matchBoostRequests.status, "awaiting_payment")));
  }

  try {
    const result = await dispatchAlgorithmicBoostProposal(db, request.id);
    return { ...result, delivered: true, creditAvailable: false };
  } catch (error: any) {
    const [current] = await db.select().from(matchBoostRequests).where(eq(matchBoostRequests.id, request.id)).limit(1);
    if (current?.status === "approved" && current.fulfilledAt) {
      return { success: true, delivered: true, creditAvailable: false, requestId: request.id };
    }
    await db.update(matchBoostRequests).set({
      status: "refunded",
      decisionReason: `boost_credit_available:${String(error?.message || "candidate_unavailable").slice(0, 700)}`,
      expiresAt: null,
      updatedAt: Date.now(),
    }).where(eq(matchBoostRequests.id, request.id));
    return { success: true, delivered: false, creditAvailable: true, requestId: request.id };
  }
}

async function dispatchAlgorithmicBoostProposal(db: any, requestId: number) {
  const [request] = await db.select().from(matchBoostRequests).where(eq(matchBoostRequests.id, requestId)).limit(1);
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "בקשת הבוסט לא נמצאה" });
  if (request.status === "approved" && request.fulfilledAt) {
    return { success: true, requestId, matchId: request.matchId, status: "approved" as const, alreadySent: true };
  }
  if (!["paid", "queued"].includes(request.status)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "בקשת הבוסט אינה מוכנה לשליחה" });
  }

  const [match] = await db.select().from(matches).where(eq(matches.id, request.matchId)).limit(1);
  if (!match || match.status !== "pending" || match.returnedToPoolAt) {
    throw new TRPCError({ code: "CONFLICT", message: "ההתאמה אינה זמינה עוד. לא תישלח הצעה." });
  }
  const [singleA, singleB, memberships] = await Promise.all([
    db.select().from(singles).where(eq(singles.id, match.singleAId)).limit(1),
    db.select().from(singles).where(eq(singles.id, match.singleBId)).limit(1),
    db.select().from(matchBoostMemberships).where(inArray(matchBoostMemberships.singleId, [match.singleAId, match.singleBId])),
  ]);
  const partyA = singleA[0];
  const partyB = singleB[0];
  if (!partyA || !partyB) throw new TRPCError({ code: "NOT_FOUND", message: "אחד הפרופילים אינו זמין" });
  const senderIsA = request.singleId === match.singleAId;
  if (!senderIsA && request.singleId !== match.singleBId) {
    throw new TRPCError({ code: "CONFLICT", message: "לא ניתן לזהות את שולח ה־Boost" });
  }
  const membershipBySingle = new Map<number, any>((memberships as any[]).map((row: any) => [row.singleId, row]));
  const bothConsented = [partyA, partyB].every((party: any) => {
    const membership = membershipBySingle.get(party.id);
    const recentActivityAt = Number(membership?.lastActiveAt || membership?.consentedAt || 0);
    return party.isPaid
      && party.isActive
      && party.consentMatchmaking
      && getMissingProfileFields(party).length === 0
      && hasActiveBoostConsent(membership)
      && recentActivityAt >= Date.now() - 90 * DAY_MS;
  });
  if (!bothConsented || !passesHardFilters(partyA, partyB).pass || !passesHardFilters(partyB, partyA).pass) {
    throw new TRPCError({ code: "CONFLICT", message: "אחד הצדדים אינו עומד עוד בתנאי מסלול Boost. לא תישלח הצעה." });
  }

  const now = Date.now();
  const tokenA = crypto.randomBytes(24).toString("hex");
  const tokenB = crypto.randomBytes(24).toString("hex");
  const expiresAt = now + 48 * 60 * 60 * 1000;
  const proposalClaimed = await db.transaction(async (tx: any) => {
    const updateResult = await tx.update(matches).set({
      status: "proposed",
      approvalTokenA: tokenA,
      approvalTokenB: tokenB,
      approvedByA: senderIsA ? true : Boolean(match.approvedByA),
      approvedByB: senderIsA ? Boolean(match.approvedByB) : true,
      tokenAUsedAt: senderIsA ? now : match.tokenAUsedAt,
      tokenBUsedAt: senderIsA ? match.tokenBUsedAt : now,
      approvalExpiresAt: expiresAt,
      proposedAt: now,
      ownerApprovedAt: null,
      autoExplanation: "[BOOST] הצעת Boost אלגוריתמית שלא נבדקה ידנית על ידי הילית",
      notes: "[BOOST_SENT] נשלחה כהצעת Boost אלגוריתמית לאחר חיוב או מימוש קרדיט",
      updatedAt: now,
    }).where(and(eq(matches.id, match.id), eq(matches.status, "pending"), isNull(matches.returnedToPoolAt)));
    const affectedRows = Number((Array.isArray(updateResult) ? updateResult[0] : updateResult)?.affectedRows || 0);
    if (affectedRows < 1) return false;
    await tx.update(matchBoostRequests).set({
      status: "reviewing",
      reviewStartedAt: now,
      decisionReason: "algorithmic_boost_dispatching",
      updatedAt: now,
    }).where(eq(matchBoostRequests.id, request.id));
    await tx.update(crmTeamTasks).set({ status: "cancelled", completedAt: now, updatedAt: now })
      .where(and(eq(crmTeamTasks.matchId, match.id), eq(crmTeamTasks.taskType, "match_review"), inArray(crmTeamTasks.status, ["todo", "in_progress"])));
    return true;
  });
  if (!proposalClaimed) throw new TRPCError({ code: "CONFLICT", message: "ההתאמה כבר נשלחה או אינה זמינה עוד" });

  const score = Math.round(Number(match.score || 0));
  const cardA = buildAnonymousBoostCard(partyA, match);
  const cardB = buildAnonymousBoostCard(partyB, match);
  const reasonText = (card: ReturnType<typeof buildAnonymousBoostCard>) => [
    ...card.reasons,
    ...(card.considerations.length ? [`כדאי לקחת בחשבון: ${card.considerations.join("; ")}`] : []),
  ].join(". ");
  const baseUrl = "https://hilitcaspi.com";
  const emailA = buildMatchProposalEmail({
    firstName: partyA.firstName,
    recipientGender: partyA.gender ?? undefined,
    matchFirstName: "התאמה אנונימית",
    matchAge: cardB.age,
    matchCity: cardB.region,
    matchOccupation: cardB.occupation,
    matchEducation: cardB.education,
    matchHasKids: partyB.hasKids,
    matchNumKids: partyB.numKids,
    matchWantsKids: partyB.wantsKids,
    matchReligiosity: partyB.religiosity,
    compatibilityScore: score,
    hilitsNote: reasonText(cardB),
    yesUrl: `${baseUrl}/match/respond?token=${tokenA}&response=yes`,
    noUrl: `${baseUrl}/match/respond?token=${tokenA}&response=no`,
    recipientEmail: partyA.email,
    singleId: partyA.id,
    trackingPixelUrl: `${baseUrl}/api/match-open?token=${tokenA}&side=a`,
    proposalSource: "boost",
    boostRole: senderIsA ? "sender" : "recipient",
  });
  const emailB = buildMatchProposalEmail({
    firstName: partyB.firstName,
    recipientGender: partyB.gender ?? undefined,
    matchFirstName: "התאמה אנונימית",
    matchAge: cardA.age,
    matchCity: cardA.region,
    matchOccupation: cardA.occupation,
    matchEducation: cardA.education,
    matchHasKids: partyA.hasKids,
    matchNumKids: partyA.numKids,
    matchWantsKids: partyA.wantsKids,
    matchReligiosity: partyA.religiosity,
    compatibilityScore: score,
    hilitsNote: reasonText(cardA),
    yesUrl: `${baseUrl}/match/respond?token=${tokenB}&response=yes`,
    noUrl: `${baseUrl}/match/respond?token=${tokenB}&response=no`,
    recipientEmail: partyB.email,
    singleId: partyB.id,
    trackingPixelUrl: `${baseUrl}/api/match-open?token=${tokenB}&side=b`,
    proposalSource: "boost",
    boostRole: senderIsA ? "recipient" : "sender",
  });
  const [emailAResult, emailBResult] = await Promise.all([
    sendEmail({ to: { email: partyA.email, name: partyA.firstName }, subject: emailA.subject, htmlContent: emailA.htmlBody }),
    sendEmail({ to: { email: partyB.email, name: partyB.firstName }, subject: emailB.subject, htmlContent: emailB.htmlBody }),
  ]);
  const whatsAppResult = await sendInitialMatchWhatsAppsOnce(db, {
    matchId: match.id,
    score,
    proposalSource: "boost",
    boostSenderSide: senderIsA ? "A" : "B",
    recipientA: { phone: partyA.phone, firstName: partyA.firstName, matchFirstName: "התאמה אנונימית" },
    recipientB: { phone: partyB.phone, firstName: partyB.firstName, matchFirstName: "התאמה אנונימית" },
  });
  const recipientDeliverySucceeded = senderIsA
    ? Boolean(emailBResult.success || whatsAppResult.sentB)
    : Boolean(emailAResult.success || whatsAppResult.sentA);
  if (!recipientDeliverySucceeded) {
    await db.transaction(async (tx: any) => {
      await tx.update(matches).set({
        status: "pending",
        approvalTokenA: null,
        approvalTokenB: null,
        approvedByA: false,
        approvedByB: false,
        tokenAUsedAt: null,
        tokenBUsedAt: null,
        approvalExpiresAt: null,
        proposedAt: null,
        autoExplanation: null,
        notes: `${BOOST_CANDIDATE_NOTE_MARKER} הוחזר לאחר כשל מסירה טכני לפני מימוש Boost`,
        waSentAt: null,
        updatedAt: Date.now(),
      }).where(and(eq(matches.id, match.id), eq(matches.status, "proposed")));
    });
    throw new Error("boost_recipient_delivery_failed");
  }
  await db.update(matchBoostRequests).set({
    status: "approved",
    decidedAt: now,
    fulfilledAt: now,
    decisionReason: "algorithmic_boost_auto_dispatch",
    updatedAt: Date.now(),
  }).where(and(eq(matchBoostRequests.id, request.id), eq(matchBoostRequests.status, "reviewing")));
  return { success: true, requestId, matchId: match.id, status: "approved" as const, alreadySent: false };
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

  inviteMember: teamProcedure
    .input(z.object({ email: z.string().email(), pilotCohort: z.string().min(2).max(100).default("pilot_2026_09") }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [single] = await db.select().from(singles)
        .where(eq(singles.email, input.email.trim().toLowerCase())).limit(1);
      if (!single) throw new TRPCError({ code: "NOT_FOUND", message: "לא נמצא חבר מאגר עם המייל הזה" });
      if (!single.isPaid || !single.isActive || !single.consentMatchmaking) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "אפשר להזמין רק חבר מאגר פעיל ומשלם" });
      }
      const [existing] = await db.select().from(matchBoostMemberships)
        .where(eq(matchBoostMemberships.singleId, single.id)).limit(1);
      if (hasActiveBoostConsent(existing)) {
        await db.update(matchBoostPilotInterests).set({ status: "joined", matchedSingleId: single.id, updatedAt: Date.now() })
          .where(eq(matchBoostPilotInterests.email, input.email.trim().toLowerCase()));
        return { success: true, status: "active" as const, alreadyActive: true, singleId: single.id };
      }

      const now = Date.now();
      await db.transaction(async (tx: any) => {
        await tx.insert(matchBoostMemberships).values({
          singleId: single.id,
          status: "invited",
          algorithmicDisclosureAccepted: false,
          anonymousProfileAccepted: false,
          termsAccepted: false,
          invitedAt: now,
          source: "crm_manual",
          pilotCohort: input.pilotCohort,
          createdAt: now,
          updatedAt: now,
        }).onDuplicateKeyUpdate({ set: {
          status: "invited",
          algorithmicDisclosureAccepted: false,
          anonymousProfileAccepted: false,
          termsAccepted: false,
          invitedAt: now,
          source: "crm_manual",
          pilotCohort: input.pilotCohort,
          updatedAt: now,
        } });
        await tx.insert(matchBoostConsentEvents).values({
          singleId: single.id,
          eventType: "invited",
          algorithmicDisclosureAccepted: false,
          anonymousProfileAccepted: false,
          termsAccepted: false,
          source: "crm_manual",
          createdAt: now,
        });
        await tx.update(matchBoostPilotInterests).set({ status: "invited", matchedSingleId: single.id, updatedAt: now })
          .where(eq(matchBoostPilotInterests.email, input.email.trim().toLowerCase()));
      });
      return {
        success: true,
        status: "invited" as const,
        alreadyActive: false,
        singleId: single.id,
        memberName: `${single.firstName} ${single.lastName || ""}`.trim(),
      };
    }),

  getMyStatus: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16) }))
    .query(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const context = await loadBoostContext(db, single);
      const eligibility = evaluateBoostEligibility({ single, ...context });
      const profileReadiness = getBoostProfileReadiness(single);
      const latestRequest = context.requests[0] || null;
      const latestRequestMatch = latestRequest
        ? context.memberMatches.find((match: any) => match.id === latestRequest.matchId)
        : null;
      const awaitingRecipientResponse = Boolean(
        latestRequest?.status === "approved"
        && latestRequestMatch?.status === "proposed"
        && !latestRequestMatch?.returnedToPoolAt
        && Boolean(latestRequestMatch?.approvedByA) !== Boolean(latestRequestMatch?.approvedByB),
      );
      return {
        eligible: eligibility.eligible,
        blockers: eligibility.blockers,
        candidateCount: eligibility.candidateCount,
        topScore: eligibility.topScore,
        plusActive: eligibility.plusActive,
        plusBenefitAvailable: eligibility.plusBenefitAvailable,
        plusBenefitUsed: eligibility.plusBenefitUsed,
        anonymousCard: eligibility.topCandidate?.candidateProfile
          ? buildAnonymousBoostCard(eligibility.topCandidate.candidateProfile, eligibility.topCandidate)
          : null,
        options: eligibility.candidates.slice(0, MAX_BOOST_OPTIONS).flatMap((candidate: any) => candidate.candidateProfile ? [{
          matchId: candidate.id,
          card: buildAnonymousBoostCard(candidate.candidateProfile, candidate),
        }] : []),
        consentVersion: BOOST_CONSENT_VERSION,
        membership: context.membership ? {
          status: context.membership.status,
          active: hasActiveBoostConsent(context.membership),
          consentVersion: context.membership.consentVersion,
          consentedAt: context.membership.consentedAt,
          optedOutAt: context.membership.optedOutAt,
        } : null,
        openRequest: eligibility.openRequest ? {
          id: eligibility.openRequest.id,
          status: eligibility.openRequest.status,
          source: eligibility.openRequest.source,
          requestedAt: eligibility.openRequest.requestedAt,
        } : null,
        latestRequest: latestRequest ? {
          id: latestRequest.id,
          status: latestRequest.status,
          source: latestRequest.source,
          requestedAt: latestRequest.requestedAt,
          fulfilledAt: latestRequest.fulfilledAt,
        } : null,
        awaitingRecipientResponse,
        creditAvailable: context.requests.some(hasReusablePaidBoostCredit),
        priceAgorot: BOOST_PRICE_AGOROT,
        paymentConfigured: true,
        profileReady: profileReadiness.ready,
        missingProfileFieldsCount: profileReadiness.missingFieldsCount,
      };
    }),

  refreshOptions: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16) }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const created = await ensureBoostCandidatesForSingle(db, single);
      const context = await loadBoostContext(db, single);
      const eligibility = evaluateBoostEligibility({ single, ...context });
      return {
        created,
        candidateCount: eligibility.candidateCount,
        available: eligibility.candidateCount > 0,
      };
    }),

  joinPool: publicProcedure
    .input(z.object({
      email: z.string().email(),
      token: z.string().min(16),
      algorithmicDisclosureAccepted: z.literal(true),
      anonymousProfileAccepted: z.literal(true),
      termsAccepted: z.literal(true),
    }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const [existingMembership] = await db.select().from(matchBoostMemberships)
        .where(eq(matchBoostMemberships.singleId, single.id)).limit(1);
      if (hasActiveBoostConsent(existingMembership)) {
        return { success: true, status: "active" as const, consentedAt: existingMembership.consentedAt };
      }
      if (!single.isPaid || !single.isActive || !single.consentMatchmaking) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ההצטרפות פתוחה לחברי מאגר פעילים בלבד" });
      }

      const now = Date.now();
      const profileReadiness = getBoostProfileReadiness(single);
      const eligibilitySnapshot = JSON.stringify({
        paidAndActive: true,
        profileComplete: profileReadiness.profileComplete,
        scientificQuestionnaireComplete: profileReadiness.scientificQuestionnaireComplete,
        photoStored: profileReadiness.photoStored,
        consentSavedBeforeProfileCompletion: !profileReadiness.ready,
      });
      await db.transaction(async (tx: any) => {
        await tx.insert(matchBoostMemberships).values({
          singleId: single.id,
          status: "active",
          consentVersion: BOOST_CONSENT_VERSION,
          algorithmicDisclosureAccepted: true,
          anonymousProfileAccepted: true,
          termsAccepted: true,
          consentedAt: now,
          optedOutAt: null,
          source: "personal_area",
          pilotCohort: "open_members_2026_09",
          eligibleAt: profileReadiness.ready ? now : null,
          eligibilitySnapshot,
          lastActiveAt: now,
          createdAt: now,
          updatedAt: now,
        }).onDuplicateKeyUpdate({ set: {
          status: "active",
          consentVersion: BOOST_CONSENT_VERSION,
          algorithmicDisclosureAccepted: true,
          anonymousProfileAccepted: true,
          termsAccepted: true,
          consentedAt: now,
          optedOutAt: null,
          source: "personal_area",
          pilotCohort: "open_members_2026_09",
          eligibleAt: profileReadiness.ready ? now : null,
          eligibilitySnapshot,
          lastActiveAt: now,
          updatedAt: now,
        } });
        await tx.insert(matchBoostConsentEvents).values({
          singleId: single.id,
          eventType: existingMembership?.status === "active" ? "consent_updated" : "opted_in",
          consentVersion: BOOST_CONSENT_VERSION,
          algorithmicDisclosureAccepted: true,
          anonymousProfileAccepted: true,
          termsAccepted: true,
          source: "personal_area",
          createdAt: now,
        });
        await tx.update(matchBoostPilotInterests).set({ status: "joined", matchedSingleId: single.id, updatedAt: now })
          .where(or(
            eq(matchBoostPilotInterests.matchedSingleId, single.id),
            eq(matchBoostPilotInterests.email, single.email?.toLowerCase() || ""),
          ));
      });
      return { success: true, status: "active" as const, consentedAt: now };
    }),

  leavePool: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16) }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const now = Date.now();
      await db.transaction(async (tx: any) => {
        await tx.update(matchBoostMemberships).set({
          status: "opted_out",
          algorithmicDisclosureAccepted: false,
          anonymousProfileAccepted: false,
          termsAccepted: false,
          optedOutAt: now,
          updatedAt: now,
        }).where(eq(matchBoostMemberships.singleId, single.id));
        await tx.insert(matchBoostConsentEvents).values({
          singleId: single.id,
          eventType: "opted_out",
          consentVersion: BOOST_CONSENT_VERSION,
          algorithmicDisclosureAccepted: false,
          anonymousProfileAccepted: false,
          termsAccepted: false,
          source: "personal_area",
          createdAt: now,
        });
        await tx.update(matchBoostPilotInterests).set({ status: "declined", matchedSingleId: single.id, updatedAt: now })
          .where(or(
            eq(matchBoostPilotInterests.matchedSingleId, single.id),
            eq(matchBoostPilotInterests.email, single.email?.toLowerCase() || ""),
          ));
      });
      return { success: true, status: "opted_out" as const, optedOutAt: now };
    }),

  redeemPlusBoost: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16), matchId: z.number().int().positive().optional() }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const context = await loadBoostContext(db, single);
      const eligibility = evaluateBoostEligibility({ single, ...context });
      if (!eligibility.plusActive || !eligibility.plusBenefitAvailable) {
        throw new TRPCError({ code: "FORBIDDEN", message: "לא נמצאה הטבת בוסט זמינה במחזור Plus הנוכחי" });
      }
      const selectedCandidate = input.matchId
        ? eligibility.candidates.find((candidate: any) => candidate.id === input.matchId)
        : eligibility.topCandidate;
      if (!eligibility.eligible || !selectedCandidate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: eligibility.blockers[0] || "הבוסט אינו זמין כרגע" });
      }

      const now = Date.now();
      const cycleStart = Number(context.plusMember.billingCycleStartedAt);
      const idempotencyKey = `plus:${single.id}:${cycleStart}`;
      try {
        const requestId = await db.transaction(async (tx: any) => {
          const [insertResult] = await tx.insert(matchBoostRequests).values({
            singleId: single.id,
            matchId: selectedCandidate.id,
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
          return insertedId;
        });
        return await dispatchAlgorithmicBoostProposal(db, requestId);
      } catch (error: any) {
        if (error?.code === "ER_DUP_ENTRY") {
          const [existing] = await db.select().from(matchBoostRequests)
            .where(eq(matchBoostRequests.idempotencyKey, idempotencyKey)).limit(1);
          if (!existing) throw error;
          return await dispatchAlgorithmicBoostProposal(db, existing.id);
        }
        throw error;
      }
    }),

  redeemPaidCredit: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16), matchId: z.number().int().positive().optional() }))
    .mutation(async ({ input }) => {
      const { db, single } = await getVerifiedSingle(input.email, input.token);
      const context = await loadBoostContext(db, single);
      const credit = context.requests.find(hasReusablePaidBoostCredit);
      if (!credit) throw new TRPCError({ code: "NOT_FOUND", message: "לא נמצא קרדיט Boost זמין" });

      const eligibility = evaluateBoostEligibility({
        single,
        memberMatches: context.memberMatches,
        plusMember: context.plusMember,
        membership: context.membership,
        boostRequests: context.requests.filter((request: any) => request.id !== credit.id),
      });
      const selectedCandidate = input.matchId
        ? eligibility.candidates.find((candidate: any) => candidate.id === input.matchId)
        : eligibility.topCandidate;
      if (!eligibility.eligible || !selectedCandidate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: eligibility.blockers[0] || "אין כרגע התאמה זמינה למימוש הקרדיט" });
      }

      const now = Date.now();
      await db.update(matchBoostRequests).set({
        matchId: selectedCandidate.id,
        status: "queued",
        requestedAt: now,
        decisionReason: "boost_credit_redeemed",
        updatedAt: now,
      }).where(and(eq(matchBoostRequests.id, credit.id), eq(matchBoostRequests.status, "refunded")));
      try {
        return await dispatchAlgorithmicBoostProposal(db, credit.id);
      } catch (error: any) {
        const [current] = await db.select().from(matchBoostRequests).where(eq(matchBoostRequests.id, credit.id)).limit(1);
        if (current?.status !== "approved") {
          await db.update(matchBoostRequests).set({
            status: "refunded",
            decisionReason: `boost_credit_available:${String(error?.message || "candidate_unavailable").slice(0, 700)}`,
            updatedAt: Date.now(),
          }).where(eq(matchBoostRequests.id, credit.id));
        }
        throw error;
      }
    }),

  startPaidBoost: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string().min(16), termsAccepted: z.literal(true), matchId: z.number().int().positive().optional() }))
    .mutation(async ({ input }) => {
      const prepared = await preparePaidBoostCheckout(input);
      return { configured: true, requestId: prepared.requestId, amountAgorot: BOOST_PRICE_AGOROT, product: "match_boost" as const };
    }),
});
