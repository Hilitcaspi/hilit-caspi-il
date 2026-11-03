import { eq } from "drizzle-orm";
import { plusCancellationRequests, plusPilotMembers, singles } from "../drizzle/schema";
import type { PlusPilotCancellationEvidence, PlusPilotCapacityRow } from "./plusPilotCapacity";

export const plusPilotCapacitySelection = {
  id: plusPilotMembers.id,
  status: plusPilotMembers.status,
  billingStatus: plusPilotMembers.billingStatus,
  activatedAt: plusPilotMembers.activatedAt,
  billingCycleStartedAt: plusPilotMembers.billingCycleStartedAt,
  billingCycleEndsAt: plusPilotMembers.billingCycleEndsAt,
  cancelledAt: plusPilotMembers.cancelledAt,
  endedAt: plusPilotMembers.endedAt,
  lastPaymentAt: plusPilotMembers.lastPaymentAt,
  gender: singles.gender,
};

export const plusPilotCapacityRequestSelection = {
  id: plusCancellationRequests.id,
  plusMemberId: plusCancellationRequests.plusMemberId,
  requestedAt: plusCancellationRequests.requestedAt,
  resolvedAt: plusCancellationRequests.resolvedAt,
  providerStoppedAt: plusCancellationRequests.providerStoppedAt,
  providerStoppedBy: plusCancellationRequests.providerStoppedBy,
};

/** Latest means newest request, not newest confirmed request. Never mutate rows. */
export function attachPlusPilotCapacityEvidence(
  rows: readonly PlusPilotCapacityRow[],
  requests: readonly PlusPilotCancellationEvidence[],
): PlusPilotCapacityRow[] {
  const latest = new Map<number, PlusPilotCancellationEvidence>();
  const ambiguous = new Set<number>();
  for (const request of requests) {
    if (!Number.isSafeInteger(request.requestedAt) || request.requestedAt <= 0 || !Number.isSafeInteger(request.id) || request.id <= 0) {
      ambiguous.add(request.plusMemberId);
      continue;
    }
    const previous = latest.get(request.plusMemberId);
    if (!previous || request.requestedAt > previous.requestedAt || (request.requestedAt === previous.requestedAt && request.id > previous.id)) {
      latest.set(request.plusMemberId, request);
    } else if (request.requestedAt === previous.requestedAt && request.id === previous.id) {
      ambiguous.add(request.plusMemberId);
    }
  }
  return rows.map(row => ({
    ...row,
    latestCancellationRequest: row.id != null && !ambiguous.has(row.id) ? latest.get(row.id) ?? null : null,
  }));
}

type CapacitySnapshot = {
  rows: readonly { pilot: Omit<PlusPilotCapacityRow, "gender">; single: { gender: string | null | undefined } }[];
  requests: readonly PlusPilotCancellationEvidence[];
};

/** SELECT-only. Overview reuses its already-selected member/request snapshot. */
export async function loadPlusPilotCapacityRows(db: any, snapshot?: CapacitySnapshot): Promise<PlusPilotCapacityRow[]> {
  if (snapshot) {
    return attachPlusPilotCapacityEvidence(snapshot.rows.map(row => ({ ...row.pilot, gender: row.single.gender })), snapshot.requests);
  }
  const [rows, requests] = await Promise.all([
    db.select(plusPilotCapacitySelection).from(plusPilotMembers)
      .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id)),
    db.select(plusPilotCapacityRequestSelection).from(plusCancellationRequests),
  ]);
  return attachPlusPilotCapacityEvidence(rows, requests);
}
