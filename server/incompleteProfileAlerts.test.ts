import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildIncompleteProfileOwnerMessage,
  getMissingProfileFields,
  INCOMPLETE_PROFILE_ALERT_JOURNEY,
} from "./incompleteProfileAlerts";

describe("24-hour incomplete profile alerts", () => {
  it("detects every critical profile field and ignores complete profiles", () => {
    expect(getMissingProfileFields({})).toEqual([
      "גיל", "עיר", "גובה", "על עצמי", "מה מחפשים בזוגיות", "תמונה",
      "שאלון DNA", "שאלון מדעי", "תעסוקה", "דת",
    ]);
    expect(getMissingProfileFields({
      age: 39,
      city: "תל אביב",
      height: 170,
      about: "תיאור מלא",
      partnerDescription: "קשר משמעותי",
      photoUrl: "/photo.jpg",
      dnaType: "heart",
      questionnaireCompletedAt: Date.now(),
      occupation: "עצמאות",
      religiosity: "מסורתיות",
    })).toEqual([]);
  });

  it("builds a neutral owner alert with CRM link", () => {
    const message = buildIncompleteProfileOwnerMessage({
      name: "ישראל ישראלי",
      email: "test@example.com",
      phone: "0500000000",
      missing: ["תמונה", "שאלון מדעי"],
    });
    expect(message).toContain("הצטרפות חדשה");
    expect(message).not.toMatch(/מצטרפ\/ת|חדש\/ה/);
    expect(message).toContain("תמונה, שאלון מדעי");
    expect(message).toContain("hilitcaspi.com/crm");
  });

  it("uses a durable idempotency log and an hourly Heartbeat endpoint", () => {
    expect(INCOMPLETE_PROFILE_ALERT_JOURNEY).toBe("incomplete_profile_24h");
    const alertSource = readFileSync(new URL("./incompleteProfileAlerts.ts", import.meta.url), "utf8");
    const growSource = readFileSync(new URL("./growWebhook.ts", import.meta.url), "utf8");
    const indexSource = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    expect(alertSource).toContain("emailLog.journeyKey");
    expect(alertSource).toContain("incomplete-profile-24h-${profile.id}");
    expect(growSource).not.toContain("TWENTY_FOUR_HOURS");
    expect(growSource).not.toContain("setTimeout(async () =>");
    expect(indexSource).toContain('/api/scheduled/incomplete-profile-alerts');
  });
});
