import { resolvePlusServiceCycle, type PlusServiceMember } from "../shared/plusServiceCycle";
import { PLUS_ENROLLMENT_POLICY } from "../shared/plusEnrollmentPolicy";

export type PlusPilotGender = "female" | "male";

export type PlusPilotCancellationEvidence = {
  id: number;
  plusMemberId: number;
  requestedAt: number;
  resolvedAt?: number | null;
  providerStoppedAt?: number | null;
  providerStoppedBy?: string | null;
};

export type PlusPilotCapacityRow = PlusServiceMember & {
  id?: number;
  status: string;
  gender: string | null | undefined;
  lastPaymentAt?: number | null;
  latestCancellationRequest?: PlusPilotCancellationEvidence | null;
};

function validTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * Capacity only: never ends service, changes billing, or removes any rights.
 * A cancellation status or a completed proposal target is not provider-stop proof.
 */
function canReleaseCancelledSlot(row: PlusPilotCapacityRow, now: number): boolean {
  if (row.billingStatus !== "cancelled" || !validTimestamp(now)) return false;
  const request = row.latestCancellationRequest;
  if (!request || request.plusMemberId !== row.id || !Number.isSafeInteger(request.id) || request.id <= 0) return false;
  if (!validTimestamp(row.cancelledAt) || row.cancelledAt > now) return false;
  if (!validTimestamp(request.requestedAt) || request.requestedAt < row.cancelledAt || request.requestedAt > now) return false;
  if (!validTimestamp(request.providerStoppedAt) || request.providerStoppedAt < request.requestedAt || request.providerStoppedAt > now) return false;
  if (typeof request.providerStoppedBy !== "string" || !request.providerStoppedBy.trim()) return false;
  // Resolved local-end history on a currently active row is ambiguous, not current proof.
  if (request.resolvedAt != null || row.endedAt != null) return false;

  // Reject malformed supplied dates rather than letting the service helper coerce
  // them or fall back to another anchor. Missing both anchors always holds a slot.
  for (const value of [row.activatedAt, row.billingCycleStartedAt, row.billingCycleEndsAt]) {
    if (value != null && (!validTimestamp(value) || value > now)) return false;
  }
  const anchor = row.activatedAt ?? row.billingCycleStartedAt;
  if (!validTimestamp(anchor) || anchor > row.cancelledAt) return false;
  // A provider payment may precede webhook activation; the service anchor and
  // billing start need not be identical or ordered activation-first.
  if (row.billingCycleStartedAt != null && row.billingCycleStartedAt > row.cancelledAt) return false;
  if (row.billingCycleEndsAt != null && (row.billingCycleEndsAt <= anchor || row.billingCycleEndsAt <= (row.billingCycleStartedAt ?? anchor))) return false;

  // A known last payment is required: unknown or later payment dates fail closed.
  // Renewed billing dates/activation also cannot inherit an older stop confirmation.
  if (!validTimestamp(row.lastPaymentAt) || row.lastPaymentAt > row.cancelledAt || row.lastPaymentAt > request.providerStoppedAt) return false;
  const cycle = resolvePlusServiceCycle(row, now);
  if (!cycle.valid || cycle.autoRenew || !validTimestamp(cycle.cycleStart) || !validTimestamp(cycle.cycleEnd)) return false;
  if (cycle.cycleEnd <= cycle.cycleStart || cycle.cycleEnd > now) return false;
  // Protect a recorded prepaid billing window even if it extends beyond the
  // frozen service window. No target_met/early-departure shortcut is used here.
  return row.billingCycleEndsAt == null || row.billingCycleEndsAt <= now;
}

// Invitations remain marketing outreach, not service commitments. Status-only
// legacy callers retain exactly their old behavior: every active row counts.
export function isPlusPilotSlotReserved(
  member: string | null | undefined | PlusPilotCapacityRow,
  now = Date.now(),
): boolean {
  if (typeof member !== "object" || member === null) return member === "active";
  return member.status === "active" && !canReleaseCancelledSlot(member, now);
}

export function calculatePlusPilotCapacity(rows: readonly PlusPilotCapacityRow[], now = Date.now()) {
  const femaleReserved = rows.filter(row => row.gender === "female" && isPlusPilotSlotReserved(row, now)).length;
  const maleReserved = rows.filter(row => row.gender === "male" && isPlusPilotSlotReserved(row, now)).length;
  return {
    enrollmentLimited: PLUS_ENROLLMENT_POLICY.enrollmentLimited,
    female: {
      reserved: femaleReserved,
      remaining: null,
      limit: PLUS_ENROLLMENT_POLICY.limitPerGender,
    },
    male: {
      reserved: maleReserved,
      remaining: null,
      limit: PLUS_ENROLLMENT_POLICY.limitPerGender,
    },
  };
}

export function calculatePlusPilotCapacityBreakdown(rows: readonly PlusPilotCapacityRow[], now = Date.now()) {
  const capacity = calculatePlusPilotCapacity(rows, now);
  return {
    female: { active: capacity.female.reserved, invited: rows.filter(row => row.gender === "female" && row.status === "invited").length },
    male: { active: capacity.male.reserved, invited: rows.filter(row => row.gender === "male" && row.status === "invited").length },
  };
}

/** Compatibility signature: enrollment has no count limit; profile gender validity remains separate. */
export function hasPlusPilotCapacity(_rows: readonly PlusPilotCapacityRow[], gender: string | null | undefined, _now = Date.now()): boolean {
  return gender === "female" || gender === "male";
}
