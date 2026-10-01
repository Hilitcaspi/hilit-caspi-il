import type { Match } from "../drizzle/schema";

/** Mirror the direct-send endpoint's active-match guard, including failed deliveries. */
export function blocksNewMatch(match: Pick<Match, "status" | "returnedToPoolAt" | "matchDetailStatus">): boolean {
  return match.status === "proposed"
    || (match.status === "matched" && !match.returnedToPoolAt && match.matchDetailStatus !== "ended");
}

export function matchPairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

type SendableProfile = { id: number; photoUrl?: string | null; email?: string | null };

/** Do not offer a one-click send that the endpoint will reject or that lacks a picture. */
export function canSuggestNewMatch(
  waiting: SendableProfile,
  candidate: SendableProfile,
  blockingIds: ReadonlySet<number>,
  previouslySentPairs: ReadonlySet<string>,
): boolean {
  return waiting.id !== candidate.id
    && !blockingIds.has(waiting.id)
    && !blockingIds.has(candidate.id)
    && Boolean(waiting.photoUrl?.trim() && candidate.photoUrl?.trim())
    && Boolean(waiting.email?.trim() && candidate.email?.trim())
    && !previouslySentPairs.has(matchPairKey(waiting.id, candidate.id));
}
