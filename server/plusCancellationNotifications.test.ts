import { describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import {
  plusCancellationRequests,
  plusCancellationSettings,
  plusPilotMembers,
  singles,
} from "../drizzle/schema";
import { notifyPlusCancellation } from "./plusCancellationNotifications";

const dialect = new MySqlDialect();

type DetailRow = {
  requestKey: string;
  requestedAt: number;
  firstName: string;
  lastName: string | null;
  activatedAt: number | null;
};

function fakeNotificationDb(
  row: DetailRow | null,
  settings = {
    recipientEmail: "owner@example.test",
    recipientPhone: "0500000000",
  }
) {
  const writes: Array<{ values: Record<string, unknown>; requestKey: string }> =
    [];
  const selectTrace: Array<{
    joins: unknown[];
    limit?: number;
    requestKey?: string;
  }> = [];
  const db: any = {
    select: (projection?: Record<string, unknown>) => {
      const joins: unknown[] = [];
      const chain: any = {
        from: (table: unknown) => {
          const fromChain: any = {
            innerJoin: (joinedTable: unknown) => {
              joins.push(joinedTable);
              return fromChain;
            },
            where: (condition: any) => {
              const compiled = dialect.sqlToQuery(condition);
              const requestKey = String(compiled.params[0] || "");
              const isDetailsLookup =
                table === plusCancellationRequests && joins.length === 2;
              const result = isDetailsLookup
                ? row && row.requestKey === requestKey
                  ? [
                      {
                        firstName: row.firstName,
                        lastName: row.lastName,
                        requestedAt: row.requestedAt,
                        activatedAt: row.activatedAt,
                      },
                    ]
                  : []
                : table === plusCancellationSettings
                  ? [settings]
                  : [];
              selectTrace.push({
                joins: [...joins],
                requestKey: isDetailsLookup ? requestKey : undefined,
              });
              const bounded: any = result;
              bounded.limit = (count: number) => {
                const limited: any = result.slice(0, count);
                selectTrace[selectTrace.length - 1]!.limit = count;
                return limited;
              };
              return bounded;
            },
          };
          return fromChain;
        },
      };
      return chain;
    },
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async (condition: any) => {
          expect(table).toBe(plusCancellationRequests);
          const compiled = dialect.sqlToQuery(condition);
          writes.push({ values, requestKey: String(compiled.params[0]) });
        },
      }),
    }),
  };
  return { db, writes, selectTrace };
}

