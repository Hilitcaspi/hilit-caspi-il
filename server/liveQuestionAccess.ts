import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { liveOctoberTickets, plusPilotMembers } from "../drizzle/schema";
import { hasActivePlusCouponEntitlement } from "./couponPolicy";
import { getDb } from "./db";
import { LIVE_OCTOBER_SLUG, LIVE_START_ISO } from "./liveOctober";

/** The URL fragment carries this capability; it is not sent in HTTP requests or referrer headers. */
const TOKEN_FORMAT = /^(?:[1-9]\d{0,9})\.[A-Za-z0-9_-]{43}$/;
const QUESTION_DEADLINE = Date.parse(LIVE_START_ISO);

type QuestionTicket = Pick<typeof liveOctoberTickets.$inferSelect,
  "id" | "eventSlug" | "email" | "voucherCode" | "issuedAt" | "revokedAt" | "source" | "singleId">;

function questionKey(): Buffer | null {
  const secret = process.env.JWT_SECRET?.trim();
  return secret ? crypto.createHash("sha256").update("live-question-link:v1\0").update(secret).digest() : null;
}

function signature(ticket: QuestionTicket, key: Buffer): Buffer {
  return crypto.createHmac("sha256", key)
    .update(JSON.stringify([ticket.id, ticket.eventSlug, ticket.email, ticket.voucherCode, ticket.issuedAt]))
    .digest();
}

/** Only generate for an actual, non-revoked event ticket; never use a voucher as the URL secret. */
export function liveQuestionToken(ticket: QuestionTicket): string {
  if (ticket.eventSlug !== LIVE_OCTOBER_SLUG || ticket.revokedAt || ticket.voucherCode.startsWith("TEST-")) {
    throw new Error("Question link unavailable");
  }
  const key = questionKey();
  if (!key) throw new Error("Question signing unavailable");
  return `${ticket.id}.${signature(ticket, key).toString("base64url")}`;
}

export function verifyLiveQuestionToken(token: string, ticket: QuestionTicket, now = Date.now()): boolean {
  if (!TOKEN_FORMAT.test(token) || ticket.eventSlug !== LIVE_OCTOBER_SLUG || ticket.revokedAt
      || ticket.voucherCode.startsWith("TEST-") || now >= QUESTION_DEADLINE) return false;
  const [id, supplied] = token.split(".");
  const key = questionKey();
  if (!key || id !== String(ticket.id)) return false;
  const received = Buffer.from(supplied, "base64url");
  const expected = signature(ticket, key);
  return received.length === expected.length && received.toString("base64url") === supplied
    && crypto.timingSafeEqual(received, expected);
}

/** Check the database again on every read and mutation, so revoked and expired Plus tickets lose access. */
export async function liveQuestionTicket(token: string) {
  if (!TOKEN_FORMAT.test(token) || Date.now() >= QUESTION_DEADLINE) return null;
  const id = Number(token.split(".")[0]);
  if (!Number.isSafeInteger(id)) return null;
  const db = await getDb();
  if (!db) return null;
  const [ticket] = await db.select().from(liveOctoberTickets)
    .where(and(eq(liveOctoberTickets.id, id), eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG))).limit(1);
  if (!ticket || !verifyLiveQuestionToken(token, ticket)) return null;
  if (ticket.source === "plus") {
    if (!ticket.singleId) return null;
    const [plus] = await db.select({
      status: plusPilotMembers.status, billingStatus: plusPilotMembers.billingStatus,
      billingCycleEndsAt: plusPilotMembers.billingCycleEndsAt,
    }).from(plusPilotMembers).where(eq(plusPilotMembers.singleId, ticket.singleId)).limit(1);
    if (!hasActivePlusCouponEntitlement(plus)) return null;
  }
  return ticket;
}
