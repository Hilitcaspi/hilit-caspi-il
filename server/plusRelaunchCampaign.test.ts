import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("./emailUnsubscribe", () => ({
  buildSignedUnsubscribeUrl: ({ email }: { email: string }) => `https://hilitcaspi.com/unsubscribe?email=${encodeURIComponent(email)}`,
  isEmailMarketingSuppressed: vi.fn(),
}));

import { buildPlusRelaunchEmail, buildPlusRelaunchSms } from "./plusRelaunchCampaign";
import {
  PLUS_HOLIDAY_LAUNCH_COHORT,
  PLUS_HOLIDAY_LAUNCH_EXPIRES_AT,
  qualifiesForPlusHolidayLaunch,
} from "./plusLaunchOffer";

describe("Database Plus holiday launch", () => {
  it("limits the third proposal to verified launch purchases before the deadline", () => {
    expect(qualifiesForPlusHolidayLaunch(PLUS_HOLIDAY_LAUNCH_COHORT, PLUS_HOLIDAY_LAUNCH_EXPIRES_AT - 1)).toBe(true);
    expect(qualifiesForPlusHolidayLaunch(PLUS_HOLIDAY_LAUNCH_COHORT, PLUS_HOLIDAY_LAUNCH_EXPIRES_AT)).toBe(false);
    expect(qualifiesForPlusHolidayLaunch("other", PLUS_HOLIDAY_LAUNCH_EXPIRES_AT - 1)).toBe(false);
  });

  it("explains the service before the holiday benefit in the email", () => {
    const content = buildPlusRelaunchEmail({ firstName: "דנה", email: "dana@example.com", token: "safe-token" });
    expect(content.subject).toContain("ההשקה שביקשתם נפתחה");
    expect(content.subject).toContain("Database Plus");
    expect(content.textContent).toContain("לפחות שתי הצעות התאמה חדשות");
    expect(content.textContent).toContain("בוסט אחד נוסף");
    expect(content.textContent).toContain("קדימות באיתור");
    expect(content.textContent).toContain("מענה ועדכון העדפות בעדיפות");
    expect(content.textContent).toContain("שלוש הצעות התאמה במקום שתיים");
    expect(content.textContent).toContain("99 ₪ לחודש");
    expect(content.textContent.indexOf("מה מקבלים בכל חודש פעיל?")).toBeLessThan(content.textContent.indexOf("לכבוד ההשקה"));
    expect(content.checkoutUrl).toContain("utm_source=email");
    expect(content.checkoutUrl).toContain("utm_medium=launch");
    expect(content.checkoutUrl).toContain("utm_campaign=plus_launch_sep26");
    expect(content.checkoutUrl).toContain("utm_content=plus_launch_email");
    expect(content.htmlContent).toContain("plus-email-hilit-seated_52bbd335.jpg");
    expect(content.htmlContent).toContain("plus-email-hilit-full_0acd266d.jpg");
    expect(content.htmlContent).toContain("box-sizing: border-box !important");
    expect(content.htmlContent.split(content.checkoutUrl)).toHaveLength(3);
    expect(content.textContent).not.toMatch(/[—–]/);
  });

  it("tracks every launch CTA instead of only the first link", () => {
    const source = readFileSync(resolve(process.cwd(), "server/plusRelaunchCampaign.ts"), "utf8");
    expect(source).toContain("htmlContent.split(checkoutUrl).join(clickUrl)");
    expect(source).not.toContain("htmlContent.replace(checkoutUrl, clickUrl)");
  });

  it("keeps the SMS concise, explanatory and separately attributable", () => {
    const content = buildPlusRelaunchSms({ email: "dana@example.com", token: "safe-token" });
    expect(content.message).toContain("מנוי חודשי");
    expect(content.message).toContain("2 הצעות");
    expect(content.message).toContain("בוסט נוסף");
    expect(content.message).toContain("הצעה שלישית במחזור הראשון");
    expect(content.message).toContain("99 ₪ לחודש");
    expect(content.message).toContain("להסרה:");
    expect(content.checkoutUrl).toContain("utm_source=sms");
    expect(content.checkoutUrl).toContain("utm_campaign=plus_launch_sep26");
    expect(content.checkoutUrl).toContain("utm_content=plus_launch_sms");
    expect(content.message).not.toMatch(/[—–]/);
  });

  it("applies three proposals only to the first launch cycle and returns to two later", () => {
    const source = readFileSync(resolve(process.cwd(), "server/plusFulfillment.ts"), "utf8");
    expect(source).toContain("!existing?.activatedAt");
    expect(source).toContain("qualifiesForPlusHolidayLaunch(checkoutIntent?.utmCampaign, cycleStart)");
    expect(source).toContain("PLUS_HOLIDAY_LAUNCH_FIRST_CYCLE_TARGET : 2");
    expect(source).toContain("monthlyMatchTarget: cycleMatchTarget");
  });

  it("guards paid members against exceeding the operational Plus capacity", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(source).toContain("hasPlusPilotCapacity(capacityRows, existingSingle.gender)");
    expect(source).toContain("מכסת ההשקה מלאה כרגע");
  });

  it("targets database members broadly but excludes everyone who already paid for Plus", () => {
    const source = readFileSync(resolve(process.cwd(), "server/plusRelaunchCampaign.ts"), "utf8");
    expect(source).toContain("completedPayments.product, \"plus\"");
    expect(source).toContain("!paidPlusEmails.has(email)");
    expect(source).toContain("eq(singles.isPaid, true)");
    expect(source).toContain("eq(singles.isActive, true)");
    expect(source).not.toContain("potentialMatchesUnderReview >= 3");
  });
});
