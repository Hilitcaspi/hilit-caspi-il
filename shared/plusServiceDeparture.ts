import { isPlusArchived, type PlusServiceMember } from "./plusServiceCycle";
export type PlusDepartureProgress = {
  cycleStart: number; cycleEnd: number; remaining: number; delivered: number; target: number;
};
export type PlusServiceDeparture = {
  requested: boolean;
  state: "not_requested" | "finishing_cycle" | "archived" | "needs_review";
  endsAt: number | null;
  remaining: number;
  reason: "target_met" | "cycle_elapsed" | null;
};

/** View-only service disposition. Never proves a Grow stop or edits a membership. */
export function getPlusServiceDeparture(
  member: PlusServiceMember,
  progress: PlusDepartureProgress,
  request: { pending?: boolean; requestedAt?: number | null; lastManualProposalAt?: number | null } = {},
  now = Date.now(),
): PlusServiceDeparture {
  const requestedAt = Number(member.cancelledAt || request.requestedAt || 0);
  const requested = Boolean(request.pending || (member.billingStatus === "cancelled" && requestedAt));
  const base = { requested, remaining: progress.remaining, reason: null };
  if (isPlusArchived(member)) return { ...base, state: "archived", endsAt: Number(member.endedAt || 0) || null };
  if (!requested) return { ...base, state: "not_requested", endsAt: null };
  if (!requestedAt || !Number.isFinite(progress.cycleEnd) || progress.cycleStart <= 0 || progress.cycleEnd <= progress.cycleStart) {
    return { ...base, state: "needs_review", endsAt: null };
  }
  if (progress.remaining <= 0) {
    const fulfilledAt = Math.max(requestedAt, Number(request.lastManualProposalAt || requestedAt));
    return { ...base, state: "archived", endsAt: Math.min(progress.cycleEnd, fulfilledAt), reason: "target_met" };
  }
  if (now >= progress.cycleEnd) return { ...base, state: "archived", endsAt: progress.cycleEnd, reason: "cycle_elapsed" };
  return { ...base, state: "finishing_cycle", endsAt: progress.cycleEnd };
}
