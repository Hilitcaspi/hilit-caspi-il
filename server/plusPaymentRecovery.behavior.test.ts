import { beforeEach, describe, expect, it, vi } from "vitest";
import { matchBoostMemberships, plusCheckoutIntents, plusPilotMembers } from "../drizzle/schema";

const dbState = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  updates: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
}));

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => {
      const rows = dbState.selectResults.shift() || [];
      const query: any = {
        from: () => query,
        innerJoin: () => query,
        where: async () => rows,
      };
      return query;
    },
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          dbState.updates.push({ table, values });
        },
      }),
    }),
  }),
}));

import { preparePlusPaymentRecoveryCandidates } from "./plusHolidayPilotCampaign";

describe("Plus 1-shekel payment recovery", () => {
  beforeEach(() => {
    dbState.selectResults = [];
    dbState.updates = [];
  });

  it("demotes exactly five 1-shekel sandbox activations, preserves a real 99-shekel activation and never touches Boost", async () => {
    const activeMen = Array.from({ length: 6 }, (_, index) => ({
      member: { id: index + 1, singleId: 100 + index, status: "active", billingStatus: "active" },
      single: {
        id: 100 + index,
        email: `member${index + 1}@example.com`,
        gender: "male",
        questionnaireToken: `questionnaire-token-${index + 1}`,
      },
    }));
    const paymentEvents = activeMen.map((row, index) => ({
      plusMemberId: row.member.id,
      eventType: "subscription_started",
      providerTransactionId: `transaction-${index + 1}`,
      amountAgorot: index < 5 ? 100 : 9900,
    }));
    dbState.selectResults = [activeMen, paymentEvents];

    await expect(preparePlusPaymentRecoveryCandidates()).resolves.toEqual({ prepared: 5 });

    const plusUpdates = dbState.updates.filter(update => update.table === plusPilotMembers);
    const intentUpdates = dbState.updates.filter(update => update.table === plusCheckoutIntents);
    const boostUpdates = dbState.updates.filter(update => update.table === matchBoostMemberships);

    expect(plusUpdates).toHaveLength(5);
    expect(intentUpdates).toHaveLength(5);
    expect(boostUpdates).toHaveLength(0);
    expect(plusUpdates.every(update => update.values.status === "eligible" && update.values.billingStatus === "not_configured")).toBe(true);
    expect(intentUpdates.every(update => update.values.status === "failed")).toBe(true);
  });

  it("stops without changing data when the recovery snapshot is not exactly five 1-shekel records", async () => {
    const activeMen = Array.from({ length: 4 }, (_, index) => ({
      member: { id: index + 1, singleId: 200 + index, status: "active", billingStatus: "active" },
      single: {
        id: 200 + index,
        email: `candidate${index + 1}@example.com`,
        gender: "male",
        questionnaireToken: `questionnaire-token-${index + 1}`,
      },
    }));
    dbState.selectResults = [activeMen, activeMen.map(row => ({
      plusMemberId: row.member.id,
      eventType: "subscription_started",
      providerTransactionId: `transaction-${row.member.id}`,
      amountAgorot: 100,
    }))];

    await expect(preparePlusPaymentRecoveryCandidates()).rejects.toThrow("Plus payment recovery snapshot mismatch");
    expect(dbState.updates).toHaveLength(0);
  });
});
