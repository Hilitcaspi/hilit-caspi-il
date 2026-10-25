import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { purchaseRecoveryRecipients } from "../drizzle/schema";
import {
  RECOVERY_CAMPAIGN,
  RECOVERY_OFFER_EXPIRES_AT,
  type PurchaseRecoveryProduct,
} from "../shared/purchaseRecoveryLinks";
import { getDb } from "./db";
import { router, teamProcedure } from "./_core/trpc";

const productSchema = z.enum(["database", "session", "plus"]);
const evidenceSchema = z.enum([
  "product_link_clicked",
  "product_marketing_email_opened",
  "saved_checkout_failure_alert",
  "saved_checkout_attempt",
]);
const deliveryStateSchema = z.enum(["draft", "held", "queued", "processing", "accepted", "failed", "skipped"]);

const cursorSchema = z.object({
  evidenceAt: z.number().int().nonnegative(),
  id: z.number().int().positive(),
});

const listInputSchema = z.object({
  product: productSchema.optional(),
  evidence: evidenceSchema.optional(),
  status: deliveryStateSchema.optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: cursorSchema.optional(),
});

type RecoveryDeliveryState = z.infer<typeof deliveryStateSchema>;
type RecoverySummaryRow = {
  product: string;
  total: number | string | null;
  emailConsented: number | string | null;
  smsConsented: number | string | null;
  emailHeld: number | string | null;
  smsHeld: number | string | null;
  scheduled19: number | string | null;
  accepted: number | string | null;
  redeemed: number | string | null;
  purchased: number | string | null;
  giftsGranted: number | string | null;
};

export const RECOVERY_EVIDENCE_LABELS: Record<z.infer<typeof evidenceSchema>, string> = {
  product_link_clicked: "נלחץ קישור למוצר",
  product_marketing_email_opened: "נפתח מייל שיווקי",
  saved_checkout_failure_alert: "נשמרה התראת כשל בתשלום",
  saved_checkout_attempt: "נשמר ניסיון תשלום",
};

/** A marketing-email open is interest evidence only. It is never a failed-payment signal. */
export function purchaseRecoveryEvidenceLabel(evidence: string) {
  return RECOVERY_EVIDENCE_LABELS[evidence as z.infer<typeof evidenceSchema>] || "עדות עניין אחרת";
}

/**
 * Produces a recipient-level status for the staff UI without exposing provider IDs,
 * transaction IDs, or opaque metadata.
 */
export function purchaseRecoveryRecipientStatus(input: {
  emailState: RecoveryDeliveryState;
  smsState: RecoveryDeliveryState;
  sendAt: number | null;
  offerRedeemedAt: number | null;
  purchased: boolean;
}) {
  if (input.purchased) return "purchased" as const;
  if (input.offerRedeemedAt) return "redeemed" as const;
  if (input.emailState === "held" && input.smsState === "held") return "held" as const;
  if (input.emailState === "held") return "email_held" as const;
  if (input.smsState === "held") return "sms_held" as const;
  if (input.emailState === "accepted" || input.smsState === "accepted") return "accepted" as const;
  if (input.emailState === "failed" || input.smsState === "failed") return "failed" as const;
  if (input.sendAt === Date.parse("2026-10-25T19:00:00+02:00") &&
    [input.emailState, input.smsState].some(state => ["draft", "queued", "processing"].includes(state))) {
    return "scheduled_19" as const;
  }
  return "not_scheduled" as const;
}

function count(value: number | string | null | undefined) {
  return Number(value || 0);
}

function emptyProductSummary(product: PurchaseRecoveryProduct) {
  return {
    product,
    total: 0,
    emailConsented: 0,
    smsConsented: 0,
    emailHeld: 0,
    smsHeld: 0,
    scheduled19: 0,
    accepted: 0,
    redeemed: 0,
    purchased: 0,
    giftsGranted: 0,
  };
}

