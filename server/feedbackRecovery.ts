import { and, desc, eq, inArray, isNotNull, like, or } from "drizzle-orm";
import {
  feedbackFollowupContacts,
  feedbackFollowups,
  matches,
  singles,
  testimonialRecords,
} from "../drizzle/schema";
import { wasMatchProposalSent } from "../shared/matchDelivery";
import { getDb } from "./db";
import {
  buildFeedbackRequestKey,
  ensurePositiveFeedbackRequest,
  sendFeedbackOutreachNow,
} from "./feedbackAutomation";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FeedbackRecoveryStage =
  | "feedback_received"
  | "new_match_sent"
  | "mutual_yes"
  | "awaiting_updated_feedback"
  | "recovered_positive"
  | "still_needs_attention";

export type FeedbackRecoveryJourney = {
  originalRecordId: number;
  followupId: number;
  singleId: number;
  issue: "matchmaking" | "personal" | "service";
  feedbackAt: number;
  stage: FeedbackRecoveryStage;
  newMatchCount: number;
  latestNewMatchId: number | null;
  latestNewMatchAt: number | null;
  mutualYesMatchId: number | null;
  mutualYesAt: number | null;
  recoveryRecordId: number | null;
  recoveryRequestSentAt: number | null;
  recoveryResponseAt: number | null;
  eligibleForOutreach: boolean;
};

type RecoveryRequestSnapshot = {
  originalRecordId?: unknown;
  recoveryMatchId?: unknown;
};

function parseSnapshot(value: string | null): RecoveryRequestSnapshot {
  if (!value) return {};
  try {
    return JSON.parse(value) as RecoveryRequestSnapshot;
  } catch {
    return {};
  }
}

