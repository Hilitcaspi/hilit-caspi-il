import { describe, expect, it, vi } from "vitest";

vi.mock("./emailUnsubscribe", () => ({
  buildSignedUnsubscribeUrl: ({ email }: { email: string }) => `https://hilitcaspi.com/unsubscribe?email=${encodeURIComponent(email)}`,
  isEmailMarketingSuppressed: vi.fn(),
}));

import {
  buildPlusHolidayPilotEmail,
  buildPlusPaymentRecoveryEmail,
  PLUS_HOLIDAY_PILOT_NEW_COUNTS,
  rankPlusHolidayPilotCandidates,
  selectBalancedPlusHolidayPilotCandidates,
} from "./plusHolidayPilotCampaign";

function candidate(id: number, gender: "female" | "male", score: number, tenureDays: number) {
  return {
    single: { id, gender, createdAt: id, firstName: `שם${id}`, email: `person${id}@example.com` } as any,
    eligibilityScore: score,
    eligibilityReasons: [],
    tenureDays,
  };
}

describe("Plus holiday pilot campaign", () => {
  it("selects exactly 20 women and 15 men deterministically", () => {
    const input = [
      ...Array.from({ length: 30 }, (_, index) => candidate(index + 1, "female", 90, index)),
      ...Array.from({ length: 30 }, (_, index) => candidate(index + 101, "male", 90, index)),
    ];
    const selected = selectBalancedPlusHolidayPilotCandidates(input);
    expect(selected.filter(item => item.single.gender === "female")).toHaveLength(PLUS_HOLIDAY_PILOT_NEW_COUNTS.female);
    expect(selected.filter(item => item.single.gender === "male")).toHaveLength(PLUS_HOLIDAY_PILOT_NEW_COUNTS.male);
    expect(selectBalancedPlusHolidayPilotCandidates([...input].reverse()).map(item => item.single.id))
      .toEqual(selected.map(item => item.single.id));
  });

  it("prioritizes eligibility score and then longer time without a match", () => {
    const ranked = rankPlusHolidayPilotCandidates([
      candidate(1, "female", 85, 40),
      candidate(2, "female", 95, 5),
      candidate(3, "female", 95, 50),
    ]);
    expect(ranked.map(item => item.single.id)).toEqual([3, 2, 1]);
  });

  it("builds a festive waitlist invitation with separated Plus benefits and recurring price", () => {
    const content = buildPlusHolidayPilotEmail({ firstName: "נועה", email: "noa@example.com", token: "questionnaire-token-123456" });
    expect(content.subject).toContain("נבחרת להשקה הראשונה");
    expect(content.htmlContent).toContain("נרשמת לרשימת ההמתנה");
    expect(content.htmlContent).toContain("השירות המתקדם ביותר שיצרתי לחברי המאגר");
    expect(content.htmlContent).toContain("שתי התאמות בכל חודש");
    expect(content.htmlContent).toContain("בוסט אחד חינם בכל מחזור");
    expect(content.htmlContent).toContain("יותר תשומת לב לפרופיל שלך");
    expect(content.htmlContent).toContain("אני שמה גז על ההתאמות לחברי המאגר");
    expect(content.htmlContent).toContain("99 ₪ לחודש");
    expect(content.htmlContent).toContain("השירות יופעל רק לאחר השלמת התשלום");
    expect(content.checkoutUrl).toContain("/database-plus?");
    expect(content.checkoutUrl).toContain("token=questionnaire-token-123456");
    expect(content.checkoutUrl).toContain("utm_campaign=holiday_plus_pilot_2026_09");
  });

  it("builds a transparent payment recovery email for the five 1-shekel sandbox attempts", () => {
    const content = buildPlusPaymentRecoveryEmail({ firstName: "אורי", email: "ori@example.com", token: "questionnaire-token-123456" });
    expect(content.subject).toContain("נפתח היום");
    expect(content.htmlContent).toContain("1 ₪ בלבד");
    expect(content.htmlContent).toContain("99 ₪ לחודש");
    expect(content.htmlContent).toContain("שתי התאמות");
    expect(content.htmlContent).toContain("בוסט אחד חינם");
    expect(content.htmlContent).toContain("השירות יופעל רק לאחר שהתשלום החדש ייקלט בהצלחה");
    expect(content.checkoutUrl).toContain("utm_medium=payment_recovery");
  });
});
