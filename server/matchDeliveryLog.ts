import { matchDeliveryEvents } from "../drizzle/schema";
import type { getDb } from "./db";

type AppDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type MatchDeliveryLogInput = {
  eventKey: string;
  matchId: number;
  singleId: number;
  side: "A" | "B";
  channel: "email" | "sms";
  attemptType?: "initial" | "manual_resend" | "followup";
  success: boolean;
  providerMessageId?: string | null;
  failureReason?: string | null;
  attemptedAt?: number;
};

export async function recordMatchDelivery(db: AppDb, input: MatchDeliveryLogInput) {
  const attemptedAt = input.attemptedAt || Date.now();
  await db.insert(matchDeliveryEvents).values({
    eventKey: input.eventKey.slice(0, 191),
    matchId: input.matchId,
    singleId: input.singleId,
    side: input.side,
    channel: input.channel,
    attemptType: input.attemptType || "initial",
    status: input.success ? "accepted" : "failed",
    providerMessageId: input.providerMessageId?.slice(0, 255) || null,
    failureReason: input.success ? null : input.failureReason || "provider_not_accepted",
    attemptedAt,
    acceptedAt: input.success ? attemptedAt : null,
  }).onDuplicateKeyUpdate({ set: {
    status: input.success ? "accepted" : "failed",
    providerMessageId: input.providerMessageId?.slice(0, 255) || null,
    failureReason: input.success ? null : input.failureReason || "provider_not_accepted",
    attemptedAt,
    acceptedAt: input.success ? attemptedAt : null,
  } });
}

export function matchDeliveryEventKey(input: {
  matchId: number;
  singleId: number;
  channel: "email" | "sms";
  attemptType?: "initial" | "manual_resend" | "followup";
  attemptRef?: string | number;
}) {
  return [
    "match-delivery",
    input.matchId,
    input.singleId,
    input.channel,
    input.attemptType || "initial",
    input.attemptRef || "first",
  ].join(":");
}

export async function recordProposalEmailResults(db: AppDb, input: {
  matchId: number;
  recipientA: { singleId: number; result: { success: boolean; messageId?: string; error?: string } };
  recipientB: { singleId: number; result: { success: boolean; messageId?: string; error?: string } };
  attemptType?: "initial" | "manual_resend" | "followup";
  attemptRef?: string | number;
}) {
  await Promise.all([
    recordMatchDelivery(db, {
      eventKey: matchDeliveryEventKey({ matchId: input.matchId, singleId: input.recipientA.singleId, channel: "email", attemptType: input.attemptType, attemptRef: input.attemptRef }),
      matchId: input.matchId,
      singleId: input.recipientA.singleId,
      side: "A",
      channel: "email",
      attemptType: input.attemptType,
      success: input.recipientA.result.success,
      providerMessageId: input.recipientA.result.messageId,
      failureReason: input.recipientA.result.error,
    }),
    recordMatchDelivery(db, {
      eventKey: matchDeliveryEventKey({ matchId: input.matchId, singleId: input.recipientB.singleId, channel: "email", attemptType: input.attemptType, attemptRef: input.attemptRef }),
      matchId: input.matchId,
      singleId: input.recipientB.singleId,
      side: "B",
      channel: "email",
      attemptType: input.attemptType,
      success: input.recipientB.result.success,
      providerMessageId: input.recipientB.result.messageId,
      failureReason: input.recipientB.result.error,
    }),
  ]);
}
