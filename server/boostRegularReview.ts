import { and, eq, gte, isNull, like, or, sql } from "drizzle-orm";
import { matches } from "../drizzle/schema";
import { BOOST_CANDIDATE_NOTE_MARKER, MIN_REGULAR_REVIEW_SCORE } from "../shared/boostScorePolicy";
import { visibleMatchSql } from "./matchAvailabilityQueries";

// Do not migrate/delete customer rows or create duplicate pairs. Surface the
// existing unsent high-score draft in the owner's queue, on reads only.
export function unclaimedHighBoostReviewSql(now = Date.now()) {
  return and(
    eq(matches.status, "pending"),
    isNull(matches.returnedToPoolAt),
    like(matches.notes, `${BOOST_CANDIDATE_NOTE_MARKER}%`),
    gte(matches.score, MIN_REGULAR_REVIEW_SCORE),
    sql`COALESCE(${visibleMatchSql(BOOST_CANDIDATE_NOTE_MARKER)}, FALSE) = FALSE`,
    sql`NOT EXISTS (
      SELECT 1 FROM match_boost_requests br
      WHERE br.match_id = ${matches.id}
      AND (
        COALESCE(br.fulfilled_at, 0) > 0
        OR br.status IN ('awaiting_payment', 'paid', 'queued', 'reviewing')
      )
    )`,
    sql`NOT EXISTS (
      SELECT 1 FROM match_delivery_events de
      WHERE de.matchId = ${matches.id} AND de.status = 'accepted'
    )`,
  );
}

export function pendingOwnerReviewSql(now = Date.now()) {
  return and(
    eq(matches.status, "pending"),
    or(
      sql`${matches.notes} IS NULL OR ${matches.notes} NOT LIKE ${`%${BOOST_CANDIDATE_NOTE_MARKER}%`}`,
      unclaimedHighBoostReviewSql(now),
    ),
  );
}
