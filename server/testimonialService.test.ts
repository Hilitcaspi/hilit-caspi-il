import { describe, expect, it } from "vitest";
import {
  buildTestimonialDraft,
  consentAllowsChannel,
  deriveSubmissionStatus,
  normalizeTestimonialEmail,
  publicQuestionsForSource,
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
    expect(publicQuestionsForSource("boost").primaryQuestion).toContain("תהליך");
    const draft = buildTestimonialDraft({ firstName: "דנה לוי", sourceType: "course" });
    expect(draft.subject).toContain("דנה");
    expect(draft.body).toContain("משוב");
  });
});
