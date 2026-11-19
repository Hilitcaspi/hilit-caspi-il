import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { matches, singles, type Match } from "../drizzle/schema";
import { PROPOSAL_WINDOW_MS } from "../shared/matchAvailability";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  sendSMS: vi.fn(),
  sendEmail: vi.fn(),
  consolation: vi.fn(),
  notifyOwner: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./vibrate", () => ({ sendSMS: mocks.sendSMS }));
vi.mock("./emailTemplates", () => ({ buildConsolationEmail: mocks.consolation }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./compatibility", () => ({ computeFullScore: vi.fn(), MATCH_THRESHOLD: 80 }));
vi.mock("./regularMatchingEligibility", () => ({ regularMatchingAccessSql: vi.fn() }));
vi.mock("./matchSms", () => ({
  buildMatchExpiredSmsMessage: (name: string) => `expired:${name}`,
}));

import { expireStaleMatches } from "./matchingScheduler";

const NOW = Date.UTC(2026, 10, 19, 10, 0);
const HOUR = 60 * 60 * 1000;
const dialect = new MySqlDialect();

function matchRow(patch: Partial<Match> = {}): Match {
  return {
    id: 7,
    singleAId: 11,
    singleBId: 22,
    status: "proposed",
    proposedAt: NOW - PROPOSAL_WINDOW_MS - 1,
    approvalExpiresAt: null,
    approvedByA: false,
    approvedByB: false,
    tokenAUsedAt: null,
    tokenBUsedAt: null,
    updatedAt: 0,
    ...patch,
  } as Match;
}

/**
 * Deliberately returns candidate snapshots even after they become obsolete.
 * The locked read is authoritative; a serialized transaction queue simulates
 * overlapping scheduler invocations without connecting to any database.
 */
function fakeDb(initial: Match, options: {
  beforeLock?: (row: Match) => void;
  affectedRows?: number;
  failUpdate?: boolean;
} = {}) {
  let row = { ...initial };
  const candidate = { ...initial };
  let tail: Promise<unknown> = Promise.resolve();
  let inTransaction = false;
  const locks: string[] = [];
  const writes: Partial<Match>[] = [];
  const scanQueries: ReturnType<MySqlDialect["sqlToQuery"]>[] = [];
  const updateQueries: ReturnType<MySqlDialect["sqlToQuery"]>[] = [];
  const people = new Map([
    [11, { id: 11, firstName: "A", email: "a@example.test", phone: "0500000011", isActive: true, isSeed: false }],
    [22, { id: 22, firstName: "B", email: "b@example.test", phone: "0500000022", isActive: true, isSeed: false }],
  ]);
  const select = vi.fn(() => ({
    from: (table: unknown) => ({
      where: (predicate: SQL) => {
        expect(inTransaction).toBe(false);
        const query = dialect.sqlToQuery(predicate);
        if (table === matches) {
          scanQueries.push(query);
          return Promise.resolve([{ ...candidate }]);
        }
        expect(table).toBe(singles);
        return { limit: async () => [people.get(query.params[0] as number)] };
      },
    }),
  }));
  const transaction = vi.fn(<T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
    const run = tail.then(async () => {
      inTransaction = true;
      let locked = false;
      let nextRow = { ...row };
      const pendingWrites: Partial<Match>[] = [];
      const tx = {
        select: () => ({
          from: (table: unknown) => {
            expect(table).toBe(matches);
            return {
              where: (predicate: SQL) => ({
                limit: (limit: number) => ({
                  for: async (mode: string) => {
                    expect(limit).toBe(1);
                    expect(mode).toBe("update");
                    expect(dialect.sqlToQuery(predicate).params).toEqual([initial.id]);
                    options.beforeLock?.(row);
                    nextRow = { ...row };
                    locked = true;
                    locks.push(mode);
                    return [{ ...nextRow }];
                  },
                }),
              }),
            };
          },
        }),
        update: (table: unknown) => {
          expect(table).toBe(matches);
          expect(locked).toBe(true);
          return {
            set: (patch: Partial<Match>) => ({
              where: async (predicate: SQL) => {
                updateQueries.push(dialect.sqlToQuery(predicate));
                if (options.failUpdate) throw new Error("synthetic expiry write failure");
                const affectedRows = options.affectedRows ?? 1;
                if (affectedRows === 1) {
                  pendingWrites.push({ ...patch });
                  nextRow = { ...nextRow, ...patch };
                }
                return [{ affectedRows }];
              },
            }),
          };
        },
      };
      try {
        const result = await callback(tx);
        row = nextRow;
        writes.push(...pendingWrites);
        return result;
      } finally {
        inTransaction = false;
      }
    });
    tail = run.catch(() => undefined);
    return run;
  });
  const outsideUpdate = vi.fn(() => { throw new Error("Expiry writes must be transactional"); });
  const db = { select, transaction, update: outsideUpdate };
  return { db, row: () => ({ ...row }), locks, writes, scanQueries, updateQueries, people, outsideUpdate };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  mocks.sendSMS.mockResolvedValue(true);
  mocks.sendEmail.mockResolvedValue(true);
  mocks.consolation.mockReturnValue({ subject: "Expired proposal", htmlBody: "<p>expired</p>", textBody: "expired" });
});

