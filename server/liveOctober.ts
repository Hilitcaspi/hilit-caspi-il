import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { liveOctoberQuestions, liveOctoberTickets, paymentLeads, plusPilotMembers, singles } from "../drizzle/schema";
import { hasActivePlusCouponEntitlement } from "./couponPolicy";
import { LIVE_TEST_CODE, LIVE_TEST_PRICE } from "./liveTestCoupon";

export const LIVE_OCTOBER_SLUG = "matching-secrets-2026-10-31";
export const LIVE_START_ISO = "2026-10-31T20:30:00+02:00";
export const LIVE_CAMPAIGN_CODE = "LIVE";
export const LIVE_FRIEND_CODE = "FRIENDS";
export const LIVE_PRODUCT = "live_october";
// Standalone and FRIENDS ticket sales remain closed until admission is ready.
// A confirmed new database signup may receive a site voucher before Zoom links exist.
export const LIVE_OCTOBER_SALES_OPEN = process.env.LIVE_OCTOBER_SALES_OPEN === "true";
export function isLiveDatabaseGiftOpen(now = Date.now()): boolean {
  return now < new Date(LIVE_START_ISO).getTime();
}

export function isLiveCheckoutOpen(
  product: string | undefined,
  couponCode: string | undefined,
  now = Date.now(),
  ticketSalesOpen = LIVE_OCTOBER_SALES_OPEN,
): boolean {
  if (!isLiveDatabaseGiftOpen(now)) return false;
  if (product === "database" && couponCode === LIVE_CAMPAIGN_CODE) return true;
  return product === LIVE_PRODUCT && ticketSalesOpen;
}

export type LiveTicketSource = "database_live" | "plus" | "friends" | "standalone";
export function normalizeLiveEmail(email: string) { return email.trim().toLowerCase(); }

/** Grow callback must be authenticated by the signed notify URL before this check. */
export function matchesPaidLiveCheckout(input: {
  tier: "database_live" | "friends" | "standalone" | "database_live_test" | "standalone_test";
  product: string | null; couponCode: string | null | undefined;
  webhookProcessToken: string; orderProcessToken: string | null | undefined;
  transactionId: string; transactionToken: string;
  statusCode: unknown; status: unknown; sum: number;
}): boolean {
  const test = input.tier.endsWith("_test");
  const amount = test ? LIVE_TEST_PRICE : input.tier === "database_live" ? 299 : input.tier === "friends" ? 49 : 149;
  const product = input.tier.startsWith("database_live") ? "database" : LIVE_PRODUCT;
  const coupon = test ? LIVE_TEST_CODE : input.tier === "database_live" ? "LIVE" : input.tier === "friends" ? "FRIENDS" : null;
  return Number(input.statusCode) === 2 && (input.status === undefined || String(input.status).trim() === "שולם")
    && /^\d{3,30}$/.test(input.transactionId) && /^[a-zA-Z0-9]{12,200}$/.test(input.transactionToken)
    && !!input.webhookProcessToken && input.webhookProcessToken === input.orderProcessToken
    && input.product === product && input.couponCode === coupon && input.sum === amount;
}

export function liveCheckoutPrice(product: string, coupon: string | undefined): number {
  if (product === LIVE_PRODUCT) {
    if (coupon && coupon !== LIVE_FRIEND_CODE) throw new Error("קוד ההטבה אינו תקף לכרטיס זה");
    return coupon === LIVE_FRIEND_CODE ? 49 : 149;
  }
  if (product === "database" && coupon === LIVE_CAMPAIGN_CODE) return 299;
  throw new Error("מסלול לייב לא מוכר");
}

function newVoucherCode(test = false) { return `${test ? "TEST-" : ""}HC31-${crypto.randomBytes(6).toString("hex").toUpperCase()}`; }

export async function getVerifiedLiveMember(email: string, token: string) {
  const db = await getDb();
  if (!db || !token || token.length < 16) return null;
  const [single] = await db.select({
    id: singles.id, email: singles.email, firstName: singles.firstName, lastName: singles.lastName,
    isPaid: singles.isPaid, isActive: singles.isActive,
  }).from(singles).where(and(
    sql`LOWER(TRIM(${singles.email})) = ${normalizeLiveEmail(email)}`,
    eq(singles.questionnaireToken, token),
  )).limit(1);
  if (!single || !single.isPaid) return null;
  const [plus] = await db.select({
    status: plusPilotMembers.status, billingStatus: plusPilotMembers.billingStatus,
    billingCycleEndsAt: plusPilotMembers.billingCycleEndsAt,
  }).from(plusPilotMembers).where(eq(plusPilotMembers.singleId, single.id)).limit(1);
  const plusActive = hasActivePlusCouponEntitlement(plus);
  if (!plusActive && !single.isActive) return null;
  return { ...single, plus: plusActive };
}

