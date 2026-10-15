import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildPlusLiveRsvpReminder, PLUS_LIVE_RSVP_REMINDER } from "./plusLiveRsvpReminder";
const input = {
  firstName: "דוגמה",
  voucherCode: "HC31-000000000001",
  rsvpUrl: "https://hilitcaspi.com/live/question#q=synthetic-preview-only&rsvp=1",
  unsubscribeUrl: "https://hilitcaspi.com/unsubscribe?preview=1",
};
describe("Plus live RSVP reminder draft", () => {
  it("has a gift subject, correct Saturday proposal and actual later live date", () => {
    const result = buildPlusLiveRsvpReminder(input);
    expect(result.subject).toBe("🎁 מחכה לך מתנה ממני. הכרטיס שלך כבר בפנים");
    expect(new Date(PLUS_LIVE_RSVP_REMINDER.proposedSendAt).toISOString()).toBe("2026-10-17T17:30:00.000Z");
    expect(result.textContent).toContain("שבת 31.10.2026 בשעה 20:30");
    expect(result.htmlContent).toContain("לפתיחת הכרטיס ולאישור הגעה");
    expect(result.textContent).toContain(input.voucherCode);
  });
  it("keeps explicit on-page RSVP, question capability and neutral wording", () => {
    const draft = buildPlusLiveRsvpReminder(input);
    expect(draft.textContent).toContain("לאשר הגעה בעמוד");
    expect(draft.textContent).toContain("לשלוח שאלה מראש");
    expect(draft.textContent).toContain("יישלח בנפרד לקראת האירוע");
    expect(draft.textContent).toContain("ללא תשלום נוסף");
    expect(draft.textContent).not.toMatch(/מקומות אחרונים|הכניסה מאושרת|אתם|שלכם|[—–]/);
    expect(draft.htmlContent).toContain("הסרה מרשימת הדיוור");
    expect(draft.htmlContent).not.toContain("/api/email/open");
    const target = new URL(draft.textContent.match(/https:\/\/hilitcaspi.com\/live\/question[^\s]+/)![0]);
    expect(target.hash).toBe(new URL(input.rsvpUrl).hash);
    expect(target.searchParams.get("utm_campaign")).toBe(PLUS_LIVE_RSVP_REMINDER.campaign);
  });
  it("escapes personal data", () => {
    const result = buildPlusLiveRsvpReminder({ ...input, firstName: '<img>' });
    expect(result.htmlContent).toContain("&lt;img&gt;");
  });
  it.each([
    "https://external.invalid/live/question#q=demo&rsvp=1",
    "http://hilitcaspi.com/live/question#q=demo&rsvp=1",
    "https://hilitcaspi.com/live/question#q=demo",
    "https://hilitcaspi.com/live/question#rsvp=1",
    "https://hilitcaspi.com/my-profile#q=demo&rsvp=1",
    "https://user:pass@hilitcaspi.com/live/question#q=demo&rsvp=1",
  ])("rejects unsafe or non-RSVP link %s", rsvpUrl => {
    expect(() => buildPlusLiveRsvpReminder({ ...input, rsvpUrl })).toThrow();
  });
  it("rejects missing vouchers and unsafe unsubscribe", () => {
    expect(() => buildPlusLiveRsvpReminder({ ...input, voucherCode: "TEST-1" })).toThrow();
    expect(() => buildPlusLiveRsvpReminder({ ...input, unsubscribeUrl: "https://external.invalid/u" })).toThrow();
  });
  it("has no execution or scheduling side effects", () => {
    const source = readFileSync(new URL("./plusLiveRsvpReminder.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/sendEmail|sendSMS|ensure.*Ticket|getDb\(|fetch\(|\.insert\(|\.update\(|setInterval|heartbeat/i);
  });
});
