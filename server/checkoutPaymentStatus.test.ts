import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTableColumns, type SQL } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { completedPayments, growPaymentReceipts, paymentLeads } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), forbidden: vi.fn(() => { throw new Error("External effects forbidden"); }) }));
vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: mocks.forbidden }));
vi.mock("./growInquiry", () => ({ verifyGrowTransaction: mocks.forbidden }));
vi.mock("./growPayment", () => ({ createPaymentProcess: mocks.forbidden }));
vi.mock("./brevo", () => ({ sendEmail: mocks.forbidden, addContactToList: mocks.forbidden }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.forbidden }));
vi.mock("./storage", () => ({ storagePut: mocks.forbidden }));

import { checkoutStatusInputSchema, getCheckoutPaymentStatus, type CheckoutStatusInput } from "./checkoutPaymentStatus";
import { encryptGrowReferences, growReceiptKey } from "./growPaymentAccounting";
import { appRouter } from "./routers";

const NOW = Date.parse("2026-11-06T06:00:00Z");
const input: CheckoutStatusInput = { trackingToken: "a".repeat(64), processToken: "Synthetic-Exact-Process", expectedProduct: "database" };
const transactionId = "987654321";
const dialect = new MySqlDialect();
const context = { user: null, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
type Lead = Pick<typeof paymentLeads.$inferSelect,
  "trackingToken" | "providerProcessToken" | "product" | "email" | "couponCode" |
  "attributionExpiresAt" | "confirmedAt" | "confirmedTransactionId" | "confirmedAmountAgorot" | "browserTrackedAt">;
type Receipt = Pick<typeof growPaymentReceipts.$inferSelect,
  "receiptKey" | "product" | "amountAgorot" | "state" | "category" | "referencesEncrypted">;
type Ledger = Pick<typeof completedPayments.$inferSelect,
  "transactionId" | "product" | "amountAgorot" | "amountSource" | "email" | "couponCode">;
type Fixture = { lead: Lead | null; receipt: Receipt | null; ledger: Ledger | null };

function fixture(): Fixture {
  return {
    lead: {
      trackingToken: input.trackingToken, providerProcessToken: input.processToken,
      product: input.expectedProduct, email: " Synthetic@Example.test ", couponCode: null,
      attributionExpiresAt: NOW + 60_000, confirmedAt: NOW - 1_000,
      confirmedTransactionId: transactionId, confirmedAmountAgorot: 29_900, browserTrackedAt: null,
    },
    receipt: {
      receiptKey: growReceiptKey(transactionId), product: input.expectedProduct, amountAgorot: 29_900,
      state: "verified", category: "provider_confirmed",
      referencesEncrypted: encryptGrowReferences({ transactionId, transactionToken: "SyntheticSecret123", processToken: input.processToken }),
    },
    ledger: {
      transactionId, product: input.expectedProduct, amountAgorot: 29_900, amountSource: "grow",
      email: "synthetic@example.test", couponCode: null,
    },
  };
}

/** Only select/from/where/limit exist: any other DB operation fails closed. */
function installReadOnlyDb(data = fixture(), ignorePredicate = false) {
  const reads: { table: unknown; sql: string; params: unknown[]; fields: string[] }[] = [];
  const select = vi.fn((selection: Record<string, unknown>) => ({
    from: (table: typeof paymentLeads | typeof growPaymentReceipts | typeof completedPayments) => ({
      where: (condition: SQL) => ({
        limit: async (limit: number) => {
          expect(limit).toBe(1);
          expect(reads.length).toBeLessThan(3);
          const query = dialect.sqlToQuery(condition);
          reads.push({ table, sql: query.sql, params: query.params, fields: Object.keys(selection) });
          const row = table === paymentLeads ? data.lead : table === growPaymentReceipts ? data.receipt : table === completedPayments ? data.ledger : undefined;
          if (row === undefined) throw new Error("Unexpected read table");
          if (!row) return [];
          const columns = getTableColumns(table);
          const predicates = [...query.sql.matchAll(/`[^`]+`\.`([^`]+)` = \?/g)];
          expect(predicates.length).toBe(query.params.length);
          // Emulate case-insensitive MySQL strings so application exactness is tested too.
          const matches = predicates.every((match, index) => {
            const key = Object.entries(columns).find(([, column]) => column.name === match[1])?.[0];
            const actual = (row as unknown as Record<string, unknown>)[key!];
            const expected = query.params[index];
            return typeof actual === "string" && typeof expected === "string"
              ? actual.toLowerCase() === expected.toLowerCase() : actual === expected;
          });
          if (!ignorePredicate && !matches) return [];
          return [Object.fromEntries(Object.keys(selection).map(key => [key, (row as unknown as Record<string, unknown>)[key]]))];
        },
      }),
    }),
  }));
  const db = new Proxy({ select }, {
    get(target, key) {
      if (key === "select") return target.select;
      if (key === "then") return undefined;
      throw new Error(`Forbidden DB operation: ${String(key)}`);
    },
  });
  mocks.getDb.mockResolvedValue(db);
  return { data, reads, select };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("JWT_SECRET", "synthetic-checkout-status-test-key-only");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("LEGACY_DATABASE_URL", "");
  vi.stubGlobal("fetch", mocks.forbidden);
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});
afterEach(() => {
  expect(mocks.forbidden).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const query = (value = input) => appRouter.createCaller(context).payment.checkoutStatus(value);

describe("payment.checkoutStatus read-only proof", () => {
  it("is a query and returns only the safe confirmed contract with three bounded exact reads", async () => {
    const h = installReadOnlyDb();
    expect(appRouter._def.procedures["payment.checkoutStatus"]._def.type).toBe("query");
    expect(await query()).toEqual({ status: "confirmed", product: "database", amountAgorot: 29_900, currency: "ILS", confirmedAt: NOW - 1_000 });
    expect(h.reads).toHaveLength(3);
    expect(h.reads[0].params).toEqual([input.trackingToken, input.processToken, input.expectedProduct]);
    expect(h.reads[0].sql).toContain(" and ");
    expect(h.reads[0].sql).not.toMatch(/\bor\b/i);
    expect(h.reads[1].params).toEqual([growReceiptKey(transactionId)]);
    expect(h.reads[2].params).toEqual([transactionId]);
    expect(h.reads.flatMap(read => read.fields)).not.toContain("browserTrackedAt");
  });

  it.each(checkoutStatusInputSchema.shape.expectedProduct.options)("accepts the createProcess product %s only when every proof matches", async product => {
    const data = fixture();
    data.lead!.product = data.receipt!.product = data.ledger!.product = product;
    installReadOnlyDb(data);
    expect(await query({ ...input, expectedProduct: product })).toMatchObject({ status: "confirmed", product });
  });

  it("keeps its mandatory product enum identical to createProcess", () => {
    const createInput = appRouter._def.procedures["payment.createProcess"]._def.inputs[0] as typeof checkoutStatusInputSchema & { shape: { product: typeof checkoutStatusInputSchema.shape.expectedProduct } };
    expect(checkoutStatusInputSchema.shape.expectedProduct.options).toEqual(createInput.shape.product.options);
  });

  it.each([
    { trackingToken: "b".repeat(64) }, { processToken: "other-process" }, { expectedProduct: "guide" as const },
    { processToken: input.processToken.toLowerCase() },
  ])("does not borrow another token/process/product identity: %j", async change => {
    installReadOnlyDb();
    expect(await query({ ...input, ...change })).toEqual({ status: "invalid" });
  });

  it("rechecks the tracking identity even if storage returns a nonmatching row", async () => {
    const data = fixture(); data.lead!.trackingToken = "b".repeat(64);
    installReadOnlyDb(data, true);
    expect(await query()).toEqual({ status: "invalid" });
  });

  it("never treats email/product fallback lead confirmation as exact-process proof", async () => {
    const data = fixture();
    data.receipt!.referencesEncrypted = encryptGrowReferences({ transactionId, transactionToken: "SyntheticSecret123", processToken: "earlier-process-same-email-product" });
    const h = installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
    expect(h.reads).toHaveLength(2);
  });

  it.each([undefined, "", input.processToken.toLowerCase()])("requires the exact encrypted process, including case: %s", async processToken => {
    const data = fixture();
    data.receipt!.referencesEncrypted = encryptGrowReferences({ transactionId, transactionToken: "SyntheticSecret123", processToken });
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it("requires encrypted transaction identity equal to the confirmed lead transaction", async () => {
    const data = fixture();
    data.receipt!.referencesEncrypted = encryptGrowReferences({ transactionId: "123456789", transactionToken: "SyntheticSecret123", processToken: input.processToken });
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it.each(["malformed.encrypted.references", "", "bad"])("does not confirm undecryptable references: %s", async encrypted => {
    const data = fixture(); data.receipt!.referencesEncrypted = encrypted;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it("does not confirm references encrypted under a different server key", async () => {
    const data = fixture();
    data.receipt!.referencesEncrypted = encryptGrowReferences({ transactionId, transactionToken: "SyntheticSecret123", processToken: input.processToken }, "other-synthetic-key");
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it.each([null, 0, NOW - 1, NOW])("excludes expired or absent attribution expiry: %s", async expiry => {
    const data = fixture(); data.lead!.attributionExpiresAt = expiry;
    const h = installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "invalid" });
    expect(h.reads).toHaveLength(1);
  });

  it.each(["TEST1", "test1", " Test1 "])("excludes diagnostic lead coupon %s", async coupon => {
    const data = fixture(); data.lead!.couponCode = coupon;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "invalid" });
  });

  it.each(["lead", "receipt", "ledger"] as const)("does not confirm a missing %s", async key => {
    const data = fixture(); data[key] = null;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: key === "lead" ? "invalid" : "pending" });
  });

  it.each(["confirmedAt", "confirmedTransactionId", "confirmedAmountAgorot"] as const)("keeps missing lead confirmation field %s pending", async key => {
    const data = fixture(); data.lead![key] = null;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "pending" });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects nonpositive/noninteger lead amount %s", async amount => {
    const data = fixture(); data.lead!.confirmedAmountAgorot = amount;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it.each([0, -1, 1.5])("rejects invalid lead confirmation timestamp %s", async confirmedAt => {
    const data = fixture(); data.lead!.confirmedAt = confirmedAt;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it.each(["not-a-provider-id", " 987654321 "])("does not canonicalize a nonexact transaction identity: %s", async id => {
    const data = fixture(); data.lead!.confirmedTransactionId = id;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it.each(["notification_only", "review"] as const)("does not confirm receipt state %s", async state => {
    const data = fixture(); data.receipt!.state = state;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: state === "notification_only" ? "pending" : "review" });
  });

  it.each([
    { product: "guide" }, { amountAgorot: 29_899 }, { amountAgorot: 0 },
    { amountAgorot: -1 }, { amountAgorot: 1.5 }, { category: "test_checkout" },
    { receiptKey: "b".repeat(64) },
  ])("rejects conflicting receipt proof: %j", async change => {
    const data = fixture(); Object.assign(data.receipt!, change);
    installReadOnlyDb(data, true);
    expect(await query()).toEqual({ status: "review" });
  });

  it.each([
    { amountSource: "estimated" }, { product: "guide" }, { email: "other@example.test" },
    { amountAgorot: 29_899 }, { amountAgorot: 0 }, { amountAgorot: -1 },
    { amountAgorot: 1.5 }, { couponCode: " test1 " }, { transactionId: "123456789" },
  ])("rejects conflicting ledger proof: %j", async change => {
    const data = fixture(); Object.assign(data.ledger!, change);
    installReadOnlyDb(data, true);
    expect(await query()).toEqual({ status: "review" });
  });

  it("does not find another transaction ledger just because email/product match", async () => {
    const data = fixture(); data.ledger!.transactionId = "123456789";
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "pending" });
  });

  it("requires three exactly equal amounts, not receipt/ledger agreement alone", async () => {
    const data = fixture(); data.receipt!.amountAgorot = data.ledger!.amountAgorot = 29_800;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it("does not borrow proof from duplicate_existing notification references even with a Grow ledger", async () => {
    const data = fixture(); data.receipt!.state = "duplicate_existing"; data.receipt!.category = "existing_ledger";
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it("does not treat duplicate_existing with estimated ledger as payment proof", async () => {
    const data = fixture(); data.receipt!.state = "duplicate_existing"; data.ledger!.amountSource = "estimated";
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it.each(["existing_ledger", "provider_inquiry_unavailable", "provider_mismatch"])("requires provider-confirmed category, not %s", async category => {
    const data = fixture(); data.receipt!.category = category;
    installReadOnlyDb(data);
    expect(await query()).toEqual({ status: "review" });
  });

  it("allows already-tracked leads repeatedly without consuming or changing their claim", async () => {
    const data = fixture(); data.lead!.browserTrackedAt = NOW - 500;
    const before = structuredClone(data);
    installReadOnlyDb(data);
    expect(await query()).toMatchObject({ status: "confirmed" });
    installReadOnlyDb(data);
    expect(await query()).toMatchObject({ status: "confirmed" });
    expect(data).toEqual(before);
  });

  it.each(["development", "test"])("returns unavailable without any DB lookup in %s", async mode => {
    vi.stubEnv("NODE_ENV", mode);
    expect(await query()).toEqual({ status: "unavailable" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("returns sanitized unavailable when no DB exists", async () => {
    mocks.getDb.mockResolvedValue(null);
    expect(await query()).toEqual({ status: "unavailable" });
  });

  it("returns sanitized unavailable on an unknown DB connection failure", async () => {
    mocks.getDb.mockRejectedValue(new Error("SQL connection password / provider-token synthetic@example.test"));
    expect(await query()).toEqual({ status: "unavailable" });
  });

  it("returns sanitized unavailable on a failed storage read", async () => {
    mocks.getDb.mockResolvedValue({ select: () => { throw new Error("Unknown column synthetic-secret"); } });
    expect(await query()).toEqual({ status: "unavailable" });
  });

  it.each([
    { trackingToken: "A".repeat(64) }, { trackingToken: "a".repeat(63) }, { trackingToken: "a".repeat(65) },
    { processToken: "" }, { processToken: "x".repeat(256) },
    { processToken: undefined }, { expectedProduct: undefined }, { expectedProduct: "unknown" },
  ])("rejects malformed endpoint input before storage: %j", async change => {
    await expect(query({ ...input, ...change } as CheckoutStatusInput)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("accepts the bounded processToken input endpoints 1 and 255", () => {
    expect(checkoutStatusInputSchema.safeParse({ ...input, processToken: "x" }).success).toBe(true);
    expect(checkoutStatusInputSchema.safeParse({ ...input, processToken: "x".repeat(255) }).success).toBe(true);
  });

  it("fails closed for direct malformed helper input before storage", async () => {
    expect(await getCheckoutPaymentStatus({ ...input, processToken: "" })).toEqual({ status: "invalid" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("contains no writes, inquiry, fulfillment, tracking claims or send calls", () => {
    const source = readFileSync(new URL("./checkoutPaymentStatus.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\.(?:insert|update|delete|execute|transaction)\s*\(|\b(?:fetch|verifyGrowTransaction|recordGrowPaymentOnce|sendEmail|sendSMS|notifyOwner|confirmPurchaseTracking)\s*\(/);
    expect(source).not.toMatch(/paymentLeads\.browserTrackedAt|purchaseEventId|clientIp|clientUserAgent/);
    expect(source).not.toMatch(/status:\s*["'](?:unpaid|failed|retry|already_tracked)["']/);
  });
});
