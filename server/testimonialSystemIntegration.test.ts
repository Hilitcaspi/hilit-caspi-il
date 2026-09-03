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

  it("keeps new outreach as drafts and does not call an email sender", () => {
    const router = read("server/testimonialRouter.ts");
    expect(router).toContain("approved_to_contact");
    expect(router).toContain("sent: 0");
    expect(router).not.toMatch(/sendEmail\s*\(/);
  });

  it("states that media upload is not publication consent", () => {
    const upload = read("server/testimonialMediaUpload.ts");
    const form = read("client/src/pages/TestimonialFeedback.tsx");
    expect(upload).toContain("העלאה אינה אישור לפרסום");
    expect(form).toContain("עצם ההעלאה אינה אישור לפרסום");
  });

  it("exposes a dedicated public form and CRM management tab", () => {
    const app = read("client/src/App.tsx");
    const crm = read("client/src/pages/CRMMatchmaking.tsx");
    expect(app).toContain('/testimonial/feedback');
    expect(crm).toContain("משובים והמלצות");
  });
});
