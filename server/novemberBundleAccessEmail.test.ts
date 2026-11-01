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
    expect(email.htmlContent).toContain(`href=\"${guideUrl}\"`);
    expect(email.textContent).toContain("במייל נפרד");
    expect(email.textContent).toContain(courseUrl);
  });

  it("escapes the greeting and keeps the guide as included course access", () => {
    const email = buildNovemberBundleAccessEmail({
      firstName: "<script>alert(1)</script>",
      email: "buyer+november@example.com",
      courseUrl: "https://hilitcaspi.com/course/view?token=course-token",
      guideUrl: "https://hilitcaspi.com/guide/view?token=guide-token",
    });
    expect(email.htmlContent).not.toContain("<script>alert(1)</script>");
    expect(email.htmlContent).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.htmlContent).toContain("כחלק מהקורס המלא");
    expect(email.htmlContent).toContain("buyer%2Bnovember%40example.com");
  });
});
