import { eq, sql } from "drizzle-orm";
import { plusPilotMembers, singles } from "../drizzle/schema";
import { getDb } from "./db";
import { canApplyPlusWednesdayOfferCoupon, isPlusWednesdayOfferPaymentTime, PLUS_WEDNESDAY_OFFER_CODE } from "../shared/plusWednesdayOffer";

/** Preview validation only; createProcess and verified fulfilment recheck separately. */
export async function validatePlusWednesdayCoupon(input: { product?: string; email?: string }, now = Date.now()) {
  if (input.product !== "plus") return { valid: false as const, error: "קוד PLUS מיועד להצטרפות ל־Plus בלבד" };
  if (!isPlusWednesdayOfferPaymentTime(now)) return { valid: false as const, error: "חלון המימוש של הטבת PLUS הסתיים. ההטבה הנוכחית תקפה עד סוף שבת 17.10 לפי שעון ישראל" };
  if (!input.email) return { valid: false as const, error: "יש להזין את כתובת המייל של חברות המאגר כדי לבדוק את ההטבה" };
  const db = await getDb();
  if (!db) return { valid: false as const, error: "לא ניתן לאמת זכאות כרגע. אפשר לנסות שוב." };
  const normalizedEmail = input.email.trim().toLowerCase();
  const [member] = await db.select({ isPaid: singles.isPaid, isActive: singles.isActive }).from(singles)
    .where(sql`LOWER(TRIM(${singles.email})) = ${normalizedEmail}`).limit(1);
  if (!member?.isPaid || !member.isActive) return { valid: false as const, error: "Plus מיועד לחברי מאגר פעילים. יש להשלים קודם את ההצטרפות למאגר." };
  const [priorPlus] = await db.select({ activatedAt: plusPilotMembers.activatedAt, status: plusPilotMembers.status, billingStatus: plusPilotMembers.billingStatus, lastPaymentTransactionId: plusPilotMembers.lastPaymentTransactionId, lastPaymentAt: plusPilotMembers.lastPaymentAt })
    .from(plusPilotMembers).innerJoin(singles, eq(singles.id, plusPilotMembers.singleId))
    .where(sql`LOWER(TRIM(${singles.email})) = ${normalizedEmail}`).limit(1);
  if (!canApplyPlusWednesdayOfferCoupon({ couponCode: PLUS_WEDNESDAY_OFFER_CODE, paidAt: now, existingMember: priorPlus })) {
    return { valid: false as const, error: "הטבת PLUS מיועדת להצטרפות ראשונה בלבד, לא לחידוש מנוי" };
  }
  return { valid: true as const, code: PLUS_WEDNESDAY_OFFER_CODE };
}
