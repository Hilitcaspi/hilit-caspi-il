import { eq, or } from "drizzle-orm";
import { matches } from "../drizzle/schema";
import { getDb } from "./db";
import { getProposalDeadline } from "../shared/matchAvailability";

type Match = typeof matches.$inferSelect;
export function classifyMatchDecision(match: Match, token: string, now: number) {
  const isA = match.approvalTokenA === token;
  if (!isA && match.approvalTokenB !== token) return { kind: "invalid" as const, isA };
  if (isA ? match.tokenAUsedAt : match.tokenBUsedAt) return { kind: "already" as const, isA };
  const deadline = getProposalDeadline(match);
  if (match.status === "expired" || (deadline != null && now >= deadline)) {
    return { kind: "expired" as const, isA };
  }
  if (match.returnedToPoolAt || match.matchDetailStatus === "ended") return { kind: "closed" as const, isA };
  if (match.status === "rejected") {
    const otherUsed = isA ? match.tokenBUsedAt : match.tokenAUsedAt;
    const otherDecision = isA ? match.approvedByB : match.approvedByA;
    // A false default without a used token is NOT evidence of a decline.
    return { kind: deadline != null && otherUsed && otherDecision === false ? "feedback" as const : "closed" as const, isA };
  }
  if (match.status === "matched") return { kind: "closed" as const, isA };
  return { kind: "active" as const, isA };
}

/** Serializes both participants' decisions. No provider calls occur in this transaction. */
export async function recordMatchDecision(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  token: string,
  response: "yes" | "no",
  clock: number | (() => number) = Date.now,
) {
  return db.transaction(async (tx) => {
    const [match] = await tx.select().from(matches).where(or(
      eq(matches.approvalTokenA, token), eq(matches.approvalTokenB, token),
    )).limit(1).for("update");
    if (!match) return { kind: "invalid" as const };
    const now = typeof clock === "function" ? clock() : clock;
    const policy = classifyMatchDecision(match, token, now);
    if (policy.kind !== "active" && policy.kind !== "feedback") {
      return { ...policy, match };
    }
    const yes = response === "yes";
    const otherYes = policy.isA ? match.approvedByB === true : match.approvedByA === true;
    const becameMatched = policy.kind === "active" && yes && otherYes;
    const nextStatus = policy.kind === "feedback" || !yes ? "rejected" : becameMatched ? "matched" : match.status;
    await tx.update(matches).set({
      ...(policy.isA ? { tokenAUsedAt: now, approvedByA: yes } : { tokenBUsedAt: now, approvedByB: yes }),
      status: nextStatus,
      ...(becameMatched ? { matchedAt: now } : {}),
      updatedAt: now,
    }).where(eq(matches.id, match.id));
    return { kind: "recorded" as const, match, isA: policy.isA, lateFeedback: policy.kind === "feedback", becameMatched, status: nextStatus };
  });
}
