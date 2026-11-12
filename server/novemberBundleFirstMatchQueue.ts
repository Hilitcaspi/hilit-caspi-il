import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { wasMatchProposalSent } from "../shared/matchDelivery";
import { hasMutualYes } from "../shared/matchLifecycle";
import {
  evaluateNovemberBundleFirstMatchPolicy,
  FIRST_MATCH_DAYS,
  NOVEMBER_BUNDLE_PRICE,
  NOVEMBER_BUNDLE_PRODUCT,
  type NovemberBundleFirstMatchQueueState,
} from "../shared/novemberBundleOffer";

export type NovemberBundleFirstMatchQueueRow = {
  paymentId: number;
  singleId: number | null;
  name: string;
  paidAt: number;
  /** Stable first readiness evidence: never derived from mutable profile.updatedAt. */
  readyAt: number | null;
  /** Null until all actual profile/photo/questionnaire/preference requirements exist. */
  dueAt: number | null;
  firstProposalDeliveredAt: number | null;
  activeMatchHold: boolean;
  state: NovemberBundleFirstMatchQueueState;
  profileRequirementsMissing: string[];
  eligibilityIssues: string[];
};

type RawQueueRow = {
  payment_id: number;
  payment_email: string;
  paid_at: number;
  single_id: number | null;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  city: string | null;
  gender: string | null;
  seeking_gender: string | null;
  height: number | null;
  photo_url: string | null;
  dna_type: string | null;
  occupation: string | null;
  religiosity: string | null;
  about: string | null;
  partner_description: string | null;
  min_age_preference: number | null;
  max_age_preference: number | null;
  min_height_preference: number | null;
  max_height_preference: number | null;
  religiosity_preference: string | null;
  location_preference: string | null;
  questionnaire_completed_at: number | null;
  profile_updated_at: number | null;
  is_active: unknown;
  is_paid: unknown;
  is_seed: unknown;
  match_id: number | null;
  match_status: string | null;
  match_proposed_at: number | null;
  match_approval_expires_at: number | null;
  match_owner_approved_at: number | null;
  match_approval_token_a: string | null;
  match_approval_token_b: string | null;
  match_single_a_token: string | null;
  match_single_b_token: string | null;
  match_email_a_opened_at: number | null;
  match_email_b_opened_at: number | null;
  match_token_a_used_at: number | null;
  match_token_b_used_at: number | null;
  match_approved_by_a: unknown;
  match_approved_by_b: unknown;
  match_email_retried_at: number | null;
  match_wa_sent_at: number | null;
  match_notes: string | null;
  match_matched_at: number | null;
  match_contact_revealed_at: number | null;
  match_returned_to_pool_at: number | null;
  match_detail_status: string | null;
  delivered_at: number | null;
};

function positiveTime(value: unknown): number | null {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : null;
}

function bool(value: unknown): boolean {
  return value === true || Number(value) === 1;
}