export async function existingLiveTicket(email: string) {
  const db = await getDb();
  if (!db) return null;
  const [ticket] = await db.select().from(liveOctoberTickets).where(and(
    eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG),
    eq(liveOctoberTickets.email, normalizeLiveEmail(email)),
  )).limit(1);
  return ticket && !ticket.revokedAt ? ticket : null;
}

/** Only call for confirmed Grow payments or for a verified active Plus member. */
export async function ensureLiveTicket(input: {
  email: string; name: string; source: LiveTicketSource;
  singleId?: number | null; amountAgorot?: number; transactionId?: string; testCheckout?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = normalizeLiveEmail(input.email);
  const current = await existingLiveTicket(email);
  if (current) return current;
  await db.insert(liveOctoberTickets).values({
    eventSlug: LIVE_OCTOBER_SLUG,
    email,
    name: input.name.trim().slice(0, 200) || "משתתף",
    singleId: input.singleId ?? null,
    source: input.source,
    voucherCode: newVoucherCode(input.testCheckout),
    amountAgorot: input.amountAgorot ?? 0,
    providerTransactionId: input.transactionId || null,
    issuedAt: Date.now(),
  }).onDuplicateKeyUpdate({ set: { issuedAt: sql`${liveOctoberTickets.issuedAt}` } });
  const ticket = await existingLiveTicket(email);
  if (!ticket) throw new Error("Live voucher was not issued");
  return ticket;
}

export async function ensurePlusLiveTicket(email: string, token: string) {
  const member = await getVerifiedLiveMember(email, token);
  if (!member?.plus) return null;
  return ensureLiveTicket({
    email: member.email || normalizeLiveEmail(email), name: [member.firstName, member.lastName].filter(Boolean).join(" "),
    singleId: member.id, source: "plus",
  });
}

/** Used only after Plus payment was fulfilled or by the existing-member backfill. */
export async function ensurePaidPlusLiveTicket(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [member] = await db.select({
    singleId: singles.id, email: singles.email, firstName: singles.firstName, lastName: singles.lastName,
    isPaid: singles.isPaid, status: plusPilotMembers.status,
    billingStatus: plusPilotMembers.billingStatus, billingCycleEndsAt: plusPilotMembers.billingCycleEndsAt,
  }).from(singles).innerJoin(plusPilotMembers, eq(plusPilotMembers.singleId, singles.id))
    .where(sql`LOWER(TRIM(${singles.email})) = ${normalizeLiveEmail(email)}`).limit(1);
  if (!member?.isPaid || !hasActivePlusCouponEntitlement(member)) return null;
  return ensureLiveTicket({
    email: member.email || normalizeLiveEmail(email),
    name: [member.firstName, member.lastName].filter(Boolean).join(" "),
    singleId: member.singleId, source: "plus",
  });
}

export async function liveTicketByReceipt(trackingToken: string) {
  if (!/^[a-f0-9]{64}$/.test(trackingToken)) return null;
  const db = await getDb();
  if (!db) return null;
  const [receipt] = await db.select({
    email: paymentLeads.email,
    product: paymentLeads.product,
    couponCode: paymentLeads.couponCode,
    confirmedAt: paymentLeads.confirmedAt,
    amountAgorot: paymentLeads.confirmedAmountAgorot,
  }).from(paymentLeads).where(eq(paymentLeads.trackingToken, trackingToken)).limit(1);
  if (!receipt?.confirmedAt) return null;
  const newDatabase = receipt.product === "database" && receipt.couponCode === LIVE_CAMPAIGN_CODE && receipt.amountAgorot === 29900;
  const purchasedTicket = receipt.product === LIVE_PRODUCT &&
    ((receipt.couponCode === LIVE_FRIEND_CODE && receipt.amountAgorot === 4900) ||
      (!receipt.couponCode && receipt.amountAgorot === 14900));
  const testPurchase = receipt.couponCode === LIVE_TEST_CODE && receipt.amountAgorot === 100 &&
    (receipt.product === "database" || receipt.product === LIVE_PRODUCT);
  if (!newDatabase && !purchasedTicket && !testPurchase) return null;
  const ticket = await existingLiveTicket(receipt.email);
  return ticket && (testPurchase === ticket.voucherCode.startsWith("TEST-")) ? ticket : null;
}

export async function submitLiveQuestion(ticketId: number, question: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const body = question.trim();
  if (body.length < 8 || body.length > 1500) throw new Error("השאלה צריכה לכלול בין 8 ל־1500 תווים");
  const [count] = await db.select({ total: sql<number>`count(*)` }).from(liveOctoberQuestions)
    .where(eq(liveOctoberQuestions.ticketId, ticketId));
  if (Number(count?.total ?? 0) >= 3) throw new Error("אפשר לשלוח עד שלוש שאלות לקראת הלייב");
  await db.insert(liveOctoberQuestions).values({ ticketId, body, createdAt: Date.now() });
  return { success: true as const };
}
