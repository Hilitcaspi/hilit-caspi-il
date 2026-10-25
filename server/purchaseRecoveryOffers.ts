import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  completedPayments,
  matchBoostRequests,
  paymentLeads,
  plusPilotMembers,
  purchaseRecoveryRecipients,
  singles,
} from "../drizzle/schema";
import {
  RECOVERY_CAMPAIGN,
  RECOVERY_OFFER_EXPIRES_AT,
  type PurchaseRecoveryProduct,
  recoveryOfferCode,
} from "../shared/purchaseRecoveryLinks";
import { hasPaidDatabaseMembership } from "../shared/plusDatabaseEligibility";
import { hasPreviouslyActivatedPlus } from "../shared/plusWednesdayOffer";
import { getDb } from "./db";

const RESERVATION_MS = 20 * 60 * 1000;
const REFERENCE_VERSION = 1;
const RESERVATION_PREFIX = "recovery-reservation:";

export type PurchaseRecoveryOffer = {
  product: PurchaseRecoveryProduct;
  code: string;
  /** The exact Grow amount. Never derive this through generic whole-shekel rounding. */
  fixedPrice?: number;
  expectedAmountAgorot: number;
  kind: "discount" | "plus_gift";
};

export type RecoveryCheckoutReference = {
  recipientId: number;
  product: PurchaseRecoveryProduct;
  emailHash: string;
  issuedAt: number;
  reservationNonce: string;
};

export type RecoveryEligibility =
  | { eligible: true; offer: PurchaseRecoveryOffer; recipientId: number }
  | { eligible: false; error: string };

const GENERIC_UNAVAILABLE = "לא ניתן לאמת את ההטבה עבור הפרטים שהוזנו";
const RECOVERY_OFFERS: Record<PurchaseRecoveryProduct, PurchaseRecoveryOffer> = {
  database: { product: "database", code: "MATCH10", fixedPrice: 269.1, expectedAmountAgorot: 26910, kind: "discount" },
  session: { product: "session", code: "LOVE10DAY", fixedPrice: 450, expectedAmountAgorot: 45000, kind: "discount" },
  plus: { product: "plus", code: "PLUSGIFT", expectedAmountAgorot: 9900, kind: "plus_gift" },
};

function canonicalEmail(value: string) {
  return value.trim().toLowerCase();
}

function timingSafeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signingSecret() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value || value.length < 16) throw new Error("purchase_recovery_reference_secret_unavailable");
  return value;
}

function emailHash(email: string) {
  return crypto.createHash("sha256").update(canonicalEmail(email)).digest("hex").slice(0, 32);
}

function sign(payload: string) {
  return crypto.createHmac("sha256", signingSecret())
    .update(`purchase-recovery:v1:${payload}`)
    .digest("base64url");
}

function reservationKey(nonce: string) {
  return `${RESERVATION_PREFIX}${nonce}`;
}

function offerForCode(code: string | null | undefined): PurchaseRecoveryOffer | null {
  const normalized = String(code || "").trim().toUpperCase();
  return Object.values(RECOVERY_OFFERS).find(offer => offer.code === normalized) || null;
}

/** Returns a recovery-only offer; unrelated discount codes remain on their existing path. */
export function getPurchaseRecoveryOffer(product: string | null | undefined, code: string | null | undefined): PurchaseRecoveryOffer | null {
  const offer = offerForCode(code);
  return offer && offer.product === product ? offer : null;
}

export function isPurchaseRecoveryOfferCode(code: string | null | undefined) {
  return Boolean(offerForCode(code));
}

/** The recovery Plus gift is represented by the existing reusable-credit contract. */
export function hasPurchaseRecoveryPlusGiftStorage() {
  const request = matchBoostRequests as unknown as Record<string, unknown>;
  return Boolean(
    request.matchId
    && request.source
    && request.status
    && request.amountAgorot
    && request.idempotencyKey
    && request.decisionReason,
  );
}

export function isPurchaseRecoveryOfferOpen(now = Date.now()) {
  return Number.isFinite(now) && now <= RECOVERY_OFFER_EXPIRES_AT;
}

/**
 * Creates a signed, non-PII provider callback reference. It intentionally does
 * not embed a browser tracking id or a mutable payment_leads row identity.
 */
