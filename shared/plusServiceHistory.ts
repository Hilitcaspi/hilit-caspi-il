import { wasMatchProposalSent, type MatchDeliveryEvidence } from "./matchDelivery";
import { getPlusServiceAnchor, PLUS_SERVICE_CYCLE_MS, type PlusServiceMember } from "./plusServiceCycle";
import { getPlusWednesdayCycleTarget } from "./plusWednesdayOffer";
import { getLivePostPlusCycleTarget } from "./livePostOffer";

/** Bound admin payloads while still showing up to two years of the member's own service history. */
export const MAX_PLUS_SERVICE_HISTORY_PERIODS = 24;
/** A normal 30-day commitment is small; retain a bounded chronological evidence list per period. */
export const MAX_PLUS_MANUAL_PROPOSALS_PER_PERIOD = 12;

export type PlusServiceHistoryMember = PlusServiceMember & {
  singleId: number;
  monthlyMatchTarget?: number | null;
  pilotCohort?: string | null;
};

export type PlusHistoricalProposal = MatchDeliveryEvidence & {
  id?: number | null;
  singleAId?: number | null;
  singleBId?: number | null;
  proposedAt?: number | null;
  /** "boost" and generated candidates are never counted as manual service fulfilment. */
  proposalSource?: string | null;
  isGeneratedCandidate?: boolean | null;
};

export type PlusServiceHistoryProposal = {
  id: number;
  proposedAt: number;
};

export type PlusServiceHistoryPeriod = {
  cycleIndex: number;
  serviceStart: number;
  serviceEnd: number;
  /** The Israel calendar month in which this 30-day service period began; it is not the period boundary. */
  calendarMonthLabel: string;
  target: number;
  manualProposalCount: number;
  manualProposals: PlusServiceHistoryProposal[];
  omittedManualProposalCount: number;
  kind: "service_30_day";
  /** Service windows model fulfilment only; this is deliberately never payment confirmation. */
  paymentVerified: false;
};

export type PlusServiceHistory = {
  anchor: number;
  periods: PlusServiceHistoryPeriod[];
  omittedPeriodCount: number;
  autoRenew: boolean;
  frozen: boolean;
  kind: "service_30_day";
};

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getIsraelCalendarMonthLabel(timestamp: number) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}

function getPeriodTarget(member: PlusServiceHistoryMember, cycleIndex: number) {
  return getLivePostPlusCycleTarget(
    member.pilotCohort,
    cycleIndex,
    getPlusWednesdayCycleTarget(member.pilotCohort, cycleIndex, member.monthlyMatchTarget),
  );
}

function isCountableManualProposal(member: PlusServiceHistoryMember, proposal: PlusHistoricalProposal) {
  const id = Number(proposal.id || 0);
  const proposedAt = Number(proposal.proposedAt || 0);
  const belongsToMember = proposal.singleAId === member.singleId || proposal.singleBId === member.singleId;
  const source = String(proposal.proposalSource || "manual").toLowerCase();
  return Number.isSafeInteger(id)
    && id > 0
    && belongsToMember
    && isFiniteTimestamp(proposedAt)
    && source !== "boost"
    && source !== "generated"
    && !proposal.isGeneratedCandidate
    && wasMatchProposalSent(proposal);
}

/**
 * Produces completed, historical 30-day *service* periods from the original activation anchor.
 * It is pure/read-only and never infers a charge: `paymentVerified` remains false for every window.
 */
export function buildPlusServiceHistory(
  member: PlusServiceHistoryMember,
  proposals: PlusHistoricalProposal[],
  now = Date.now(),
): PlusServiceHistory {
  const anchor = getPlusServiceAnchor(member);
  const activeService = member.status === "active" && member.billingStatus === "active" && !member.endedAt;
  if (!anchor) {
    return { anchor: 0, periods: [], omittedPeriodCount: 0, autoRenew: false, frozen: false, kind: "service_30_day" };
  }
  const frozenAt = Number(member.cancelledAt || member.endedAt || 0);
  const frozen = !activeService
    && frozenAt >= anchor
    && ["cancelled", "ended"].includes(member.billingStatus || "");
  const validNow = Number.isFinite(now) && now >= anchor;

  // A period is historical only after it is fully behind the active/frozen service window.
  const reference = activeService ? now : frozen ? frozenAt : 0;
  const completedThroughIndex = validNow && reference >= anchor
    ? Math.floor((reference - anchor) / PLUS_SERVICE_CYCLE_MS) - 1
    : -1;
  if (completedThroughIndex < 0) {
    return { anchor, periods: [], omittedPeriodCount: 0, autoRenew: activeService && validNow, frozen, kind: "service_30_day" };
  }

  const firstIndex = Math.max(0, completedThroughIndex - MAX_PLUS_SERVICE_HISTORY_PERIODS + 1);
  const proposalByPeriod = new Map<number, PlusServiceHistoryProposal[]>();
  const dedupedProposalIds = new Set<number>();

  for (const proposal of proposals) {
    if (!isCountableManualProposal(member, proposal)) continue;
    const id = Number(proposal.id);
    if (dedupedProposalIds.has(id)) continue;
    const proposedAt = Number(proposal.proposedAt);
    const cycleIndex = Math.floor((proposedAt - anchor) / PLUS_SERVICE_CYCLE_MS);
    if (cycleIndex < firstIndex || cycleIndex > completedThroughIndex) continue;
    dedupedProposalIds.add(id);
    const periodProposals = proposalByPeriod.get(cycleIndex) || [];
    periodProposals.push({ id, proposedAt });
    proposalByPeriod.set(cycleIndex, periodProposals);
  }

  const periods: PlusServiceHistoryPeriod[] = [];
  for (let cycleIndex = firstIndex; cycleIndex <= completedThroughIndex; cycleIndex++) {
    const serviceStart = anchor + cycleIndex * PLUS_SERVICE_CYCLE_MS;
    const allManualProposals = (proposalByPeriod.get(cycleIndex) || [])
      .sort((left, right) => left.proposedAt - right.proposedAt || left.id - right.id);
    periods.push({
      cycleIndex,
      serviceStart,
      serviceEnd: serviceStart + PLUS_SERVICE_CYCLE_MS,
      calendarMonthLabel: getIsraelCalendarMonthLabel(serviceStart),
      target: getPeriodTarget(member, cycleIndex),
      manualProposalCount: allManualProposals.length,
      manualProposals: allManualProposals.slice(0, MAX_PLUS_MANUAL_PROPOSALS_PER_PERIOD),
      omittedManualProposalCount: Math.max(0, allManualProposals.length - MAX_PLUS_MANUAL_PROPOSALS_PER_PERIOD),
      kind: "service_30_day",
      paymentVerified: false,
    });
  }

  return {
    anchor,
    periods,
    omittedPeriodCount: firstIndex,
    autoRenew: activeService,
    frozen,
    kind: "service_30_day",
  };
}
