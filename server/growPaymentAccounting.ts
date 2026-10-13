import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { completedPayments, growPaymentReceipts } from "../drizzle/schema";
import { getDb } from "./db";
import { verifyGrowTransaction } from "./growInquiry";

// Only new provider notifications enter this mechanism. No historical backfill.
export const GROW_ACCOUNTING_ROLLOUT_AT = Date.parse("2026-10-13T10:20:00Z");
type References = { transactionId: string; transactionToken: string; processId?: string; processToken?: string };
export type AccountingInput = References & {
  product: string; email: string; amountAgorot: number; receivedAt: number; paymentDate?: unknown;
  statusCode?: unknown; couponCode?: string | null;
  utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null; utmContent?: string | null;
};
export type AccountingResult = "recorded" | "duplicate" | "review" | "pending" | "disabled";
function encryptionKey(secret = process.env.JWT_SECRET) {
  if (!secret) throw new Error("grow_reference_encryption_unavailable");
  return crypto.createHash("sha256").update(`grow-accounting:v1:${secret}`).digest();
}
export function encryptGrowReferences(value: References, secret?: string) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), bytes.toString("base64")].join(".");
}
export function decryptGrowReferences(value: string, secret?: string): References {
  const [iv, tag, bytes] = value.split(".");
  if (!iv || !tag || !bytes) throw new Error("grow_reference_invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(bytes, "base64")), decipher.final()]).toString("utf8"));
}
/** Identity is provider transaction, not the purchaser, product, time or SDK token. */
export function growReceiptKey(transactionId: string) {
  return crypto.createHash("sha256").update(`hilitcaspi-il:grow:transaction:v1:${transactionId.trim()}`).digest("hex");
}
export function classifyGrowAccounting(input: AccountingInput) {
  if (!Number.isSafeInteger(input.amountAgorot) || input.amountAgorot <= 0) return "invalid_amount";
  if (!/^\d{3,30}$/.test(input.transactionId) || !/^[A-Za-z0-9]{12,200}$/.test(input.transactionToken)) return "missing_provider_identity";
  if (input.statusCode != null && Number(input.statusCode) !== 2) return "non_paid_status";
  if (typeof input.paymentDate !== "string") return "missing_provider_date";
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(input.paymentDate);
  if (!parts) return "invalid_provider_date";
  const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
  const providerDay = `${year}-${parts[2].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
  const date = new Date(`${providerDay}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== providerDay) return "invalid_provider_date";
  const receivedDay = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(input.receivedAt));
  const rolloutDay = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(GROW_ACCOUNTING_ROLLOUT_AT));
  if (providerDay < rolloutDay || input.receivedAt < GROW_ACCOUNTING_ROLLOUT_AT) return "historical_notification";
  if (providerDay > receivedDay) return "future_provider_date";
  return "eligible";
}
export function growReceiptConflict(row: {product: string; amountAgorot: number}, input: Pick<AccountingInput,"product"|"amountAgorot">) {
  return row.product !== input.product || row.amountAgorot !== input.amountAgorot;
}
/** Never approve a charge, fulfill a product, send mail or mutate an existing ledger row. */
export async function recordGrowPaymentOnce(input: AccountingInput): Promise<AccountingResult> {
  if (process.env.NODE_ENV !== "production") return "disabled";
  const db = await getDb();
  if (!db) throw new Error("grow_accounting_database_unavailable");
  const canonical = /^\d{3,30}$/.test(input.transactionId);
  // Invalid SDK notifications are audit events, not an alternative transaction identity.
  const key = canonical ? growReceiptKey(input.transactionId)
    : crypto.createHash("sha256").update(`unverified-event:${input.transactionId || crypto.randomUUID()}:${input.amountAgorot}:${input.product}`).digest("hex");
  const [existing] = await db.select().from(growPaymentReceipts).where(eq(growPaymentReceipts.receiptKey, key)).limit(1);
  if (existing && growReceiptConflict(existing,input)) {
    await db.update(growPaymentReceipts).set({state:"review",category:"conflicting_notification",updatedAt:input.receivedAt}).where(eq(growPaymentReceipts.receiptKey,key));
    return "review";
  }
  if (existing && ["verified","duplicate_existing"].includes(existing.state)) return "duplicate";
  let category = classifyGrowAccounting(input);
  const [previous] = canonical ? await db.select({product:completedPayments.product,amountAgorot:completedPayments.amountAgorot})
    .from(completedPayments).where(eq(completedPayments.transactionId,input.transactionId)).limit(1) : [];
  const inquiry = category === "eligible" && !previous
    ? await verifyGrowTransaction({product:input.product,transactionId:input.transactionId,transactionToken:input.transactionToken,expectedAmountAgorot:input.amountAgorot})
    : null;
  const confirmed = inquiry?.state === "confirmed";
  const paidDate = confirmed && inquiry.verified.paymentDate ? inquiry.verified.paymentDate : input.paymentDate;
  if (confirmed && classifyGrowAccounting({...input,paymentDate:paidDate}) !== "eligible") category = "provider_date_review";
  if (inquiry?.state === "mismatch") category = "provider_mismatch";
  if (previous && growReceiptConflict(previous,input)) category = "conflicting_existing_transaction";
  const review = category !== "eligible";
  const state = review ? "review" as const : previous ? "duplicate_existing" as const : confirmed ? "verified" as const : "notification_only" as const;
  const referencesEncrypted = encryptGrowReferences({transactionId:input.transactionId,transactionToken:input.transactionToken,processId:input.processId,processToken:input.processToken});
  const providerDate = growProviderDate(paidDate);
  const paidAt = growAccountingPaidAt(paidDate,input.receivedAt);
  const receipt = {receiptKey:key,product:input.product,amountAgorot:input.amountAgorot,state,
    category:review ? category : previous ? "existing_ledger" : confirmed ? "provider_confirmed" : "provider_inquiry_unavailable",
    referencesEncrypted,providerDate,paidAt,receivedAt:input.receivedAt,updatedAt:input.receivedAt};
  try {
    return await db.transaction(async tx => {
      if (existing) {
        // CAS serializes promotion: only one retry can change the pending receipt.
        const result = await tx.update(growPaymentReceipts).set(receipt).where(sql`${growPaymentReceipts.receiptKey} = ${key}
          AND ${growPaymentReceipts.updatedAt} = ${existing.updatedAt} AND ${growPaymentReceipts.state} = ${existing.state}`);
        if (Number((result as any)?.[0]?.affectedRows || 0) !== 1) return "pending" as const;
      } else await tx.insert(growPaymentReceipts).values(receipt);
      if (review) return "review" as const;
      if (previous) return "duplicate" as const;
      if (!confirmed) return "pending" as const; // NEVER counts as revenue without provider confirmation.
      await tx.insert(completedPayments).values({transactionId:input.transactionId,dedupeKey:`grow-v2:${key}`,email:input.email,product:input.product,
        couponCode:input.couponCode || null,utmSource:input.utmSource || null,utmMedium:input.utmMedium || null,
        utmCampaign:input.utmCampaign || null,utmContent:input.utmContent || null,amountAgorot:input.amountAgorot,
        amountSource:"grow",paidAt,createdAt:input.receivedAt});
      return "recorded" as const;
    });
  } catch (error: any) {
    const code = error?.code || error?.cause?.code;
    if (code === "ER_DUP_ENTRY" || Number(error?.errno || error?.cause?.errno) === 1062) {
      // A uniqueness race does not prove the winning callback was verified.
      const [winner] = await db.select().from(growPaymentReceipts).where(eq(growPaymentReceipts.receiptKey,key)).limit(1);
      return winner && ["verified","duplicate_existing"].includes(winner.state) && !growReceiptConflict(winner,input)
        ? "duplicate" : "pending";
    }
    throw new Error("grow_accounting_persistence_failed");
  }
}
export function growProviderDate(value: unknown): string | null {
  if(typeof value !== "string") return null;
  const p=/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value); if(!p)return null;
  const date=`${p[3].length===2?`20${p[3]}`:p[3]}-${p[2].padStart(2,"0")}-${p[1].padStart(2,"0")}`;
  const d=new Date(`${date}T09:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date?date:null;
}
/** Same-day receipt preserves order; delayed date-only notification uses a day anchor, not an invented exact payment time. */
export function growAccountingPaidAt(value:unknown,receivedAt:number) {
  const day=growProviderDate(value);if(!day)return receivedAt;
  const receivedDay=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(receivedAt));
  return day===receivedDay?receivedAt:Date.parse(`${day}T09:00:00Z`);
}
/** Staff aggregate only; no reference, token, purchaser or invoice identifiers. */
export async function growAccountingSummary(start: number, end: number) {
  const db = await getDb(); if (!db) return {available:false as const,rows:[]};
  const [rows] = await db.execute(sql`SELECT state, category, product, COUNT(*) AS count, SUM(amount_agorot) AS amountAgorot
    FROM grow_payment_receipts WHERE received_at >= ${start} AND received_at < ${end} GROUP BY state,category,product`) as any;
  return {available:true as const,rows:rows.map((r:any)=>({...r,count:Number(r.count),amountAgorot:Number(r.amountAgorot)}))};
}
