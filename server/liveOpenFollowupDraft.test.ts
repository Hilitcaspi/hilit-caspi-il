import { describe, expect, it, vi } from "vitest";
import { buildAfterLiveOpenRegistrationDraft } from "./liveOpenFollowupDraft";

const unsubscribeUrl = "https://hilitcaspi.com/unsubscribe?token=synthetic-only";
describe("after live registration newsletter draft", () => {
  it("stays a draft without a scheduling side effect or unapproved deadline", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No external network permitted"));
    try {
      const mail = buildAfterLiveOpenRegistrationDraft({ unsubscribeUrl, proposalBusinessDays: null });
      expect(mail).toMatchObject({ readyToSchedule: false, approvalRequired: true });
      expect(mail.textContent).not.toMatch(/בתוך [23]|349|299|2\.11/);
      expect(mail.textContent).toContain("utm_campaign=live_open_registration");
      expect(mail.htmlContent).toContain("utm_medium=email");
      expect(mail.textContent).toContain(unsubscribeUrl);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { fetchMock.mockRestore(); }
  });
  it.each([2, 3] as const)("labels the %s-day variant with the correct start condition, but never schedules it", days => {
    const mail = buildAfterLiveOpenRegistrationDraft({ unsubscribeUrl, proposalBusinessDays: days });
    expect(mail.textContent).toContain(`בתוך ${days} ימי עסקים מאישור התשלום והשלמת הפרופיל`);
    expect(mail.textContent).toContain("לא לדייט");
    expect(mail.readyToSchedule).toBe(false);
  });
  it("escapes the first name in HTML", () => {
    const mail = buildAfterLiveOpenRegistrationDraft({ firstName: '<script>alert("x")</script>', unsubscribeUrl, proposalBusinessDays: null });
    expect(mail.htmlContent).not.toContain('<script>');
    expect(mail.htmlContent).toContain("&lt;script&gt;");
  });
  it.each(["https://evil.example/unsubscribe?token=x", "https://hilitcaspi.com/join?token=x", "https://hilitcaspi.com/unsubscribe"])("requires an expected first-party opt-out link: %s", link => {
    expect(() => buildAfterLiveOpenRegistrationDraft({ unsubscribeUrl: link, proposalBusinessDays: null })).toThrow();
  });
});
