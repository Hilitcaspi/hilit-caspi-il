import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import {
  crmTeamTasks,
  plusCancellationRequests,
  plusCancellationSettings,
  plusPilotMembers,
  singles,
} from "../drizzle/schema";

const external = vi.hoisted(() => ({
  getDb: vi.fn(),
  push: vi.fn(),
  email: vi.fn(),
  sms: vi.fn(),
}));

// Router coverage must never resolve a real database or delivery provider.
vi.mock("./db", () => ({ getDb: external.getDb }));
vi.mock("./_core/notification", () => ({ notifyOwner: external.push }));
vi.mock("./brevo", () => ({ sendEmail: external.email }));
vi.mock("./vibrate", () => ({
  normalizeIsraeliMobile: (phone: string) => phone === "synthetic-phone" ? "synthetic-normalized-phone" : null,
  sendSMSBulkDetailed: external.sms,
}));

import {
  cancellationDeliveryStatus,
  PLUS_CANCELLATION_TASK_SOURCE,
  recordPlusCancellation,
} from "./plusCancellation";
import { notifyPlusCancellation } from "./plusCancellationNotifications";
import { buildPlusCancellationQueue } from "./plusCancellationQueue";
import { plusPilotRouter } from "./plusPilotRouter";

type Write = {
  kind: "insert" | "update";
  table: unknown;
  values: Record<string, unknown>;
  condition?: { sql: string; params: unknown[] };
  txId: number;
};

type State = {
  member: any | null;
  single?: any | null;
  requests: any[];
  tasks: any[];
  settings?: any | null;
  writes: Write[];
  attemptedWrites: Write[];
  failTaskInsert?: boolean;
};

const dialect = new MySqlDialect();

function sqlOf(condition: any) {
  const query = dialect.sqlToQuery(condition);
  return { sql: query.sql, params: query.params as unknown[] };
}

function copyState(state: State): State {
  return {
    ...state,
    member: state.member ? { ...state.member } : null,
    single: state.single ? { ...state.single } : state.single,
    requests: state.requests.map(row => ({ ...row })),
    tasks: state.tasks.map(row => ({ ...row })),
    settings: state.settings ? { ...state.settings } : state.settings,
    writes: state.writes,
    attemptedWrites: state.attemptedWrites,
  };
}

/**
 * A deliberately small, observable Drizzle fake. It compiles real eq/and/or
 * expressions, exposes their SQL parameters, and serializes transaction bodies.
 */
