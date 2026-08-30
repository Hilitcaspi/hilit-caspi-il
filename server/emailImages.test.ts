import { describe, expect, it } from "vitest";
import { buildMatchProposalEmail, buildOwnerMatchApprovalEmail } from "./emailTemplates";
import { extractEmailImageKeyFromPath, extractEmailStorageKey, toEmailImageUrl } from "./emailImages";

describe("email image URLs", () => {
  it("converts relative Manus storage paths to the stable email image proxy", () => {
    expect(toEmailImageUrl("/manus-storage/singles-photos/example_a1b2c3.jpg"))
      .toBe("https://hilitcaspi.com/email-images/singles-photos/example_a1b2c3.jpg");
  });

  it("converts absolute site storage URLs and keeps direct HTTPS CDN URLs", () => {
    expect(toEmailImageUrl("https://www.hilitcaspi.com/manus-storage/singles/42-photo.jpg"))
      .toBe("https://hilitcaspi.com/email-images/singles/42-photo.jpg");
    expect(toEmailImageUrl("https://files.manuscdn.com/example/photo.jpg"))
      .toBe("https://files.manuscdn.com/example/photo.jpg");
  });

  it("rejects unsafe or unsupported image sources", () => {
    expect(toEmailImageUrl("javascript:alert(1)")).toBeUndefined();
    expect(toEmailImageUrl("http://example.com/photo.jpg")).toBeUndefined();
    expect(toEmailImageUrl("/manus-storage/../secret.jpg")).toBeUndefined();
    expect(extractEmailStorageKey("/manus-storage/%E0%A4%A")).toBe("%E0%A4%A");
    expect(extractEmailImageKeyFromPath("../secret.jpg")).toBeNull();
  });

  it("uses the proxy in both regular and Boost proposal emails", () => {
    for (const proposalSource of ["manual", "boost"] as const) {
      const email = buildMatchProposalEmail({
        firstName: "נועה",
        recipientGender: "female",
        matchFirstName: "אורי",
        matchAge: 34,
        matchCity: "המרכז",
        matchPhotoUrl: "/manus-storage/singles-photos/example.jpg",
        compatibilityScore: 78,
        hilitsNote: "חיבור אפשרי",
        yesUrl: "https://hilitcaspi.com/match/respond?token=yes",
        noUrl: "https://hilitcaspi.com/match/respond?token=no",
        recipientEmail: "test@example.com",
        singleId: 1,
        proposalSource,
        boostRole: proposalSource === "boost" ? "recipient" : undefined,
      });
      expect(email.htmlBody).toContain("https://hilitcaspi.com/email-images/singles-photos/example.jpg");
      expect(email.htmlBody).not.toContain('src="/manus-storage/');
      expect(email.htmlBody).toContain('alt=""');
    }
  });

  it("uses the same proxy in the owner approval email", () => {
    const email = buildOwnerMatchApprovalEmail({
      singleAFirstName: "א",
      singleAAge: 30,
      singleACity: "מרכז",
      singleAPhotoUrl: "/manus-storage/singles/a.jpg",
      singleBFirstName: "ב",
      singleBAge: 31,
      singleBCity: "שרון",
      singleBPhotoUrl: "/manus-storage/singles/b.jpg",
      score: 80,
      approveUrl: "https://hilitcaspi.com/approve",
      rejectUrl: "https://hilitcaspi.com/reject",
      matchId: 5,
    });
    expect(email.htmlBody).toContain("https://hilitcaspi.com/email-images/singles/a.jpg");
    expect(email.htmlBody).toContain("https://hilitcaspi.com/email-images/singles/b.jpg");
  });
});