export async function getFeedbackRecoveryJourneys(): Promise<FeedbackRecoveryJourney[]> {
  const db = await getDb();
  if (!db) return [];

  const negativeRows = await db.select({
    followupId: feedbackFollowups.id,
    originalRecordId: testimonialRecords.id,
    singleId: testimonialRecords.singleId,
    feedbackAt: testimonialRecords.lastResponseAt,
    feedbackCreatedAt: testimonialRecords.createdAt,
    needsMatchmakingAttention: feedbackFollowups.needsMatchmakingAttention,
    needsPersonalAttention: feedbackFollowups.needsPersonalAttention,
    isActive: singles.isActive,
    isSeed: singles.isSeed,
    consentEmailMarketing: singles.consentEmailMarketing,
  }).from(feedbackFollowups)
    .innerJoin(testimonialRecords, eq(feedbackFollowups.testimonialRecordId, testimonialRecords.id))
    .leftJoin(singles, eq(testimonialRecords.singleId, singles.id))
    .where(and(eq(feedbackFollowups.needsServiceRecovery, true), isNotNull(testimonialRecords.singleId)))
    .orderBy(desc(testimonialRecords.lastResponseAt), desc(testimonialRecords.createdAt), desc(feedbackFollowups.id));

  const latestBySingle = new Map<number, typeof negativeRows[number]>();
  for (const row of negativeRows) {
    if (row.singleId && !latestBySingle.has(row.singleId)) latestBySingle.set(row.singleId, row);
  }
  const singleIds = Array.from(latestBySingle.keys());
  if (singleIds.length === 0) return [];

  const [matchRows, recoveryRequests] = await Promise.all([
    db.select().from(matches).where(or(inArray(matches.singleAId, singleIds), inArray(matches.singleBId, singleIds))),
    db.select({
      id: testimonialRecords.id,
      requestKey: testimonialRecords.requestKey,
      sourceSnapshot: testimonialRecords.sourceSnapshot,
      requestSentAt: testimonialRecords.requestSentAt,
      lastResponseAt: testimonialRecords.lastResponseAt,
      createdAt: testimonialRecords.createdAt,
    }).from(testimonialRecords)
      .where(like(testimonialRecords.requestKey, "feedback-recovery:%"))
      .orderBy(desc(testimonialRecords.id)),
  ]);
  const recoveryRecordIds = recoveryRequests.map(row => row.id);
  const recoveryFollowups = recoveryRecordIds.length
    ? await db.select({ testimonialRecordId: feedbackFollowups.testimonialRecordId, isPositive: feedbackFollowups.isPositive })
      .from(feedbackFollowups)
      .where(inArray(feedbackFollowups.testimonialRecordId, recoveryRecordIds))
    : [];
  const positiveByRecord = new Map(recoveryFollowups.map(row => [row.testimonialRecordId, row.isPositive]));

  const requestByOriginal = new Map<number, typeof recoveryRequests[number]>();
  for (const request of recoveryRequests) {
    const snapshot = parseSnapshot(request.sourceSnapshot);
    const keyPart = String(request.requestKey || "").split(":")[1];
    const originalRecordId = Number(snapshot.originalRecordId || keyPart || 0);
    if (originalRecordId && !requestByOriginal.has(originalRecordId)) requestByOriginal.set(originalRecordId, request);
  }

  return Array.from(latestBySingle.values()).map(row => {
    const singleId = Number(row.singleId);
    const feedbackAt = Number(row.feedbackAt || row.feedbackCreatedAt || 0);
    const sentAfterFeedback = matchRows
      .filter(match => (match.singleAId === singleId || match.singleBId === singleId)
        && Number(match.proposedAt || 0) > feedbackAt
        && wasMatchProposalSent(match))
      .sort((a, b) => Number(b.proposedAt || 0) - Number(a.proposedAt || 0));
    const latestNewMatch = sentAfterFeedback[0] || null;
    const mutualYesMatch = sentAfterFeedback
      .filter(match => match.approvedByA && match.approvedByB)
      .sort((a, b) => Number(b.matchedAt || b.updatedAt || b.proposedAt || 0) - Number(a.matchedAt || a.updatedAt || a.proposedAt || 0))[0] || null;
    const recoveryRequest = requestByOriginal.get(row.originalRecordId) || null;
    const responsePositive = recoveryRequest ? positiveByRecord.get(recoveryRequest.id) : undefined;
    const recoveryResponseAt = Number(recoveryRequest?.lastResponseAt || 0) || null;

    let stage: FeedbackRecoveryStage = "feedback_received";
    if (latestNewMatch) stage = "new_match_sent";
    if (mutualYesMatch) stage = "mutual_yes";
    if (recoveryRequest?.requestSentAt) stage = "awaiting_updated_feedback";
    if (recoveryResponseAt && responsePositive !== true) stage = "still_needs_attention";
    if (recoveryResponseAt && responsePositive === true) stage = "recovered_positive";

    return {
      originalRecordId: row.originalRecordId,
      followupId: row.followupId,
      singleId,
      issue: row.needsMatchmakingAttention ? "matchmaking" : row.needsPersonalAttention ? "personal" : "service",
      feedbackAt,
      stage,
      newMatchCount: sentAfterFeedback.length,
      latestNewMatchId: latestNewMatch?.id || null,
      latestNewMatchAt: Number(latestNewMatch?.proposedAt || 0) || null,
      mutualYesMatchId: mutualYesMatch?.id || null,
      mutualYesAt: Number(mutualYesMatch?.matchedAt || mutualYesMatch?.updatedAt || mutualYesMatch?.proposedAt || 0) || null,
      recoveryRecordId: recoveryRequest?.id || null,
      recoveryRequestSentAt: Number(recoveryRequest?.requestSentAt || 0) || null,
      recoveryResponseAt,
      eligibleForOutreach: Boolean(mutualYesMatch && row.isActive && !row.isSeed && row.consentEmailMarketing && !recoveryRequest?.requestSentAt),
    };
  });
}

export function summarizeFeedbackRecovery(journeys: FeedbackRecoveryJourney[]) {
  return {
    negativeTracked: journeys.length,
    receivedNewMatch: journeys.filter(item => item.newMatchCount > 0).length,
    mutualYesAfterFeedback: journeys.filter(item => Boolean(item.mutualYesMatchId)).length,
    readyForOutreach: journeys.filter(item => item.eligibleForOutreach).length,
    awaitingUpdatedFeedback: journeys.filter(item => item.stage === "awaiting_updated_feedback").length,
    recoveredPositive: journeys.filter(item => item.stage === "recovered_positive").length,
    stillNeedsAttention: journeys.filter(item => item.stage === "still_needs_attention").length,
  };
}