function fakeCancellationDb(initial: Partial<State> = {}) {
  const state: State = {
    member: null,
    single: null,
    requests: [],
    tasks: [],
    settings: null,
    writes: [],
    attemptedWrites: [],
    ...initial,
  };
  const observedSelects: Array<{ table: unknown; condition: { sql: string; params: unknown[] } }> = [];
  let transactionTail: Promise<void> = Promise.resolve();
  let transactionNumber = 0;

  const rowsFor = (source: State, table: unknown, condition: { sql: string; params: unknown[] }) => {
    const { sql, params } = condition;
    if (table === plusPilotMembers) {
      const id = Number(params[0]);
      if (sql.includes("`single_id`")) return source.member?.singleId === id ? [source.member] : [];
      if (sql.includes("`id`")) return source.member?.id === id ? [source.member] : [];
      return source.member ? [source.member] : [];
    }
    if (table === singles) {
      const [token, email] = params.map(value => String(value));
      return source.single?.questionnaireToken === token && source.single?.email === email ? [source.single] : [];
    }
    if (table === plusCancellationRequests) {
      const memberId = sql.includes("`plus_member_id`") ? Number(params[0]) : undefined;
      return source.requests.filter(row =>
        (memberId === undefined || row.plusMemberId === memberId)
        && (!sql.includes("`resolved_at` is null") || !row.resolvedAt),
      );
    }
    if (table === crmTeamTasks) {
      const [singleId, taskType, createdBy, firstOpenStatus, secondOpenStatus] = params;
      return source.tasks.filter(row =>
        row.singleId === Number(singleId)
        && row.taskType === taskType
        && row.createdBy === createdBy
        && (!firstOpenStatus || [firstOpenStatus, secondOpenStatus].includes(row.status)),
      );
    }
    if (table === plusCancellationSettings) return source.settings ? [source.settings] : [];
    return [];
  };

  const query = (source: State, table: unknown, condition: { sql: string; params: unknown[] }) => {
    const rows = rowsFor(source, table, condition);
    const fluent: any = {
      limit: (count: number) => {
        const limited: any = rows.slice(0, count);
        limited.for = async (_lock: string) => limited;
        return limited;
      },
      then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
      catch: (reject: any) => Promise.resolve(rows).catch(reject),
    };
    return fluent;
  };

  const reader = (source: State) => (_projection?: unknown) => ({
    from: (table: unknown) => ({
      where: (condition: any) => {
        const compiled = sqlOf(condition);
        observedSelects.push({ table, condition: compiled });
        return query(source, table, compiled);
      },
    }),
  });

  const writers = (source: State, txId: number) => ({
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async (condition: any) => {
          const write: Write = { kind: "update", table, values, condition: sqlOf(condition), txId };
          source.attemptedWrites.push(write);
          source.writes.push(write);
          const params = write.condition!.params;
          if (table === plusPilotMembers && source.member) Object.assign(source.member, values);
          if (table === plusCancellationRequests) {
            const requestKey = String(params[0] || "");
            const request = source.requests.find(row => row.requestKey === requestKey)
              || source.requests.find(row => row.plusMemberId === Number(params[0]));
            if (request) Object.assign(request, values);
          }
          if (table === crmTeamTasks) {
            const createdBy = params.find(value => value === PLUS_CANCELLATION_TASK_SOURCE);
            source.tasks.filter(row => !createdBy || row.createdBy === createdBy).forEach(row => Object.assign(row, values));
          }
        },
      }),
    }),
    insert: (table: unknown) => ({
      values: async (values: Record<string, unknown>) => {
        const write: Write = { kind: "insert", table, values, txId };
        source.attemptedWrites.push(write);
        if (source.failTaskInsert && table === crmTeamTasks) throw new Error("synthetic cancellation-task failure");
        source.writes.push(write);
        if (table === plusCancellationRequests) source.requests.push({ id: source.requests.length + 1, ...values });
        if (table === crmTeamTasks) source.tasks.push({ id: source.tasks.length + 1, ...values });
      },
    }),
  });

  const db: any = {
    select: reader(state),
    ...writers(state, 0),
    transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>(resolve => { release = resolve; });
      await previous;
      const working = copyState(state);
      const txId = ++transactionNumber;
      const tx = { select: reader(working), ...writers(working, txId) };
      try {
        const result = await callback(tx);
        state.member = working.member;
        state.single = working.single;
        state.requests = working.requests;
        state.tasks = working.tasks;
        state.settings = working.settings;
        state.writes.push(...working.writes.filter(write => !state.writes.includes(write)));
        return result;
      } finally {
        release();
      }
    }),
  };
  return { db, state, observedSelects };
}

const activeMember = (overrides: Record<string, unknown> = {}) => ({
  id: 11,
  singleId: 101,
  status: "active",
  billingStatus: "active",
  billingCycleStartedAt: 100,
  billingCycleEndsAt: 2_000,
  monthlyMatchTarget: 2,
  providerSubscriptionId: "provider-subscription-private",
  lastPaymentTransactionId: "provider-transaction-private",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  external.push.mockResolvedValue(true);
  external.email.mockResolvedValue({ success: true, messageId: "synthetic-message" });
  external.sms.mockResolvedValue({ accepted: true });
});

