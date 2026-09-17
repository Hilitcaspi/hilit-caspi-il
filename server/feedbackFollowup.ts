import { eq } from "drizzle-orm";
import { feedbackFollowups, testimonialRecords } from "../drizzle/schema";
import type { getTestimonialDb } from "./testimonialDb";

type FeedbackDb = NonNullable<Awaited<ReturnType<typeof getTestimonialDb>>>;

type FollowupSource = Pick<typeof testimonialRecords.$inferSelect,
  | "id"
  | "singleId"
  | "matchId"
  | "surveyKind"
  | "sourceType"
  | "rating"
  | "npsScore"
  | "feedbackText"
  | "improvementText"
  | "testimonialTextOriginal"
  | "consentText"
  | "consentPhoto"
  | "consentVideo"
  | "lastResponseAt"
>;

const NEGATIVE_TERMS = [
  "לא מרוצה", "מאכזב", "מאוכזב", "אין מענה", "לא עונים", "לא חזר", "לא חוזר",
  "לא קיבל", "לא קיבלתי", "אף התאמה", "אין התאמות", "לא מתאימ", "אותה התאמה",
  "תקלה", "בעיה", "קשה להשתמש", "לא ברור", "מרגיש לבד", "חוסר יחס", "חוסר מענה",
];

const MATCHMAKING_TERMS = [
  "התאמה", "התאמות", "מאץ", "מאצ'", "שידוך", "מאגר", "פרופיל", "בוסט",
  "לא קיבל", "אין התאמות", "לא מתאימ", "אותו גבר", "אותה אישה",
];
const MATCH_REQUEST_TERMS = [
  "לא קיבל", "טרם קיבל", "אף התאמה", "אין התאמות", "מעט התאמות", "מעט הצעות",
  "יותר התאמות", "עוד התאמות", "לא מתאימ", "אותו גבר", "אותה אישה", "בדיקת פרופיל",
];

const URGENT_TERMS = ["הטרדה", "מסוכן", "אלימות", "שקר", "התחזות", "איום", "פגיעה"];
const NPS_DIRECTION_FIXED_AT = Date.parse("2026-09-17T19:50:00Z");

function includesAny(text: string, terms: string[]) {
  return terms.some(term => text.includes(term));
}

export type FeedbackFollowupClassification = {
  isPositive: boolean;
  needsServiceRecovery: boolean;
  needsMatchmakingAttention: boolean;
  needsPersonalAttention: boolean;
  needsPublishingReview: boolean;
  priority: "normal" | "high" | "urgent";
  recommendedAction: string;
};

