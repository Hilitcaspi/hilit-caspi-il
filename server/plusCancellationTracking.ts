import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { crmTeamTasks, plusCancellationRequests, plusPaymentEvents, plusPilotMembers } from "../drizzle/schema";
import { getPlusServiceDeparture } from "../shared/plusServiceDeparture";
import { cancellationDeliveryStatus, PLUS_CANCELLATION_TASK_SOURCE, type PlusCancellationStatus } from "./plusCancellation";

export const PLUS_LOCAL_END_TASK_SOURCE = "plus_local_end";
export const PLUS_PROVIDER_STOP_CONFIRMATION_TASK_SOURCE = "plus_provider_stop_confirmation";

type TrackingProgress = {
  cycleStart: number;
  cycleEnd: number;
  target: number;
  delivered: number;
  remaining: number;
  lastManualProposalAt?: number | null;
};

type TrackingTask = {
  singleId?: number | null;
  createdBy?: string | null;
  createdAt?: number | null;
  completedAt?: number | null;
  status?: string | null;
};

function timestamp(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function latest<T>(items: T[], getAt: (item: T) => number | null) {
  return [...items].sort((left, right) => Number(getAt(right) || 0) - Number(getAt(left) || 0))[0] || null;
}

function hasReactivated(member: any) {
  return member.status === "active" && member.billingStatus === "active" && !timestamp(member.cancelledAt);
}

function hasLegacyRequestEvidence(member: any, cancellationTasks: TrackingTask[], localEndTasks: TrackingTask[]) {
  return Boolean(timestamp(member.cancelledAt) || cancellationTasks.length || localEndTasks.length);
}

function legacyRequestDate(member: any, cancellationTasks: TrackingTask[]) {
  const task = latest(cancellationTasks, row => timestamp(row.createdAt));
  if (task && timestamp(task.createdAt)) {
    return { requestedAt: timestamp(task.createdAt), requestDateSource: "cancellation_task" as const };
  }
  if (timestamp(member.cancelledAt)) {
    return { requestedAt: timestamp(member.cancelledAt), requestDateSource: "member_cancellation" as const };
  }
  return { requestedAt: null, requestDateSource: "unknown" as const };
}

function legacyProviderStopAt(localEndTasks: TrackingTask[], requestedAt: number | null) {
  if (!requestedAt) return null;
  const proof = latest(
    localEndTasks.filter(task => {
      const completedAt = timestamp(task.completedAt);
      return task.status === "done" && Boolean(completedAt && completedAt >= requestedAt);
    }),
    task => timestamp(task.completedAt),
  );
  return proof ? timestamp(proof.completedAt) : null;
}

function deliveryStatus(request: any, field: "pushStatus" | "emailStatus" | "smsStatus", now: number) {
  if (!request) return "not_recorded" as const;
  return cancellationDeliveryStatus(request[field] as PlusCancellationStatus, Number(request.updatedAt || 0), now);
}

function hasSubscriptionProof(member: any, row: any) {
  return member.status === "active"
    || Boolean(timestamp(member.activatedAt))
    || Boolean(row.confirmedPayment)
    || Boolean(row.paymentRecorded);
}

/**
 * Builds the full cancellation history separately from the live Grow-stop queue.
 * A member may have historical ledger rows, but an active membership with its
 * cancellation timestamp cleared has reactivated and must not inherit that old
 * request as its current cancellation state.
 */
export function buildPlusCancellationTracking(
  rows: any[],
  requests: any[],
  tasks: TrackingTask[],
  progressByMemberId: Map<number, TrackingProgress>,
  now = Date.now(),
) {
  const requestsByMemberId = new Map<number, any[]>();
  for (const request of requests) {
    const list = requestsByMemberId.get(Number(request.plusMemberId)) || [];
    list.push(request);
    requestsByMemberId.set(Number(request.plusMemberId), list);
  }
  const tasksBySingleId = new Map<number, TrackingTask[]>();
  for (const task of tasks) {
    const singleId = Number(task.singleId || 0);
    if (!singleId) continue;
    const list = tasksBySingleId.get(singleId) || [];
    list.push(task);
    tasksBySingleId.set(singleId, list);
  }

  const tracking = rows.filter(row => !hasReactivated(row.pilot)).map(row => {
    const member = row.pilot;
    const memberRequests = requestsByMemberId.get(Number(member.id)) || [];
    const memberTasks = tasksBySingleId.get(Number(row.single.id)) || [];
    const cancellationTasks = memberTasks.filter(task => task.createdBy === PLUS_CANCELLATION_TASK_SOURCE);
    const localEndTasks = memberTasks.filter(task => task.createdBy === PLUS_LOCAL_END_TASK_SOURCE);
    const unresolved = latest(memberRequests.filter(request => !timestamp(request.resolvedAt)), request => timestamp(request.requestedAt));
    const resolved = latest(memberRequests.filter(request => timestamp(request.resolvedAt)), request => timestamp(request.requestedAt));
    const legacyEvidence = hasLegacyRequestEvidence(member, cancellationTasks, localEndTasks);
    const request = unresolved || resolved;
    const legacy = !request && legacyEvidence;
    const explicitRequest = Boolean(memberRequests.length || cancellationTasks.length);
    // A cancelledAt-only historical row is not proof that Plus was ever activated
    // or paid. Keep it auditable, but never invent a cycle or Grow work item.
    const subscriptionUnverified = !Boolean(timestamp(member.activatedAt))
      && !Boolean(row.confirmedPayment)
      && !Boolean(row.paymentRecorded)
      && !explicitRequest;
    const legacyDate = legacyRequestDate(member, cancellationTasks);
    const requestedAt = request ? timestamp(request.requestedAt) : legacy ? legacyDate.requestedAt : null;
    const requestDateSource = request
      ? "cancellation_request"
      : legacy
        ? legacyDate.requestDateSource
        : "unknown";
    const localProofAt = legacyProviderStopAt(localEndTasks, requestedAt);
    const recordedProviderStopAt = request ? timestamp(request.providerStoppedAt) : null;
    const providerStoppedAt = recordedProviderStopAt || localProofAt;
    const providerStopEvidence = recordedProviderStopAt
      ? "staff_confirmation" as const
      : localProofAt
        ? "legacy_staff_confirmation" as const
        : "not_confirmed" as const;
    const requested = Boolean(request || legacy);
    const sourceProgress = progressByMemberId.get(Number(member.id)) || {
      cycleStart: 0,
      cycleEnd: 0,
      target: 0,
      delivered: 0,
      remaining: 0,
    };
    const progress = subscriptionUnverified ? {
      cycleStart: 0,
      cycleEnd: 0,
      target: 0,
      delivered: 0,
      remaining: 0,
    } : sourceProgress;
    const serviceDeparture = subscriptionUnverified
      ? { state: "needs_review" as const, endsAt: null }
      : getPlusServiceDeparture(member, progress, {
      pending: requested,
      requestedAt,
      lastManualProposalAt: progress.lastManualProposalAt,
      }, now);
    const serviceState = serviceDeparture.state;
    const archived = serviceState === "archived";

    return {
      requestId: request ? Number(request.id) : null,
      requestCount: memberRequests.length,
      plusMemberId: Number(member.id),
      single: {
        id: Number(row.single.id),
        firstName: row.single.firstName,
        lastName: row.single.lastName,
        email: row.single.email,
        phone: row.single.phone,
        isCoachingClient: row.single.isCoachingClient,
        isNotBasic: row.single.isNotBasic,
      },
      // Waitlisting is not activation. Do not substitute waitlistedAt or a billing date here.
      joinedAt: timestamp(member.activatedAt),
      requestedAt,
      requestDateSource,
      providerStoppedAt,
      providerStopEvidence,
      resolvedAt: request ? timestamp(request.resolvedAt) : providerStopEvidence === "legacy_staff_confirmation" ? providerStoppedAt : null,
      serviceState,
      serviceEndsAt: serviceDeparture.endsAt,
      remaining: archived ? 0 : Number(progress.remaining || 0),
      ...(archived && !subscriptionUnverified ? { outstandingAtClosure: Number(progress.remaining || 0) } : {}),
      target: Number(progress.target || 0),
      delivered: Number(progress.delivered || 0),
      legacy,
      subscriptionUnverified,
      pushStatus: deliveryStatus(request, "pushStatus", now),
      emailStatus: deliveryStatus(request, "emailStatus", now),
      smsStatus: deliveryStatus(request, "smsStatus", now),
    };
  });

  const cancellationTracking = tracking.filter(row => row.requestId !== null || row.legacy || row.requestCount > 0);
  const requestedTracking = cancellationTracking.filter(row => !row.subscriptionUnverified && (row.requestId !== null || row.legacy));
  return {
    tracking: cancellationTracking,
    summary: {
      requested: requestedTracking.length,
      pendingGrow: requestedTracking.filter(row => row.providerStopEvidence === "not_confirmed").length,
      confirmedGrow: requestedTracking.filter(row => row.providerStopEvidence !== "not_confirmed").length,
      withRemaining: requestedTracking.filter(row => row.remaining > 0).length,
      archived: requestedTracking.filter(row => row.serviceState === "archived").length,
      subscriptionUnverified: cancellationTracking.filter(row => row.subscriptionUnverified).length,
    },
  };
}

export async function loadPlusCancellationTrackingEvidence(db: any) {
  const [requests, tasks] = await Promise.all([
    db.select().from(plusCancellationRequests),
    db.select({
      singleId: crmTeamTasks.singleId,
      createdBy: crmTeamTasks.createdBy,
      createdAt: crmTeamTasks.createdAt,
      completedAt: crmTeamTasks.completedAt,
      status: crmTeamTasks.status,
    }).from(crmTeamTasks).where(and(
      eq(crmTeamTasks.taskType, "plus"),
      inArray(crmTeamTasks.createdBy, [
        PLUS_CANCELLATION_TASK_SOURCE,
        PLUS_LOCAL_END_TASK_SOURCE,
      ]),
    )),
  ]);
  return { requests, tasks };
}

/**
 * Records an authenticated staff confirmation only. It never calls Grow and
 * never changes the member, cycle, benefit, or match records.
 */
export async function confirmPlusProviderStopped(db: any, id: number, actor: string, now = Date.now()) {
  if (!actor) throw new TRPCError({ code: "FORBIDDEN" });
  return db.transaction(async (tx: any) => {
    const [member] = await tx.select().from(plusPilotMembers)
      .where(eq(plusPilotMembers.id, id)).limit(1).for("update");
    if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "מנוי Plus לא נמצא" });

    const memberRequests = await tx.select().from(plusCancellationRequests)
      .where(eq(plusCancellationRequests.plusMemberId, member.id))
      .orderBy(desc(plusCancellationRequests.requestedAt)).for("update");
    const cancellationTasks = await tx.select().from(crmTeamTasks).where(and(
      eq(crmTeamTasks.singleId, member.singleId),
      eq(crmTeamTasks.taskType, "plus"),
      eq(crmTeamTasks.createdBy, PLUS_CANCELLATION_TASK_SOURCE),
    )).orderBy(desc(crmTeamTasks.createdAt)).for("update");

    const unresolved = memberRequests.find((request: any) => !timestamp(request.resolvedAt));
    const newest = unresolved || memberRequests[0] || null;
    const legacyRequestedAt = timestamp(member.cancelledAt) || timestamp(cancellationTasks[0]?.createdAt);
    const reactivated = hasReactivated(member);
    if (reactivated || (!newest && !legacyRequestedAt)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "אין בקשת ביטול פעילה לאישור" });
    }
    const paymentProof = !newest && !hasSubscriptionProof(member, {})
      ? await tx.select({
        eventType: plusPaymentEvents.eventType,
        amountAgorot: plusPaymentEvents.amountAgorot,
        providerTransactionId: plusPaymentEvents.providerTransactionId,
      }).from(plusPaymentEvents).where(eq(plusPaymentEvents.plusMemberId, member.id)).limit(1)
      : [];
    const hasVerifiedPayment = paymentProof.some((event: any) =>
      ["subscription_started", "payment_succeeded"].includes(event.eventType)
      && Number(event.amountAgorot || 0) >= 9_900
      && Boolean(event.providerTransactionId),
    );
    if (!newest && !hasSubscriptionProof(member, { paymentRecorded: hasVerifiedPayment })) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "נדרש אימות חברות Plus לפני אישור בקשה ישנה" });
    }
    if (newest && timestamp(newest.providerStoppedAt)) {
      return { success: true, alreadyConfirmed: true, requestId: Number(newest.id), providerChanged: false };
    }

    let request = newest;
    if (!request) {
      const requestedAt = legacyRequestedAt!;
      const requestKey = `plus-cancellation:legacy-confirmation:${member.id}:${requestedAt}`;
      await tx.insert(plusCancellationRequests).values({
        requestKey,
        plusMemberId: member.id,
        requestedAt,
        resolvedAt: null,
        providerStoppedAt: now,
        providerStoppedBy: actor,
        // This backfill is an audit record; it must never dispatch notifications.
        pushStatus: "unknown",
        emailStatus: "unknown",
        smsStatus: "unknown",
        updatedAt: now,
      });
      request = { id: null, requestKey };
    } else {
      await tx.update(plusCancellationRequests).set({
        providerStoppedAt: now,
        providerStoppedBy: actor,
        updatedAt: now,
      }).where(eq(plusCancellationRequests.id, request.id));
    }

    // Completing this narrowly scoped task does not end local Plus service.
    await tx.update(crmTeamTasks).set({ status: "done", completedAt: now, updatedAt: now }).where(and(
      eq(crmTeamTasks.singleId, member.singleId),
      eq(crmTeamTasks.taskType, "plus"),
      eq(crmTeamTasks.createdBy, PLUS_CANCELLATION_TASK_SOURCE),
      or(eq(crmTeamTasks.status, "todo"), eq(crmTeamTasks.status, "in_progress")),
    ));
    const [existingAudit] = await tx.select({ id: crmTeamTasks.id }).from(crmTeamTasks).where(and(
      eq(crmTeamTasks.singleId, member.singleId),
      eq(crmTeamTasks.taskType, "plus"),
      eq(crmTeamTasks.createdBy, PLUS_PROVIDER_STOP_CONFIRMATION_TASK_SOURCE),
    )).limit(1).for("update");
    if (!existingAudit) {
      await tx.insert(crmTeamTasks).values({
        singleId: member.singleId,
        taskType: "plus",
        title: "Plus: עצירת חיוב ב־Grow אושרה על ידי הצוות",
        description: "אישור צוות בלבד לעצירת החיוב אצל הספק. השירות המקומי של Plus והזכויות במחזור נשארו ללא שינוי.",
        priority: "normal",
        status: "done",
        completedAt: now,
        createdBy: PLUS_PROVIDER_STOP_CONFIRMATION_TASK_SOURCE,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { success: true, alreadyConfirmed: false, requestId: request.id === null ? null : Number(request.id), providerChanged: false };
  });
}