function text(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function meaningfulText(value: unknown, placeholders: string[]): boolean {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length >= 8 && !placeholders.includes(normalized);
}

/** Actual persisted fields required before the November three-calendar-day clock starts. */
export function novemberBundleProfileRequirements(row: Pick<RawQueueRow,
  "first_name" | "age" | "city" | "gender" | "seeking_gender" | "height" | "photo_url"
  | "dna_type" | "occupation" | "religiosity" | "about" | "partner_description"
  | "min_age_preference" | "max_age_preference" | "min_height_preference" | "max_height_preference"
  | "religiosity_preference" | "location_preference" | "questionnaire_completed_at"
>): string[] {
  const missing: string[] = [];
  if (!text(row.first_name)) missing.push("שם");
  if (!row.age || Number(row.age) < 18) missing.push("גיל");
  if (!text(row.city)) missing.push("עיר");
  if (!text(row.gender)) missing.push("מגדר");
  if (!text(row.seeking_gender)) missing.push("למי מתאים להכיר");
  if (!row.height || Number(row.height) < 120) missing.push("גובה");
  if (!text(row.photo_url)) missing.push("תמונה");
  if (!text(row.dna_type)) missing.push("DNA");
  if (!text(row.occupation)) missing.push("תעסוקה");
  if (!text(row.religiosity)) missing.push("דת");
  if (!meaningfulText(row.about, ["על עצמי"])) missing.push("על עצמי");
  if (!meaningfulText(row.partner_description, ["מחפש זוגיות", "מחפשת זוגיות"])) missing.push("העדפות התאמה");
  if (!row.min_age_preference || !row.max_age_preference || Number(row.min_age_preference) > Number(row.max_age_preference)) missing.push("טווח גילאים");
  if (!row.min_height_preference || !row.max_height_preference || Number(row.min_height_preference) > Number(row.max_height_preference)) missing.push("טווח גובה");
  if (!text(row.religiosity_preference)) missing.push("העדפה דתית");
  if (!text(row.location_preference)) missing.push("העדפת מיקום");
  if (!positiveTime(row.questionnaire_completed_at)) missing.push("שאלון מדעי");
  return missing;
}

function matchFromRaw(row: RawQueueRow) {
  return {
    status: row.match_status || "pending",
    proposedAt: positiveTime(row.match_proposed_at),
    approvalExpiresAt: positiveTime(row.match_approval_expires_at),
    ownerApprovedAt: positiveTime(row.match_owner_approved_at),
    approvalTokenA: row.match_approval_token_a,
    approvalTokenB: row.match_approval_token_b,
    singleAToken: row.match_single_a_token,
    singleBToken: row.match_single_b_token,
    emailAOpenedAt: positiveTime(row.match_email_a_opened_at),
    emailBOpenedAt: positiveTime(row.match_email_b_opened_at),
    tokenAUsedAt: positiveTime(row.match_token_a_used_at),
    tokenBUsedAt: positiveTime(row.match_token_b_used_at),
    approvedByA: bool(row.match_approved_by_a),
    approvedByB: bool(row.match_approved_by_b),
    emailRetriedAt: positiveTime(row.match_email_retried_at),
    waSentAt: positiveTime(row.match_wa_sent_at),
    notes: row.match_notes,
    matchedAt: positiveTime(row.match_matched_at),
    contactRevealedAt: positiveTime(row.match_contact_revealed_at),
    returnedToPoolAt: positiveTime(row.match_returned_to_pool_at),
    matchDetailStatus: row.match_detail_status,
  };
}

function isActiveMatchHold(match: ReturnType<typeof matchFromRaw>, now: number): boolean {
  if (!wasMatchProposalSent(match) || match.returnedToPoolAt || match.matchDetailStatus === "ended") return false;
  if (match.status === "matched" || hasMutualYes(match)) return true;
  if (match.status !== "proposed") return false;
  const expires = match.approvalExpiresAt || (match.proposedAt ? match.proposedAt + 48 * 60 * 60 * 1000 : 0);
  return expires > now;
}

export function buildNovemberBundleFirstMatchQueueRow(rows: RawQueueRow[], now = Date.now()): NovemberBundleFirstMatchQueueRow {
  const base = rows[0]!;
  const paidAt = positiveTime(base.paid_at) || 0;
  const questionnaireCompletedAt = positiveTime(base.questionnaire_completed_at);
  const profileUpdatedAt = positiveTime(base.profile_updated_at);
  const profileRequirementsMissing = novemberBundleProfileRequirements(base);
  const hasAllProfileRequirements = profileRequirementsMissing.length === 0;
  const readinessTimestampNeedsReview = hasAllProfileRequirements
    && questionnaireCompletedAt !== null
    && profileUpdatedAt !== null
    && profileUpdatedAt > Math.max(paidAt, questionnaireCompletedAt);
  // A later profile edit must not erase an accepted proposal. Use the stable
  // payment/questionnaire lower bound, independently of current completeness
  // or uncertainty about the exact historical readiness time. The SQL below
  // requires accepted evidence for this recipient and excludes Boost matches.
  const deliveryLowerBound = Math.max(paidAt, questionnaireCompletedAt || 0);
  const sent = rows.filter(row => row.match_id && wasMatchProposalSent(matchFromRaw(row)));
  const firstProposalDeliveredAt = paidAt <= 0 ? null : rows.filter(row => row.match_id)
    .map(row => positiveTime(row.delivered_at))
    .filter((value): value is number => value !== null && value >= deliveryLowerBound && value <= now)
    .sort((left, right) => left - right)[0] || null;
  const activeMatchHold = sent.some(row => isActiveMatchHold(matchFromRaw(row), now));
  const policy = evaluateNovemberBundleFirstMatchPolicy({
    paidAt,
    questionnaireCompletedAt,
    hasAllProfileRequirements,
    readinessTimestampNeedsReview,
    isPaid: bool(base.is_paid),
    isActive: bool(base.is_active),
    isSeed: bool(base.is_seed),
    firstProposalDeliveredAt,
    hasActiveMatchHold: activeMatchHold,
    profileRequirementsMissing,
  }, now);
  return {
    paymentId: Number(base.payment_id),
    singleId: base.single_id ? Number(base.single_id) : null,
    name: [base.first_name, base.last_name].filter(Boolean).join(" ").trim() || base.payment_email,
    paidAt,
    readyAt: policy.readyAt,
    dueAt: policy.dueAt,
    firstProposalDeliveredAt,
    activeMatchHold,
    state: policy.state,
    profileRequirementsMissing: policy.profileRequirementsMissing,
    eligibilityIssues: policy.eligibilityIssues,
  };
}

function emptySummary() {
  return { total: 0, awaitingProfile: 0, ready: 0, fulfilled: 0, overdue: 0, needsReview: 0 };
}

function summarize(rows: NovemberBundleFirstMatchQueueRow[]) {
  return {
    total: rows.length,
    awaitingProfile: rows.filter(row => row.state === "awaiting_profile").length,
    ready: rows.filter(row => row.state === "ready").length,
    fulfilled: rows.filter(row => row.state === "fulfilled").length,
    overdue: rows.filter(row => row.state === "overdue").length,
    needsReview: rows.filter(row => row.state === "needs_review").length,
  };
}

function queueRank(state: NovemberBundleFirstMatchQueueState) {
  return ({ overdue: 0, needs_review: 1, ready: 2, awaiting_profile: 3, fulfilled: 4 } as const)[state];
}

/**
 * Read-only staff queue. It does not score, create, reserve, or send matches.
 * Entitlement begins only with the canonical verified payment ledger row for
 * the dedicated November discriminator and exact 349 ILS amount; it never
 * trusts a URL query, a client amount, or the historical Tu B'Av 349 amount.
 */
export async function loadNovemberBundleFirstMatchQueue(now = Date.now()) {
  const db = await getDb();
  if (!db) return {
    generatedAt: now,
    firstMatchDays: FIRST_MATCH_DAYS,
    rows: [] as NovemberBundleFirstMatchQueueRow[],
    summary: emptySummary(),
  };

  const [rawRows] = await db.execute(sql`
    WITH eligible_payments AS (
      SELECT cp.id AS payment_id, LOWER(TRIM(cp.email)) AS payment_email, cp.paid_at
      FROM completed_payments cp
      WHERE cp.product = ${NOVEMBER_BUNDLE_PRODUCT}
        AND cp.amount_source = 'grow'
        AND cp.amount_agorot = ${NOVEMBER_BUNDLE_PRICE * 100}
    ), ranked_singles AS (
      SELECT s.*, ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(s.email))
        ORDER BY s.isPaid DESC, s.isActive DESC, s.id DESC
      ) AS profile_rank
      FROM singles s
    ), member_matches AS (
      SELECT m.id AS match_id, m.singleAId AS single_id, m.status, m.proposedAt, m.approvalExpiresAt,
        m.ownerApprovedAt, m.approvalTokenA, m.approvalTokenB, m.singleAToken, m.singleBToken,
        m.emailAOpenedAt, m.emailBOpenedAt, m.tokenAUsedAt, m.tokenBUsedAt, m.approvedByA, m.approvedByB,
        m.emailRetriedAt, m.waSentAt, m.notes, m.matchedAt, m.contactRevealedAt, m.returnedToPoolAt, m.matchDetailStatus
      FROM matches m
      UNION ALL
      SELECT m.id AS match_id, m.singleBId AS single_id, m.status, m.proposedAt, m.approvalExpiresAt,
        m.ownerApprovedAt, m.approvalTokenA, m.approvalTokenB, m.singleAToken, m.singleBToken,
        m.emailAOpenedAt, m.emailBOpenedAt, m.tokenAUsedAt, m.tokenBUsedAt, m.approvedByA, m.approvedByB,
        m.emailRetriedAt, m.waSentAt, m.notes, m.matchedAt, m.contactRevealedAt, m.returnedToPoolAt, m.matchDetailStatus
      FROM matches m
    )
    SELECT ep.payment_id, ep.payment_email, ep.paid_at,
      rs.id AS single_id, rs.firstName AS first_name, rs.lastName AS last_name,
      rs.age, rs.city, rs.gender, rs.seekingGender AS seeking_gender, rs.height,
      rs.photoUrl AS photo_url, rs.dnaType AS dna_type, rs.occupation, rs.religiosity,
      rs.about, rs.partnerDescription AS partner_description,
      rs.minAgePreference AS min_age_preference, rs.maxAgePreference AS max_age_preference,
      rs.minHeightPreference AS min_height_preference, rs.maxHeightPreference AS max_height_preference,
      rs.religiosityPreference AS religiosity_preference, rs.locationPreference AS location_preference,
      rs.questionnaireCompletedAt AS questionnaire_completed_at,
      rs.updatedAt AS profile_updated_at,
      rs.isActive AS is_active, rs.isPaid AS is_paid, rs.isSeed AS is_seed,
      mm.match_id, mm.status AS match_status, mm.proposedAt AS match_proposed_at,
      mm.approvalExpiresAt AS match_approval_expires_at, mm.ownerApprovedAt AS match_owner_approved_at,
      mm.approvalTokenA AS match_approval_token_a, mm.approvalTokenB AS match_approval_token_b,
      mm.singleAToken AS match_single_a_token, mm.singleBToken AS match_single_b_token,
      mm.emailAOpenedAt AS match_email_a_opened_at, mm.emailBOpenedAt AS match_email_b_opened_at,
      mm.tokenAUsedAt AS match_token_a_used_at, mm.tokenBUsedAt AS match_token_b_used_at,
      mm.approvedByA AS match_approved_by_a, mm.approvedByB AS match_approved_by_b,
      mm.emailRetriedAt AS match_email_retried_at, mm.waSentAt AS match_wa_sent_at,
      mm.notes AS match_notes, mm.matchedAt AS match_matched_at,
      mm.contactRevealedAt AS match_contact_revealed_at, mm.returnedToPoolAt AS match_returned_to_pool_at,
      mm.matchDetailStatus AS match_detail_status,
      (
        SELECT MIN(COALESCE(mde.acceptedAt, mde.attemptedAt))
        FROM match_delivery_events mde
        WHERE mde.singleId = rs.id
          AND mde.matchId = mm.match_id
          AND mde.status = 'accepted'
          AND COALESCE(mde.providerMessageId, '') <> 'blocked'
          AND NOT EXISTS (SELECT 1 FROM match_boost_requests br WHERE br.match_id = mm.match_id)
          AND COALESCE(mde.acceptedAt, mde.attemptedAt) >= GREATEST(ep.paid_at, COALESCE(rs.questionnaireCompletedAt, 0))
          AND COALESCE(mde.acceptedAt, mde.attemptedAt) <= ${now}
      ) AS delivered_at
    FROM eligible_payments ep
    LEFT JOIN ranked_singles rs ON LOWER(TRIM(rs.email)) = ep.payment_email AND rs.profile_rank = 1
    LEFT JOIN member_matches mm ON mm.single_id = rs.id
    ORDER BY ep.paid_at ASC, ep.payment_id ASC
  `) as unknown as [RawQueueRow[]];

  const grouped = new Map<number, RawQueueRow[]>();
  for (const row of rawRows || []) {
    const paymentRows = grouped.get(Number(row.payment_id)) || [];
    paymentRows.push(row);
    grouped.set(Number(row.payment_id), paymentRows);
  }
  const rows = Array.from(grouped.values()).map(paymentRows => buildNovemberBundleFirstMatchQueueRow(paymentRows, now));
  rows.sort((left, right) => queueRank(left.state) - queueRank(right.state)
    || (left.dueAt ?? Number.MAX_SAFE_INTEGER) - (right.dueAt ?? Number.MAX_SAFE_INTEGER)
    || left.paidAt - right.paidAt);
  return { generatedAt: now, firstMatchDays: FIRST_MATCH_DAYS, rows, summary: summarize(rows) };
}
