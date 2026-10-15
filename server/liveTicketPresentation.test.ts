import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { liveAttendancePresentation, liveZoomPresentation } from "../shared/liveTicketPresentation";

describe("live ticket status presentation", () => {
  it("distinguishes an explicit Plus RSVP from a free ticket without RSVP", () => {
    expect(liveAttendancePresentation({ source: "plus", attendanceConfirmedAt: 123 }).label).toBe("אישר הגעה");
    expect(liveAttendancePresentation({ source: "plus", attendanceConfirmedAt: null }).label).toBe("טרם אישר הגעה");
    expect(liveAttendancePresentation({ source: "plus" }).tone).not.toBe("attention");
  });
  it.each(["database_live", "friends", "standalone"])("does not fabricate RSVP for %s purchases", source => {
    const status = liveAttendancePresentation({ source });
    expect(status.label).toBe("לא נדרש אישור נוסף");
    expect(status.detail).toContain("לא נרשם אישור הגעה נפרד");
    expect(status.tone).not.toBe("success");
  });
  it("shows an actual recorded RSVP even if a different ticket source is present", () => {
    expect(liveAttendancePresentation({ source: "database_live", attendanceConfirmedAt: 123 }).label).toBe("אישר הגעה");
  });
  it("does not confuse pending Zoom with missing customer registration", () => {
    const status = liveZoomPresentation({ source: "plus", zoomDeliveryState: "pending" }, false);
    expect(status.label).toBe("טרם נרשם ב־Zoom");
    expect(status.detail).toContain("כבויה כרגע");
    expect(status.detail).toContain("אין פעולה נדרשת מהמשתתף");
    expect(status.tone).toBe("neutral");
  });
  it("enabled delivery does not imply that the ticket has been registered or sent", () => {
    const status = liveZoomPresentation({ source: "plus", zoomDeliveryState: "pending" }, true);
    expect(status.label).toBe("טרם נרשם ב־Zoom");
    expect(status.detail).not.toContain("כבויה");
    expect(status.tone).not.toBe("success");
  });
  it("shows existing registration separately from a sent email, even with delivery disabled", () => {
    expect(liveZoomPresentation({ source: "plus", zoomDeliveryState: "registered" }, false).label).toBe("רשום ב־Zoom · הקישור טרם נשלח");
    expect(liveZoomPresentation({ source: "plus", zoomDeliveryState: "sent" }, false).label).toBe("קישור הכניסה נשלח במייל");
    expect(liveZoomPresentation({ source: "plus", zoomDeliveryState: "sent" }, false).detail).toContain("אין בכך הוכחת קריאה");
  });
  it("shows review-needed without exposing provider errors or implying an automatic retry", () => {
    const status = liveZoomPresentation({ source: "plus", zoomDeliveryState: "registered", zoomLastError: "private-provider-error" }, true);
    expect(status.label).toBe("דורש בדיקת צוות");
    expect(status.tone).toBe("attention");
    expect(JSON.stringify(status)).not.toContain("private-provider-error");
  });
  it("keeps adminOverview read-only and returns only the safe delivery flag", () => {
    const router = readFileSync(new URL("./liveOctoberRouter.ts", import.meta.url), "utf8");
    const block = router.slice(router.indexOf("adminOverview:"), router.indexOf("adminFirstMatchQueue:"));
    expect(block).toContain("zoomDelivery: { enabled: isZoomLiveDeliveryEnabled() }");
    expect(block).not.toMatch(/processLiveZoomTickets|registerApprovedLiveAttendee|zoomLiveConfig\(|\.insert\(|\.update\(|sendEmail/);
    const ui = readFileSync(new URL("../client/src/components/LiveOctoberAdminSection.tsx", import.meta.url), "utf8");
    expect(ui).toContain("בעלי כרטיסים");
    expect(ui).not.toContain('"לא אושר"');
    expect(ui).not.toContain('"לא רלוונטי"');
  });
});
