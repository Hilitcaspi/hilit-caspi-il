export const PLUS_SERVICE_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;
export type PlusServiceMember = {
  status?: string | null;
  billingStatus?: string | null;
  billingCycleStartedAt?: number | null;
  billingCycleEndsAt?: number | null;
  activatedAt?: number | null;
  endedAt?: number | null;
  cancelledAt?: number | null;
};

/**
 * Historical fulfilment uses the original activation whenever it is present.
 * A later provider renewal can update billing fields, but must not move old
 * 30-day service boundaries or reassign already-sent manual proposals.
 */
export function getPlusServiceAnchor(member: PlusServiceMember) {
  const activatedAt = Number(member.activatedAt || 0);
  if (Number.isFinite(activatedAt) && activatedAt > 0) return activatedAt;
  const billingCycleStartedAt = Number(member.billingCycleStartedAt || 0);
  return Number.isFinite(billingCycleStartedAt) && billingCycleStartedAt > 0 ? billingCycleStartedAt : 0;
}
/** Computed service window only. Never proves a payment or advances billing fields. */
export function resolvePlusServiceCycle(member: PlusServiceMember, now = Date.now()) {
  const anchor = getPlusServiceAnchor(member);
  const valid = Number.isFinite(anchor) && anchor > 0;
  const autoRenew = valid && member.status === "active" && member.billingStatus === "active" && !member.endedAt;
  const frozenAt = Number(member.cancelledAt || member.endedAt || 0);
  const freezeService = valid && frozenAt >= anchor && ["cancelled", "ended"].includes(member.billingStatus || "");
  const reference = autoRenew ? now : frozenAt;
  const cycleIndex = (autoRenew || freezeService) && reference >= anchor ? Math.floor((reference - anchor) / PLUS_SERVICE_CYCLE_MS) : 0;
  const cycleStart = valid ? anchor + cycleIndex * PLUS_SERVICE_CYCLE_MS : 0;
  const cycleEnd = autoRenew || freezeService ? cycleStart + PLUS_SERVICE_CYCLE_MS : Number(member.billingCycleEndsAt || (valid ? anchor + PLUS_SERVICE_CYCLE_MS : 0));
  return { cycleStart, cycleEnd, cycleIndex, autoRenew, valid, kind: "service" as const };
}
export function isPlusArchived(member: PlusServiceMember) {
  return member.status === "churned" || member.billingStatus === "ended" || Boolean(member.endedAt && member.status === "active");
}