/** Kept pure so the aggregate presentation can be tested without a database. */
export function purchaseRecoverySummary(rows: RecoverySummaryRow[]) {
  const products: Record<PurchaseRecoveryProduct, ReturnType<typeof emptyProductSummary>> = {
    database: emptyProductSummary("database"),
    session: emptyProductSummary("session"),
    plus: emptyProductSummary("plus"),
  };

  for (const row of rows) {
    if (!(row.product in products)) continue;
    products[row.product as PurchaseRecoveryProduct] = {
      product: row.product as PurchaseRecoveryProduct,
      total: count(row.total),
      emailConsented: count(row.emailConsented),
      smsConsented: count(row.smsConsented),
      emailHeld: count(row.emailHeld),
      smsHeld: count(row.smsHeld),
      scheduled19: count(row.scheduled19),
      accepted: count(row.accepted),
      redeemed: count(row.redeemed),
      purchased: count(row.purchased),
      giftsGranted: count(row.giftsGranted),
    };
  }

  const allProducts = Object.values(products);
  return {
    campaignKey: RECOVERY_CAMPAIGN,
    offerExpiresAt: RECOVERY_OFFER_EXPIRES_AT,
    total: allProducts.reduce((sum, product) => sum + product.total, 0),
    emailConsented: allProducts.reduce((sum, product) => sum + product.emailConsented, 0),
    smsConsented: allProducts.reduce((sum, product) => sum + product.smsConsented, 0),
    emailHeld: allProducts.reduce((sum, product) => sum + product.emailHeld, 0),
    smsHeld: allProducts.reduce((sum, product) => sum + product.smsHeld, 0),
    scheduled19: allProducts.reduce((sum, product) => sum + product.scheduled19, 0),
    accepted: allProducts.reduce((sum, product) => sum + product.accepted, 0),
    redeemed: allProducts.reduce((sum, product) => sum + product.redeemed, 0),
    purchased: allProducts.reduce((sum, product) => sum + product.purchased, 0),
    giftsGranted: allProducts.reduce((sum, product) => sum + product.giftsGranted, 0),
    products,
  };
}

