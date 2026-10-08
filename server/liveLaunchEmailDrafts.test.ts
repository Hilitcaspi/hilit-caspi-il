import { describe, expect, it } from "vitest";
import { buildLiveLaunchEmailDraft } from "./liveLaunchEmailDrafts";
import { LIVE_LAUNCH_SMS } from "../shared/liveLaunchSms";
const unsubscribeUrl = "https://hilitcaspi.com/u";
const rsvpUrl = "https://hilitcaspi.com/live/question?utm_source=newsletter&utm_medium=email&utm_campaign=live_oct2026&utm_content=plus_rsvp#q=TEST_PREVIEW_ONLY&rsvp=1";

describe("live launch drafts (no delivery)", () => {
  it("sells database plus gift, not standalone, to the cold audience", () => {
    const draft = buildLiveLaunchEmailDraft({ audience: "cold", unsubscribeUrl });
    expect(draft.htmlContent).toContain("299 ₪");
    expect(draft.htmlContent).toContain("כרטיס אחד במתנה");
    expect(draft.htmlContent).toContain("launch_cold_database");
    expect(draft.htmlContent).toContain("קוד LIVE נוסף אוטומטית");
    expect(draft.htmlContent).not.toMatch(/התאמה ראשונה.*3 ימים|ללא אפשרות להעברה/);
  });
  it("requires member verification for FRIENDS", () => {
    const draft = buildLiveLaunchEmailDraft({ audience: "database", unsubscribeUrl });
    expect(draft.htmlContent).toContain("49 ₪");
    expect(draft.htmlContent).toContain("FRIENDS");
    expect(draft.htmlContent).toContain("אימות באמצעות הקישור האישי");
  });
  it("Plus gets only a direct personalized RSVP, never a paid or Zoom CTA", () => {
    const draft = buildLiveLaunchEmailDraft({ audience: "plus", rsvpUrl, unsubscribeUrl });
    expect(draft.htmlContent).toContain("ללא עלות נוספת");
    expect(draft.htmlContent).toContain("utm_content=plus_rsvp");
    expect(draft.htmlContent).not.toContain("zoom.us");
    expect(draft.htmlContent).not.toContain("FRIENDS");
    expect(draft.htmlContent).toContain("אישור הגעה נעשה רק בלחיצה מפורשת");
  });
  it.each([undefined, "https://evil.example/live/question#q=anything", "https://hilitcaspi.com/live", "https://hilitcaspi.com/live/question"])("rejects unsafe or absent Plus RSVP URL %s", rsvpUrl => {
    expect(() => buildLiveLaunchEmailDraft({ audience: "plus", rsvpUrl, unsubscribeUrl })).toThrow();
  });
  it("escapes recipient markup", () => {
    const d = buildLiveLaunchEmailDraft({ audience: "cold", firstName: "<script>attack</script>", unsubscribeUrl });
    expect(d.htmlContent).not.toContain("<script>");
    expect(d.htmlContent).toContain("&lt;script&gt;");
  });
  it.each(Object.entries(LIVE_LAUNCH_SMS))("keeps %s SMS within one 70-unit Unicode segment with opt-out", (_name, message) => {
    expect(message.length).toBeLessThanOrEqual(70);
    expect(message).toContain("💛");
    expect(message).toContain("הסר hilitcaspi.com/u");
  });
});