export async function sendFeedbackRecoveryUpdate(input: {
  originalRecordId: number;
  sentBy: string;
  includeSms: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const journey = (await getFeedbackRecoveryJourneys()).find(item => item.originalRecordId === input.originalRecordId);
  if (!journey?.mutualYesMatchId) throw new Error("לא נמצאה התאמה חדשה עם אישור משני הצדדים לאחר הפידבק");

  const [original] = await db.select().from(testimonialRecords)
    .where(eq(testimonialRecords.id, input.originalRecordId))
    .limit(1);
  if (!original?.singleId) throw new Error("רשומת הפידבק המקורית אינה מקושרת לחבר מאגר");

  const requestKey = buildFeedbackRequestKey({
    touchpoint: "historical_match",
    subjectId: `recovery:${input.originalRecordId}:${journey.mutualYesMatchId}`,
    contactId: original.singleId,
  }).replace("historical_match:recovery", "feedback-recovery");
  const request = await ensurePositiveFeedbackRequest({
    requestKey,
    touchpoint: "historical_match",
    deliveryChannel: "email",
    proofType: "progress",
    sourceType: "match",
    contactName: original.contactName,
    contactEmail: original.contactEmail,
    contactPhone: original.contactPhone,
    singleId: original.singleId,
    matchId: journey.mutualYesMatchId,
    sourceSnapshot: {
      campaignVariant: "service_recovery_followup",
      originalRecordId: input.originalRecordId,
      recoveryMatchId: journey.mutualYesMatchId,
      issue: journey.issue,
    },
    scheduledAt: null,
  });
  if (!request) throw new Error("הפנייה נחסמה בגלל סטטוס חשבון, הסרה או היעדר הסכמה");

  const firstName = original.contactName.trim().split(/\s+/)[0] || "שלום";
  const issueSentence = journey.issue === "matchmaking"
    ? "כתבת לי שההתאמות שקיבלת עד אז לא היו מספיק מדויקות או מספקות."
    : journey.issue === "personal"
      ? "כתבת לי שהחוויה הרגישה פחות אישית ממה שציפית."
      : "כתבת לי בכנות על חלק בחוויה שלא עבד עבורך כפי שצריך.";
  await db.update(testimonialRecords).set({
    surveyKind: "satisfaction_survey",
    proofType: "progress",
    rewardType: "none",
    draftSubject: `${firstName}, לקחתי את הפידבק שלך ברצינות — אשמח לשמוע מה השתנה`,
    draftBody: `היי ${firstName}, ${issueSentence} לקחתי את הפידבק ברצינות, חזרתי לבדוק את הדרך שלך במאגר, ומאז נשלחה לך התאמה חדשה שבה שני הצדדים אמרו כן. חשוב לי לא להניח שהכול הסתדר רק בגלל האישור, אלא לשמוע ממך באמת: האם הרגשת שיפור, מה היה מדויק יותר, ומה עדיין נכון לי לשפר?`,
    updatedAt: Date.now(),
  }).where(eq(testimonialRecords.id, request.record.id));

  const delivery = await sendFeedbackOutreachNow({
    recordId: request.record.id,
    sentBy: input.sentBy,
    includeSms: input.includeSms,
  });
  const accepted = delivery.email === "accepted" || delivery.email === "already_sent" || delivery.sms === "accepted" || delivery.sms === "already_sent";
  if (accepted) {
    const now = Date.now();
    const note = "נשלחה בקשת פידבק חוזרת לאחר התאמה חדשה עם אישור הדדי.";
    await db.update(feedbackFollowups).set({
      status: "waiting_customer",
      contactedAt: now,
      contactChannel: input.includeSms ? "sms" : "email",
      contactNote: note,
      nextActionAt: now + 7 * DAY_MS,
      updatedAt: now,
    }).where(eq(feedbackFollowups.id, journey.followupId));
    if (request.created) {
      await db.insert(feedbackFollowupContacts).values({
        followupId: journey.followupId,
        channel: input.includeSms ? "sms" : "email",
        note,
        contactedAt: now,
        actorRef: input.sentBy,
      });
    }
  }
  return { ...delivery, requestCreated: request.created, recordId: request.record.id };
}
