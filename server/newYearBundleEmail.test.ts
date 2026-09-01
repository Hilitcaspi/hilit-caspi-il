import { describe, expect, it } from "vitest";
import { buildNewYearBundleAccessEmail } from "./newYearBundleEmail";

describe("New Year bundle access email", () => {
  it("delivers the course and guide with two distinct buttons", () => {
    const courseUrl = "https://hilitcaspi.com/course/view?token=course-token";
    const guideUrl = "https://hilitcaspi.com/guide/view?token=guide-token";
    const email = buildNewYearBundleAccessEmail({
      firstName: "הילה",
      email: "buyer@example.com",
      courseUrl,
      guideUrl,
    });

    expect(email.subject).toBe("חבילת החג שלך מוכנה | הקורס והמדריך בפנים");
    expect(email.htmlContent).toContain("חבילת החג שלך מוכנה");
    expect(email.htmlContent).toContain("המסע לזוגיות");
    expect(email.htmlContent).toContain("לבחור נכון");
    expect(email.htmlContent).toContain(`href="${courseUrl}"`);
    expect(email.htmlContent).toContain(`href="${guideUrl}"`);
    expect(email.htmlContent).toContain(">כניסה לקורס</a>");
    expect(email.htmlContent).toContain(">פתיחת המדריך</a>");
    expect(email.textContent).toContain(courseUrl);
    expect(email.textContent).toContain(guideUrl);
  });

  it("states that database access arrives separately and escapes the greeting", () => {
    const email = buildNewYearBundleAccessEmail({
      firstName: "<script>alert(1)</script>",
      email: "buyer+bundle@example.com",
      courseUrl: "https://hilitcaspi.com/course/view?token=course-token",
      guideUrl: "https://hilitcaspi.com/guide/view?token=guide-token",
    });

    expect(email.htmlContent).toContain("את הקישור האישי לכניסה למאגר קיבלת במייל נפרד");
    expect(email.htmlContent).not.toContain("<script>alert(1)</script>");
    expect(email.htmlContent).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.htmlContent).toContain("buyer%2Bbundle%40example.com");
  });
});
