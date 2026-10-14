import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const page = readFileSync("client/src/pages/DatabasePlusSales.tsx", "utf8");
describe("Plus live benefit presentation", () => {
  it("shows the automatic free ticket, date and profile-building value on the existing page", () => {
    expect(page).toContain('id="plus-live-benefit"');
    expect(page).toContain("כרטיס חינם ללייב איתי");
    expect(page).toContain("שבת 31.10.2026 · 20:30");
    expect(page).toContain("מפגש אונליין בזום");
    expect(page).toContain("לבנות פרופיל מדויק יותר");
    expect(page).toContain("יכול לפתוח יותר הזדמנויות להתאמה");
    expect(page).toContain("הכרטיס שלך מופק אוטומטית");
    expect(page).toContain("קישור הכניסה לזום יישלח בנפרד בסמוך לאירוע");
    expect(page).toContain("הכניסה כלולה לחברי Plus פעילים במועד הלייב");
  });
  it("offers existing club benefits without promising guaranteed extra matches or new benefits", () => {
    expect(page).toContain("ועוד הטבות ששמורות רק ל־Plus");
    expect(page).toContain("מחיר מיוחד לפגישת היכרות, הנחות על המדריך, הקורס וחבילות הליווי");
    expect(page).not.toContain("פרופיל שמבטיח יותר התאמות");
    expect(page).not.toContain("הכרטיס נשלח מיד לזום");
  });
  it("hides the dated live benefit after the event and keeps checkout and consent unchanged", () => {
    expect(page).toContain('Date.now() < Date.parse("2026-10-31T20:30:00+02:00")');
    expect(page).toContain('{liveBenefitAvailable && <section');
    expect(page).toContain("liveBenefitAvailable ? [[");
    expect(page).toContain('99 ₪ לחודש');
    expect(page).toContain('prefillCoupon={requestedCoupon}');
    expect(page).toContain('plusConsents={{ renewalAccepted, termsAccepted, boostAccepted }}');
    expect(page).toContain('product="plus"');
    expect(page).not.toMatch(/\b(sendEmail|sendSMS|sendWhatsApp|ensurePaidPlusLiveTicket)\(/);
  });
});
