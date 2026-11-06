import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DATABASE_APPROVED_TESTIMONIALS } from "../shared/databaseApprovedTestimonials";
import { NOVEMBER_APPROVED_TESTIMONIALS } from "../shared/novemberApprovedTestimonials";

const page = readFileSync(new URL("../client/src/pages/DatabaseSales.tsx", import.meta.url), "utf8");
const component = readFileSync(new URL("../client/src/components/DatabaseTestimonials.tsx", import.meta.url), "utf8");

describe("approved experience quotes on the database sales page", () => {
  it("reuses the three November quotes verbatim and leaves their list unchanged", () => {
    expect(NOVEMBER_APPROVED_TESTIMONIALS).toHaveLength(3);
    expect(DATABASE_APPROVED_TESTIMONIALS).toHaveLength(4);
    expect(DATABASE_APPROVED_TESTIMONIALS.slice(0, 3)).toEqual(NOVEMBER_APPROVED_TESTIMONIALS);
    expect(new Set(DATABASE_APPROVED_TESTIMONIALS.map(row => row.id)).size).toBe(4);
  });

  it("adds only the owner-supplied meeting experience with the owner-supplied first name", () => {
    const additional = DATABASE_APPROVED_TESTIMONIALS[3];
    expect(additional.displayName).toBe("דניאל");
    expect(additional.topic).toBe("על ההיכרות הראשונה");
    expect(additional.text).toBe("אתמול בערב נפגשנו. תודה רבה על ההיכרות. אין ספק שההיכרות בדרך הזו הרבה יותר נעימה ומוצלחת מהאפליקציות 😎🍷. סופ״ש נעים.");
    expect(additional.text).not.toMatch(/זוגיות|חודשים|חתונה/);
  });

  it("contains no photos, contact details, scores or personal profile identifiers", () => {
    for (const row of DATABASE_APPROVED_TESTIMONIALS) {
      expect(Object.keys(row).sort()).toEqual(["displayName", "id", "text", "topic"]);
      expect(JSON.stringify(row)).not.toMatch(/@|https?:\/\/|\+?\d[\d ()-]{7,}\d/);
    }
    expect(component).not.toContain("photoUrl");
    expect(component).not.toContain("<img");
    expect(component).not.toContain("Star");
    expect(component).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders anonymous credit and retains the consent-gated public source with static fallback", () => {
    expect(component).toContain('|| "בעילום שם"');
    expect(component).toContain("testimonial.displayName.trim().split(/\\s+/)[0]");
    expect(component).toContain("...DATABASE_APPROVED_TESTIMONIALS");
    expect(component).toContain("trpc.publicProof.approvedTestimonials.useQuery");
    expect(component).toContain("Array.isArray(approvedTestimonials)");
    expect(component).not.toContain("useMutation");
  });

  it("adds an accessible section to the ordinary database page without changing the live offer", () => {
    expect(page).toContain("!isLiveOffer && <DatabaseTestimonials />");
    expect(component).toContain('aria-labelledby="database-testimonials-title"');
    expect(component).toContain('<blockquote');
    expect(component).toContain("md:grid-cols-2");
    expect(page.indexOf("<DatabaseTestimonials />")).toBeLessThan(page.indexOf("{/* ── FINAL CTA"));
  });
});
