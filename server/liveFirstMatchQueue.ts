import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { wasMatchProposalSent } from "../shared/matchDelivery";
import { hasMutualYes } from "../shared/matchLifecycle";
import { LIVE_OCTOBER_SLUG } from "./liveOctober";
import {
  evaluateLiveFirstMatchPolicy,
  LIVE_FIRST_MATCH_EVENT_START,
  LIVE_FIRST_MATCH_OFFER_ENABLED,
  LIVE_FIRST_MATCH_OFFER_END,
  LIVE_FIRST_MATCH_POLICY_STATUS,
  LIVE_FIRST_MATCH_OFFER_START,
  type LiveFirstMatchQueueState,
} from "../shared/liveFirstMatchPolicy";

export type LiveFirstMatchQueueRow = {
  ticketId: number;
  singleId: number | null;
  name: string;
  paidRegistrationAt: number;
  issuedAt: number;
  questionnaireCompletedAt: number | null;
  firstProposalDeliveredAt: number | null;
  activeMatchHold: boolean;
  state: LiveFirstMatchQueueState;
  originalPromiseDeadline: number;
  profileRequirementsMissing: string[];
  completedAfterLive: boolean;
  eligibilityIssues: string[];
  needsReview: boolean;
};

type RawQueueRow = {
  ticket_id: number;
  ticket_name: string;
  ticket_issued_at: number;
  paid_registration_at: number;
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
  active_match_hold: number | string | null;
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

function asNumber(value: unknown): number | null {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : null;
}

/**
 * Read-only staff queue. It deliberately uses the accepted, per-side delivery
 * ledger as fulfillment evidence; a generated/pending match row is not a sent
 * proposal. A delivered proposal before the live still fulfils the benefit
 * when it was delivered after the verified paid registration.
 */
export async function loadLiveFirstMatchQueue(now = Date.now()) {
  if (!LIVE_FIRST_MATCH_OFFER_ENABLED) {
    return { enabled: false, policyStatus: LIVE_FIRST_MATCH_POLICY_STATUS, generatedAt: now, rows: [] as LiveFirstMatchQueueRow[], summary: emptySummary() };
  }

  const db = await getDb();
  if (!db) return { enabled: true, policyStatus: LIVE_FIRST_MATCH_POLICY_STATUS, generatedAt: now, rows: [] as LiveFirstMatchQueueRow[], summary: emptySummary() };

  const [rawRows] = await db.execute(sql`
    WITH eligible_tickets AS (
      SELECT
        t.id AS ticket_id,
        t.name AS ticket_name,
        LOWER(TRIM(t.email)) AS ticket_email,
        t.issued_at AS ticket_issued_at,
        t.single_id AS ticket_single_id,
        MIN(cp.paid_at) AS paid_registration_at,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(t.email))
          ORDER BY t.issued_at ASC, t.id ASC
        ) AS ticket_rank
      FROM live_october_tickets t
      INNER JOIN completed_payments cp
        ON LOWER(TRIM(cp.email)) = LOWER(TRIM(t.email))
       AND cp.product = 'database'
       AND cp.transaction_id = t.provider_transaction_id
       AND cp.paid_at <= t.issued_at
       AND cp.paid_at >= ${LIVE_FIRST_MATCH_OFFER_START}
       AND cp.paid_at < ${LIVE_FIRST_MATCH_OFFER_END}
       AND cp.amount_agorot >= 29900
       AND UPPER(COALESCE(cp.coupon_code, '')) = 'LIVE'
      WHERE t.event_slug = ${LIVE_OCTOBER_SLUG}
        AND t.source = 'database_live'
        AND t.issued_at >= ${LIVE_FIRST_MATCH_OFFER_START}
        AND t.issued_at < ${LIVE_FIRST_MATCH_OFFER_END}
        AND t.revoked_at IS NULL
        AND t.voucher_code NOT LIKE 'TEST-%'
      GROUP BY t.id, t.name, t.issued_at, t.single_id, t.email
    ), ranked_singles AS (
      SELECT
        s.id,
        s.email,
        s.firstName,
        s.lastName,
        s.age,
        s.city,
        s.gender,
        s.seekingGender,
        s.photoUrl,
        s.questionnaireCompletedAt,
        s.isActive,
        s.isPaid,
        s.isSeed,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(s.email))
          ORDER BY s.isPaid DESC, s.isActive DESC, s.id DESC
        ) AS profile_rank
      FROM singles s
    ), member_matches AS (
      SELECT
        m.id AS match_id,
        m.singleAId AS single_id,
        m.status,
        m.proposedAt,
        m.approvalExpiresAt,
        m.ownerApprovedAt,
        m.approvalTokenA,
        m.approvalTokenB,
        m.singleAToken,
        m.singleBToken,
        m.emailAOpenedAt,
        m.emailBOpenedAt,
        m.tokenAUsedAt,
        m.tokenBUsedAt,
        m.approvedByA,
        m.approvedByB,
        m.emailRetriedAt,
        m.waSentAt,
        m.notes,
        m.matchedAt,
        m.contactRevealedAt,
        m.returnedToPoolAt,
        m.matchDetailStatus
      FROM matches m
      UNION ALL
      SELECT
        m.id AS match_id,
        m.singleBId AS single_id,
        m.status,
        m.proposedAt,
        m.approvalExpiresAt,
        m.ownerApprovedAt,
        m.approvalTokenA,
        m.approvalTokenB,
        m.singleAToken,
        m.singleBToken,
        m.emailAOpenedAt,
        m.emailBOpenedAt,
        m.tokenAUsedAt,
        m.tokenBUsedAt,
        m.approvedByA,
        m.approvedByB,
        m.emailRetriedAt,
        m.waSentAt,
        m.notes,
        m.matchedAt,
        m.contactRevealedAt,
        m.returnedToPoolAt,
        m.matchDetailStatus
      FROM matches m
    ), per_member AS (
      SELECT
        et.ticket_id,
        et.ticket_name,
        et.ticket_issued_at,
        et.paid_registration_at,
        rs.id AS single_id,
        rs.firstName AS first_name,
        rs.lastName AS last_name,
        rs.age,
        rs.city,
        rs.gender,
        rs.seekingGender AS seeking_gender,
        rs.photoUrl AS photo_url,
        rs.questionnaireCompletedAt AS questionnaire_completed_at,
        rs.isActive AS is_active,
        rs.isPaid AS is_paid,
        rs.isSeed AS is_seed,
        mm.match_id,
        mm.status AS match_status,
        mm.proposedAt AS match_proposed_at,
        mm.approvalExpiresAt AS match_approval_expires_at,
        mm.ownerApprovedAt AS match_owner_approved_at,
        mm.approvalTokenA AS match_approval_token_a,
        mm.approvalTokenB AS match_approval_token_b,
        mm.singleAToken AS match_single_a_token,
        mm.singleBToken AS match_single_b_token,
        mm.emailAOpenedAt AS match_email_a_opened_at,
        mm.emailBOpenedAt AS match_email_b_opened_at,
        mm.tokenAUsedAt AS match_token_a_used_at,
        mm.tokenBUsedAt AS match_token_b_used_at,
        mm.approvedByA AS match_approved_by_a,
        mm.approvedByB AS match_approved_by_b,
        mm.emailRetriedAt AS match_email_retried_at,
        mm.waSentAt AS match_wa_sent_at,
        mm.notes AS match_notes,
        mm.matchedAt AS match_matched_at,
        mm.contactRevealedAt AS match_contact_revealed_at,
        mm.returnedToPoolAt AS match_returned_to_pool_at,
        mm.matchDetailStatus AS match_detail_status,
        (
          SELECT MIN(COALESCE(mde.acceptedAt, mde.attemptedAt))
          FROM match_delivery_events mde
          WHERE mde.singleId = rs.id
            AND mde.matchId = mm.match_id
            AND mde.status = 'accepted'
            AND NOT EXISTS (
              SELECT 1 FROM match_boost_requests br WHERE br.match_id = mm.match_id
            )
            AND COALESCE(mde.acceptedAt, mde.attemptedAt) >= et.paid_registration_at
        ) AS delivered_at
      FROM eligible_tickets et
      LEFT JOIN ranked_singles rs
        ON LOWER(TRIM(rs.email)) = et.ticket_email
       AND rs.profile_rank = 1
      LEFT JOIN member_matches mm ON mm.single_id = rs.id
      WHERE et.ticket_rank = 1
    )
    SELECT * FROM per_member
    ORDER BY paid_registration_at ASC, ticket_id ASC
  `) as unknown as [RawQueueRow[]];

  const byTicket = new Map<number, RawQueueRow[]>();
  for (const row of rawRows || []) {
    const rows = byTicket.get(Number(row.ticket_id)) || [];
    rows.push(row);
    byTicket.set(Number(row.ticket_id), rows);
  }

  const rows = Array.from(byTicket.values()).map((memberRows) => buildQueueRow(memberRows, now));
  rows.sort((a, b) => queueRank(a.state) - queueRank(b.state) || a.originalPromiseDeadline - b.originalPromiseDeadline || a.paidRegistrationAt - b.paidRegistrationAt);

  return {
    enabled: true,
    policyStatus: LIVE_FIRST_MATCH_POLICY_STATUS,
    generatedAt: now,
    eventStart: LIVE_FIRST_MATCH_EVENT_START,
    rows,
    summary: summarize(rows),
  };
}

function buildQueueRow(memberRows: RawQueueRow[], now: number): LiveFirstMatchQueueRow {
  const base = memberRows[0]!;
  const paidRegistrationAt = asNumber(base.paid_registration_at) || asNumber(base.ticket_issued_at) || 0;
  const matches = memberRows.filter(row => row.match_id).map(matchFromRaw);
  const genuinelySent = matches.filter(wasMatchProposalSent);
  const acceptedDeliveredAt = memberRows
    .filter(row => wasMatchProposalSent(matchFromRaw(row)))
    .map(row => asNumber(row.delivered_at))
    .filter((value): value is number => value !== null && value >= paidRegistrationAt)
    .sort((a, b) => a - b)[0] || null;
  const activeMatchHold = genuinelySent.some(match => isActiveMatchHold(match, now));
  const name = [base.first_name, base.last_name].filter(Boolean).join(" ").trim() || base.ticket_name;
  const hasCompleteProfile = Boolean(
    base.first_name?.trim()
    && base.age
    && base.city?.trim()
    && base.gender
    && base.seeking_gender,
  );
  const policy = evaluateLiveFirstMatchPolicy({
    hasProfile: Boolean(base.single_id),
    hasCompleteProfile,
    hasPhoto: Boolean(base.photo_url?.trim()),
    questionnaireCompletedAt: asNumber(base.questionnaire_completed_at),
    isPaid: Boolean(base.is_paid),
    isActive: Boolean(base.is_active),
    isSeed: Boolean(base.is_seed),
    firstProposalDeliveredAt: acceptedDeliveredAt,
    hasActiveMatchHold: activeMatchHold,
  }, now);

  return {
    ticketId: Number(base.ticket_id),
    singleId: base.single_id ? Number(base.single_id) : null,
    name,
    paidRegistrationAt,
    issuedAt: asNumber(base.ticket_issued_at) || paidRegistrationAt,
    questionnaireCompletedAt: asNumber(base.questionnaire_completed_at),
    firstProposalDeliveredAt: acceptedDeliveredAt,
    activeMatchHold,
    state: policy.state,
    originalPromiseDeadline: policy.originalPromiseDeadline,
    profileRequirementsMissing: policy.profileRequirementsMissing,
    completedAfterLive: policy.completedAfterLive,
    eligibilityIssues: policy.eligibilityIssues,
    needsReview: policy.needsReview,
  };
}

function matchFromRaw(row: RawQueueRow) {
  return {
    status: row.match_status || "pending",
    proposedAt: asNumber(row.match_proposed_at),
    approvalExpiresAt: asNumber(row.match_approval_expires_at),
    ownerApprovedAt: asNumber(row.match_owner_approved_at),
    approvalTokenA: row.match_approval_token_a,
    approvalTokenB: row.match_approval_token_b,
    singleAToken: row.match_single_a_token,
    singleBToken: row.match_single_b_token,
    emailAOpenedAt: asNumber(row.match_email_a_opened_at),
    emailBOpenedAt: asNumber(row.match_email_b_opened_at),
    tokenAUsedAt: asNumber(row.match_token_a_used_at),
    tokenBUsedAt: asNumber(row.match_token_b_used_at),
    approvedByA: Boolean(row.match_approved_by_a),
    approvedByB: Boolean(row.match_approved_by_b),
    emailRetriedAt: asNumber(row.match_email_retried_at),
    waSentAt: asNumber(row.match_wa_sent_at),
    notes: row.match_notes,
    matchedAt: asNumber(row.match_matched_at),
    contactRevealedAt: asNumber(row.match_contact_revealed_at),
    returnedToPoolAt: asNumber(row.match_returned_to_pool_at),
    matchDetailStatus: row.match_detail_status,
  };
}

function isActiveMatchHold(match: ReturnType<typeof matchFromRaw>, now: number) {
  if (!wasMatchProposalSent(match)) return false;
  if (match.returnedToPoolAt || match.matchDetailStatus === "ended") return false;
  // Mutual matches require explicit release. An unanswered proposal holds only
  // until its recorded expiry (48 hours from proposedAt for legacy rows).
  if (match.status === "matched" || hasMutualYes(match)) return true;
  if (match.status !== "proposed") return false;
  const expires = match.approvalExpiresAt || (match.proposedAt ? match.proposedAt + 48 * 60 * 60 * 1000 : 0);
  return expires > now;
}

function emptySummary() {
  return { total: 0, awaitingProfile: 0, ready: 0, fulfilled: 0, overdue: 0, needsReview: 0 };
}

function summarize(rows: LiveFirstMatchQueueRow[]) {
  return {
    total: rows.length,
    awaitingProfile: rows.filter(row => row.state === "awaiting_profile").length,
    ready: rows.filter(row => row.state === "ready").length,
    fulfilled: rows.filter(row => row.state === "fulfilled").length,
    overdue: rows.filter(row => row.state === "overdue").length,
    needsReview: rows.filter(row => row.state === "needs_review").length,
  };
}

function queueRank(state: LiveFirstMatchQueueState) {
  return ({ overdue: 0, needs_review: 1, ready: 2, awaiting_profile: 3, fulfilled: 4 } as const)[state];
}