export const purchaseRecoveryRouter = router({
  /** Aggregates only. No recipient identity, provider ID, transaction ID, or metadata is returned. */
  summary: teamProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "מסד הנתונים אינו זמין" });

    const rows = await db.select({
      product: purchaseRecoveryRecipients.product,
      total: sql<number>`COUNT(*)`,
      emailConsented: sql<number>`SUM(CASE WHEN ${purchaseRecoveryRecipients.emailConsent} = 1 THEN 1 ELSE 0 END)`,
      smsConsented: sql<number>`SUM(CASE WHEN ${purchaseRecoveryRecipients.smsConsent} = 1 THEN 1 ELSE 0 END)`,
      emailHeld: sql<number>`SUM(CASE WHEN ${purchaseRecoveryRecipients.emailState} = 'held' THEN 1 ELSE 0 END)`,
      smsHeld: sql<number>`SUM(CASE WHEN ${purchaseRecoveryRecipients.smsState} = 'held' THEN 1 ELSE 0 END)`,
      scheduled19: sql<number>`SUM(CASE WHEN ${purchaseRecoveryRecipients.sendAt} = ${Date.parse("2026-10-25T19:00:00+02:00")} AND (${purchaseRecoveryRecipients.emailState} IN ('draft', 'queued', 'processing') OR ${purchaseRecoveryRecipients.smsState} IN ('draft', 'queued', 'processing')) THEN 1 ELSE 0 END)`,
      accepted: sql<number>`SUM(CASE WHEN ${purchaseRecoveryRecipients.emailState} = 'accepted' OR ${purchaseRecoveryRecipients.smsState} = 'accepted' THEN 1 ELSE 0 END)`,
      redeemed: sql<number>`SUM(CASE WHEN ${isNotNull(purchaseRecoveryRecipients.offerRedeemedAt)} THEN 1 ELSE 0 END)`,
      purchased: sql<number>`SUM(CASE WHEN ${isNotNull(purchaseRecoveryRecipients.offerTransactionId)} THEN 1 ELSE 0 END)`,
      giftsGranted: sql<number>`SUM(CASE WHEN ${isNotNull(purchaseRecoveryRecipients.giftGrantedAt)} THEN 1 ELSE 0 END)`,
    })
      .from(purchaseRecoveryRecipients)
      // campaign_key is the leading field in the recipient unique index.
      .where(eq(purchaseRecoveryRecipients.campaignKey, RECOVERY_CAMPAIGN))
      .groupBy(purchaseRecoveryRecipients.product);

    return {
      ...purchaseRecoverySummary(rows),
      generatedAt: Date.now(),
    };
  }),

  /**
   * A bounded, cursor-paginated staff listing. This is intentionally not invoked
   * until the CRM panel is opened. The select list excludes metadata, provider IDs,
   * checkout references, and transaction IDs.
   */
  list: teamProcedure.input(listInputSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "מסד הנתונים אינו זמין" });

    const filters = [eq(purchaseRecoveryRecipients.campaignKey, RECOVERY_CAMPAIGN)];
    if (input.product) filters.push(eq(purchaseRecoveryRecipients.product, input.product));
    if (input.evidence) filters.push(eq(purchaseRecoveryRecipients.evidence, input.evidence));
    if (input.status) filters.push(sql`(
      ${purchaseRecoveryRecipients.emailState} = ${input.status}
      OR ${purchaseRecoveryRecipients.smsState} = ${input.status}
    )`);
    if (input.cursor) filters.push(sql`(
      ${purchaseRecoveryRecipients.evidenceAt} < ${input.cursor.evidenceAt}
      OR (${purchaseRecoveryRecipients.evidenceAt} = ${input.cursor.evidenceAt}
        AND ${purchaseRecoveryRecipients.id} < ${input.cursor.id})
    )`);

    const rows = await db.select({
      id: purchaseRecoveryRecipients.id,
      name: purchaseRecoveryRecipients.name,
      email: purchaseRecoveryRecipients.email,
      phone: purchaseRecoveryRecipients.phone,
      product: purchaseRecoveryRecipients.product,
      evidence: purchaseRecoveryRecipients.evidence,
      evidenceAt: purchaseRecoveryRecipients.evidenceAt,
      emailConsent: purchaseRecoveryRecipients.emailConsent,
      smsConsent: purchaseRecoveryRecipients.smsConsent,
      consentSource: purchaseRecoveryRecipients.consentSource,
      suppressionReason: purchaseRecoveryRecipients.suppressionReason,
      sendAt: purchaseRecoveryRecipients.sendAt,
      emailState: purchaseRecoveryRecipients.emailState,
      smsState: purchaseRecoveryRecipients.smsState,
      offerRedeemedAt: purchaseRecoveryRecipients.offerRedeemedAt,
      giftGrantedAt: purchaseRecoveryRecipients.giftGrantedAt,
      purchased: sql<number>`CASE WHEN ${isNotNull(purchaseRecoveryRecipients.offerTransactionId)} THEN 1 ELSE 0 END`,
    })
      .from(purchaseRecoveryRecipients)
      .where(and(...filters))
      .orderBy(desc(purchaseRecoveryRecipients.evidenceAt), desc(purchaseRecoveryRecipients.id))
      .limit(input.limit + 1);

    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        product: row.product,
        evidence: row.evidence,
        evidenceLabel: purchaseRecoveryEvidenceLabel(row.evidence),
        evidenceAt: row.evidenceAt,
        emailConsent: row.emailConsent,
        smsConsent: row.smsConsent,
        consentSource: row.consentSource,
        suppressionReason: row.suppressionReason,
        emailState: row.emailState,
        smsState: row.smsState,
        offerRedeemedAt: row.offerRedeemedAt,
        giftGrantedAt: row.giftGrantedAt,
        status: purchaseRecoveryRecipientStatus({
          ...row,
          purchased: Boolean(row.purchased),
        }),
      })),
      nextCursor: hasMore && last ? { evidenceAt: last.evidenceAt, id: last.id } : null,
    };
  }),
});

export type PurchaseRecoveryListInput = z.infer<typeof listInputSchema>;
