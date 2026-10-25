import { beforeEach, describe, expect, it } from "vitest";
import { matchBoostRequests, plusPilotMembers, purchaseRecoveryRecipients, singles } from "../drizzle/schema";
import {
  grantPurchaseRecoveryPlusGift,
  PURCHASE_RECOVERY_PLUS_GIFT_RETRY_AFTER_ACTIVATION,
} from "./purchaseRecoveryGift";

type Write = { table: unknown; values: Record<string, unknown> };

const now = Date.parse("2026-10-25T10:00:00.000Z");

function createDb(selectResults: unknown[][], giftMarkerAffectedRows = 1) {
  const inserts: Write[] = [];
  const updates: Write[] = [];
  let updateCount = 0;
  const tx: any = {
    select: () => {
      const rows = selectResults.shift() || [];
      const query: any = {
        from: () => query,
        where: () => query,
        limit: () => query,
        for: async () => rows,
      };
      return query;
    },
    insert: (table: unknown) => ({
      values: async (values: Record<string, unknown>) => {
        inserts.push({ table, values });
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          updates.push({ table, values });
          updateCount += 1;
          return { affectedRows: updateCount === 1 ? giftMarkerAffectedRows : 1 };
        },
      }),
    }),
  };
  return {
    db: { transaction: async (run: (transaction: any) => Promise<unknown>) => run(tx) },
    inserts,
    updates,
  };
}

function eligibleRows() {
  return [
    [{ id: 71, offerRedeemedAt: now - 1000, offerTransactionId: "tx-verified", giftGrantedAt: null }],
    [{ id: 42, isPaid: true, isActive: true }],
    [{ id: 99, singleId: 42, status: "active", billingStatus: "active", lastPaymentTransactionId: "tx-verified" }],
  ];
}

describe("grantPurchaseRecoveryPlusGift", () => {
  beforeEach(() => {
    // Tests use only synthetic identifiers and never call a real database.
  });

  it("creates exactly one reusable zero-cost credit without a match or state rewrites", async () => {
    const state = createDb(eligibleRows());

    const result = await grantPurchaseRecoveryPlusGift(state.db, {
      email: "member@example.test",
      transactionId: "tx-verified",
      now,
    });

    expect(result).toEqual({
      granted: true,
      alreadyGranted: false,
      idempotencyKey: "purchase-recovery-plus-gift:recovery_oct25_2026:71",
    });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toEqual({
      table: matchBoostRequests,
      values: expect.objectContaining({
        singleId: 42,
        matchId: null,
        source: "paid",
        status: "refunded",
        amountAgorot: 0,
        idempotencyKey: "purchase-recovery-plus-gift:recovery_oct25_2026:71",
        providerTransactionId: null,
        paidAt: null,
        decisionReason: "boost_credit_available:purchase_recovery_plus_first_signup",
      }),
    });
    expect(state.updates).toEqual([{ table: purchaseRecoveryRecipients, values: { giftGrantedAt: now, updatedAt: now } }]);
    expect(state.inserts.some(write => write.table === singles || write.table === plusPilotMembers)).toBe(false);
    expect(state.updates.some(write => write.table === singles || write.table === plusPilotMembers)).toBe(false);
  });

  it("returns alreadyGranted without issuing another credit when the recipient marker exists", async () => {
    const state = createDb([[
      { id: 71, offerRedeemedAt: now - 1000, offerTransactionId: "tx-verified", giftGrantedAt: now - 1 },
    ]]);

    await expect(grantPurchaseRecoveryPlusGift(state.db, {
      email: "member@example.test",
      transactionId: "tx-verified",
      now,
    })).resolves.toEqual({
      granted: false,
      alreadyGranted: true,
      idempotencyKey: "purchase-recovery-plus-gift:recovery_oct25_2026:71",
    });
    expect(state.inserts).toEqual([]);
    expect(state.updates).toEqual([]);
  });

  it("requires the newly activated Plus row to match the verified transaction before writing a credit", async () => {
    const rows = eligibleRows();
    rows[2] = [{ id: 99, singleId: 42, status: "active", billingStatus: "active", lastPaymentTransactionId: "different-tx" }];
    const state = createDb(rows);

    await expect(grantPurchaseRecoveryPlusGift(state.db, {
      email: "member@example.test",
      transactionId: "tx-verified",
      now,
    })).rejects.toThrow(PURCHASE_RECOVERY_PLUS_GIFT_RETRY_AFTER_ACTIVATION);
    expect(state.inserts).toEqual([]);
    expect(state.updates).toEqual([]);
  });
});
