import { describe, expect, it } from "vitest";
import { buildMatchProposalEmail } from "./emailTemplates";

const baseParams = {
  firstName: "בדיקה",
  recipientGender: "other" as const,
  matchFirstName: "שם שאסור לחשוף",
  matchAge: 40,
  matchCity: "אזור כללי",
  matchOccupation: "תחום מקצועי",
  matchPhotoUrl: "https://example.com/private-photo.jpg",
  compatibilityScore: 75,
  hilitsNote: "התאמה טובה בדפוסי זוגיות",
  yesUrl: "https://example.com/yes-secret",
  noUrl: "https://example.com/no-secret",
  recipientEmail: "test@example.com",
  singleId: 1,
  proposalSource: "boost" as const,
};

describe("Boost role-specific messaging", () => {
  it("tells the recipient that a Boost was sent and keeps the card anonymous", () => {
    const email = buildMatchProposalEmail({ ...baseParams, boostRole: "recipient" });
    expect(email.subject).toContain("התאמת Boost מיוחדת מחכה לך");
    expect(email.htmlBody).toContain("מחכה לך התאמת Boost מיוחדת");
    expect(email.htmlBody).toContain("נשלחה אליך במסגרת מסלול Boost");
    expect(email.htmlBody).toContain("לא נבחרה או נבדקה אישית על ידי הילית");
    expect(email.htmlBody).toContain(baseParams.yesUrl);
    expect(email.htmlBody).not.toContain(baseParams.matchPhotoUrl);
    expect(email.htmlBody).not.toContain(baseParams.matchFirstName);
  });

  it("confirms the sent Boost without asking the sender to approve again", () => {
    const email = buildMatchProposalEmail({ ...baseParams, boostRole: "sender" });
    expect(email.subject).toContain("בקשת ה־Boost שלך נשלחה");
    expect(email.htmlBody).toContain("אין צורך לאשר שוב");
    expect(email.textBody).toContain("בקשת ה־Boost שלך");
    expect(email.htmlBody).not.toContain(baseParams.yesUrl);
    expect(email.htmlBody).not.toContain(baseParams.noUrl);
    expect(email.htmlBody).not.toContain(baseParams.matchPhotoUrl);
    expect(email.htmlBody).not.toContain(baseParams.matchFirstName);
  });
});
