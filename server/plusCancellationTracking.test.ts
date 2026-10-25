import { describe, expect, it } from "vitest";
import { crmTeamTasks, plusCancellationRequests, plusPilotMembers } from "../drizzle/schema";
import {
  buildPlusCancellationTracking,
  confirmPlusProviderStopped,
  PLUS_LOCAL_END_TASK_SOURCE,
} from "./plusCancellationTracking";
import { plusPilotRouter } from "./plusPilotRouter";

type Write = { table: unknown; values: Record<string, unknown> };

const progress = (remaining = 1) => ({
  cycleStart: 1_000,
  cycleEnd: 4_000_000_000_000,
  target: 2,
  delivered: 2 - remaining,
  remaining,
});

function row(id: number, overrides: Record<string, unknown> = {}) {
  return {
    pilot: {
      id,
      singleId: id + 100,
      status: "active",
      billingStatus: "cancelled",
      activatedAt: 1_000,
      cancelledAt: 2_000,
      billingCycleStartedAt: 1_000,
      billingCycleEndsAt: 4_000_000_000_000,
      monthlyMatchTarget: 2,
      ...overrides,
    },
    single: {
      id: id + 100,
      firstName: "חבר",
      lastName: "בדיקה",
      email: null,
      phone: null,
      isCoachingClient: false,
      isNotBasic: false,
    },
    confirmedPayment: true,
    paymentRecorded: true,
  };
}

function request(id: number, plusMemberId: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    plusMemberId,
    requestedAt: 2_000,
    resolvedAt: null,
    providerStoppedAt: null,
    pushStatus: "accepted",
    emailStatus: "accepted",
    smsStatus: "accepted",
    updatedAt: 2_000,
    ...overrides,
  };
}

function confirmationDb(options: {
  member: any;
  requests?: any[];
  cancellationTasks?: any[];
  existingAudit?: any[];
}) {
  const writes: Write[] = [];
  const selections = [
    options.member ? [options.member] : [],
    options.requests || [],
    options.cancellationTasks || [],
    options.existingAudit || [],
  ];
  const query = (rows: any[]) => {
    const limited: any = {
      for: async () => rows,
      then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
    };
    const fluent: any = {
      for: async () => rows,
      limit: () => limited,
      orderBy: () => ({ for: async () => rows }),
      then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
    };
    return fluent;
  };
  const select = () => ({
    from: () => ({ where: () => query(selections.shift() || []) }),
  });
  const tx: any = {
    select,
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => writes.push({ table, values }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (values: Record<string, unknown>) => writes.push({ table, values }),
    }),
  };
  return {
    writes,
    db: { transaction: async (callback: (inner: any) => Promise<unknown>) => callback(tx) },
  };
}

describe("Plus cancellation tracking", () => {
  it("keeps the actual last fulfilled proposal date as the historical service end", () => {
    const built = buildPlusCancellationTracking([row(1)], [request(10, 1)], [], new Map([[1, { ...progress(0), lastManualProposalAt: 3_500 }]]), 4_000);
    expect(built.tracking[0]).toMatchObject({ serviceState: "archived", serviceEndsAt: 3_500, remaining: 0 });
  });

  it("uses an unresolved current request in preference to a newer resolved row and preserves request history count", () => {
    const member = row(1);
    const built = buildPlusCancellationTracking(
      [member],
      [request(10, 1, { requestedAt: 1_500 }), request(11, 1, { requestedAt: 2_500, resolvedAt: 2_600 })],
      [],
      new Map([[1, progress(1)]]),
      3_000,
    );

    expect(built.tracking).toHaveLength(1);
    expect(built.tracking[0]).toMatchObject({
      requestId: 10,
      requestCount: 2,
      requestedAt: 1_500,
      requestDateSource: "cancellation_request",
      providerStopEvidence: "not_confirmed",
      joinedAt: 1_000,
      serviceState: "finishing_cycle",
      remaining: 1,
      target: 2,
      delivered: 1,
      legacy: false,
      subscriptionUnverified: false,
    });
  });

  it("recognizes a legacy plus_local_end task as staff evidence only when its completed time proves it followed the request", () => {
    const member = row(2, { status: "churned", billingStatus: "ended", endedAt: 3_000 });
    const built = buildPlusCancellationTracking(
      [member],
      [],
      [{ singleId: 102, createdBy: PLUS_LOCAL_END_TASK_SOURCE, status: "done", completedAt: 2_500 }],
      new Map([[2, progress(1)]]),
      3_000,
    );

    expect(built.tracking[0]).toMatchObject({
      requestId: null,
      legacy: true,
      requestedAt: 2_000,
      requestDateSource: "member_cancellation",
      providerStoppedAt: 2_500,
      providerStopEvidence: "legacy_staff_confirmation",
      resolvedAt: 2_500,
      serviceState: "archived",
      remaining: 0,
      outstandingAtClosure: 1,
    });
  });

  it("keeps legacy records with an unknown request date unconfirmed rather than inferring a provider stop", () => {
    const member = row(3, { cancelledAt: null });
    const built = buildPlusCancellationTracking(
      [member],
      [],
      [
        { singleId: 103, createdBy: "plus_self_service_cancellation", status: "done", createdAt: null },
        { singleId: 103, createdBy: PLUS_LOCAL_END_TASK_SOURCE, status: "done", completedAt: 3_000 },
      ],
      new Map([[3, progress(1)]]),
      3_000,
    );

    expect(built.tracking[0]).toMatchObject({
      legacy: true,
      requestedAt: null,
      requestDateSource: "unknown",
      providerStoppedAt: null,
      providerStopEvidence: "not_confirmed",
    });
  });

  it("keeps cancelledAt-only unactivated history visible but unverified, with no invented service debt", () => {
    const member = row(4, {
      status: "declined",
      activatedAt: null,
      billingStatus: "cancelled",
      cancelledAt: 2_000,
    });
    const built = buildPlusCancellationTracking(
      [{ ...member, confirmedPayment: false, paymentRecorded: false }],
      [],
      [],
      new Map([[4, progress(2)]]),
      3_000,
    );

    expect(built.tracking[0]).toMatchObject({
      legacy: true,
      subscriptionUnverified: true,
      serviceState: "needs_review",
      joinedAt: null,
      remaining: 0,
      target: 0,
      delivered: 0,
      providerStopEvidence: "not_confirmed",
    });
    expect(built.tracking[0]).not.toHaveProperty("outstandingAtClosure");
    expect(built.summary).toMatchObject({ requested: 0, pendingGrow: 0, confirmedGrow: 0, subscriptionUnverified: 1 });
  });

  it("does not surface stale resolved cancellation history after the membership has reactivated", () => {
    const member = row(5, { billingStatus: "active", cancelledAt: null, status: "active" });
    const built = buildPlusCancellationTracking(
      [member],
      [request(50, 5, { resolvedAt: 2_500, providerStoppedAt: 2_500 })],
      [],
      new Map([[5, progress(0)]]),
      3_000,
    );

    expect(built.tracking).toEqual([]);
  });
});

