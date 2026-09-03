import { describe, expect, it } from "vitest";
import {
  buildTestimonialDraft,
  consentAllowsChannel,
  deriveSubmissionStatus,
  normalizeTestimonialEmail,
  publicQuestionsForSource,
  resolveFeedbackRewardGrant,
} from "./testimonialService";

describe("testimonial service", () => {
  it("normalizes email addresses before storing contact details", () => {
    expect(normalizeTestimonialEmail("  Person@Example.COM ")).toBe("person@example.com");
  });

  it("keeps feedback private until explicit asset and channel consent exist", () => {
    expect(deriveSubmissionStatus({ testimonialText: undefined, consentText: false, consentPhoto: false, consentVideo: false, allowedChannels: [] })).toBe("submitted");
    expect(deriveSubmissionStatus({ testimonialText: "משוב אמיתי", consentText: false, consentPhoto: false, consentVideo: false, allowedChannels: [] })).toBe("awaiting_consent");
    expect(deriveSubmissionStatus({ testimonialText: "טקסט מאושר", consentText: true, consentPhoto: false, consentVideo: false, allowedChannels: ["website"] })).toBe("awaiting_verification");
  });

  it("blocks every channel immediately after consent is revoked", () => {
    const record = { allowWebsite: true, allowOrganicSocial: true, allowEmail: true, allowPaidAds: true, allowPr: true, consentRevokedAt: Date.now() } as any;
    expect(consentAllowsChannel(record, "website")).toBe(false);
    expect(consentAllowsChannel(record, "paid_ads")).toBe(false);
  });

  it("builds source-specific questions and draft copy without sending", () => {
    expect(publicQuestionsForSource("dna").heading).toContain("DNA");
    expect(publicQuestionsForSource("match").primaryQuestion).toContain("תהליך");
    expect(publicQuestionsForSource("match").secondaryQuestion).toContain("מקצועי");
    expect(publicQuestionsForSource("boost").testimonialPrompt).toContain("חבר מאגר");
    expect(publicQuestionsForSource("database").outcomeQuestion).toContain("התאמה");
    const draft = buildTestimonialDraft({ firstName: "דנה לוי", sourceType: "course" });
    expect(draft.subject).toContain("דנה");
    expect(draft.body).toContain("מתנה");
    expect(draft.body).toContain("גם בלי אישור לפרסם");
  });

  it("keeps satisfaction surveys neutral and separate from testimonial rewards", () => {
    const questions = publicQuestionsForSource("database", "satisfaction_survey");
    expect(questions.showRatings).toBe(true);
    expect(questions.showImprovement).toBe(true);
    expect(questions.rewardLabel).toBeNull();
    const draft = buildTestimonialDraft({ firstName: "דנה", sourceType: "database", surveyKind: "satisfaction_survey" });
    expect(draft.body).toContain("מה נכון לשפר");
    expect(draft.body).toContain("לא ישמשו לפרסום");
  });

  it("uses dedicated holiday bundle questions instead of generic service copy", () => {
    const questions = publicQuestionsForSource("bundle", "positive_experience");
    expect(questions.heading).toContain("חבילת החג");
    expect(questions.primaryQuestion).toContain("כלי בחבילת החג");
  });

  it("grants the thank-you gift once without depending on publication consent", () => {
    const now = 1_788_300_000_000;
    expect(resolveFeedbackRewardGrant({ surveyKind: "positive_experience", rewardType: "date_map", now }))
      .toBe(now);
    expect(resolveFeedbackRewardGrant({ surveyKind: "positive_experience", rewardType: "date_map", existingGrantedAt: now - 10, now }))
      .toBe(now - 10);
    expect(resolveFeedbackRewardGrant({ surveyKind: "satisfaction_survey", rewardType: "date_map", now }))
      .toBeNull();
  });
});
