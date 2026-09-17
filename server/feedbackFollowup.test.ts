import { describe, expect, it } from "vitest";
import { classifyFeedbackFollowup } from "./feedbackFollowup";

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    singleId: 10,
    matchId: 20,
    surveyKind: "satisfaction_survey" as const,
    sourceType: "database" as const,
    rating: 5,
    npsScore: 10,
    feedbackText: "חוויה טובה",
    improvementText: null,
    testimonialTextOriginal: null,
    consentText: false,
    consentPhoto: false,
    consentVideo: false,
    lastResponseAt: Date.now(),
    ...overrides,
  };
}

describe("feedback follow-up classification", () => {
  it("keeps a clearly positive response in the positive queue", () => {
    const result = classifyFeedbackFollowup(record());
    expect(result.isPositive).toBe(true);
    expect(result.needsServiceRecovery).toBe(false);
    expect(result.needsPersonalAttention).toBe(false);
  });

  it("routes a low-rated no-match complaint to recovery, matchmaking and personal care", () => {
    const result = classifyFeedbackFollowup(record({
      rating: 2,
      npsScore: 3,
      feedbackText: "לא קיבלתי אף התאמה ואין מענה",
      improvementText: "אני צריכה יותר יחס אישי",
    }));
    expect(result.needsServiceRecovery).toBe(true);
    expect(result.needsMatchmakingAttention).toBe(true);
    expect(result.needsPersonalAttention).toBe(true);
    expect(result.priority).toBe("high");
  });

  it("marks safety language urgent and does not recommend an automatic benefit", () => {
    const result = classifyFeedbackFollowup(record({
      rating: 1,
      feedbackText: "הייתה הטרדה ואני חוששת מאלימות",
    }));
    expect(result.priority).toBe("urgent");
    expect(result.recommendedAction).toContain("אין לשלוח התאמה או הטבה אוטומטית");
  });

  it("routes a consented positive testimonial to publishing review", () => {
    const result = classifyFeedbackFollowup(record({
      surveyKind: "positive_experience",
      sourceType: "match",
      testimonialTextOriginal: "הרגשתי שבאמת רואים אותי",
      consentText: true,
    }));
    expect(result.isPositive).toBe(true);
    expect(result.needsPublishingReview).toBe(true);
    expect(result.needsMatchmakingAttention).toBe(false);
  });

  it("does not turn a positive suggestion into a service failure", () => {
    const result = classifyFeedbackFollowup(record({
      feedbackText: "החוויה הייתה טובה מאוד",
      improvementText: "אשמח לעוד מפגשי תוכן",
    }));
    expect(result.isPositive).toBe(true);
    expect(result.needsServiceRecovery).toBe(false);
  });

  it("ignores historical NPS direction before the RTL scale fix", () => {
    const result = classifyFeedbackFollowup(record({
      rating: 5,
      npsScore: 0,
      feedbackText: "שירות נהדר ומדויק",
      lastResponseAt: Date.parse("2026-09-17T18:00:00Z"),
    }));
    expect(result.isPositive).toBe(true);
    expect(result.needsServiceRecovery).toBe(false);
  });
});
