import { describe, expect, it } from "vitest";
import { addOneBillingMonth, calculatePlusCycleProgress, shouldCreatePlusCommitmentTask } from "./plusSubscription";

const january31 = Date.UTC(2026, 0, 31, 10, 0, 0);

describe("Database Plus billing cycle", () => {
  it("keeps end-of-month subscriptions on the last valid day", () => {
    expect(new Date(addOneBillingMonth(january31)).toISOString()).toBe("2026-02-28T10:00:00.000Z");
  });

  it("counts unique proposals only inside the member billing cycle", () => {
    const start = Date.UTC(2026, 7, 12);
    const end = Date.UTC(2026, 8, 12);
    const progress = calculatePlusCycleProgress({
      singleId: 7,
      monthlyMatchTarget: 2,
      billingCycleStartedAt: start,
      billingCycleEndsAt: end,
    }, [
      { id: 1, singleAId: 7, singleBId: 8, proposedAt: start + 1_000 },
      { id: 1, singleAId: 7, singleBId: 8, proposedAt: start + 1_000 },
      { id: 2, singleAId: 9, singleBId: 7, proposedAt: start + 2_000 },
      { id: 3, singleAId: 7, singleBId: 10, proposedAt: start - 1_000 },
      { id: 4, singleAId: 99, singleBId: 100, proposedAt: start + 3_000 },
    ], start + 10 * 24 * 60 * 60 * 1000);

    expect(progress.delivered).toBe(2);
    expect(progress.remaining).toBe(0);
    expect(progress.state).toBe("green");
    expect(progress.progressPercent).toBe(100);
  });

  it("does not count an algorithmic Boost instead of the two manually reviewed Plus proposals", () => {
    const start = Date.UTC(2026, 7, 12);
    const end = Date.UTC(2026, 8, 12);
    const progress = calculatePlusCycleProgress({
      singleId: 7,
      monthlyMatchTarget: 2,
      billingCycleStartedAt: start,
      billingCycleEndsAt: end,
    }, [
      { id: 1, singleAId: 7, singleBId: 8, proposedAt: start + 1_000, proposalSource: "manual" },
      { id: 2, singleAId: 7, singleBId: 9, proposedAt: start + 2_000, proposalSource: "boost" },
    ], start + 10 * 24 * 60 * 60 * 1000);

    expect(progress.delivered).toBe(1);
    expect(progress.remaining).toBe(1);
  });

  it("turns red and creates a team task in the final seven days when the target is not met", () => {
    const start = Date.UTC(2026, 7, 1);
    const end = Date.UTC(2026, 8, 1);
    const progress = calculatePlusCycleProgress({
      singleId: 7,
      monthlyMatchTarget: 2,
      billingCycleStartedAt: start,
      billingCycleEndsAt: end,
    }, [
      { id: 1, singleAId: 7, singleBId: 8, proposedAt: start + 1_000 },
    ], end - 3 * 24 * 60 * 60 * 1000);

    expect(progress.delivered).toBe(1);
    expect(progress.state).toBe("red");
    expect(shouldCreatePlusCommitmentTask(progress)).toBe(true);
  });

  it("does not create an SLA task while enough time remains", () => {
    const start = Date.UTC(2026, 7, 1);
    const end = Date.UTC(2026, 8, 1);
    const progress = calculatePlusCycleProgress({
      singleId: 7,
      monthlyMatchTarget: 2,
      billingCycleStartedAt: start,
      billingCycleEndsAt: end,
    }, [], start + 5 * 24 * 60 * 60 * 1000);

    expect(progress.state).toBe("neutral");
    expect(shouldCreatePlusCommitmentTask(progress)).toBe(false);
  });
});
