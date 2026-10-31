import { and, eq, sql } from "drizzle-orm";
import { completedPayments, liveOctoberTickets, plusPilotMembers, singles } from "../drizzle/schema";
import {
  hasPreviouslyActivatedPlus,
} from "../shared/plusWednesdayOffer";
import {
  isLivePostOfferAccountTicket,
  isLivePostOfferCode,
  isLivePostOfferPaymentTime,
  isLivePostOfferTicket,
  LIVE_POST_DATABASE_CODE,
  LIVE_POST_PLUS_CODE,
  normalizeLivePostOfferEmail,
} from "../shared/livePostOffer";
import { hasPaidDatabaseMembership } from "../shared/plusDatabaseEligibility";
import { getDb } from "./db";
import { requirePlusDatabaseCheckout } from "./plusDatabaseCheckout";

export type LivePostOfferEligibility =
  | { valid: true; code: typeof LIVE_POST_DATABASE_CODE | typeof LIVE_POST_PLUS_CODE; singleId?: number }
  | { valid: false; error: string };

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function matchingActualTickets(db: Db, email: string) {
  const normalizedEmail = normalizeLivePostOfferEmail(email);
  const tickets = await db.select({
    eventSlug: liveOctoberTickets.eventSlug,
    email: liveOctoberTickets.email,
    revokedAt: liveOctoberTickets.revokedAt,
    voucherCode: liveOctoberTickets.voucherCode,
    singleId: liveOctoberTickets.singleId,
  }).from(liveOctoberTickets).where(and(
    eq(liveOctoberTickets.eventSlug, "matching-secrets-2026-10-31"),
    sql`LOWER(TRIM(${liveOctoberTickets.email})) = ${normalizedEmail}`,
  ));
  return tickets.filter(ticket => isLivePostOfferTicket(ticket, normalizedEmail));
}

/**
 * Authorizes only the two post-event service codes. This never consults or
 * writes discount_codes: both offers retain ordinary current pricing.
 */
export async function validateLivePostOfferCheckout(input: {
  code: string | null | undefined;
  product: string | null | undefined;
  email: string;
  personalToken?: string | null;
  now?: number;
  db?: Db;
}): Promise<LivePostOfferEligibility> {
  const code = String(input.code || "").trim().toUpperCase();
  if (!isLivePostOfferCode(code)) return { valid: false, error: "קוד הטבת הלייב אינו תקף" };
  const now = input.now ?? Date.now();
  if (!isLivePostOfferPaymentTime(now)) {
    return { valid: false, error: "הטבת הלייב הסתיימה. המחיר הרגיל נשאר בתוקף." };
  }
  const product = String(input.product || "");
  const expectedProduct = code === LIVE_POST_DATABASE_CODE ? "database" : "plus";
  if (product !== expectedProduct) {
    return { valid: false, error: "קוד ההטבה אינו תקף למוצר הזה" };
  }
  const db = input.db || await getDb();
  if (!db) return { valid: false, error: "לא ניתן לאמת זכאות להטבה כרגע" };
  const email = normalizeLivePostOfferEmail(input.email);
  const tickets = await matchingActualTickets(db, email);
  if (tickets.length === 0) {
    return { valid: false, error: "הטבת הלייב זמינה רק לנרשמים מאומתים ללייב" };
  }

  if (code === LIVE_POST_DATABASE_CODE) {
    const [[member], [priorPurchase]] = await Promise.all([
      db.select({ isPaid: singles.isPaid, isActive: singles.isActive, isSeed: singles.isSeed, market: singles.market })
        .from(singles).where(sql`LOWER(TRIM(${singles.email})) = ${email}`).limit(1),
      db.select({ id: completedPayments.id }).from(completedPayments).where(and(
        sql`LOWER(TRIM(${completedPayments.email})) = ${email}`,
        eq(completedPayments.product, "database"),
      )).limit(1),
    ]);
    if (hasPaidDatabaseMembership(member) || priorPurchase) {
      return { valid: false, error: "LIVE48 מיועדת למי שעדיין אינם חברי מאגר בתשלום" };
    }
    return { valid: true, code };
  }

  // The token gates the actual account; a shared email-only link cannot buy a
  // Plus benefit for another member.
  let single: Awaited<ReturnType<typeof requirePlusDatabaseCheckout>>;
  try {
    single = await requirePlusDatabaseCheckout(email, input.personalToken || undefined);
  } catch {
    return { valid: false, error: "LIVEPLUS זמינה רק דרך הקישור האישי של חברות המאגר" };
  }
  if (!tickets.some(ticket => isLivePostOfferAccountTicket(ticket, email, single.id))) {
    return { valid: false, error: "לא ניתן לקשר את כרטיס הלייב לחשבון המאגר המאומת" };
  }
  const [priorPlusMember] = await db.select({
    status: plusPilotMembers.status,
    billingStatus: plusPilotMembers.billingStatus,
    activatedAt: plusPilotMembers.activatedAt,
    lastPaymentAt: plusPilotMembers.lastPaymentAt,
    lastPaymentTransactionId: plusPilotMembers.lastPaymentTransactionId,
  }).from(plusPilotMembers).where(eq(plusPilotMembers.singleId, single.id)).limit(1);
  if (hasPreviouslyActivatedPlus(priorPlusMember)) {
    return { valid: false, error: "LIVEPLUS מיועדת להצטרפות ראשונה ל־Plus בלבד" };
  }
  return { valid: true, code, singleId: single.id };
}
