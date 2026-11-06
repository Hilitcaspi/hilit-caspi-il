import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { NOVEMBER_APPROVED_TESTIMONIALS } from "../shared/novemberApprovedTestimonials";

const landing = readFileSync(new URL("../client/src/pages/NovemberLoveBundle.tsx", import.meta.url), "utf8");

describe("owner-supplied November website experience quotes", () => {
  it("contains only the three selected publish-marked screenshot excerpts", () => {
    expect(NOVEMBER_APPROVED_TESTIMONIALS).toHaveLength(3);
    expect(new Set(NOVEMBER_APPROVED_TESTIMONIALS.map(row => row.id)).size).toBe(3);
    expect(NOVEMBER_APPROVED_TESTIMONIALS.map(row => row.topic)).toEqual([
      "על הדרך עם הילית", "על חוויית ההתאמות", "על התוצאה בשאלון",
    ]);
    expect(NOVEMBER_APPROVED_TESTIMONIALS[0].text).toContain("רואה ומבינה אותי");
    expect(NOVEMBER_APPROVED_TESTIMONIALS.map(row => row.displayName)).toEqual(["דור", "תום", "הודיה"]);
    expect(NOVEMBER_APPROVED_TESTIMONIALS[1].text).toContain("כל פעם בהתאמה אחת");
    expect(NOVEMBER_APPROVED_TESTIMONIALS[2].text).toContain("כל נושא ההתאמה מסקרן ממש");
  });
  it("keeps names first-only and exposes no contact fields or images", () => {
    for (const row of NOVEMBER_APPROVED_TESTIMONIALS) {
      expect(row.displayName).not.toMatch(/\s/);
      expect(Object.keys(row).sort()).toEqual(["displayName", "id", "text", "topic"]);
      expect(JSON.stringify(row)).not.toMatch(/@|https?:\/\/|\+?\d[\d ()-]{7,}\d/);
    }
  });
  it("renders curated quotes without requiring or overriding database consent", () => {
    expect(landing).toContain("...NOVEMBER_APPROVED_TESTIMONIALS");
    expect(landing).toContain("Array.isArray(approvedTestimonials)");
    expect(landing).toContain("testimonial.displayName.trim().split(/\\s+/)[0]");
    expect(landing).not.toContain("testimonial.photoUrl");
  });
});
