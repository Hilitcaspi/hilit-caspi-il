import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core/dialect";
import { getDb } from "./db";
import { liveQuestionTicket } from "./liveQuestionAccess";
import { liveOctoberRouter } from "./liveOctoberRouter";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./liveQuestionAccess", () => ({ liveQuestionTicket: vi.fn() }));

const now = Date.parse("2026-10-07T18:00:00Z");
const plusTicket = {
  id: 17,
  eventSlug: "matching-secrets-2026-10-31",
  email: "member@example.test",
  voucherCode: "HC31-ABCDEF123456",
  issuedAt: now - 60_000,
  revokedAt: null,
  source: "plus" as const,
  singleId: 11,
  attendanceConfirmedAt: null,
};

type FakeDbOptions = { attendanceConfirmedAt?: number | null; questionCount?: number };
function fakeDb(options: FakeDbOptions = {}) {
  const updates: Array<Record<string, unknown>> = [];
  const wheres: unknown[] = [];
  const db = {
    select: (fields?: Record<string, unknown>) => ({
      from: () => ({
        where: (where: unknown) => {
          const rows = [fields && "total" in fields
            ? { total: options.questionCount ?? 0 }
            : { attendanceConfirmedAt: options.attendanceConfirmedAt ?? null }];
          const result = {
            limit: async () => rows,
            then: (resolve: (value: typeof rows) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
          };
          return result;
        },
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: async (where: unknown) => { wheres.push(where); } };
      },
    }),
  };
  return { db, updates, wheres };
}

function caller() {
  return liveOctoberRouter.createCaller({} as any);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("live October Plus RSVP", () => {
  it.each(["forged", "expired", "inactive Plus", "revoked"])("denies a %s question capability through a null verifier result", async () => {
    vi.mocked(liveQuestionTicket).mockResolvedValue(null);
    await expect(caller().confirmAttendance({ questionToken: "bad", attending: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("does not let a valid standalone question link confirm attendance", async () => {
    vi.mocked(liveQuestionTicket).mockResolvedValue({ ...plusTicket, source: "standalone", singleId: null });
    const { db, updates } = fakeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    await expect(caller().confirmAttendance({ questionToken: "signed", attending: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updates).toHaveLength(0);
  });

  it("keeps the first confirmation timestamp atomically when confirmation is repeated", async () => {
    vi.mocked(liveQuestionTicket).mockResolvedValue(plusTicket);
    const { db, updates, wheres } = fakeDb({ attendanceConfirmedAt: now - 3_000 });
    vi.mocked(getDb).mockResolvedValue(db as any);
    const result = await caller().confirmAttendance({ questionToken: "signed", attending: true });
    expect(result).toEqual({ attending: true, attendanceConfirmedAt: now - 3_000 });
    expect(updates).toHaveLength(1);
    const dialect = new MySqlDialect();
    const confirmationSql = dialect.sqlToQuery((updates[0]!.attendanceConfirmedAt as any).getSQL());
    expect(confirmationSql.sql).toContain("coalesce(`live_october_tickets`.`attendance_confirmed_at`, ?)");
    expect(confirmationSql.params).toEqual([now]);
    expect(wheres).toHaveLength(1);
    const whereSql = dialect.sqlToQuery((wheres[0] as any).getSQL());
    expect(whereSql.sql).toContain("`live_october_tickets`.`revoked_at` is null");
    expect(whereSql.sql).toContain("exists (");
  });

  it("clears confirmation when a Plus member cancels", async () => {
    vi.mocked(liveQuestionTicket).mockResolvedValue({ ...plusTicket, attendanceConfirmedAt: now - 3_000 });
    const { db, updates } = fakeDb({ attendanceConfirmedAt: null });
    vi.mocked(getDb).mockResolvedValue(db as any);
    await expect(caller().confirmAttendance({ questionToken: "signed", attending: false }))
      .resolves.toEqual({ attending: false, attendanceConfirmedAt: null });
    expect(updates).toHaveLength(1);
    expect(updates[0]!.attendanceConfirmedAt).toBeNull();
  });

  it("returns RSVP state and Plus status from questionAccess without a ticket write", async () => {
    vi.mocked(liveQuestionTicket).mockResolvedValue({ ...plusTicket, attendanceConfirmedAt: now - 2_000 });
    const { db, updates } = fakeDb({ questionCount: 1 });
    vi.mocked(getDb).mockResolvedValue(db as any);
    await expect(caller().questionAccess({ questionToken: "signed" })).resolves.toEqual({
      remaining: 2, isPlus: true, attendanceConfirmed: true, attendanceConfirmedAt: now - 2_000,
    });
    expect(updates).toHaveLength(0);
  });
});
