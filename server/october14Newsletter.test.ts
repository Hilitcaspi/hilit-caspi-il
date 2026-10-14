import { describe, expect, it } from "vitest";
import { buildOctober14Newsletter, october14OfferUrl, OCT14_CAMPAIGN } from "./october14Newsletter";
const input = { unsubscribeUrl: "https://hilitcaspi.com/unsubscribe?preview=1" };
describe("October14 content only newsletter", () => {
  it("preserves UTM and correct offer code for every channel", () => {
    for (const audience of ["database_warm", "plus_members"] as const) {
      for (const channel of ["email", "sms", "whatsapp"] as const) {
        const u = new URL(october14OfferUrl(audience, channel));
        expect(u.origin).toBe("https://hilitcaspi.com");
        expect(u.searchParams.get("utm_campaign")).toBe(OCT14_CAMPAIGN);
        expect(u.searchParams.get("coupon")).toBe(audience === "database_warm" ? "LIVE" : "PLUS");
        expect(u.searchParams.get("utm_content")).toBe(`${audience}_primary`);
        expect(u.searchParams.get("utm_medium")).toBe(channel === "whatsapp" ? "organic_social" : channel);
      }
    }
  });
  it("has complete profile condition and one post live promise, never NOW or simultaneous 3 day promise", () => {
    const d = buildOctober14Newsletter({ ...input, audience: "database_warm" });
    expect(d.htmlContent).toContain("שני ימי עסקים");
    expect(d.htmlContent).toContain("יום שני 2.11");
    expect(d.htmlContent).toContain("להשלים את הפרופיל, התמונה והשאלון עד הלייב");
    expect(d.htmlContent).toContain("השתתפות בפועל בלייב אינה תנאי");
    expect(d.htmlContent).not.toMatch(/בתוך 3 ימים|קוד NOW|קישור.*זום.*מייד/);
    expect(d.htmlContent).toContain("תשלום חד־פעמי");
  });
  it("states first cycle only and 99 recurring price for new Wednesday Plus", () => {
    const d = buildOctober14Newsletter({ ...input, audience: "plus_members" });
    expect(d.htmlContent).toContain("PLUS");
    expect(d.htmlContent).not.toContain("17.10");
    expect(d.htmlContent).not.toContain("23:59");
    expect(d.preheader).not.toContain("23:59");
    expect(d.textContent).not.toContain("17.10");
    expect(d.htmlContent).toContain("יש לי הזמנה אישית בשבילך");
    expect(d.htmlContent).toContain("לחברי מאגר פעילים");
    expect(d.htmlContent).toContain("בדיקה אישית שלי");
    expect(d.htmlContent).toContain("הטבות ששמורות רק לחברי Plus");
    expect(d.htmlContent).not.toContain("PLUS3");
    expect(d.htmlContent).not.toContain("היום בלבד");
    expect(d.htmlContent).toContain("שלוש הצעות התאמה");
    expect(d.htmlContent).toContain("מהמחזור הבא: שתי הצעות");
    expect(d.htmlContent).toContain("אין שינוי במנויים קיימים");
    expect(d.htmlContent).toContain("בחיוב מתחדש עד לביטול");
    expect(d.htmlContent).toContain("בוסט חינמי אינו נספר");
  });
  it("escapes personal greeting and rejects foreign or untagged destinations", () => {
    expect(buildOctober14Newsletter({ ...input, audience: "database_warm", firstName: "<script>" }).htmlContent).not.toContain("<script>");
    expect(() => buildOctober14Newsletter({ ...input, audience: "database_warm", offerUrl: "https://external.example/live/database" })).toThrow();
    expect(() => buildOctober14Newsletter({ audience: "plus_members", unsubscribeUrl: "javascript:alert(1)" })).toThrow();
  });
  it("contains plain text and a genuine unsubscribe link", () => {
    for (const audience of ["database_warm", "plus_members"] as const) {
      const d = buildOctober14Newsletter({ ...input, audience });
      expect(d.htmlContent.endsWith("</html>")).toBe(true);
      expect(d.textContent).toContain(d.offerUrl);
      expect(d.htmlContent).toContain("הסרה מרשימת הדיוור");
      expect(d.textContent).not.toMatch(/אני מאשר\/ת|מבטיחים שלושה דייטים/);
    }
  });
});
