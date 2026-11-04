import { describe, expect, it } from "vitest";
import { buildNovemberBundleAccessEmail } from "./novemberBundleAccessEmail";

describe("November bundle access email", () => {
  it("delivers the full text-and-workbook course in one bundle-specific email", () => {
    const courseUrl = "https://hilitcaspi.com/course/view?token=course-token";
    const guideUrl = "https://hilitcaspi.com/guide/view?token=guide-token";
    const email = buildNovemberBundleAccessEmail({
      firstName: "הילה",
      email: "buyer@example.com",
      courseUrl,
      guideUrl,
    });
    expect(email.subject).toContain("הקורס המלא");
    expect(email.htmlContent).toContain("5 מודולים כתובים ומעשיים");
    expect(email.htmlContent).toContain("לא קורס וידאו");
    expect(email.htmlContent).toContain(`href=\"${courseUrl}\"`);
    for (const content of [email.htmlContent, email.textContent]) {
      expect(content).not.toContain(guideUrl);
      expect(content).not.toContain("guide/view");
      expect(content).not.toContain("לבחור נכון");
      expect(content).not.toContain("מדריך");
    }
    expect(email.textContent).toContain("במייל נפרד");
    expect(email.textContent).toContain(courseUrl);
  });

  it("escapes the greeting and preserves onboarding and unsubscribe links", () => {
    const email = buildNovemberBundleAccessEmail({
      firstName: "<script>alert(1)</script>",
      email: "buyer+november@example.com",
      courseUrl: "https://hilitcaspi.com/course/view?token=course-token",
      guideUrl: "https://hilitcaspi.com/guide/view?token=guide-token",
    });
    expect(email.htmlContent).not.toContain("<script>alert(1)</script>");
    expect(email.htmlContent).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.htmlContent).toContain("המסע לזוגיות");
    expect(email.htmlContent).toContain("להשלמת ההצטרפות למאגר קיבלת במייל נפרד");
    expect(email.htmlContent).toContain("buyer%2Bnovember%40example.com");
  });
});
