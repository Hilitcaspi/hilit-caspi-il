import { and, eq, isNull } from "drizzle-orm";
import { matches } from "../drizzle/schema";
import type { getDb } from "./db";

type AppDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type MatchSide = "A" | "B";

export type MatchWhatsAppRecipient = {
  side: MatchSide;
  phone?: string | null;
  firstName: string;
  matchFirstName: string;
};

export type MatchWhatsAppPayload = {
  event: "match_proposal_sent";
  channel: "whatsapp";
  idempotencyKey: string;
  matchId: number;
  recipientSide: MatchSide;
  phone: string;
  message: string;
  recipientName: string;
  matchFirstName: string;
  score: number;
};

export function normalizeWhatsAppPhone(phone: string): string | null {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("05")) normalized = `972${normalized.slice(1)}`;
  if (normalized.startsWith("5") && normalized.length === 9) normalized = `972${normalized}`;
  return /^9725\d{8}$/.test(normalized) ? normalized : null;
}

export function buildMatchWhatsAppMessage(firstName: string, matchFirstName: string, score: number): string {
  return `היי ${firstName}\n\nשלחתי לך מייל עם התאמה של ${score}% מיוחדת שבחרתי עבורך, ${matchFirstName} מחכה לתשובתך!\n\nכדאי לבדוק את תיבת המייל (גם ספאם והשיווק) וללחוץ על הקישור.\n\nהילית 💛`;
}

export function buildMatchWhatsAppPayload(input: {
  matchId: number;
  score: number;
  recipient: MatchWhatsAppRecipient;
}): MatchWhatsAppPayload | null {
  const phone = input.recipient.phone ? normalizeWhatsAppPhone(input.recipient.phone) : null;
  if (!phone) return null;
  return {
    event: "match_proposal_sent",
    channel: "whatsapp",
    idempotencyKey: `match-${input.matchId}-${input.recipient.side}`,
    matchId: input.matchId,
    recipientSide: input.recipient.side,
    phone,
    message: buildMatchWhatsAppMessage(input.recipient.firstName, input.recipient.matchFirstName, input.score),
    recipientName: input.recipient.firstName,
    matchFirstName: input.recipient.matchFirstName,
    score: input.score,
  };
}

export function didClaimMatchWhatsApp(result: unknown): boolean {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: number } | undefined)?.affectedRows ?? 0) > 0;
}

export async function postMatchWhatsAppWebhook(
  payload: MatchWhatsAppPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const webhookUrl = process.env.MATCH_WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[MatchWhatsApp] MATCH_WHATSAPP_WEBHOOK_URL is not configured");
    return false;
  }

  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      console.error(`[MatchWhatsApp] Make webhook rejected ${payload.idempotencyKey}: ${response.status} ${responseText.slice(0, 160)}`);
      return false;
    }
    console.log(`[MatchWhatsApp] Make webhook accepted ${payload.idempotencyKey} for ${payload.phone.slice(0, 5)}****${payload.phone.slice(-2)}`);
    return true;
  } catch (error) {
    console.error(`[MatchWhatsApp] Make webhook failed for ${payload.idempotencyKey}:`, error);
    return false;
  }
}

export async function sendInitialMatchWhatsAppsOnce(
  db: AppDb,
  input: {
    matchId: number;
    score: number;
    recipientA: Omit<MatchWhatsAppRecipient, "side">;
    recipientB: Omit<MatchWhatsAppRecipient, "side">;
  },
) {
  try {
    if (!process.env.MATCH_WHATSAPP_WEBHOOK_URL) {
      console.warn("[MatchWhatsApp] Webhook is not configured; leaving the match available for a later retry");
      return { skipped: false, sentA: false, sentB: false };
    }
    const claimResult = await db.update(matches)
      .set({ waSentAt: Date.now() })
      .where(and(eq(matches.id, input.matchId), isNull(matches.waSentAt)));
    if (!didClaimMatchWhatsApp(claimResult)) {
      console.log(`[MatchWhatsApp] Skipping match ${input.matchId}; initial WhatsApp already claimed`);
      return { skipped: true, sentA: false, sentB: false };
    }

    const payloadA = buildMatchWhatsAppPayload({ matchId: input.matchId, score: input.score, recipient: { ...input.recipientA, side: "A" } });
    const payloadB = buildMatchWhatsAppPayload({ matchId: input.matchId, score: input.score, recipient: { ...input.recipientB, side: "B" } });
    const [sentA, sentB] = await Promise.all([
      payloadA ? postMatchWhatsAppWebhook(payloadA) : Promise.resolve(false),
      payloadB ? postMatchWhatsAppWebhook(payloadB) : Promise.resolve(false),
    ]);
    return { skipped: false, sentA, sentB };
  } catch (error) {
    console.error(`[MatchWhatsApp] Initial WhatsApp delivery failed for match ${input.matchId}:`, error);
    return { skipped: false, sentA: false, sentB: false };
  }
}
