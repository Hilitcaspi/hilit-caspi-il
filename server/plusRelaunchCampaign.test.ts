import { describe, expect, it } from "vitest";
import { buildPlusRelaunchEmail, buildPlusRelaunchSms } from "./plusRelaunchCampaign";
import {
  PLUS_RELAUNCH_BONUS_WINDOW_MS,
  PLUS_RELAUNCH_COHORT,
  qualifiesForPlusRelaunchGuideBonus,
} from "./plusLaunchOffer";

describe("Database Plus relaunch offer", () => {
  it("limits the guide bonus to 72 hours from the personal invitation", () => {
    const invitedAt = Date.UTC(2026, 8, 17, 12);
    expect(qualifiesForPlusRelaunchGuideBonus(PLUS_RELAUNCH_COHORT, invitedAt, invitedAt)).toBe(true);
    expect(qualifiesForPlusRelaunchGuideBonus(PLUS_RELAUNCH_COHORT, invitedAt, invitedAt + PLUS_RELAUNCH_BONUS_WINDOW_MS)).toBe(true);
    expect(qualifiesForPlusRelaunchGuideBonus(PLUS_RELAUNCH_COHORT, invitedAt, invitedAt + PLUS_RELAUNCH_BONUS_WINDOW_MS + 1)).toBe(false);
    expect(qualifiesForPlusRelaunchGuideBonus("other", invitedAt, invitedAt)).toBe(false);
  });

  it("states the real work, price, bonus and limitations in the email", () => {
    const content = buildPlusRelaunchEmail({ firstName: "דנה", email: "dana@example.com", token: "safe-token" });
    expect(content.subject).toContain("72 שעות");
    expect(content.textContent).toContain("שתי הצעות התאמה חדשות שנבדקו בפועל");
    expect(content.textContent).toContain("149 ₪ במתנה");
    expect(content.textContent).toContain("99 ₪ לחודש");
    expect(content.textContent).toContain("אינם מובטחים");
    expect(content.checkoutUrl).toContain("utm_campaign=plus_relaunch_guide_bonus_2026_09");
  });

  it("keeps the SMS concise and includes unsubscribe", () => {
    const content = buildPlusRelaunchSms({ email: "dana@example.com", token: "safe-token" });
    expect(content.message).toContain("72 שעות");
    expect(content.message).toContain("להסרה:");
    expect(content.message).toContain("99 ₪ לחודש");
  });
});
