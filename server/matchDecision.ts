import { eq, or } from "drizzle-orm";
import { matches } from "../drizzle/schema";
import { getDb } from "./db";
import { getProposalDeadline } from "../shared/matchAvailability";

type Match = typeof matches.$inferSelect;

/** Rejected status alone is not proof that a participant actually voted no. */
function hasRecordedDecline(match: Match, isA: boolean) {
  return (
    Boolean(isA ? match.tokenAUsedAt : match.tokenBUsedAt) &&
    (isA ? match.approvedByA : match.approvedByB) === false
  );
}

export function classifyMatchDecision(
  match: Match,
  token: string,
  now: number
) {
  const isA = match.approvalTokenA === token;
  if (!isA && match.approvalTokenB !== token)
    return { kind: "invalid" as const, isA };
  if (isA ? match.tokenAUsedAt : match.tokenBUsedAt)
    return { kind: "already" as const, isA };
  const deadline = getProposalDeadline(match);
  if (match.status === "expired" || (deadline != null && now >= deadline)) {
    return { kind: "expired" as const, isA };
  }
  if (match.returnedToPoolAt || match.matchDetailStatus === "ended")
    return { kind: "closed" as const, isA };
  if (match.status === "rejected") {
    // A false default without a used token is NOT evidence of a decline.
    return {
      kind:
        deadline != null && hasRecordedDecline(match, !isA)
          ? ("feedback" as const)
          : ("closed" as const),
      isA,
    };
  }
  if (match.status === "matched") return { kind: "closed" as const, isA };
  return { kind: "active" as const, isA };
}

export type MatchResponseOutcome =
  | "matched"
  | "waiting"
  | "not_matched"
  | "closed";

/**
 * Public participant view, not the raw match lifecycle. An unused token sees the
 * same proposal whether the other participant is waiting, said yes, or said no.
 * This changes disclosure only; availability and transactional guards stay intact.
 */
export function getMatchResponseView(match: Match, token: string, now: number) {
  const policy = classifyMatchDecision(match, token, now);
  const alreadyResponded = policy.kind === "already";
  const myDecision = alreadyResponded
    ? policy.isA
      ? match.approvedByA
      : match.approvedByB
    : null;
  const deadline = getProposalDeadline(match);
  const manuallyClosed =
    Boolean(match.returnedToPoolAt) || match.matchDetailStatus === "ended";
  const mutualYes =
    match.status === "matched" &&
    match.approvedByA === true &&
    match.approvedByB === true;
  const isExpired =
    match.status === "expired" ||
    (!mutualYes && deadline != null && now >= deadline);
  let responseOutcome: MatchResponseOutcome | null = null;
  if (alreadyResponded) {
    if (manuallyClosed) responseOutcome = "closed";
    else if (mutualYes) responseOutcome = "matched";
    else if (
      hasRecordedDecline(match, true) ||
      hasRecordedDecline(match, false)
    )
      responseOutcome = "not_matched";
    else if (isExpired || match.status === "rejected")
      responseOutcome = "closed";
    else responseOutcome = "waiting";
  }
  return {
    canRespond: policy.kind === "active" || policy.kind === "feedback",
    closed: policy.kind === "closed" || policy.kind === "invalid",
    isExpired,
    alreadyResponded,
    myDecision,
    // Preserve legacy clients without exposing the partner's decision pre-vote.
    status: alreadyResponded ? match.status : ("proposed" as const),
    responseOutcome,
  };
}

/** Serializes both participants' decisions. No provider calls occur in this transaction. */
export async function recordMatchDecision(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  token: string,
  response: "yes" | "no",
  clock: number | (() => number) = Date.now
) {
  return db.transaction(async (tx) => {
    const [match] = await tx
      .select()
      .from(matches)
      .where(
        or(eq(matches.approvalTokenA, token), eq(matches.approvalTokenB, token))
      )
      .limit(1)
      .for("update");
    if (!match) return { kind: "invalid" as const };
    const now = typeof clock === "function" ? clock() : clock;
    const policy = classifyMatchDecision(match, token, now);
    if (policy.kind !== "active" && policy.kind !== "feedback") {
      return { ...policy, match };
    }
    const yes = response === "yes";
    const otherYes = policy.isA
      ? match.approvedByB === true
      : match.approvedByA === true;
    const becameMatched = policy.kind === "active" && yes && otherYes;
    const nextStatus =
      policy.kind === "feedback" || !yes
        ? "rejected"
        : becameMatched
          ? "matched"
          : match.status;
    await tx
      .update(matches)
      .set({
        ...(policy.isA
          ? { tokenAUsedAt: now, approvedByA: yes }
          : { tokenBUsedAt: now, approvedByB: yes }),
        status: nextStatus,
        ...(becameMatched ? { matchedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(matches.id, match.id));
    return {
      kind: "recorded" as const,
      match,
      isA: policy.isA,
      lateFeedback: policy.kind === "feedback",
      becameMatched,
      status: nextStatus,
    };
  });
}
