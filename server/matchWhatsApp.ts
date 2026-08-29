import { and, eq, isNull } from "drizzle-orm";
import { matches } from "../drizzle/schema";
import type { getDb } from "./db";
import {
  buildMakeWhatsAppPayload,
  normalizeWhatsAppPhone,
  postWhatsAppWebhook,
  type MakeWhatsAppPayload,
} from "./whatsappWebhook";

export { normalizeWhatsAppPhone } from "./whatsappWebhook";

type AppDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type MatchSide = "A" | "B";
export type BoostRecipientRole = "sender" | "recipient";

export type MatchWhatsAppRecipient = {
  side: MatchSide;
  phone?: string | null;
  firstName: string;
  matchFirstName: string;
};

export type MatchWhatsAppPayload = MakeWhatsAppPayload & {
  event: "match_proposal_sent";
  matchId: number;
  recipientSide: MatchSide;
  recipientName: string;
  matchFirstName: string;
  score: number;
  boostRole?: BoostRecipientRole;
};

export function buildMatchWhatsAppMessage(firstName: string, matchFirstName: string, score: number, proposalSource: "manual" | "boost" = "manual", boostRole: BoostRecipientRole = "recipient"): string {
  if (proposalSource === "boost") {
    if (boostRole === "sender") {
      return `היי ${firstName}\n\nבקשת ה־Boost שלך, עם ${score}% התאמה, נשלחה לצד השני במסגרת מסלול Boost. אין צורך לאשר שוב.\n\nאם תהיה הסכמה מהצד השני, השם, התמונה והפרטים המלאים יישלחו לשניכם במייל.\n\nצוות הילית כספי 💛`;
    }
    return `היי ${firstName}\n\nמחכה לך התאמת Boost מיוחדת עם ${score}% התאמה. ההצעה נוצרה על ידי אלגוריתם ההתאמה ונשלחה במסגרת מסלול Boost. היא לא נבחרה או נבדקה אישית על ידי הילית.\n\nהפרטים האנונימיים והסיבות להתאמה מחכים במייל, גם בספאם ובתיקיית השיווק. השם והתמונה ייחשפו רק לאחר אישור הדדי.\n\nצוות הילית כספי 💛`;
  }
  return `היי ${firstName}\n\nשלחתי לך מייל עם התאמה של ${score}% מיוחדת שבחרתי עבורך, ${matchFirstName} מחכה לתשובתך!\n\nכדאי לבדוק את תיבת המייל (גם ספאם והשיווק) וללחוץ על הקישור.\n\nהילית 💛`;
}

export function buildMatchWhatsAppPayload(input: {
  matchId: number;
  score: number;
  recipient: MatchWhatsAppRecipient;
  proposalSource?: "manual" | "boost";
  boostRole?: BoostRecipientRole;
}): MatchWhatsAppPayload | null {
  if (!input.recipient.phone) return null;
  return buildMakeWhatsAppPayload({
    event: "match_proposal_sent",
    idempotencyKey: `match-${input.matchId}-${input.recipient.side}`,
    phone: input.recipient.phone,
    message: buildMatchWhatsAppMessage(input.recipient.firstName, input.recipient.matchFirstName, input.score, input.proposalSource, input.boostRole),
    metadata: {
      matchId: input.matchId,
      recipientSide: input.recipient.side,
      recipientName: input.recipient.firstName,
      matchFirstName: input.recipient.matchFirstName,
      score: input.score,
      proposalSource: input.proposalSource || "manual",
      ...(input.boostRole ? { boostRole: input.boostRole } : {}),
    },
  }) as MatchWhatsAppPayload | null;
}

export function didClaimMatchWhatsApp(result: unknown): boolean {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: number } | undefined)?.affectedRows ?? 0) > 0;
}

export const postMatchWhatsAppWebhook = postWhatsAppWebhook;

export async function sendInitialMatchWhatsAppsOnce(
  db: AppDb,
  input: {
    matchId: number;
    score: number;
    recipientA: Omit<MatchWhatsAppRecipient, "side">;
    recipientB: Omit<MatchWhatsAppRecipient, "side">;
    proposalSource?: "manual" | "boost";
    boostSenderSide?: MatchSide;
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

    const payloadA = buildMatchWhatsAppPayload({
      matchId: input.matchId,
      score: input.score,
      recipient: { ...input.recipientA, side: "A" },
      proposalSource: input.proposalSource,
      boostRole: input.proposalSource === "boost" ? (input.boostSenderSide === "A" ? "sender" : "recipient") : undefined,
    });
    const payloadB = buildMatchWhatsAppPayload({
      matchId: input.matchId,
      score: input.score,
      recipient: { ...input.recipientB, side: "B" },
      proposalSource: input.proposalSource,
      boostRole: input.proposalSource === "boost" ? (input.boostSenderSide === "B" ? "sender" : "recipient") : undefined,
    });
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
