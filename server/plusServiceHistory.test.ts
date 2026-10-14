import { describe, expect, it } from "vitest";
import { PLUS_SERVICE_CYCLE_MS } from "../shared/plusServiceCycle";
import { buildPlusServiceHistory, MAX_PLUS_SERVICE_HISTORY_PERIODS } from "../shared/plusServiceHistory";

const anchor = Date.parse("2026-01-05T10:15:00.000Z");
const member = {
  singleId: 11,
  status: "active",
  billingStatus: "active",
  activatedAt: anchor,
  // Deliberately later: historical service must remain anchored to activation.
  billingCycleStartedAt: anchor + 2 * PLUS_SERVICE_CYCLE_MS,
  monthlyMatchTarget: 2,
};
const sent = (id: number, proposedAt: number, extra: Record<string, unknown> = {}) => ({
  id,
  singleAId: 11,
  singleBId: id + 100,
  proposedAt,
  status: "proposed",
  ownerApprovedAt: proposedAt,
  ...extra,
});

describe("Plus service history", () => {
  it("uses activation as a stable anchor and rolls at exact 30-day boundaries", () => {
    const history = buildPlusServiceHistory(member, [], anchor + 3 * PLUS_SERVICE_CYCLE_MS + 1);
    expect(history.anchor).toBe(anchor);
    expect(history.periods.map(period => [period.cycleIndex, period.serviceStart, period.serviceEnd])).toEqual([
      [0, anchor, anchor + PLUS_SERVICE_CYCLE_MS],
      [1, anchor + PLUS_SERVICE_CYCLE_MS, anchor + 2 * PLUS_SERVICE_CYCLE_MS],
      [2, anchor + 2 * PLUS_SERVICE_CYCLE_MS, anchor + 3 * PLUS_SERVICE_CYCLE_MS],
    ]);
    expect(history.periods.every(period => period.serviceEnd - period.serviceStart === PLUS_SERVICE_CYCLE_MS)).toBe(true);
    expect(history.periods.every(period => period.kind === "service_30_day" && period.paymentVerified === false)).toBe(true);
  });

  it("assigns evidence by exact service window, keeps actual dates, sorts chronologically, and dedupes IDs", () => {
    const history = buildPlusServiceHistory(member, [
      sent(5, anchor + 5),
      sent(4, anchor + 2),
      sent(4, anchor + 2),
      sent(6, anchor + PLUS_SERVICE_CYCLE_MS),
      sent(7, anchor + PLUS_SERVICE_CYCLE_MS + 4, { proposalSource: "boost" }),
      { ...sent(8, anchor + PLUS_SERVICE_CYCLE_MS + 5), isGeneratedCandidate: true },
      { ...sent(9, anchor + PLUS_SERVICE_CYCLE_MS + 6), status: "pending", ownerApprovedAt: null },
    ], anchor + 2 * PLUS_SERVICE_CYCLE_MS + 1);
    expect(history.periods[0]?.manualProposalCount).toBe(2);
    expect(history.periods[0]?.manualProposals).toEqual([
      { id: 4, proposedAt: anchor + 2 },
      { id: 5, proposedAt: anchor + 5 },
    ]);
    expect(history.periods[1]?.manualProposals).toEqual([{ id: 6, proposedAt: anchor + PLUS_SERVICE_CYCLE_MS }]);
  });

  it("does not include missing-date or future proposal evidence", () => {
    const history = buildPlusServiceHistory(member, [
      { ...sent(1, anchor + 100), proposedAt: null },
      sent(2, anchor + 2 * PLUS_SERVICE_CYCLE_MS + 10),
    ], anchor + 2 * PLUS_SERVICE_CYCLE_MS);
    expect(history.periods).toHaveLength(2);
    expect(history.periods.flatMap(period => period.manualProposals)).toEqual([]);
  });

  it("freezes on cancellation and never auto-renews or creates later periods", () => {
    const cancelledAt = anchor + PLUS_SERVICE_CYCLE_MS + 500;
    const history = buildPlusServiceHistory({ ...member, billingStatus: "cancelled", cancelledAt }, [
      sent(1, anchor + 100),
      sent(2, anchor + PLUS_SERVICE_CYCLE_MS + 100),
      sent(3, anchor + 2 * PLUS_SERVICE_CYCLE_MS + 100),
    ], anchor + 7 * PLUS_SERVICE_CYCLE_MS);
    expect(history.autoRenew).toBe(false);
    expect(history.frozen).toBe(true);
    expect(history.periods.map(period => period.cycleIndex)).toEqual([0]);
    expect(history.periods[0]?.manualProposalCount).toBe(1);
  });

  it("returns bounded history from join onward without mutating inputs", () => {
    const snapshot = JSON.stringify(member);
    const history = buildPlusServiceHistory(member, [], anchor + (MAX_PLUS_SERVICE_HISTORY_PERIODS + 5) * PLUS_SERVICE_CYCLE_MS);
    expect(history.periods).toHaveLength(MAX_PLUS_SERVICE_HISTORY_PERIODS);
    expect(history.periods[0]?.cycleIndex).toBe(5);
    expect(history.omittedPeriodCount).toBe(5);
    expect(JSON.stringify(member)).toBe(snapshot);
  });
});