describe("Plus cancellation intake", () => {
  it("uses one locked transaction to atomically create the ledger, preserve cancellation time, update the member, and create one matching task", async () => {
    const unrelatedTask = { singleId: 101, taskType: "plus", createdBy: "manual_plus_follow_up", status: "todo" };
    const { db, state, observedSelects } = fakeCancellationDb({
      member: activeMember({ cancelledAt: 777 }),
      tasks: [unrelatedTask],
    });

    const result = await recordPlusCancellation(db, 101, 1_000);

    expect(result).toMatchObject({ firstRequest: true, requestKey: "plus-cancellation:11:777" });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(state.writes).toHaveLength(3);
    expect(state.writes.map(write => write.txId)).toEqual([1, 1, 1]);
    expect(state.writes.map(write => [write.kind, write.table])).toEqual([
      ["insert", plusCancellationRequests],
      ["update", plusPilotMembers],
      ["insert", crmTeamTasks],
    ]);
    expect(state.requests).toMatchObject([{
      plusMemberId: 11,
      requestedAt: 777,
      resolvedAt: null,
      pushStatus: "sending",
      emailStatus: "sending",
      smsStatus: "sending",
    }]);
    expect(state.writes[1].values).toMatchObject({ billingStatus: "cancelled", cancelledAt: 777, nextBillingAt: null });

    // The unrelated Plus task is deliberately not considered an open cancellation task.
    const cancellationLookup = observedSelects.find(select => select.table === crmTeamTasks)!;
    expect(cancellationLookup.condition.params).toEqual([
      101,
      "plus",
      PLUS_CANCELLATION_TASK_SOURCE,
      "todo",
      "in_progress",
    ]);
    expect(cancellationLookup.condition.sql).toContain("`created_by` = ?");
    const cancellationTasks = state.tasks.filter(task => task.createdBy === PLUS_CANCELLATION_TASK_SOURCE);
    expect(cancellationTasks).toHaveLength(1);
    expect(state.tasks).toHaveLength(2);

    const taskContent = JSON.stringify(cancellationTasks[0]);
    expect(taskContent).not.toContain("provider-subscription-private");
    expect(taskContent).not.toContain("provider-transaction-private");
    expect(taskContent).not.toContain("member-supplied-reason");
  });

  it("serializes concurrent clicks so only one ledger entry and cancellation task commit", async () => {
    const { db, state } = fakeCancellationDb({ member: activeMember() });
    const [first, second] = await Promise.all([
      recordPlusCancellation(db, 101, 1_000),
      recordPlusCancellation(db, 101, 1_001),
    ]);

    expect([first.firstRequest, second.firstRequest].filter(Boolean)).toHaveLength(1);
    expect(state.requests).toHaveLength(1);
    expect(state.tasks.filter(task => task.createdBy === PLUS_CANCELLATION_TASK_SOURCE)).toHaveLength(1);
    expect(state.writes.filter(write => write.kind === "insert" && write.table === plusCancellationRequests)).toHaveLength(1);
    expect(state.writes.filter(write => write.kind === "insert" && write.table === crmTeamTasks)).toHaveLength(1);
  });

  it("propagates a transaction write failure instead of returning a success response", async () => {
    const { db, state } = fakeCancellationDb({ member: activeMember(), failTaskInsert: true });
    await expect(recordPlusCancellation(db, 101, 1_000)).rejects.toThrow("synthetic cancellation-task failure");
    expect(state.requests).toEqual([]);
    expect(state.tasks).toEqual([]);
  });
});

