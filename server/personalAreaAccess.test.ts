import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildContactRevealEmail } from "./emailTemplates";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const routersSource = read("server/routers.ts");
const dashboardSource = read("client/src/pages/UserDashboard.tsx");
const homeSource = read("client/src/pages/Home.tsx");
const dashboardLinkProcedure = routersSource.slice(
  routersSource.indexOf("sendDashboardLink: publicProcedure"),
  routersSource.indexOf("/**", routersSource.indexOf("sendDashboardLink: publicProcedure") + 40),
);

describe("personal area passwordless access", () => {
  it("does not reveal whether an email belongs to a member and throttles repeat sends", () => {
    expect(dashboardLinkProcedure).toContain("const genericResult = { success: true }");
    expect(dashboardLinkProcedure).toContain("if (!profile?.isActive || !profile.isPaid) return genericResult");
    expect(dashboardLinkProcedure).toContain("PERSONAL_AREA_LINK_COOLDOWN_MS");
    expect(dashboardLinkProcedure).toContain('page: "/my-profile/login-link"');
    expect(dashboardLinkProcedure).not.toContain("notFound");
    expect(dashboardLinkProcedure).not.toContain("${input.origin}");
    expect(dashboardLinkProcedure).toContain("https://hilitcaspi.com/my-profile?email=");
  });

  it("generates a token when needed and sends only to the profile email", () => {
    expect(dashboardLinkProcedure).toContain('crypto.randomBytes(32).toString("hex")');
    expect(dashboardLinkProcedure).toContain("questionnaireToken: dashboardToken");
    expect(dashboardLinkProcedure).toContain("to: { email: profile.email || normalizedEmail");
    expect(dashboardLinkProcedure).toContain("הקישור אישי. לשמירה על הפרטיות אין להעביר אותו לאחרים");
    expect(dashboardLinkProcedure).not.toContain("הקישור תקף ל-48 שעות");
  });

  it("shows a generic login confirmation and exposes clear site entry points", () => {
    expect(dashboardSource).toContain("נכנסים בלי סיסמה");
    expect(dashboardSource).toContain("אם הכתובת");
    expect(dashboardSource).toContain("משויכת לחברות פעילה במאגר");
    expect(dashboardSource).toContain("sendLink.mutate({ email })");
    expect(dashboardSource).not.toContain("לא מצאנו חשבון עם כתובת המייל הזו");
    expect(homeSource.match(/href="\/my-profile"/g)?.length || 0).toBeGreaterThanOrEqual(3);
  });
});

describe("contact reveal personal-area link", () => {
  const dashboardUrl = "https://hilitcaspi.com/my-profile?email=member%40example.com&token=member-token&tab=matches";
  const baseParams = {
    firstName: "נועם",
    gender: "other" as const,
    matchFirstName: "טל",
    matchLastName: "כהן",
    matchPhone: "0500000000",
    matchEmail: "match@example.com",
    matchAge: 35,
    matchCity: "מרכז",
    compatibilityScore: 76,
    preDateTip: "להגיע בסקרנות ובפתיחות.",
    recipientEmail: "member@example.com",
    singleId: 10,
    dashboardUrl,
  };

  it("labels an approved Boost and includes the recipient's dashboard link in HTML and text", () => {
    const email = buildContactRevealEmail({ ...baseParams, proposalSource: "boost" });
    expect(email.subject).toContain("התאמת ה־Boost אושרה");
    expect(email.htmlBody).toContain(`href="${dashboardUrl}"`);
    expect(email.htmlBody).toContain("כניסה לאזור האישי");
    expect(email.textBody).toContain(dashboardUrl);
    expect(email.htmlBody).not.toContain("https://hilitcaspi.com/my\"");
  });

  it("binds each reveal email to the matching recipient's own email and token", () => {
    expect(routersSource).toContain("const dashboardUrlA = singleA.questionnaireToken");
    expect(routersSource).toContain("encodeURIComponent(singleA.questionnaireToken)");
    expect(routersSource).toContain("const dashboardUrlB = singleB.questionnaireToken");
    expect(routersSource).toContain("encodeURIComponent(singleB.questionnaireToken)");
    expect(routersSource).toContain("dashboardUrl: dashboardUrlA");
    expect(routersSource).toContain("dashboardUrl: dashboardUrlB");
    expect(routersSource).toContain('proposalSource: isBoost ? "boost" : "regular"');
  });
});