export function createPurchaseRecoveryCheckoutReference(input: {
  recipientId: number;
  email: string;
  product: PurchaseRecoveryProduct;
  now?: number;
  reservationNonce?: string;
}) {
  const now = input.now ?? Date.now();
  if (!isPurchaseRecoveryOfferOpen(now)) throw new Error("purchase_recovery_offer_expired");
  const nonce = input.reservationNonce || crypto.randomBytes(18).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    v: REFERENCE_VERSION,
    c: RECOVERY_CAMPAIGN,
    r: input.recipientId,
    p: input.product,
    h: emailHash(input.email),
    i: now,
    n: nonce,
  }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * Valid after the public window only so a provider's delayed callback can prove
 * it belongs to a checkout reserved during the offer. It cannot open a new
 * checkout after expiry because creation/reservation separately require open.
 */
export function verifyPurchaseRecoveryCheckoutReference(reference: string | undefined, email: string, now = Date.now()): RecoveryCheckoutReference | null {
  if (!reference || reference.length > 500) return null;
  const [payload, suppliedSignature, extra] = reference.split(".");
  if (!payload || !suppliedSignature || extra || !timingSafeEqual(suppliedSignature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed?.v !== REFERENCE_VERSION || parsed?.c !== RECOVERY_CAMPAIGN
      || !Number.isInteger(parsed?.r) || parsed.r <= 0
      || !["database", "session", "plus"].includes(parsed?.p)
      || typeof parsed?.h !== "string" || parsed.h !== emailHash(email)
      || !Number.isFinite(parsed?.i) || parsed.i > now + 60_000
      || parsed.i > RECOVERY_OFFER_EXPIRES_AT
      || typeof parsed?.n !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(parsed.n)) return null;
    return {
      recipientId: parsed.r,
      product: parsed.p,
      emailHash: parsed.h,
      issuedAt: parsed.i,
      reservationNonce: parsed.n,
    };
  } catch {
    return null;
  }
}

async function findPriorPurchase(db: any, email: string, product: PurchaseRecoveryProduct, excludeTransactionId?: string) {
  const normalized = canonicalEmail(email);
  const [completed, confirmed] = await Promise.all([
    db.select({ transactionId: completedPayments.transactionId }).from(completedPayments)
      .where(and(
        sql`LOWER(TRIM(${completedPayments.email})) = ${normalized}`,
        eq(completedPayments.product, product),
      )).limit(10),
    db.select({ transactionId: paymentLeads.confirmedTransactionId }).from(paymentLeads)
      .where(and(
        sql`LOWER(TRIM(${paymentLeads.email})) = ${normalized}`,
        eq(paymentLeads.product, product),
        sql`${paymentLeads.confirmedAt} IS NOT NULL`,
      )).limit(10),
  ]);
  return [...completed, ...confirmed].some(row => String(row.transactionId || "") !== String(excludeTransactionId || ""));
}

