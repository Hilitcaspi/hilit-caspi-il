import type { ApprovedPublicTestimonial } from "./publicTestimonials";

export const TESTIMONIAL_CREATIVE_FORMATS = [
  "story",
  "feed",
  "reel",
  "carousel",
  "newsletter",
  "paid_ad",
  "landing_page",
  "email_quote",
  "short_social",
  "editorial_card",
] as const;

export type TestimonialCreativeFormat = typeof TESTIMONIAL_CREATIVE_FORMATS[number];

const FORMAT_LABELS: Record<TestimonialCreativeFormat, string> = {
  story: "Story",
  feed: "Feed",
  reel: "Reel",
  carousel: "קרוסלה",
  newsletter: "ניוזלטר",
  paid_ad: "מודעה",
  landing_page: "עמוד נחיתה",
  email_quote: "ציטוט למייל",
  short_social: "פוסט קצר",
  editorial_card: "כרטיס מגזיני",
};

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const sentence = trimmed.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return sentence || trimmed;
}

export function buildApprovedTestimonialCreativeVariants(testimonial: ApprovedPublicTestimonial) {
  const fullText = testimonial.text.trim();
  const lead = firstSentence(fullText);
  const variants = TESTIMONIAL_CREATIVE_FORMATS.map((format, index) => {
    const useLead = ["story", "reel", "email_quote", "short_social"].includes(format);
    return {
      id: `${testimonial.id}-${format}`,
      order: index + 1,
      format,
      formatLabel: FORMAT_LABELS[format],
      badge: "עדות מאושרת" as const,
      headline: format === "editorial_card" ? "חוויה מהמאגר" : "מילים שנכתבו לאחר היכרות דרך המאגר",
      body: useLead ? lead : fullText,
      attribution: testimonial.displayName,
      photoUrl: testimonial.photoUrl,
      submittedAt: testimonial.submittedAt,
    };
  });

  return variants;
}
