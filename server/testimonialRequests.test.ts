import { describe, expect, it } from "vitest";
import {
  buildOutcomeFeedbackRequestEmail,
  shouldOfferTestimonialRequest,
  shouldSendAutomaticTestimonialRequest,
  TESTIMONIAL_REQUEST_AUTOMATION_ENABLED,
} from "./testimonialRequests";

describe("testimonial feedback requests", () => {
  it("offers requests only after a genuinely positive outcome", () => {
    expect(shouldOfferTestimonialRequest({ detailStatus: "together" })).toBe(true);
    expect(shouldOfferTestimonialRequest({ detailStatus: "ended" })).toBe(false);
    expect(shouldOfferTestimonialRequest({ feedback: { status: "continuing" } as any })).toBe(true);
    expect(shouldOfferTestimonialRequest({ feedback: { status: "ended" } as any })).toBe(false);
  });

  it("keeps automatic sending disabled until explicitly approved", () => {
    expect(TESTIMONIAL_REQUEST_AUTOMATION_ENABLED).toBe(false);
    expect(shouldSendAutomaticTestimonialRequest({
      automationEnabled: TESTIMONIAL_REQUEST_AUTOMATION_ENABLED,
      teamVerified: true,
      detailStatus: "together",
    })).toBe(false);
  });

  it("requires team verification and respects the cooldown for automatic mode", () => {
    const now = 1_800_000_000_000;
    expect(shouldSendAutomaticTestimonialRequest({ automationEnabled: true, teamVerified: false, detailStatus: "together", now })).toBe(false);
    expect(shouldSendAutomaticTestimonialRequest({ automationEnabled: true, teamVerified: true, detailStatus: "together", lastRequestedAt: now - 1_000, now })).toBe(false);
    expect(shouldSendAutomaticTestimonialRequest({ automationEnabled: true, teamVerified: true, detailStatus: "together", lastRequestedAt: now - 90_000_000, now })).toBe(true);
  });

  it("escapes names and explains that publication is always optional", () => {
    const email = buildOutcomeFeedbackRequestEmail({
      firstName: "<נועה>",
      partnerFirstName: "איתי & דנה",
      feedbackUrl: "https://hilitcaspi.com/match/outcome?token=test",
    });
    expect(email.htmlContent).not.toContain("<נועה>");
    expect(email.htmlContent).toContain("&lt;נועה&gt;");
    expect(email.htmlContent).toContain("שום דבר לא מתפרסם בלי בחירה מפורשת");
  });
});
