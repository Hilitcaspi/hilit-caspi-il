// Boost is the independent 60–79 lane. Scores of 80+ belong to owner review.
// Never clamp a score to fit a lane or relabel an already-sent proposal.
export const MIN_BOOST_SCORE = 60;
export const MAX_BOOST_SCORE = 79;
export const MIN_REGULAR_REVIEW_SCORE = 80;
export const BOOST_CANDIDATE_NOTE_MARKER = "[BOOST_CANDIDATE]";
export const REGULAR_REVIEW_NOTE_MARKER = "[REGULAR_REVIEW]";

export function isBoostScore(score: unknown): boolean {
  const value = Number(score);
  return score !== null && score !== undefined && score !== ""
    && Number.isFinite(value) && value >= MIN_BOOST_SCORE && value <= MAX_BOOST_SCORE;
}

export function isRegularReviewScore(score: unknown): boolean {
  const value = Number(score);
  return score !== null && score !== undefined && score !== ""
    && Number.isFinite(value) && value >= MIN_REGULAR_REVIEW_SCORE && value <= 100;
}

export function isBoostCandidate(match: { score?: unknown; notes?: string | null }): boolean {
  return isBoostScore(match.score)
    && String(match.notes || "").startsWith(BOOST_CANDIDATE_NOTE_MARKER);
}

export function regularReviewNotes(notes: string | null | undefined): string {
  const original = String(notes || "");
  return original.startsWith(BOOST_CANDIDATE_NOTE_MARKER)
    ? original.replace(BOOST_CANDIDATE_NOTE_MARKER, REGULAR_REVIEW_NOTE_MARKER)
    : original;
}