describe("Plus cancellation owner notification details", () => {
  it("sends the bounded authorized name and Israel-formatted lifecycle dates to each owner channel", async () => {
    const priorEmail = process.env.PLUS_CANCELLATION_OWNER_EMAIL;
    const priorSms = process.env.PLUS_CANCELLATION_OWNER_SMS;
    process.env.PLUS_CANCELLATION_OWNER_EMAIL = "owner@example.test";
    process.env.PLUS_CANCELLATION_OWNER_SMS = "0500000000";
    const requestKey = "synthetic-request-key";
    const { db, writes, selectTrace } = fakeNotificationDb({
      requestKey,
      firstName: "עדן\n",
      lastName: "<לוי>",
      requestedAt: Date.parse("2026-01-15T12:30:00.000Z"),
      activatedAt: Date.parse("2025-12-15T08:05:00.000Z"),
    });
    const push = vi.fn().mockResolvedValue(true);
    const email = vi
      .fn()
      .mockResolvedValue({ success: true, messageId: "synthetic-message" });
    const sms = vi.fn().mockResolvedValue({ accepted: true });

    try {
      await notifyPlusCancellation(db, requestKey, { push, email, sms } as any);

      expect(selectTrace).toContainEqual({
        joins: [plusPilotMembers, singles],
        limit: 1,
        requestKey,
      });
      expect(push).toHaveBeenCalledOnce();
      expect(email).toHaveBeenCalledOnce();
      expect(sms).toHaveBeenCalledOnce();
      const [pushPayload] = push.mock.calls[0];
      const [emailPayload] = email.mock.calls[0];
      const [smsPayload] = sms.mock.calls[0];
      const ownerPayloads = JSON.stringify([
        pushPayload,
        emailPayload,
        smsPayload,
      ]);

      expect(ownerPayloads).toContain("עדן <לוי>");
      expect(ownerPayloads).toContain("15.01.2026");
      expect(ownerPayloads).toContain("14:30");
      expect(ownerPayloads).toContain("15.12.2025");
      expect(ownerPayloads).toContain("10:05");
      expect(emailPayload.htmlContent).toContain("עדן &lt;לוי&gt;");
      expect(smsPayload.messages[0].message).not.toMatch(/[\r\n\u2028\u2029]/);
      expect(smsPayload.idempotencyKey).not.toContain(requestKey);
      expect(ownerPayloads).toContain("Grow");
      expect(ownerPayloads).toContain("זכאות השירות נשמרת עד סוף המחזור");
      expect(ownerPayloads).toContain("האישור אינו מסיים את השירות");
      expect(ownerPayloads).toContain("אישור עצירת החיוב ב־Grow");
      expect(ownerPayloads).not.toContain("provider-subscription-private");
      expect(writes).toHaveLength(3);
      expect(writes.map(write => write.values)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ pushStatus: "accepted" }),
          expect.objectContaining({ emailStatus: "accepted" }),
          expect.objectContaining({ smsStatus: "accepted" }),
        ])
      );
    } finally {
      if (priorEmail === undefined)
        delete process.env.PLUS_CANCELLATION_OWNER_EMAIL;
      else process.env.PLUS_CANCELLATION_OWNER_EMAIL = priorEmail;
      if (priorSms === undefined)
        delete process.env.PLUS_CANCELLATION_OWNER_SMS;
      else process.env.PLUS_CANCELLATION_OWNER_SMS = priorSms;
    }
  });

  it("retains the generic owner alert when the bounded lookup cannot resolve a profile", async () => {
    const priorEmail = process.env.PLUS_CANCELLATION_OWNER_EMAIL;
    const priorSms = process.env.PLUS_CANCELLATION_OWNER_SMS;
    process.env.PLUS_CANCELLATION_OWNER_EMAIL = "owner@example.test";
    process.env.PLUS_CANCELLATION_OWNER_SMS = "0500000000";
    const { db, writes } = fakeNotificationDb(null);
    const push = vi.fn().mockResolvedValue(true);
    const email = vi
      .fn()
      .mockResolvedValue({ success: true, messageId: "synthetic-message" });
    const sms = vi.fn().mockResolvedValue({ accepted: true });

    try {
      await notifyPlusCancellation(db, "lookup-miss", {
        push,
        email,
        sms,
      } as any);

      expect(push).toHaveBeenCalledOnce();
      expect(email).toHaveBeenCalledOnce();
      expect(sms).toHaveBeenCalledOnce();
      const ownerPayloads = JSON.stringify([
        push.mock.calls[0][0],
        email.mock.calls[0][0],
        sms.mock.calls[0][0],
      ]);
      expect(ownerPayloads).toContain("התקבלה בקשת ביטול Plus");
      expect(ownerPayloads).not.toContain("lookup-miss");
      expect(ownerPayloads).not.toContain("provider");
      expect(ownerPayloads).not.toMatch(/שגיאה|error/i);
      expect(writes).toHaveLength(3);
    } finally {
      if (priorEmail === undefined)
        delete process.env.PLUS_CANCELLATION_OWNER_EMAIL;
      else process.env.PLUS_CANCELLATION_OWNER_EMAIL = priorEmail;
      if (priorSms === undefined)
        delete process.env.PLUS_CANCELLATION_OWNER_SMS;
      else process.env.PLUS_CANCELLATION_OWNER_SMS = priorSms;
    }
  });
});
