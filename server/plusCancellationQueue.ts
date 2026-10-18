import { and, eq, isNull, or } from "drizzle-orm";
import { crmTeamTasks, plusCancellationRequests } from "../drizzle/schema";
import { cancellationDeliveryStatus, PLUS_CANCELLATION_TASK_SOURCE, type PlusCancellationStatus } from "./plusCancellation";

export function buildPlusCancellationQueue(rows: any[], requests: any[], tasks: any[], now = Date.now()) {
  const unresolved = new Map(requests.filter(row => !row.resolvedAt).map(row => [row.plusMemberId, row]));
  const openTasks = new Map(tasks.map(row => [row.singleId, row]));
  return rows.flatMap(row => {
    const request = unresolved.get(row.pilot.id);
    const task = openTasks.get(row.single.id);
    const legacy = !request && row.pilot.status === "active" && row.pilot.billingStatus !== "ended"
      && Boolean(row.pilot.cancelledAt || row.pilot.billingStatus === "cancelled" || task);
    if (!request && !legacy) return [];
    const delivery = (field: string): PlusCancellationStatus | "not_recorded" => request
      ? cancellationDeliveryStatus(request[field], Number(request.updatedAt), now) : "not_recorded";
    return [{
      plusMemberId: row.pilot.id,
      single: { id: row.single.id, firstName: row.single.firstName, lastName: row.single.lastName,
        email: row.single.email, phone: row.single.phone },
      requestedAt: request?.requestedAt || row.pilot.cancelledAt || task?.createdAt || null,
      legacy: !request, pushStatus: delivery("pushStatus"), emailStatus: delivery("emailStatus"), smsStatus: delivery("smsStatus"),
    }];
  }).sort((a, b) => Number(a.requestedAt || 0) - Number(b.requestedAt || 0));
}

export async function loadPlusCancellationQueue(db: any, rows: any[]) {
  const [requests, tasks] = await Promise.all([
    db.select().from(plusCancellationRequests).where(isNull(plusCancellationRequests.resolvedAt)),
    db.select({ singleId: crmTeamTasks.singleId, createdAt: crmTeamTasks.createdAt }).from(crmTeamTasks).where(and(
      eq(crmTeamTasks.taskType, "plus"), eq(crmTeamTasks.createdBy, PLUS_CANCELLATION_TASK_SOURCE),
      or(eq(crmTeamTasks.status, "todo"), eq(crmTeamTasks.status, "in_progress")),
    )),
  ]);
  return buildPlusCancellationQueue(rows, requests, tasks);
}

export async function isPlusCancellationPending(db: any, member: any) {
  if (!member) return false;
  const [request] = await db.select({ id: plusCancellationRequests.id }).from(plusCancellationRequests).where(and(
    eq(plusCancellationRequests.plusMemberId, member.id), isNull(plusCancellationRequests.resolvedAt),
  )).limit(1);
  return Boolean(request || (member.status === "active" && member.billingStatus !== "ended"
    && (member.cancelledAt || member.billingStatus === "cancelled")));
}