function expectNoNotifications() {
  expect(mocks.sendSMS).not.toHaveBeenCalled();
  expect(mocks.sendEmail).not.toHaveBeenCalled();
  expect(mocks.consolation).not.toHaveBeenCalled();
  expect(mocks.notifyOwner).not.toHaveBeenCalled();
}

describe("expireStaleMatches", () => {
  it("does nothing without a database", async () => {
    mocks.getDb.mockResolvedValue(null);
    expect(await expireStaleMatches()).toBe(0);
    expectNoNotifications();
  });

  it("preserves an explicit seven-day window even when proposedAt is older than 48 hours", async () => {
    const proposedAt = NOW - 3 * 24 * HOUR;
    const fake = fakeDb(matchRow({ proposedAt, approvalExpiresAt: proposedAt + 7 * 24 * HOUR }));
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(0);
    expect(fake.row().status).toBe("proposed");
    expect(fake.writes).toEqual([]);
    expect(fake.locks).toEqual(["update"]);
    // Verify the scan honours explicit deadlines, not just old proposedAt.
    expect(fake.scanQueries[0].sql).toContain("`matches`.`approvalExpiresAt` <= ?");
    expect(fake.scanQueries[0].sql).toContain("`matches`.`approvalExpiresAt` is null");
    expect(fake.scanQueries[0].params).toEqual(["proposed", 0, NOW, 0, 0, NOW - PROPOSAL_WINDOW_MS]);
    expectNoNotifications();
  });

  it("rereads a deadline extended after the candidate scan", async () => {
    const fake = fakeDb(matchRow(), {
      beforeLock: row => { row.approvalExpiresAt = NOW + 7 * 24 * HOUR; },
    });
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(0);
    expect(fake.writes).toEqual([]);
    expectNoNotifications();
  });

  it("does not overwrite mutual yes that becomes matched before the expiry lock", async () => {
    const fake = fakeDb(matchRow({ approvedByA: true, tokenAUsedAt: NOW - HOUR }), {
      beforeLock: row => Object.assign(row, {
        status: "matched", approvedByB: true, tokenBUsedAt: NOW - 1, matchedAt: NOW - 1,
      }),
    });
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(0);
    expect(fake.row().status).toBe("matched");
    expect(fake.writes).toEqual([]);
    expectNoNotifications();
  });

  it("preserves mutual yes even if a legacy row still says proposed", async () => {
    const fake = fakeDb(matchRow({ approvedByA: true, approvedByB: true }));
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(0);
    expect(fake.writes).toEqual([]);
    expectNoNotifications();
  });

  it.each([
    { label: "explicit deadline on a young proposal", patch: { proposedAt: NOW - HOUR, approvalExpiresAt: NOW } },
    { label: "explicit deadline without proposedAt", patch: { proposedAt: null, approvalExpiresAt: NOW } },
    { label: "legacy 48-hour boundary", patch: { proposedAt: NOW - PROPOSAL_WINDOW_MS } },
  ])("expires at the $label with a guarded transactional claim", async ({ patch }) => {
    const fake = fakeDb(matchRow(patch));
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(1);
    expect(fake.row().status).toBe("expired");
    expect(fake.locks).toEqual(["update"]);
    expect(fake.writes).toEqual([{ status: "expired", updatedAt: NOW }]);
    expect(fake.outsideUpdate).not.toHaveBeenCalled();
    expect(fake.updateQueries[0].sql).toContain("`matches`.`status` = ?");
    expect(fake.updateQueries[0].sql).toContain("`matches`.`approvalExpiresAt` <= ?");
    expect(fake.updateQueries[0].params).toEqual([7, "proposed", 0, NOW, 0, 0, NOW - PROPOSAL_WINDOW_MS, false, false]);
    expect(mocks.sendSMS).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("leaves undated proposals for review rather than guessing an expiry", async () => {
    const fake = fakeDb(matchRow({ proposedAt: null, approvalExpiresAt: null }));
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(0);
    expect(fake.writes).toEqual([]);
    expectNoNotifications();
  });

  it("notifies from the successfully claimed locked snapshot, not the candidate snapshot", async () => {
    const fake = fakeDb(matchRow(), {
      beforeLock: row => Object.assign(row, { approvedByA: true, tokenAUsedAt: NOW - HOUR }),
    });
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(1);
    expect(mocks.sendSMS.mock.calls).toEqual([["0500000022", "expired:B"]]);
    expect(mocks.consolation).toHaveBeenCalledWith({
      firstName: "A", matchFirstName: "B", recipientEmail: "a@example.test", singleId: 11, reason: "expired",
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith({
      to: { email: "a@example.test", name: "A" }, subject: "Expired proposal", htmlContent: "<p>expired</p>", textContent: "expired",
    });
  });

  it("does not treat an explicit no as no response merely because approval is false", async () => {
    const fake = fakeDb(matchRow({ tokenAUsedAt: NOW - HOUR, approvedByA: false }));
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(1);
    expect(mocks.sendSMS.mock.calls).toEqual([["0500000022", "expired:B"]]);
    expect(mocks.consolation).not.toHaveBeenCalled();
  });

  it("retains active and non-seed guards on expiry SMS", async () => {
    const fake = fakeDb(matchRow());
    fake.people.get(11)!.isActive = false;
    fake.people.get(22)!.isSeed = true;
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(1);
    expectNoNotifications();
  });

  it("does not count or notify a failed guarded claim", async () => {
    const fake = fakeDb(matchRow({ approvedByA: true, tokenAUsedAt: NOW - HOUR }), { affectedRows: 0 });
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(0);
    expect(fake.row().status).toBe("proposed");
    expect(fake.writes).toEqual([]);
    expectNoNotifications();
  });

  it("does not notify when the transaction fails", async () => {
    const fake = fakeDb(matchRow(), { failUpdate: true });
    mocks.getDb.mockResolvedValue(fake.db);
    await expect(expireStaleMatches()).rejects.toThrow("synthetic expiry write failure");
    expect(fake.row().status).toBe("proposed");
    expect(fake.writes).toEqual([]);
    expectNoNotifications();
  });

  it("skips repeated expired rows without duplicate notifications", async () => {
    const fake = fakeDb(matchRow({ approvedByA: true, tokenAUsedAt: NOW - HOUR }));
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await expireStaleMatches()).toBe(1);
    expect(await expireStaleMatches()).toBe(0);
    expect(fake.writes).toHaveLength(1);
    expect(fake.locks).toEqual(["update", "update"]);
    expect(mocks.sendSMS).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("allows only one overlapping scheduler invocation to claim and notify", async () => {
    const fake = fakeDb(matchRow());
    mocks.getDb.mockResolvedValue(fake.db);
    expect(await Promise.all([expireStaleMatches(), expireStaleMatches()])).toEqual([1, 0]);
    expect(fake.writes).toHaveLength(1);
    expect(mocks.sendSMS).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
