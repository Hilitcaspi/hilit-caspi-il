import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BOOST_NEWSLETTER_PREHEADER,
  BOOST_NEWSLETTER_SUBJECT,
  buildBoostEnrollmentNewsletter,
} from "./boostNewsletter";

const previewRouteSource = readFileSync(
  new URL("./_core/index.ts", import.meta.url),
  "utf8",
);

describe("Boost enrollment newsletter", () => {
  it("uses a strong member-only subject and human preheader without price or raw URL", () => {
    expect(BOOST_NEWSLETTER_SUBJECT).toBe(
      "ביקשתם יותר התאמות. עכשיו הבחירה גם בידיים שלכם 💛",
    );
    expect(BOOST_NEWSLETTER_PREHEADER).toBe(
      "Boost נפתח לחברי המאגר: אישור קצר וללא תשלום פותח אפשרויות נוספות באזור האישי",
    );
    expect(`${BOOST_NEWSLETTER_SUBJECT} ${BOOST_NEWSLETTER_PREHEADER}`).not.toMatch(
      /https?:\/\/|19\.90|19\.99/,
    );
  });

  it("explains eligibility, free enrollment, dual approval and contact privacy", () => {
    const email = buildBoostEnrollmentNewsletter({
      firstName: "נועה",
      enrollmentUrl: "https://hilitcaspi.com/match-boost?utm_source=brevo&utm_medium=email",
      unsubscribeUrl: "https://hilitcaspi.com/unsubscribe?email=member%40example.com",
    });

    expect(email.htmlContent).toContain("חדש לחברי המאגר");
    expect(email.htmlContent).toContain("רשומים ופעילים במאגר");
    expect(email.htmlContent).toContain("אישור השירות עצמו אינו כרוך בתשלום");
    expect(email.htmlContent).toContain("שני הצדדים מחליטים בעצמם");
    expect(email.htmlContent).toContain("פרטי קשר נחשפים רק לאחר ששני הצדדים אישרו");
    expect(email.htmlContent).toContain("אינן נבדקות אישית על ידי הילית");
    expect(email.textContent).toContain("להסרה מרשימת התפוצה");
  });

  it("uses the public enrollment page with UTM tracking and a visible unsubscribe link", () => {
    const email = buildBoostEnrollmentNewsletter({
      enrollmentUrl:
        "https://hilitcaspi.com/match-boost?utm_source=brevo&utm_medium=email&utm_campaign=boost_launch&utm_content=primary_cta",
      unsubscribeUrl: "https://hilitcaspi.com/unsubscribe",
    });

    expect(email.htmlContent).toContain("https://hilitcaspi.com/match-boost?utm_source=brevo");
    expect(email.htmlContent).toContain("utm_medium=email");
    expect(email.htmlContent).toContain("utm_campaign=boost_launch");
    expect(email.htmlContent).toContain("הסרה מרשימת התפוצה");
    expect(email.htmlContent).not.toContain("questionnaireToken");
    expect(email.htmlContent).not.toContain("token=");
  });

  it("escapes recipient copy and rejects unsafe link schemes", () => {
    const email = buildBoostEnrollmentNewsletter({
      firstName: "<script>alert(1)</script>",
      enrollmentUrl: "javascript:alert(1)",
      unsubscribeUrl: "data:text/html,bad",
    });

    expect(email.htmlContent).not.toContain("<script>alert(1)</script>");
    expect(email.htmlContent).not.toContain("javascript:");
    expect(email.htmlContent).not.toContain("data:text/html");
    expect(email.htmlContent).toContain("https://hilitcaspi.com/match-boost");
    expect(email.htmlContent).toContain("https://hilitcaspi.com/unsubscribe");
  });

  it("exposes a noindex, no-store preview route without a send action", () => {
    expect(previewRouteSource).toContain('app.get("/api/preview/boost-newsletter"');
    expect(previewRouteSource).toContain('res.setHeader("Cache-Control", "no-store")');
    expect(previewRouteSource).toContain('res.setHeader("X-Robots-Tag", "noindex, nofollow")');

    const routeBlock = previewRouteSource.slice(
      previewRouteSource.indexOf('app.get("/api/preview/boost-newsletter"'),
      previewRouteSource.indexOf("// ─── WhatsApp Group Redirect"),
    );
    expect(routeBlock).not.toContain("sendEmail(");
  });
});