export function classifyFeedbackFollowup(record: FollowupSource): FeedbackFollowupClassification {
  const text = [record.feedbackText, record.improvementText, record.testimonialTextOriginal]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const hasNegativeLanguage = includesAny(text, NEGATIVE_TERMS);
  const urgent = includesAny(text, URGENT_TERMS);
  const lowRating = record.rating != null && record.rating <= 3;
  const veryLowRating = record.rating != null && record.rating <= 2;
  // Historical NPS responses before this cutoff are directionally unreliable:
  // the RTL scale was visually reversed. Text and rating remain trustworthy.
  const npsIsReliable = Number(record.lastResponseAt || 0) >= NPS_DIRECTION_FIXED_AT;
  const detractor = npsIsReliable && record.npsScore != null && record.npsScore <= 6;
  const severeDetractor = npsIsReliable && record.npsScore != null && record.npsScore <= 4;
  const matchContext = record.sourceType === "match" || record.sourceType === "database";
  const needsServiceRecovery = Boolean(
    record.lastResponseAt && (lowRating || detractor || hasNegativeLanguage),
  );
  const needsMatchmakingAttention = Boolean(
    record.lastResponseAt && matchContext && (
      (needsServiceRecovery && (includesAny(text, MATCHMAKING_TERMS) || lowRating || detractor))
      || includesAny(text, MATCH_REQUEST_TERMS)
    ),
  );
  const needsPersonalAttention = Boolean(
    record.lastResponseAt && (urgent || veryLowRating || severeDetractor || (needsServiceRecovery && needsMatchmakingAttention)),
  );
  const consented = Boolean(record.consentText || record.consentPhoto || record.consentVideo);
  const positiveSignal = Boolean(
    (record.rating != null && record.rating >= 4)
    || (npsIsReliable && record.npsScore != null && record.npsScore >= 9)
    || record.testimonialTextOriginal?.trim(),
  );
  const isPositive = Boolean(record.lastResponseAt && positiveSignal && !needsServiceRecovery);
  const needsPublishingReview = Boolean(isPositive && consented);
  const priority: FeedbackFollowupClassification["priority"] = urgent
    ? "urgent"
    : needsPersonalAttention || (needsServiceRecovery && (veryLowRating || severeDetractor))
      ? "high"
      : "normal";

  let recommendedAction = "להודות על המשוב ולתעד את התוצאה.";
  if (urgent) {
    recommendedAction = "לעצור ולבדוק אישית עוד היום; אין לשלוח התאמה או הטבה אוטומטית לפני בירור.";
  } else if (needsServiceRecovery && needsMatchmakingAttention) {
    recommendedAction = "לעבור אישית על הפרופיל, ההתאמות שנשלחו והחסמים; ליצור קשר ורק לאחר הבדיקה לבחור התאמה, Boost או פתרון אחר.";
  } else if (needsServiceRecovery) {
    recommendedAction = "ליצור קשר אישי, להבין מה קרה, לתקן את הכשל ורק אז לבחור מחוות שירות מתאימה.";
  } else if (needsMatchmakingAttention) {
    recommendedAction = "לבדוק את הפרופיל, ההעדפות והיצע ההתאמות לפני הפנייה הבאה.";
  } else if (needsPublishingReview) {
    recommendedAction = "להודות, לאמת את הניסוח וההסכמה, ולהעביר לספר ההמלצות המאושרות.";
  } else if (isPositive) {
    recommendedAction = "להודות ולבדוק אם חסרה הסכמה קצרה לפרסום או תמונה.";
  }

  return {
    isPositive,
    needsServiceRecovery,
    needsMatchmakingAttention,
    needsPersonalAttention,
    needsPublishingReview,
    priority,
    recommendedAction,
  };
}

export async function upsertFeedbackFollowup(db: FeedbackDb, record: FollowupSource) {
  if (!record.lastResponseAt) return null;
  const classification = classifyFeedbackFollowup(record);
  const now = Date.now();
  const defaultNextActionAt = now + (
    classification.priority === "urgent" ? 4 * 60 * 60 * 1000
      : classification.priority === "high" ? 24 * 60 * 60 * 1000
        : classification.needsServiceRecovery || classification.needsMatchmakingAttention ? 48 * 60 * 60 * 1000
          : 3 * 24 * 60 * 60 * 1000
  );
  const [existing] = await db.select({ id: feedbackFollowups.id, status: feedbackFollowups.status, nextActionAt: feedbackFollowups.nextActionAt })
    .from(feedbackFollowups)
    .where(eq(feedbackFollowups.testimonialRecordId, record.id))
    .limit(1);
  const values = {
    singleId: record.singleId || null,
    matchId: record.matchId || null,
    ...classification,
    updatedAt: now,
  };
  if (existing) {
    await db.update(feedbackFollowups).set({
      ...values,
      ...(!existing.nextActionAt && !["resolved", "dismissed"].includes(existing.status) ? { nextActionAt: defaultNextActionAt } : {}),
    }).where(eq(feedbackFollowups.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(feedbackFollowups).values({
    testimonialRecordId: record.id,
    ...values,
    status: "open",
    nextActionAt: defaultNextActionAt,
    createdAt: now,
  });
  return Number((result[0] as { insertId?: number }).insertId || 0);
}

export async function syncAllFeedbackFollowups(db: FeedbackDb) {
  const records = await db.select().from(testimonialRecords).where(eq(testimonialRecords.status, "submitted"));
  let synced = 0;
  for (const record of records) {
    await upsertFeedbackFollowup(db, record);
    synced += 1;
  }
  // Positive responses may move beyond submitted after verification/approval.
  const reviewed = await db.select().from(testimonialRecords);
  for (const record of reviewed) {
    if (!record.lastResponseAt || records.some(item => item.id === record.id)) continue;
    await upsertFeedbackFollowup(db, record);
    synced += 1;
  }
  return { synced };
}