describe("confirmPlusProviderStopped", () => {
  it("records staff confirmation and completes only the cancellation task without mutating the member or matches", async () => {
    const { db, writes } = confirmationDb({
      member: { id: 1, singleId: 101, status: "active", billingStatus: "cancelled", activatedAt: 1_000, cancelledAt: 2_000 },
      requests: [request(77, 1)],
      cancellationTasks: [{ id: 3, singleId: 101, createdBy: "plus_self_service_cancellation", status: "todo", createdAt: 2_000 }],
    });

    await expect(confirmPlusProviderStopped(db, 1, "staff@example.test", 3_000))
      .resolves.toEqual({ success: true, alreadyConfirmed: false, requestId: 77, providerChanged: false });

    expect(writes.map(write => write.table)).toEqual([
      plusCancellationRequests,
      crmTeamTasks,
      crmTeamTasks,
    ]);
    expect(writes[0].values).toEqual({
      providerStoppedAt: 3_000,
      providerStoppedBy: "staff@example.test",
      updatedAt: 3_000,
    });
    expect(writes[1].values).toEqual({ status: "done", completedAt: 3_000, updatedAt: 3_000 });
    expect(writes[2].values).toMatchObject({
      createdBy: "plus_provider_stop_confirmation",
      status: "done",
      completedAt: 3_000,
    });
    expect(writes.some(write => write.table === plusPilotMembers)).toBe(false);
    expect(writes.every(write => [plusCancellationRequests, crmTeamTasks].includes(write.table as any))).toBe(true);
  });

  it("is idempotent when the current request already has an explicit staff confirmation", async () => {
    const { db, writes } = confirmationDb({
      member: { id: 2, singleId: 102, status: "active", billingStatus: "cancelled", activatedAt: 1_000, cancelledAt: 2_000 },
      requests: [request(88, 2, { providerStoppedAt: 2_500, providerStoppedBy: "staff@example.test", resolvedAt: 2_500 })],
    });

    await expect(confirmPlusProviderStopped(db, 2, "staff@example.test", 3_000))
      .resolves.toEqual({ success: true, alreadyConfirmed: true, requestId: 88, providerChanged: false });
    expect(writes).toEqual([]);
  });

  it("rejects false legacy requests with no subscription proof before writing anything", async () => {
    const { db, writes } = confirmationDb({
      member: { id: 3, singleId: 103, status: "declined", billingStatus: "cancelled", activatedAt: null, cancelledAt: 2_000 },
    });

    await expect(confirmPlusProviderStopped(db, 3, "staff@example.test", 3_000)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(writes).toEqual([]);
  });

  it("requires authenticated team access before database work", async () => {
    const anonymous = plusPilotRouter.createCaller({ req: { headers: {} }, res: {}, user: null, teamMember: null } as any);
    const nonAdmin = plusPilotRouter.createCaller({ req: { headers: {} }, res: {}, user: { role: "user" }, teamMember: null } as any);

    await expect(anonymous.adminConfirmProviderStopped({ id: 1, confirmed: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(nonAdmin.adminConfirmProviderStopped({ id: 1, confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
