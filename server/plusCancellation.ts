import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { crmTeamTasks, plusCancellationRequests, plusPilotMembers } from "../drizzle/schema";
import { calculatePlusServiceProgress } from "./plusSubscription";

export const PLUS_CANCELLATION_TASK_SOURCE = "plus_self_service_cancellation";

/** The member lock serializes concurrent clicks; all durable writes commit together. */
export async function recordPlusCancellation(db: any, singleId: number, now = Date.now()) {
  return db.transaction(async (tx: any) => {
    const [member] = await tx.select().from(plusPilotMembers)
      .where(eq(plusPilotMembers.singleId, singleId)).limit(1).for("update");
    if (!member || member.status !== "active") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "לא נמצא מנוי Plus פעיל" });
    }
    const accessUntil = calculatePlusServiceProgress(member, [], now).cycleEnd || now;
    const [existing] = await tx.select().from(plusCancellationRequests).where(and(
      eq(plusCancellationRequests.plusMemberId, member.id), isNull(plusCancellationRequests.resolvedAt),
    )).limit(1);
    if (existing) return { firstRequest: false, requestKey: existing.requestKey, accessUntil };

    // Preserve earlier cancellation dates. Do not reset the deadline on another click.
    const requestedAt = Number(member.cancelledAt || now);
    const requestKey = `plus-cancellation:${member.id}:${requestedAt}`;
    await tx.insert(plusCancellationRequests).values({
      requestKey, plusMemberId: member.id, requestedAt, resolvedAt: null,
      pushStatus: "sending", emailStatus: "sending", smsStatus: "sending", updatedAt: now,
    });
    await tx.update(plusPilotMembers).set({
      billingStatus: "cancelled", cancelledAt: requestedAt, nextBillingAt: null, updatedAt: now,
    }).where(eq(plusPilotMembers.id, member.id));

    // An unrelated Plus matching task must never suppress a cancellation task.
    const [openTask] = await tx.select({ id: crmTeamTasks.id }).from(crmTeamTasks).where(and(
      eq(crmTeamTasks.singleId, singleId), eq(crmTeamTasks.taskType, "plus"),
      eq(crmTeamTasks.createdBy, PLUS_CANCELLATION_TASK_SOURCE),
      or(eq(crmTeamTasks.status, "todo"), eq(crmTeamTasks.status, "in_progress")),
    )).limit(1);
    if (!openTask) await tx.insert(crmTeamTasks).values({
      singleId, taskType: "plus", title: "Plus: לעצור חיוב עתידי ב־Grow",
      description: "בקשת עצירת חידוש נקלטה באתר. יש לעצור את הוראת הקבע ב־Grow ורק לאחר בדיקה לאשר סיום Plus באתר. הבקשה אינה אישור להפסקת חיוב אצל הספק.",
      priority: "urgent", status: "todo", dueAt: now,
      createdBy: PLUS_CANCELLATION_TASK_SOURCE, createdAt: now, updatedAt: now,
    });
    return { firstRequest: true, requestKey, accessUntil };
  });
}

export type PlusCancellationStatus = "sending" | "accepted" | "failed" | "unknown";
export function cancellationDeliveryStatus(status: PlusCancellationStatus, updatedAt: number, now = Date.now()): PlusCancellationStatus {
  // A process may have stopped after dispatch but before recording acceptance.
  // Never retry this uncertain send automatically, as that could send duplicates.
  return status === "sending" && now - updatedAt > 120_000 ? "unknown" : status;
}
