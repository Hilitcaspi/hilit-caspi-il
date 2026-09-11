import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDatabase90DayEmail, DATABASE_90_DAY_LAUNCH_AT, DATABASE_90_DAY_STAGES } from "./database90DayJourney";

const single = {
  id: 42,
  firstName: "נועה",
  lastName: "בדיקה",
  email: "noa@example.com",
  questionnaireToken: "token-1234567890",
} as any;

describe("database onboarding journey", () => {
  it("starts only with new registrations from the launch date", () => {
    expect(DATABASE_90_DAY_LAUNCH_AT).toBe(Date.UTC(2026, 7, 22, 0, 0, 0));
  });

  it("allows only the day-3 and day-7 onboarding messages", () => {
    expect(DATABASE_90_DAY_STAGES.map(stage => stage.day)).toEqual([3, 7]);
    expect(DATABASE_90_DAY_STAGES.map(stage => stage.index)).toEqual([1, 2]);
  });

  it("skips the day-3 reminder when the profile is complete", () => {
    const email = buildDatabase90DayEmail(1, single, []);
    expect(email.skipReason).toBe("profile_complete");
  });

  it("lists the exact missing fields and uses a personal completion link", () => {
    const email = buildDatabase90DayEmail(1, single, ["תמונה", "שאלון מדעי"]);
    expect(email.htmlBody).toContain("תמונה, שאלון מדעי");
    expect(email.htmlBody).toContain("/join/questionnaire?token=token-1234567890");
  });

  it("states the service boundaries explicitly at day 7", () => {
    const email = buildDatabase90DayEmail(2, single, []);
    expect(email.htmlBody).toContain("299 ש״ח הם דמי הצטרפות");
    expect(email.htmlBody).toContain("אינם התחייבות לכמות או לתדירות קבועה");
    expect(email.htmlBody).toContain("/unsubscribe?token=");
    expect(email.htmlBody).not.toContain("/unsubscribe?email=");
  });

  it("permanently blocks every generic status stage from day 14 onward", () => {
    for (const stageIndex of [3, 4, 5, 6]) {
      const email = buildDatabase90DayEmail(stageIndex, single, []);
      expect(email.skipReason).toBe("generic_status_email_disabled");
      expect(email.htmlBody).toBe("");
      expect(email.textBody).toBe("");
    }
  });

  it("does not contain the removed active-profile or proposal-count copy", () => {
    const sourcePath = fileURLToPath(new URL("./database90DayJourney.ts", import.meta.url));
    const source = readFileSync(sourcePath, "utf8");
    expect(source).not.toContain("עד עכשיו נשלחו עבורך");
    expect(source).not.toContain("סיכום החודש הראשון שלך במאגר");
    expect(source).not.toContain("60 יום במאגר");
    expect(source).not.toContain("סיכום 90 הימים הראשונים שלך");
  });
});