describe("Plus cancellation notifications", () => {
  it("runs push, email, and SMS independently, recording failures including a blocked email without member data in provider payloads", async () => {
    // Explicitly use synthetic recipients: host configuration must not influence this unit test.
    const priorEmail = process.env.PLUS_CANCELLATION_OWNER_EMAIL;
    const priorSms = process.env.PLUS_CANCELLATION_OWNER_SMS;
    process.env.PLUS_CANCELLATION_OWNER_EMAIL = "owner@example.test";
    process.env.PLUS_CANCELLATION_OWNER_SMS = "synthetic-phone";
    const { db, state } = fakeCancellationDb({
      settings: { recipientEmail: "owner@example.test", recipientPhone: "synthetic-phone" },
      requests: [{
        id: 1,
        requestKey: "synthetic-request-key",
        plusMemberId: 991,
        requestedAt: 1,
        resolvedAt: null,
        pushStatus: "sending",
        emailStatus: "sending",
        smsStatus: "sending",
        updatedAt: 1,
      }],
    });
    const push = vi.fn().mockRejectedValue(new Error("synthetic push failure"));
    const email = vi.fn().mockResolvedValue({ success: true, messageId: "blocked" });
    const sms = vi.fn().mockResolvedValue({ accepted: false });

    await notifyPlusCancellation(db, "synthetic-request-key", { push, email, sms } as any);

    expect(push).toHaveBeenCalledOnce();
    expect(email).toHaveBeenCalledOnce();
    expect(sms).toHaveBeenCalledOnce();
    expect(state.requests[0]).toMatchObject({ pushStatus: "failed", emailStatus: "failed", smsStatus: "failed" });
    const payload = JSON.stringify([push.mock.calls[0][0], email.mock.calls[0][0], sms.mock.calls[0][0]]);
    // Synthetic member details must never become an operations-delivery payload.
    expect(payload).not.toContain("member@example.test");
    expect(payload).not.toContain("עדן");
    expect(payload).not.toContain("991");
    expect(payload).not.toContain("provider-subscription-private");
    if (priorEmail === undefined) delete process.env.PLUS_CANCELLATION_OWNER_EMAIL;
    else process.env.PLUS_CANCELLATION_OWNER_EMAIL = priorEmail;
    if (priorSms === undefined) delete process.env.PLUS_CANCELLATION_OWNER_SMS;
    else process.env.PLUS_CANCELLATION_OWNER_SMS = priorSms;
  });

  it("does not fall back to arbitrary recipients when operational configuration is missing", async () => {
    const priorEmail = process.env.PLUS_CANCELLATION_OWNER_EMAIL;
    const priorSms = process.env.PLUS_CANCELLATION_OWNER_SMS;
    delete process.env.PLUS_CANCELLATION_OWNER_EMAIL;
    delete process.env.PLUS_CANCELLATION_OWNER_SMS;
    try {
      const { db, state } = fakeCancellationDb({
        requests: [{ requestKey: "no-config", plusMemberId: 1, pushStatus: "sending", emailStatus: "sending", smsStatus: "sending", updatedAt: 1 }],
      });
      const push = vi.fn().mockResolvedValue(true);
      const email = vi.fn().mockResolvedValue({ success: true, messageId: "must-not-send" });
      const sms = vi.fn().mockResolvedValue({ accepted: true });

      await notifyPlusCancellation(db, "no-config", { push, email, sms } as any);

      expect(push).toHaveBeenCalledOnce();
      expect(email).not.toHaveBeenCalled();
      expect(sms).not.toHaveBeenCalled();
      expect(state.requests[0]).toMatchObject({ pushStatus: "accepted", emailStatus: "failed", smsStatus: "failed" });
    } finally {
      if (priorEmail === undefined) delete process.env.PLUS_CANCELLATION_OWNER_EMAIL;
      else process.env.PLUS_CANCELLATION_OWNER_EMAIL = priorEmail;
      if (priorSms === undefined) delete process.env.PLUS_CANCELLATION_OWNER_SMS;
      else process.env.PLUS_CANCELLATION_OWNER_SMS = priorSms;
    }
  });
});

