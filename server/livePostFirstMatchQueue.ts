import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { wasMatchProposalSent } from "../shared/matchDelivery";
import { hasMutualYes } from "../shared/matchLifecycle";
import {
  evaluateLivePostFirstMatchPolicy,
  LIVE_POST_DATABASE_CODE,
  LIVE_POST_FIRST_MATCH_SLA_MS,
  LIVE_POST_OFFER_END,
  LIVE_POST_OFFER_START,
  type LivePostFirstMatchQueueState,
} from "../shared/livePostOffer";

export type LivePostFirstMatchQueueRow = {
  paymentId: number;
  singleId: number | null;
  name: string;
  paidAt: number;
  dueAt: number;
  firstProposalDeliveredAt: number | null;
  activeMatchHold: boolean;
  state: LivePostFirstMatchQueueState;
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
  photo_url: string | null;
  questionnaire_completed_at: number | null;
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

function positiveTime(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : null;
}

function bool(value: unknown) {
  return value === true || Number(value) === 1;
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

function isActiveMatchHold(match: ReturnType<typeof matchFromRaw>, now: number) {
  if (!wasMatchProposalSent(match) || match.returnedToPoolAt || match.matchDetailStatus === "ended") return false;
  if (match.status === "matched" || hasMutualYes(match)) return true;
  if (match.status !== "proposed") return false;
  const expires = match.approvalExpiresAt || (match.proposedAt ? match.proposedAt + 48 * 60 * 60 * 1000 : 0);
  return expires > now;
}

function buildQueueRow(rows: RawQueueRow[], now: number): LivePostFirstMatchQueueRow {
  const base = rows[0]!;
  const paidAt = positiveTime(base.paid_at) || 0;
  const sent = rows.filter(row => row.match_id && wasMatchProposalSent(matchFromRaw(row)));
  const firstProposalDeliveredAt = sent
    .map(row => positiveTime(row.delivered_at))
    .filter((value): value is number => value !== null && value >= paidAt)
    .sort((left, right) => left - right)[0] || null;
  const activeMatchHold = sent.some(row => isActiveMatchHold(matchFromRaw(row), now));
  const hasCompleteProfile = Boolean(
    base.first_name?.trim()
    && base.age
    && base.city?.trim()
    && base.gender
    && base.seeking_gender,
  );
  const policy = evaluateLivePostFirstMatchPolicy({
    paidAt,
    hasProfile: Boolean(base.single_id),
    hasCompleteProfile,
    hasPhoto: Boolean(base.photo_url?.trim()),
    questionnaireCompletedAt: positiveTime(base.questionnaire_completed_at),
    isPaid: bool(base.is_paid),
    isActive: bool(base.is_active),
    isSeed: bool(base.is_seed),
    firstProposalDeliveredAt,
    hasActiveMatchHold: activeMatchHold,
  }, now);
  return {
    paymentId: Number(base.payment_id),
    singleId: base.single_id ? Number(base.single_id) : null,
    name: [base.first_name, base.last_name].filter(Boolean).join(" ").trim() || base.payment_email,
    paidAt,
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

function summarize(rows: LivePostFirstMatchQueueRow[]) {
  return {
    total: rows.length,
    awaitingProfile: rows.filter(row => row.state === "awaiting_profile").length,
    ready: rows.filter(row => row.state === "ready").length,
    fulfilled: rows.filter(row => row.state === "fulfilled").length,
    overdue: rows.filter(row => row.state === "overdue").length,
    needsReview: rows.filter(row => row.state === "needs_review").length,
  };
}

function queueRank(state: LivePostFirstMatchQueueState) {
  return ({ overdue: 0, needs_review: 1, ready: 2, awaiting_profile: 3, fulfilled: 4 } as const)[state];
}

/**
 * Read-only staff queue for the post-event LIVE48 promise. It intentionally
 * derives entitlement from the canonical verified payment ledger plus an
 * actual, non-revoked October event ticket with the same normalized email.
 * It neither creates staff tasks nor sends/creates matches.
 */
export async function loadLivePostFirstMatchQueue(now = Date.now()) {
  const db = await getDb();
  if (!db) return { generatedAt: now, offerStart: LIVE_POST_OFFER_START, offerEnd: LIVE_POST_OFFER_END, slaMs: LIVE_POST_FIRST_MATCH_SLA_MS, rows: [] as LivePostFirstMatchQueueRow[], summary: emptySummary() };
  const [rawRows] = await db.execute(sql`
    WITH eligible_payments AS (
      SELECT cp.id AS payment_id, LOWER(TRIM(cp.email)) AS payment_email, cp.paid_at
      FROM completed_payments cp
      WHERE cp.product = 'database'
        AND UPPER(COALESCE(cp.coupon_code, '')) = ${LIVE_POST_DATABASE_CODE}
        AND cp.amount_agorot > 0
        AND cp.paid_at >= ${LIVE_POST_OFFER_START}
        AND cp.paid_at < ${LIVE_POST_OFFER_END}
        AND EXISTS (
          SELECT 1
          FROM live_october_tickets t
          WHERE t.event_slug = 'matching-secrets-2026-10-31'
            AND LOWER(TRIM(t.email)) = LOWER(TRIM(cp.email))
            AND t.revoked_at IS NULL
            AND t.voucher_code NOT LIKE 'TEST-%'
        )
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
      rs.id AS single_id, rs.firstName AS first_name, rs.lastName AS last_name, rs.age, rs.city,
      rs.gender, rs.seekingGender AS seeking_gender, rs.photoUrl AS photo_url,
      rs.questionnaireCompletedAt AS questionnaire_completed_at, rs.isActive AS is_active,
      rs.isPaid AS is_paid, rs.isSeed AS is_seed,
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
        WHERE mde.singleId = rs.id AND mde.matchId = mm.match_id AND mde.status = 'accepted'
          AND NOT EXISTS (SELECT 1 FROM match_boost_requests br WHERE br.match_id = mm.match_id)
          AND COALESCE(mde.acceptedAt, mde.attemptedAt) >= ep.paid_at
      ) AS delivered_at
    FROM eligible_payments ep
    LEFT JOIN ranked_singles rs ON LOWER(TRIM(rs.email)) = ep.payment_email AND rs.profile_rank = 1
    LEFT JOIN member_matches mm ON mm.single_id = rs.id
    ORDER BY ep.paid_at ASC, ep.payment_id ASC
  `) as unknown as [RawQueueRow[]];
  const grouped = new Map<number, RawQueueRow[]>();
  for (const row of rawRows || []) {
    const rows = grouped.get(Number(row.payment_id)) || [];
    rows.push(row);
    grouped.set(Number(row.payment_id), rows);
  }
  const rows = Array.from(grouped.values()).map(rows => buildQueueRow(rows, now));
  rows.sort((left, right) => queueRank(left.state) - queueRank(right.state) || left.dueAt - right.dueAt || left.paidAt - right.paidAt);
  return { generatedAt: now, offerStart: LIVE_POST_OFFER_START, offerEnd: LIVE_POST_OFFER_END, slaMs: LIVE_POST_FIRST_MATCH_SLA_MS, rows, summary: summarize(rows) };
}