async function evaluateEligibility(db: any, input: {
  email: string;
  product: PurchaseRecoveryProduct;
  code: string;
  now: number;
  requireOpenWindow: boolean;
  excludeTransactionId?: string;
}): Promise<RecoveryEligibility> {
  const offer = getPurchaseRecoveryOffer(input.product, input.code);
  if (!offer || (input.requireOpenWindow && !isPurchaseRecoveryOfferOpen(input.now))) return { eligible: false, error: GENERIC_UNAVAILABLE };
  if (offer.kind === "plus_gift" && !hasPurchaseRecoveryPlusGiftStorage()) return { eligible: false, error: GENERIC_UNAVAILABLE };
  const email = canonicalEmail(input.email);
  if (!email.includes("@")) return { eligible: false, error: GENERIC_UNAVAILABLE };

  const [recipient] = await db.select({
    id: purchaseRecoveryRecipients.id,
    offerCode: purchaseRecoveryRecipients.offerCode,
    suppressionReason: purchaseRecoveryRecipients.suppressionReason,
    offerRedeemedAt: purchaseRecoveryRecipients.offerRedeemedAt,
  }).from(purchaseRecoveryRecipients).where(and(
    eq(purchaseRecoveryRecipients.campaignKey, RECOVERY_CAMPAIGN),
    sql`LOWER(TRIM(${purchaseRecoveryRecipients.email})) = ${email}`,
    eq(purchaseRecoveryRecipients.product, input.product),
  )).limit(1);
  // Consent is a delivery condition, not a redemption condition. A campaign
  // owner may grant the offer to a recorded recipient without email consent.
  if (!recipient || recipient.suppressionReason || recipient.offerCode !== offer.code || recipient.offerRedeemedAt) {
    return { eligible: false, error: GENERIC_UNAVAILABLE };
  }

  if (await findPriorPurchase(db, email, input.product, input.excludeTransactionId)) {
    return { eligible: false, error: GENERIC_UNAVAILABLE };
  }

  const [profile] = await db.select({
    id: singles.id,
    isPaid: singles.isPaid,
    isActive: singles.isActive,
    isSeed: singles.isSeed,
    market: singles.market,
  }).from(singles).where(sql`LOWER(TRIM(${singles.email})) = ${email}`).limit(1);

  if (input.product === "database" && profile?.isPaid) return { eligible: false, error: GENERIC_UNAVAILABLE };
  if (input.product === "plus") {
    if (!hasPaidDatabaseMembership(profile)) return { eligible: false, error: GENERIC_UNAVAILABLE };
    const [priorPlus] = await db.select({
      activatedAt: plusPilotMembers.activatedAt,
      status: plusPilotMembers.status,
      billingStatus: plusPilotMembers.billingStatus,
      lastPaymentTransactionId: plusPilotMembers.lastPaymentTransactionId,
      lastPaymentAt: plusPilotMembers.lastPaymentAt,
    }).from(plusPilotMembers).where(eq(plusPilotMembers.singleId, profile.id)).limit(1);
    // A cancelled/churned/billed Plus row is historical use, not an invitation
    // to revive an old membership.
    if (hasPreviouslyActivatedPlus(priorPlus)) return { eligible: false, error: GENERIC_UNAVAILABLE };
  }

  return { eligible: true, offer, recipientId: recipient.id };
}

/** Read-only coupon preview. This never creates a recipient, intent, or reservation. */
export async function validatePurchaseRecoveryCoupon(input: {
  email?: string;
  product?: string;
  code?: string;
  now?: number;
}): Promise<
  | { valid: true; code: string; discountPercent: number | undefined; discountAmount: number | undefined; fixedPrice: number | undefined; bonus?: 1 }
  | { valid: false; error: string }
> {
  const offer = getPurchaseRecoveryOffer(input.product, input.code);
  if (!offer || !input.email) return { valid: false, error: GENERIC_UNAVAILABLE };
  const db = await getDb();
  if (!db) return { valid: false, error: "לא ניתן לאמת את ההטבה כרגע. אפשר לנסות שוב." };
  const eligibility = await evaluateEligibility(db, {
    email: input.email,
    product: offer.product,
    code: offer.code,
    now: input.now ?? Date.now(),
    requireOpenWindow: true,
  });
  if (!eligibility.eligible) return { valid: false, error: eligibility.error };
  return {
    valid: true,
    code: offer.code,
    discountPercent: offer.kind === "discount" ? 10 : undefined,
    discountAmount: undefined,
    fixedPrice: offer.fixedPrice,
    ...(offer.kind === "plus_gift" ? { bonus: 1 as const } : {}),
  };
}

/**
 * Atomically reserves exactly one recipient offer before Grow is opened. A
 * reservation is intentionally retained after an uncertain provider outcome;
 * only a caller that independently proves no process was created may release it.
 */
