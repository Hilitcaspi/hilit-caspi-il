import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("testimonial system integration policy", () => {
  it("keeps the creative library team-only and manual requests explicit", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("testimonialCreativeLibrary: teamProcedure");
    expect(router).toContain("requestOutcomeFeedback: teamProcedure");
    expect(router).toContain("בקשת עדות נשלחת רק לאחר תוצאה חיובית אמיתית");
  });

  it("labels demonstrations and keeps automatic sending visibly disabled", () => {
    const component = read("client/src/components/TestimonialCreativeLibrarySection.tsx");
    const requestPolicy = read("server/testimonialRequests.ts");
    expect(component).toContain("המחשה, לא עדות לקוח");
    expect(component).toContain("מסלול אוטומטי, מוכן אך כבוי");
    expect(requestPolicy).toContain("TESTIMONIAL_REQUEST_AUTOMATION_ENABLED = false");
  });

  it("never places invented customer names or result claims in illustration templates", () => {
    const component = read("client/src/components/TestimonialCreativeLibrarySection.tsx");
    for (const prohibited of ["רותם ועידו", "יעל ותומר", "מצאתי אהבה", "התחתנו", "צילום מסך מוואטסאפ"]) {
      expect(component).not.toContain(prohibited);
    }
  });
});
