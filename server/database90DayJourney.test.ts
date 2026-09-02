import { describe, expect, it } from "vitest";
import { buildDatabase90DayEmail, DATABASE_90_DAY_LAUNCH_AT, DATABASE_90_DAY_STAGES, selectDatabaseUpsellOffer } from "./database90DayJourney";

const single = {
  id: 42,
  firstName: "נועה",
  lastName: "בדיקה",
  email: "noa@example.com",
  questionnaireToken: "token-1234567890",
} as any;

const stats = {
  proposals: 2,
  mutualApprovals: 1,
  meetings: 1,
  endedMatches: 0,
  positiveOutcomes: 0,
  latestOutcomeUrl: "https://hilitcaspi.com/match/outcome?token=feedback-token",
};

describe("database 90-day journey", () => {
  it("starts only with new registrations from the launch date", () => {
    expect(DATABASE_90_DAY_LAUNCH_AT).toBe(Date.UTC(2026, 7, 22, 0, 0, 0));
    expect(DATABASE_90_DAY_STAGES.map(stage => stage.day)).toEqual([3, 7, 14, 30, 60, 90]);
  });

  it("skips the day-3 reminder when the profile is complete", () => {
    const email = buildDatabase90DayEmail(1, single, stats, []);
    expect(email.skipReason).toBe("profile_complete");
  });

  it("lists the exact missing fields and uses a personal completion link", () => {
    const email = buildDatabase90DayEmail(1, single, stats, ["תמונה", "שאלון מדעי"]);
    expect(email.htmlBody).toContain("תמונה, שאלון מדעי");
    expect(email.htmlBody).toContain("/join/questionnaire?token=token-1234567890");
  });

  it("states the service boundaries explicitly at day 7", () => {
    const email = buildDatabase90DayEmail(2, single, stats, []);
    expect(email.htmlBody).toContain("299 ש״ח הם דמי הצטרפות");
    expect(email.htmlBody).toContain("אינם התחייבות לכמות או לתדירות קבועה");
    expect(email.htmlBody).toContain("/unsubscribe?token=");
    expect(email.htmlBody).not.toContain("/unsubscribe?email=");
  });

  it("adapts the day-14 message when no match was proposed", () => {
    const email = buildDatabase90DayEmail(3, single, { ...stats, proposals: 0 }, []);
    expect(email.htmlBody).toContain("עדיין לא נשלחה הצעה");
    expect(email.htmlBody).toContain("לא נשלח אדם שאינו עומד בהתאמה ההדדית");
  });

  it("uses measured outcomes and the feedback form at day 90", () => {
    const email = buildDatabase90DayEmail(6, single, stats, []);
    expect(email.htmlBody).toContain("2</strong> הצעות");
    expect(email.htmlBody).toContain("1</strong> אישורים הדדיים");
    expect(email.htmlBody).toContain(stats.latestOutcomeUrl);
    expect(email.htmlBody).toContain("שום דבר לא יפורסם ללא הסכמה מפורשת");
  });

  it("chooses an offer from behavior rather than sending one generic upsell", () => {
    expect(selectDatabaseUpsellOffer(14, { ...stats, proposals: 0 }, [])).toBe("community");
    expect(selectDatabaseUpsellOffer(30, { ...stats, proposals: 3, mutualApprovals: 0 }, [])).toBe("single_session");
    expect(selectDatabaseUpsellOffer(60, { ...stats, endedMatches: 1 }, [])).toBe("coaching");
  });

  it("does not upsell when the profile is incomplete or a positive outcome exists", () => {
    expect(selectDatabaseUpsellOffer(60, stats, ["תמונה"])).toBe("none");
    expect(selectDatabaseUpsellOffer(90, { ...stats, positiveOutcomes: 1 }, [])).toBe("none");
  });

  it("explains that a paid session is not a purchased match", () => {
    const email = buildDatabase90DayEmail(4, single, { ...stats, mutualApprovals: 0 }, []);
    expect(email.htmlBody).toContain("אינה רכישה של התאמה");
    expect(email.htmlBody).toContain("behavioral_upsell");
  });
});
