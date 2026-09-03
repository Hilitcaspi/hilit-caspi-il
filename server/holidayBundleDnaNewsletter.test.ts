import { describe, expect, it } from "vitest";
import {
  HOLIDAY_BUNDLE_DNA_PREHEADER,
  HOLIDAY_BUNDLE_DNA_SUBJECT,
  buildHolidayBundleDnaNewsletter,
} from "./holidayBundleDnaNewsletter";

describe("holiday bundle DNA newsletter", () => {
  it("uses the DNA continuation message and one dedicated coupon", () => {
    const email = buildHolidayBundleDnaNewsletter({
      firstName: "נועה",
      offerUrl: "https://hilitcaspi.com/new-year-love?coupon=HOLIDAY10",
      unsubscribeUrl: "https://hilitcaspi.com/unsubscribe?token=signed",
    });
    expect(HOLIDAY_BUNDLE_DNA_SUBJECT).toContain("שאלון ה־DNA");
    expect(HOLIDAY_BUNDLE_DNA_PREHEADER).toContain("HOLIDAY10");
    expect(email.htmlContent).toContain("היי נועה");
    expect(email.htmlContent).toContain("359 ₪ עם הקוד HOLIDAY10");
    expect(email.htmlContent).toContain("399 ₪");
    expect(email.htmlContent).toContain("יום ראשון, 6.9 בשעה 23:59");
    expect(email.htmlContent).toContain("unsubscribe?token=signed");
    expect(email.textContent).toContain("10% הנחה");
  });

  it("escapes names and rejects unsafe links", () => {
    const email = buildHolidayBundleDnaNewsletter({
      firstName: "<script>alert(1)</script>",
      offerUrl: "javascript:alert(1)",
      unsubscribeUrl: "javascript:alert(1)",
    });
    expect(email.htmlContent).not.toContain("<script>alert(1)</script>");
    expect(email.htmlContent).not.toContain('href="javascript:');
    expect(email.htmlContent).toContain("https://hilitcaspi.com/new-year-love");
  });
});
