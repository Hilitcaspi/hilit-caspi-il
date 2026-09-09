import { and, eq, isNull } from "drizzle-orm";
import { matches } from "../drizzle/schema";
import type { getDb } from "./db";
import { sendSMS } from "./vibrate";

type AppDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type MatchSide = "A" | "B";
export type BoostRecipientRole = "sender" | "recipient";
type SmsSender = (phone: string, message: string) => Promise<boolean>;

export type MatchSmsRecipient = {
  side: MatchSide;
  phone?: string | null;
  firstName: string;
  matchFirstName: string;
  isActive?: boolean | null;
  isSeed?: boolean | null;
};

function canReceiveMatchSms(recipient: Omit<MatchSmsRecipient, "side">): recipient is Omit<MatchSmsRecipient, "side"> & { phone: string } {
  return Boolean(recipient.phone && recipient.isActive !== false && recipient.isSeed !== true);
}

export function buildInitialMatchSmsMessage(
  firstName: string,
  matchFirstName: string,
  score: number,
  proposalSource: "manual" | "boost" = "manual",
  boostRole: BoostRecipientRole = "recipient",
): string {
  if (proposalSource === "boost") {
    if (boostRole === "sender") {
      return `היי ${firstName}, בקשת ה־Boost שלך עם ${score}% התאמה נשלחה לשני הצדדים. השליחה והתשלום אינם אישור להתאמה. התמונה, הפרטים וכפתורי האישור מחכים במייל. הילית כספי`;
    }
    return `היי ${firstName}, נשלחה אליך התאמת Boost עם ${score}% התאמה. זו הצעה אלגוריתמית שלא נבחרה אישית על ידי הילית. התמונה, הפרטים וכפתורי האישור מחכים במייל. הילית כספי`;
  }
  return `היי ${firstName}, שלחתי לך במייל התאמה של ${score}% שבחרתי עבורך. ${matchFirstName} מחכה לתשובתך. כדאי לבדוק גם בספאם ובתיקיית השיווק ולאשר או לדחות דרך המייל. הילית`;
}

export function buildMatchFollowUpSmsMessage(firstName: string, proposalSource: "regular" | "boost"): string {
  const matchLabel = proposalSource === "boost" ? "התאמת ה־Boost" : "ההתאמה";
  return `היי ${firstName}, ${matchLabel} שנשלחה אליך עדיין ממתינה לתשובה. הפרטים וכפתורי האישור נמצאים במייל; כדאי לבדוק גם בספאם ובתיקיית השיווק. הילית כספי`;
}

export function buildMatchExpiredSmsMessage(firstName: string): string {
  return `היי ${firstName}, ההתאמה האחרונה פגה לאחר שלא התקבלה תשובה בתוך 48 שעות. בהתאמה הבאה חשוב להשיב בזמן כדי לשמור אותה פעילה. הילית כספי`;
}

export function didClaimMatchSms(result: unknown): boolean {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: number } | undefined)?.affectedRows ?? 0) > 0;
}

export async function sendInitialMatchSmsOnce(
  db: AppDb,
  input: {
    matchId: number;
    score: number;
    recipientA: Omit<MatchSmsRecipient, "side">;
    recipientB: Omit<MatchSmsRecipient, "side">;
    proposalSource?: "manual" | "boost";
    boostSenderSide?: MatchSide;
  },
  sender: SmsSender = sendSMS,
) {
  try {
    // waSentAt is the existing production idempotency column. It is retained for
    // backwards-compatible schema use, but now claims the initial SMS delivery.
    const claimResult = await db.update(matches)
      .set({ waSentAt: Date.now() })
      .where(and(eq(matches.id, input.matchId), isNull(matches.waSentAt)));
    if (!didClaimMatchSms(claimResult)) {
      console.log(`[MatchSms] Skipping match ${input.matchId}; initial SMS already claimed`);
      return { skipped: true, sentA: false, sentB: false };
    }

    const messageA = canReceiveMatchSms(input.recipientA)
      ? buildInitialMatchSmsMessage(
          input.recipientA.firstName,
          input.recipientA.matchFirstName,
          input.score,
          input.proposalSource,
          input.proposalSource === "boost" && input.boostSenderSide === "A" ? "sender" : "recipient",
        )
      : null;
    const messageB = canReceiveMatchSms(input.recipientB)
      ? buildInitialMatchSmsMessage(
          input.recipientB.firstName,
          input.recipientB.matchFirstName,
          input.score,
          input.proposalSource,
          input.proposalSource === "boost" && input.boostSenderSide === "B" ? "sender" : "recipient",
        )
      : null;

    const [sentA, sentB] = await Promise.all([
      messageA && canReceiveMatchSms(input.recipientA) ? sender(input.recipientA.phone, messageA) : Promise.resolve(false),
      messageB && canReceiveMatchSms(input.recipientB) ? sender(input.recipientB.phone, messageB) : Promise.resolve(false),
    ]);
    return { skipped: false, sentA, sentB };
  } catch (error) {
    console.error(`[MatchSms] Initial SMS delivery failed for match ${input.matchId}:`, error);
    return { skipped: false, sentA: false, sentB: false };
  }
}
