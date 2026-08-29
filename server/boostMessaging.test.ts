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

describe("Boost dual-approval messaging", () => {
  it("sends the recipient a full profile with separate approval controls", () => {
    const email = buildMatchProposalEmail({ ...baseParams, boostRole: "recipient" });
    expect(email.subject).toContain("נשלחה אליך התאמת Boost לאישור");
    expect(email.htmlBody).toContain("נשלחה אליך התאמת Boost שמחכה לאישור שלך");
    expect(email.htmlBody).toContain("נשלחה אליך התאמה במסגרת מסלול Boost");
    expect(email.htmlBody).toContain("לא נבחרה או נבדקה אישית על ידי הילית");
    expect(email.htmlBody).toContain(baseParams.yesUrl);
    expect(email.htmlBody).toContain(baseParams.noUrl);
    expect(email.htmlBody).toContain(baseParams.matchPhotoUrl);
    expect(email.htmlBody).toContain(baseParams.matchFirstName);
    expect(email.htmlBody).toContain("פרטי יצירת הקשר נחשפים רק אחרי אישור הדדי");
  });

  it("asks the paying sender to approve separately and shows the same full profile", () => {
    const email = buildMatchProposalEmail({ ...baseParams, boostRole: "sender" });
    expect(email.subject).toContain("בקשת ה־Boost שלך נשלחה ומחכה לאישור");
    expect(email.htmlBody).toContain("בקשת ה־Boost שלך נשלחה לשני הצדדים");
    expect(email.htmlBody).toContain("התשלום ושליחת ה־Boost אינם אישור להתאמה");
    expect(email.textBody).toContain("גם האישור שלך עדיין נדרש במייל");
    expect(email.htmlBody).toContain(baseParams.yesUrl);
    expect(email.htmlBody).toContain(baseParams.noUrl);
    expect(email.htmlBody).toContain(baseParams.matchPhotoUrl);
    expect(email.htmlBody).toContain(baseParams.matchFirstName);
  });
});
