import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const crmSource = readFileSync(resolve(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const emailSource = readFileSync(resolve(process.cwd(), "server/emailTemplates.ts"), "utf8");

describe("Boost and advanced-search CRM visibility", () => {
  it("labels Boost proposals clearly in email and both dashboard histories", () => {
    expect(emailSource).toContain("זו התאמה שהגיעה אליך דרך שירות Boost");
    expect(emailSource).toContain("לא נבחרה ונשלחה אישית על ידי הילית");
    expect(routerSource).toContain('proposalSource = String(m.autoExplanation || "").startsWith("[BOOST]")');
    expect(dashboardSource).toContain('match.proposalSource === "boost"');
    expect(dashboardSource).toContain("נשלחה ב־Boost");
    expect(crmSource).toContain('h.proposalSource === "boost"');
  });

  it("shows operational badges and excludes unavailable people from ranked results", () => {
    expect(routerSource).toContain("plusStatus: plusBySingle.get(single.id)?.status");
    expect(crmSource).toContain("unavailableForNewMatchIds.has(s.id)");
    expect(crmSource).toContain("💜 מלווה");
    expect(crmSource).toContain("⭐ דורש תשומת לב");
    expect(crmSource).toContain("✓ מאושר Boost");
    expect(crmSource).toContain("PLUS");
  });

  it("opens advanced-search photos in the existing lightbox", () => {
    expect(crmSource).toContain("onClick={() => setLightboxUrl(single.photoUrl!)}");
    expect(crmSource).toContain("cursor-zoom-in");
  });

  it("requires explicit criteria override confirmation for a blocked direct send", () => {
    expect(crmSource).toContain("אשר חריגה ושלח");
    expect(crmSource).toContain("allowCriteriaOverride: canOverrideCriteria");
    expect(crmSource).toContain("זו התראה בלבד. אפשר לאשר במפורש ולשלוח את ההתאמה בכל זאת.");
    expect(routerSource).toContain("allowCriteriaOverride: z.boolean().optional().default(false)");
    expect(routerSource).toContain("[CRITERIA_OVERRIDE]");
  });

  it("shows Plus approval and provides a prefilled WhatsApp profile-update action", () => {
    expect(routerSource).toContain("plusApproved: plusMembership?.status");
    expect(dashboardSource).toContain("✓ מאושר Plus");
    expect(crmSource).toContain("בקשת עדכון פרטים ב־WhatsApp");
    expect(crmSource).toContain("buildWhatsAppUrl(single.phone, message)");
    expect(crmSource).toContain('target="_blank"');
    expect(crmSource).toContain('rel="noopener noreferrer"');
  });
});
