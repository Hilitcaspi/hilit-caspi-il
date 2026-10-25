import { and, eq, isNull, sql } from "drizzle-orm";
import {
  matchBoostRequests,
  plusPilotMembers,
  purchaseRecoveryRecipients,
  singles,
} from "../drizzle/schema";
import { RECOVERY_CAMPAIGN } from "../shared/purchaseRecoveryLinks";

export const PURCHASE_RECOVERY_PLUS_GIFT_NOT_ELIGIBLE = "purchase_recovery_plus_gift_not_eligible";
export const PURCHASE_RECOVERY_PLUS_GIFT_RETRY_AFTER_ACTIVATION = "purchase_recovery_plus_gift_retry_after_activation";

export type PurchaseRecoveryPlusGiftResult =
  | { granted: true; alreadyGranted: false; idempotencyKey: string }
  | { granted: false; alreadyGranted: true; idempotencyKey: string };

function affectedRows(result: unknown) {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: unknown } | undefined)?.affectedRows || 0);
}

async function grantInTransaction(
  tx: any,
  input: { email: string; transactionId: string; now: number },
): Promise<PurchaseRecoveryPlusGiftResult> {
  const email = input.email.trim().toLowerCase();
  const transactionId = input.transactionId.trim();
  if (!email || !transactionId) throw new Error(PURCHASE_RECOVERY_PLUS_GIFT_NOT_ELIGIBLE);

  const recipients = await tx.select({
    id: purchaseRecoveryRecipients.id,
    offerRedeemedAt: purchaseRecoveryRecipients.offerRedeemedAt,
    offerTransactionId: purchaseRecoveryRecipients.offerTransactionId,
    giftGrantedAt: purchaseRecoveryRecipients.giftGrantedAt,
  }).from(purchaseRecoveryRecipients).where(and(
    eq(purchaseRecoveryRecipients.campaignKey, RECOVERY_CAMPAIGN),
    sql`LOWER(TRIM(${purchaseRecoveryRecipients.email})) = ${email}`,
    eq(purchaseRecoveryRecipients.product, "plus"),
    eq(purchaseRecoveryRecipients.offerCode, "PLUSGIFT"),
  )).limit(2).for("update");
  if (recipients.length !== 1) throw new Error(PURCHASE_RECOVERY_PLUS_GIFT_NOT_ELIGIBLE);
  const recipient = recipients[0];
  const idempotencyKey = `purchase-recovery-plus-gift:${RECOVERY_CAMPAIGN}:${recipient.id}`;
  if (recipient.giftGrantedAt) return { granted: false, alreadyGranted: true, idempotencyKey };
  if (!recipient.offerRedeemedAt || recipient.offerTransactionId !== transactionId) {
    throw new Error(PURCHASE_RECOVERY_PLUS_GIFT_NOT_ELIGIBLE);
  }

  const profiles = await tx.select({
    id: singles.id,
    isPaid: singles.isPaid,
    isActive: singles.isActive,
  }).from(singles).where(sql`LOWER(TRIM(${singles.email})) = ${email}`).limit(2).for("update");
  if (profiles.length !== 1 || !profiles[0].isPaid || !profiles[0].isActive) {
    throw new Error(PURCHASE_RECOVERY_PLUS_GIFT_RETRY_AFTER_ACTIVATION);
  }
  const profile = profiles[0];

  const members = await tx.select({
    id: plusPilotMembers.id,
    singleId: plusPilotMembers.singleId,
    status: plusPilotMembers.status,
    billingStatus: plusPilotMembers.billingStatus,
    lastPaymentTransactionId: plusPilotMembers.lastPaymentTransactionId,
  }).from(plusPilotMembers).where(eq(plusPilotMembers.singleId, profile.id)).limit(2).for("update");
  if (members.length !== 1
    || members[0].status !== "active"
    || members[0].billingStatus !== "active"
    || members[0].lastPaymentTransactionId !== transactionId) {
    throw new Error(PURCHASE_RECOVERY_PLUS_GIFT_RETRY_AFTER_ACTIVATION);
  }

  await tx.insert(matchBoostRequests).values({
    singleId: profile.id,
    matchId: null,
    source: "paid",
    status: "refunded",
    amountAgorot: 0,
    idempotencyKey,
    providerTransactionId: null,
    entryChannel: "other",
    plusBillingCycleStartedAt: null,
    requestedAt: input.now,
    paidAt: null,
    reviewStartedAt: null,
    decidedAt: null,
    fulfilledAt: null,
    expiresAt: null,
    decisionReason: "boost_credit_available:purchase_recovery_plus_first_signup",
    createdAt: input.now,
    updatedAt: input.now,
  });

  const marked = await tx.update(purchaseRecoveryRecipients).set({
    giftGrantedAt: input.now,
    updatedAt: input.now,
  }).where(and(
    eq(purchaseRecoveryRecipients.id, recipient.id),
    isNull(purchaseRecoveryRecipients.giftGrantedAt),
  ));
  if (affectedRows(marked) !== 1) throw new Error(PURCHASE_RECOVERY_PLUS_GIFT_RETRY_AFTER_ACTIVATION);

  return { granted: true, alreadyGranted: false, idempotencyKey };
}

/**
 * Grant the first-signup PLUSGIFT credit immediately after successful Plus
 * activation. The helper owns the transaction containing both the zero-cost
 * credit insert and recipient marker update. It creates no match, sends no
 * message, and does not change profile or membership state.
 */
export async function grantPurchaseRecoveryPlusGift(
  db: any,
  input: { email: string; transactionId: string; now?: number },
): Promise<PurchaseRecoveryPlusGiftResult> {
  return db.transaction((tx: any) => grantInTransaction(tx, {
    email: input.email,
    transactionId: input.transactionId,
    now: input.now ?? Date.now(),
  }));
}
