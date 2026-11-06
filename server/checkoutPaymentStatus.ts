import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { completedPayments, growPaymentReceipts, paymentLeads } from "../drizzle/schema";
import { getDb } from "./db";
import { decryptGrowReferences, growReceiptKey } from "./growPaymentAccounting";

// Keep the mandatory product contract identical to payment.createProcess.
export const checkoutStatusInputSchema = z.object({
  trackingToken: z.string().regex(/^[a-f0-9]{64}$/),
  processToken: z.string().min(1).max(255),
  expectedProduct: z.enum([
    "database", "guide", "course", "coaching", "coaching_mas", "session",
    "bundle_tubav", "bundle_new_year", "bundle_november", "match_boost", "plus", "live_october",
  ]),
});
export type CheckoutStatusInput = z.infer<typeof checkoutStatusInputSchema>;
export type CheckoutPaymentStatus =
  | { status: "pending" | "review" | "invalid" | "unavailable" }
  | {
      status: "confirmed";
      product: CheckoutStatusInput["expectedProduct"];
      amountAgorot: number;
      currency: "ILS";
      confirmedAt: number;
    };

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function isTestCoupon(value: string | null) {
  return value?.trim().toUpperCase() === "TEST1";
}

/**
 * Read-only proof of this exact checkout, not an unpaid/retry decision.
 * A lead may have been confirmed through the webhook's email/product fallback;
 * only an encrypted process binding plus the exact Grow ledger can prove payment.
 * Never consume browserTrackedAt or invoke accounting, inquiry or fulfillment.
 */
export async function getCheckoutPaymentStatus(input: CheckoutStatusInput): Promise<CheckoutPaymentStatus> {
  if (process.env.NODE_ENV !== "production") return { status: "unavailable" };
  if (!checkoutStatusInputSchema.safeParse(input).success) return { status: "invalid" };

  try {
    const db = await getDb();
    if (!db) return { status: "unavailable" };

    const [lead] = await db.select({
      trackingToken: paymentLeads.trackingToken,
      providerProcessToken: paymentLeads.providerProcessToken,
      product: paymentLeads.product,
      email: paymentLeads.email,
      couponCode: paymentLeads.couponCode,
      attributionExpiresAt: paymentLeads.attributionExpiresAt,
      confirmedAt: paymentLeads.confirmedAt,
      confirmedTransactionId: paymentLeads.confirmedTransactionId,
      confirmedAmountAgorot: paymentLeads.confirmedAmountAgorot,
    }).from(paymentLeads).where(and(
      eq(paymentLeads.trackingToken, input.trackingToken),
      eq(paymentLeads.providerProcessToken, input.processToken),
      eq(paymentLeads.product, input.expectedProduct),
    )).limit(1);

    // Recheck byte-exact identities: database text comparison can be case-insensitive.
    if (!lead || lead.trackingToken !== input.trackingToken ||
        lead.providerProcessToken !== input.processToken || lead.product !== input.expectedProduct ||
        !positiveInteger(lead.attributionExpiresAt) || lead.attributionExpiresAt <= Date.now() ||
        isTestCoupon(lead.couponCode)) return { status: "invalid" };
    if (lead.confirmedAt == null || !lead.confirmedTransactionId || lead.confirmedAmountAgorot == null) {
      return { status: "pending" };
    }
    if (!positiveInteger(lead.confirmedAt) || !positiveInteger(lead.confirmedAmountAgorot) ||
        !/^\d{3,30}$/.test(lead.confirmedTransactionId)) return { status: "review" };

    const receiptKey = growReceiptKey(lead.confirmedTransactionId);
    const [receipt] = await db.select({
      receiptKey: growPaymentReceipts.receiptKey,
      product: growPaymentReceipts.product,
      amountAgorot: growPaymentReceipts.amountAgorot,
      state: growPaymentReceipts.state,
      category: growPaymentReceipts.category,
      referencesEncrypted: growPaymentReceipts.referencesEncrypted,
    }).from(growPaymentReceipts).where(eq(growPaymentReceipts.receiptKey, receiptKey)).limit(1);
    if (!receipt) return { status: "pending" };
    if (receipt.receiptKey !== receiptKey || receipt.product !== input.expectedProduct ||
        !positiveInteger(receipt.amountAgorot) || receipt.amountAgorot !== lead.confirmedAmountAgorot ||
        receipt.category === "test_checkout") return { status: "review" };
    if (receipt.state === "notification_only") return { status: "pending" };
    // A duplicate_existing receipt can copy unverified notification references
    // from an old ledger row. It proves that transaction existed, not this process.
    // A retry of a truly verified receipt keeps its original verified binding.
    if (receipt.state !== "verified" || receipt.category !== "provider_confirmed") return { status: "review" };

    let references: ReturnType<typeof decryptGrowReferences>;
    try {
      references = decryptGrowReferences(receipt.referencesEncrypted);
    } catch {
      return { status: "review" };
    }
    if (!references || references.processToken !== input.processToken ||
        references.transactionId !== lead.confirmedTransactionId) return { status: "review" };

    const [ledger] = await db.select({
      transactionId: completedPayments.transactionId,
      product: completedPayments.product,
      amountAgorot: completedPayments.amountAgorot,
      amountSource: completedPayments.amountSource,
      email: completedPayments.email,
      couponCode: completedPayments.couponCode,
    }).from(completedPayments).where(eq(completedPayments.transactionId, lead.confirmedTransactionId)).limit(1);
    if (!ledger) return { status: "pending" };
    const leadEmail = lead.email.trim().toLowerCase();
    if (ledger.transactionId !== lead.confirmedTransactionId || ledger.amountSource !== "grow" ||
        ledger.product !== input.expectedProduct || !positiveInteger(ledger.amountAgorot) ||
        ledger.amountAgorot !== receipt.amountAgorot || ledger.amountAgorot !== lead.confirmedAmountAgorot ||
        !leadEmail || ledger.email.trim().toLowerCase() !== leadEmail || isTestCoupon(ledger.couponCode)) {
      return { status: "review" };
    }

    return {
      status: "confirmed",
      product: input.expectedProduct,
      amountAgorot: ledger.amountAgorot,
      currency: "ILS",
      confirmedAt: lead.confirmedAt,
    };
  } catch {
    // No SQL, credentials, provider references, identifiers or PII reach the browser.
    return { status: "unavailable" };
  }
}
