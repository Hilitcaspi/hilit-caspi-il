import { describe, expect, it } from "vitest";
import { summarizeFeedbackRecovery, type FeedbackRecoveryJourney } from "./feedbackRecovery";

function journey(stage: FeedbackRecoveryJourney["stage"], overrides: Partial<FeedbackRecoveryJourney> = {}): FeedbackRecoveryJourney {
  return {
    originalRecordId: 1,
    followupId: 2,
    singleId: 3,
    issue: "matchmaking",
    feedbackAt: 100,
    stage,
    newMatchCount: 0,
    latestNewMatchId: null,
    latestNewMatchAt: null,
    mutualYesMatchId: null,
    mutualYesAt: null,
    recoveryRecordId: null,
    recoveryRequestSentAt: null,
    recoveryResponseAt: null,
    eligibleForOutreach: false,
    ...overrides,
  };
}

describe("feedback recovery funnel", () => {
  it("counts progress only after real recovery events", () => {
    const summary = summarizeFeedbackRecovery([
      journey("feedback_received"),
      journey("new_match_sent", { originalRecordId: 2, newMatchCount: 1, latestNewMatchId: 10 }),
      journey("mutual_yes", { originalRecordId: 3, newMatchCount: 1, latestNewMatchId: 11, mutualYesMatchId: 11, eligibleForOutreach: true }),
      journey("awaiting_updated_feedback", { originalRecordId: 4, newMatchCount: 2, latestNewMatchId: 12, mutualYesMatchId: 12, recoveryRequestSentAt: 300 }),
      journey("recovered_positive", { originalRecordId: 5, newMatchCount: 1, latestNewMatchId: 13, mutualYesMatchId: 13, recoveryRequestSentAt: 300, recoveryResponseAt: 400 }),
      journey("still_needs_attention", { originalRecordId: 6, newMatchCount: 1, latestNewMatchId: 14, mutualYesMatchId: 14, recoveryRequestSentAt: 300, recoveryResponseAt: 400 }),
    ]);

    expect(summary).toEqual({
      negativeTracked: 6,
      receivedNewMatch: 5,
      mutualYesAfterFeedback: 4,
      readyForOutreach: 1,
      awaitingUpdatedFeedback: 1,
      recoveredPositive: 1,
      stillNeedsAttention: 1,
    });
  });
});
