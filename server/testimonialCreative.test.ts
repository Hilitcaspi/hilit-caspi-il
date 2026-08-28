import { describe, expect, it } from "vitest";
import { buildApprovedTestimonialCreativeVariants, TESTIMONIAL_CREATIVE_FORMATS } from "./testimonialCreative";

describe("approved testimonial creative variants", () => {
  it("creates exactly ten channel variants from one approved source", () => {
    const source = {
      id: "42-A",
      text: "הכרנו דרך המאגר. אנחנו ממשיכים להכיר בקצב שלנו.",
      displayName: "נועה",
      photoUrl: null,
      submittedAt: 1_700_000_000_000,
    };
    const variants = buildApprovedTestimonialCreativeVariants(source);
    expect(variants).toHaveLength(10);
    expect(variants.map(item => item.format)).toEqual(TESTIMONIAL_CREATIVE_FORMATS);
    expect(variants.every(item => item.badge === "עדות מאושרת")).toBe(true);
  });

  it("uses only the approved quote or its exact first sentence", () => {
    const source = {
      id: "42-A",
      text: "הכרנו דרך המאגר. אנחנו ממשיכים להכיר בקצב שלנו.",
      displayName: "חבר/ת המאגר",
      photoUrl: null,
      submittedAt: 1_700_000_000_000,
    };
    const variants = buildApprovedTestimonialCreativeVariants(source);
    const allowed = new Set([source.text, "הכרנו דרך המאגר."]);
    expect(variants.every(item => allowed.has(item.body))).toBe(true);
    expect(variants.every(item => item.attribution === source.displayName)).toBe(true);
  });
});
