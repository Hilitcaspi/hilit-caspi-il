import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { crmTeamTasks, plusCancellationRequests, plusPilotMembers } from "../drizzle/schema";

/** Called only by the authorized team procedure after provider-stop confirmation. */
export async function endPlusLocally(db: any, id: number, now = Date.now()) {
  return db.transaction(async (tx: any) => {
    const [member] = await tx.select().from(plusPilotMembers).where(eq(plusPilotMembers.id, id)).limit(1).for("update");
    if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "מנוי Plus לא נמצא" });
    if (member.status === "churned" && member.billingStatus === "ended") return { success: true, alreadyEnded: true, providerChanged: false };
    if (member.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "אפשר לסיים כאן רק מנוי Plus פעיל" });
    await tx.update(plusPilotMembers).set({
      status: "churned", billingStatus: "ended", premiumSupportEnabled: false,
      nextBillingAt: null, endedAt: now, cancelledAt: member.cancelledAt || now, updatedAt: now,
    }).where(eq(plusPilotMembers.id, id));
    // Close only automatically-generated matching commitments, not unrelated team work.
    await tx.update(crmTeamTasks).set({ status: "cancelled", completedAt: now, updatedAt: now }).where(and(
      eq(crmTeamTasks.singleId, member.singleId), eq(crmTeamTasks.taskType, "plus"),
      eq(crmTeamTasks.createdBy, "plus_commitment_monitor"),
      or(eq(crmTeamTasks.status, "todo"), eq(crmTeamTasks.status, "in_progress")),
    ));
    // This records staff confirmation, not an API-verified stop by the provider.
    await tx.update(plusCancellationRequests).set({ resolvedAt: now, updatedAt: now }).where(and(
      eq(plusCancellationRequests.plusMemberId, id), isNull(plusCancellationRequests.resolvedAt),
    ));
    await tx.update(crmTeamTasks).set({ status: "done", completedAt: now, updatedAt: now }).where(and(
      eq(crmTeamTasks.singleId, member.singleId), eq(crmTeamTasks.taskType, "plus"),
      eq(crmTeamTasks.createdBy, "plus_self_service_cancellation"),
      or(eq(crmTeamTasks.status, "todo"), eq(crmTeamTasks.status, "in_progress")),
    ));
    await tx.insert(crmTeamTasks).values({
      singleId: member.singleId, taskType: "plus", title: "Plus: המנוי באתר הסתיים והועבר לארכיון",
      description: "סיום מקומי בידי הצוות לאחר אישור שהחיוב הופסק ב־Grow. אין פעולת ביטול אצל הספק ואין שינוי בחברות הרגילה במאגר.",
      priority: "normal", status: "done", completedAt: now, createdBy: "plus_local_end", createdAt: now, updatedAt: now,
    });
    return { success: true, alreadyEnded: false, providerChanged: false };
  });
}
