import { describe, expect, it } from "vitest";
import {
  buildFeedbackRequestEmail,
  buildFeedbackRequestKey,
  feedbackProductPlan,
  isFeedbackTouchpointEnabled,
  shouldApplyFeedbackCooldown,
} from "./feedbackAutomation";

const disabledSettings = {
  matchImmediateEnabled: false,
  matchWeekReminderEnabled: false,
  dnaResultEnabled: false,
  databaseCompleteEnabled: false,
  guideCompleteEnabled: false,
  courseCompleteEnabled: false,
  productFollowupEnabled: false,
  satisfactionSurveyEnabled: false,
  historicalBatchEnabled: false,
};

describe("feedback automation", () => {
  it("builds stable request keys for retry-safe touchpoints", () => {
    expect(buildFeedbackRequestKey({ touchpoint: "match_mutual", subjectId: 44, contactId: 9 }))
      .toBe("match_mutual:44:9");
  });

  it("keeps every automation touchpoint disabled by default", () => {
    expect(isFeedbackTouchpointEnabled(disabledSettings, "match_mutual")).toBe(false);
    expect(isFeedbackTouchpointEnabled(disabledSettings, "dna_result")).toBe(false);
    expect(isFeedbackTouchpointEnabled(disabledSettings, "representative_sample")).toBe(false);
    expect(isFeedbackTouchpointEnabled(disabledSettings, "product_followup")).toBe(false);
  });

  it("allows the intentional week follow-up even during the general cooldown", () => {
    expect(shouldApplyFeedbackCooldown("match_mutual")).toBe(true);
    expect(shouldApplyFeedbackCooldown("match_week")).toBe(false);
  });

  it("states clearly that the gift does not depend on publication consent", () => {
    const email = buildFeedbackRequestEmail({ firstName: "דנה", contactEmail: "dana@example.com", sourceType: "match", feedbackUrl: "https://example.com/form" });
    expect(email.subject).toContain("מתנה אישית");
    expect(email.htmlContent).toContain("גם בלי אישור לפרסם");
    expect(email.htmlContent).toContain("https://example.com/form");
    expect(email.htmlContent).toContain("לעוד אנשים שמחפשים אהבה");
    expect(email.htmlContent).toContain("/unsubscribe?token=");
    expect(email.htmlContent).not.toContain("/unsubscribe?email=");
  });

  it("keeps the satisfaction survey neutral and separate from the testimonial gift", () => {
    const email = buildFeedbackRequestEmail({
      firstName: "דנה",
      contactEmail: "dana@example.com",
      sourceType: "database",
      surveyKind: "satisfaction_survey",
      feedbackUrl: "https://example.com/survey",
    });
    expect(email.subject).toContain("נשמח לשמוע מה דעתך");
    expect(email.htmlContent).toContain("סקר שביעות רצון קצר ונפרד");
    expect(email.htmlContent).toContain("לא יפורסמו ללא בקשת רשות נפרדת");
    expect(email.htmlContent).not.toContain("מפת הדייט הבא");
    expect(email.htmlContent).not.toContain("מתנה אישית");
    expect(email.htmlContent).toContain("https://example.com/survey");
    expect(email.htmlContent).toContain("/unsubscribe?token=");
    expect(email.htmlContent).not.toContain("/unsubscribe?email=");
  });

  it("waits for meaningful product use before requesting feedback", () => {
    expect(feedbackProductPlan("bundle_new_year")).toEqual({ sourceType: "bundle", delayDays: 10 });
    expect(feedbackProductPlan("match_boost")).toBeNull();
    expect(feedbackProductPlan("guide")).toEqual({ sourceType: "guide", delayDays: 7 });
    expect(feedbackProductPlan("database")).toBeNull();
  });
});