export async function reservePurchaseRecoveryOffer(input: {
  email: string;
  product: PurchaseRecoveryProduct;
  code: string;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("purchase_recovery_database_unavailable");
  const now = input.now ?? Date.now();
  const offer = getPurchaseRecoveryOffer(input.product, input.code);
  if (!offer || !isPurchaseRecoveryOfferOpen(now)) throw new Error("purchase_recovery_offer_unavailable");
  const email = canonicalEmail(input.email);
  return db.transaction(async (tx: any) => {
    const eligibility = await evaluateEligibility(tx, {
      email,
      product: offer.product,
      code: offer.code,
      now,
      requireOpenWindow: true,
    });
    if (!eligibility.eligible) throw new Error("purchase_recovery_offer_unavailable");
    const [recipient] = await tx.select({
      id: purchaseRecoveryRecipients.id,
      offerCheckoutRef: purchaseRecoveryRecipients.offerCheckoutRef,
      offerRedeemedAt: purchaseRecoveryRecipients.offerRedeemedAt,
      offerTransactionId: purchaseRecoveryRecipients.offerTransactionId,
    }).from(purchaseRecoveryRecipients).where(eq(purchaseRecoveryRecipients.id, eligibility.recipientId)).limit(1).for("update");
    if (!recipient || recipient.offerRedeemedAt || recipient.offerTransactionId || recipient.offerCheckoutRef) {
      throw new Error("purchase_recovery_offer_already_reserved_or_redeemed");
    }
    const reference = createPurchaseRecoveryCheckoutReference({ recipientId: recipient.id, email, product: offer.product, now });
    const parsed = verifyPurchaseRecoveryCheckoutReference(reference, email, now);
    if (!parsed) throw new Error("purchase_recovery_reference_creation_failed");
    const reservedUntil = Math.min(now + RESERVATION_MS, RECOVERY_OFFER_EXPIRES_AT);
    const result = await tx.update(purchaseRecoveryRecipients).set({
      offerCheckoutRef: reservationKey(parsed.reservationNonce),
      offerReservedUntil: reservedUntil,
      updatedAt: now,
    }).where(and(
      eq(purchaseRecoveryRecipients.id, recipient.id),
      isNull(purchaseRecoveryRecipients.offerCheckoutRef),
      isNull(purchaseRecoveryRecipients.offerRedeemedAt),
      isNull(purchaseRecoveryRecipients.offerTransactionId),
    ));
    const affectedRows = Number((Array.isArray(result) ? result[0] : result)?.affectedRows || 0);
    if (affectedRows !== 1) throw new Error("purchase_recovery_reservation_race");
    return { offer, reference, reservedUntil };
  });
}

/** Persist Grow's exact process token only after a known successful setup response. */
export async function bindPurchaseRecoveryProviderProcess(input: {
  reference: string;
  email: string;
  product: PurchaseRecoveryProduct;
  processToken: string | undefined | null;
  now?: number;
}) {
  const token = String(input.processToken || "").trim();
  const now = input.now ?? Date.now();
  const parsed = verifyPurchaseRecoveryCheckoutReference(input.reference, input.email, now);
  if (!parsed || parsed.product !== input.product || !token || token.length > 255) {
    throw new Error("purchase_recovery_provider_binding_invalid");
  }
  const db = await getDb();
  if (!db) throw new Error("purchase_recovery_database_unavailable");
  const result = await db.update(purchaseRecoveryRecipients).set({
    offerCheckoutRef: token,
    updatedAt: now,
  }).where(and(
    eq(purchaseRecoveryRecipients.id, parsed.recipientId),
    eq(purchaseRecoveryRecipients.campaignKey, RECOVERY_CAMPAIGN),
    sql`LOWER(TRIM(${purchaseRecoveryRecipients.email})) = ${canonicalEmail(input.email)}`,
    eq(purchaseRecoveryRecipients.product, input.product),
    eq(purchaseRecoveryRecipients.offerCheckoutRef, reservationKey(parsed.reservationNonce)),
    isNull(purchaseRecoveryRecipients.offerRedeemedAt),
    isNull(purchaseRecoveryRecipients.offerTransactionId),
  ));
  const affectedRows = Number((Array.isArray(result) ? result[0] : result)?.affectedRows || 0);
  if (affectedRows !== 1) throw new Error("purchase_recovery_provider_binding_failed");
}

/**
 * Use only when a caller has independent proof that Grow never created a
 * process. It is deliberately not called for network timeouts or ambiguous API
 * failures, because retrying an uncertain provider request could double-charge.
 */
export async function releasePurchaseRecoveryReservationAfterProvenSetupFailure(input: {
  reference: string;
  email: string;
  product: PurchaseRecoveryProduct;
  provenNoProviderProcess: true;
  now?: number;
}) {
  const parsed = verifyPurchaseRecoveryCheckoutReference(input.reference, input.email, input.now ?? Date.now());
  if (!parsed || parsed.product !== input.product || input.provenNoProviderProcess !== true) return false;
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(purchaseRecoveryRecipients).set({
    offerCheckoutRef: null,
    offerReservedUntil: null,
    updatedAt: input.now ?? Date.now(),
  }).where(and(
    eq(purchaseRecoveryRecipients.id, parsed.recipientId),
    eq(purchaseRecoveryRecipients.offerCheckoutRef, reservationKey(parsed.reservationNonce)),
    isNull(purchaseRecoveryRecipients.offerRedeemedAt),
  ));
  return Number((Array.isArray(result) ? result[0] : result)?.affectedRows || 0) === 1;
}

/**
 * Claims a payment only after Grow accounting has independently verified it.
 * The exact provider token and actual amount are checked against the immutable
 * recovery recipient row; no browser input or latest mutable tracking lead is
 * considered proof. A delayed webhook is accepted only for this exact persisted
 * in-window checkout.
 */
export async function redeemPurchaseRecoveryOffer(input: {
  reference: string | undefined;
  email: string;
  product: string;
  processToken: string | undefined | null;
  transactionId: string;
  amountAgorot: number;
  now?: number;
}): Promise<{ redeemed: boolean; alreadyRedeemed: boolean; offer?: PurchaseRecoveryOffer }> {
  const now = input.now ?? Date.now();
  const email = canonicalEmail(input.email);
  const parsed = verifyPurchaseRecoveryCheckoutReference(input.reference, email, now);
  const product = input.product as PurchaseRecoveryProduct;
  const offer = parsed && getPurchaseRecoveryOffer(product, recoveryOfferCode(parsed.product));
  const processToken = String(input.processToken || "").trim();
  const transactionId = String(input.transactionId || "").trim();
  if (!parsed || parsed.product !== product || !offer || !processToken || !transactionId
    || transactionId.length > 120 || input.amountAgorot !== offer.expectedAmountAgorot) {
    throw new Error("purchase_recovery_payment_not_bound");
  }
  const db = await getDb();
  if (!db) throw new Error("purchase_recovery_database_unavailable");
  return db.transaction(async (tx: any) => {
    const [recipient] = await tx.select({
      id: purchaseRecoveryRecipients.id,
      campaignKey: purchaseRecoveryRecipients.campaignKey,
      email: purchaseRecoveryRecipients.email,
      product: purchaseRecoveryRecipients.product,
      offerCode: purchaseRecoveryRecipients.offerCode,
      offerCheckoutRef: purchaseRecoveryRecipients.offerCheckoutRef,
      offerReservedUntil: purchaseRecoveryRecipients.offerReservedUntil,
      offerRedeemedAt: purchaseRecoveryRecipients.offerRedeemedAt,
      offerTransactionId: purchaseRecoveryRecipients.offerTransactionId,
      suppressionReason: purchaseRecoveryRecipients.suppressionReason,
    }).from(purchaseRecoveryRecipients).where(eq(purchaseRecoveryRecipients.id, parsed.recipientId)).limit(1).for("update");
    if (!recipient || recipient.campaignKey !== RECOVERY_CAMPAIGN
      || canonicalEmail(recipient.email) !== email || recipient.product !== product
      || recipient.offerCode !== offer.code || recipient.suppressionReason
      || recipient.offerCheckoutRef !== processToken || !recipient.offerReservedUntil
      || Number(recipient.offerReservedUntil) > RECOVERY_OFFER_EXPIRES_AT) {
      throw new Error("purchase_recovery_payment_not_bound");
    }
    if (recipient.offerRedeemedAt || recipient.offerTransactionId) {
      if (recipient.offerTransactionId === transactionId) return { redeemed: true, alreadyRedeemed: true, offer };
      throw new Error("purchase_recovery_offer_already_redeemed");
    }
    const eligibility = await evaluateEligibility(tx, {
      email,
      product,
      code: offer.code,
      now,
      requireOpenWindow: false,
      excludeTransactionId: transactionId,
    });
    if (!eligibility.eligible || eligibility.recipientId !== recipient.id) {
      throw new Error("purchase_recovery_offer_no_longer_eligible");
    }
    const result = await tx.update(purchaseRecoveryRecipients).set({
      offerRedeemedAt: now,
      offerTransactionId: transactionId,
      updatedAt: now,
    }).where(and(
      eq(purchaseRecoveryRecipients.id, recipient.id),
      eq(purchaseRecoveryRecipients.offerCheckoutRef, processToken),
      isNull(purchaseRecoveryRecipients.offerRedeemedAt),
      isNull(purchaseRecoveryRecipients.offerTransactionId),
    ));
    const affectedRows = Number((Array.isArray(result) ? result[0] : result)?.affectedRows || 0);
    if (affectedRows !== 1) throw new Error("purchase_recovery_redemption_race");
    return { redeemed: true, alreadyRedeemed: false, offer };
  });
}