describe("Plus cancellation queue", () => {
  it("keeps unresolved ledger requests even after a local billing webhook is active, includes legacy cancellation, sorts oldest, and hides resolved archives", () => {
    const rows = [
      {
        pilot: { id: 11, status: "active", billingStatus: "active", cancelledAt: null },
        single: { id: 101, firstName: "א", lastName: "בדיקה", email: "member@example.test", phone: "synthetic-phone-a" },
      },
      {
        pilot: { id: 12, status: "active", billingStatus: "cancelled", cancelledAt: 200 },
        single: { id: 102, firstName: "ב", lastName: "בדיקה", email: "legacy@example.test", phone: "synthetic-phone-b" },
      },
      {
        pilot: { id: 13, status: "churned", billingStatus: "ended", cancelledAt: 50 },
        single: { id: 103, firstName: "ג", lastName: "ארכיון", email: "archived@example.test", phone: "synthetic-phone-c" },
      },
    ];
    const queue = buildPlusCancellationQueue(rows, [
      { plusMemberId: 11, requestedAt: 100, resolvedAt: null, pushStatus: "sending", emailStatus: "accepted", smsStatus: "failed", updatedAt: 1 },
      { plusMemberId: 13, requestedAt: 50, resolvedAt: 99, pushStatus: "accepted", emailStatus: "accepted", smsStatus: "accepted", updatedAt: 50 },
    ], [], 130_001);

    expect(queue.map(item => item.plusMemberId)).toEqual([11, 12]);
    expect(queue[0]).toMatchObject({ legacy: false, requestedAt: 100, pushStatus: "unknown", emailStatus: "accepted", smsStatus: "failed" });
    expect(queue[1]).toMatchObject({ legacy: true, requestedAt: 200, pushStatus: "not_recorded" });
    expect(cancellationDeliveryStatus("sending", 10_001, 130_001)).toBe("sending");
    expect(cancellationDeliveryStatus("sending", 10_000, 130_001)).toBe("unknown");
  });
});

describe("public Plus cancellation route", () => {
  it("rejects an unauthorized team route and invalid token without writes or provider calls", async () => {
    const { db, state } = fakeCancellationDb({ member: activeMember() });
    external.getDb.mockResolvedValue(db);
    const anonymous = plusPilotRouter.createCaller({ req: { headers: {} }, res: {}, user: null, teamMember: null } as any);
    await expect(anonymous.adminEndMembership({ id: 11, providerStoppedConfirmed: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const publicCaller = plusPilotRouter.createCaller({ req: { headers: {} }, res: {}, user: null, teamMember: null } as any);
    await expect(publicCaller.requestCancellation({ email: "member@example.test", token: "x".repeat(16) }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(state.writes).toEqual([]);
    expect(external.push).not.toHaveBeenCalled();
    expect(external.email).not.toHaveBeenCalled();
    expect(external.sms).not.toHaveBeenCalled();
  });

  it("returns providerChanged false and does not write or re-dispatch notifications on a repeated verified click", async () => {
    const { db, state } = fakeCancellationDb({
      member: activeMember(),
      single: { id: 101, email: "member@example.test", firstName: "עדן", questionnaireToken: "t".repeat(16) },
    });
    external.getDb.mockResolvedValue(db);
    external.push.mockImplementation(async () => {
      // notifyPlusCancellation is reachable only after the intake transaction committed.
      expect(state.requests).toHaveLength(1);
      expect(state.writes.filter(write => write.kind === "insert" && write.table === plusCancellationRequests)).toHaveLength(1);
      expect(state.writes.filter(write => write.kind === "insert" && write.table === crmTeamTasks)).toHaveLength(1);
      return true;
    });
    const caller = plusPilotRouter.createCaller({ req: { headers: {} }, res: {}, user: null, teamMember: null } as any);

    const first = await caller.requestCancellation({
      email: "member@example.test",
      token: "t".repeat(16),
      reason: "member-supplied-reason",
    });
    expect(first).toMatchObject({ success: true, cancellationPending: true, providerChanged: false });
    const createdTask = state.tasks.find(task => task.createdBy === PLUS_CANCELLATION_TASK_SOURCE);
    expect(JSON.stringify(createdTask)).not.toContain("member-supplied-reason");
    const providerCallsAfterFirst = { push: external.push.mock.calls.length, email: external.email.mock.calls.length, sms: external.sms.mock.calls.length };
    state.writes.length = 0;

    const repeated = await caller.requestCancellation({ email: "member@example.test", token: "t".repeat(16) });

    expect(repeated).toMatchObject({ success: true, cancellationPending: true, providerChanged: false });
    expect(state.writes).toEqual([]);
    expect(external.push).toHaveBeenCalledTimes(providerCallsAfterFirst.push);
    expect(external.email).toHaveBeenCalledTimes(providerCallsAfterFirst.email);
    expect(external.sms).toHaveBeenCalledTimes(providerCallsAfterFirst.sms);
  });
});
