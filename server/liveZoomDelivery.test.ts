import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLiveZoomTicketEmail } from "./liveZoomTicketEmail";
import { liveEmailIdempotencyKey, processLiveZoomTickets, ticketJoinUrl } from "./liveZoomDelivery";
import { decryptZoomJoinUrl, encryptZoomJoinUrl, isZoomLiveDeliveryEnabled, registerApprovedLiveAttendee } from "./liveZoomApi";

const keys = ["ZOOM_LIVE_ACCOUNT_ID", "ZOOM_LIVE_CLIENT_ID", "ZOOM_LIVE_CLIENT_SECRET", "ZOOM_LIVE_MEETING_ID", "ZOOM_LIVE_ENCRYPTION_KEY", "LIVE_ZOOM_DELIVERY_ENABLED"] as const;
const originals = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const fakeUrl = "https://example.zoom.us/w/123456789?tk=test-only-personal";

beforeEach(() => {
  process.env.ZOOM_LIVE_ACCOUNT_ID = "test-account";
  process.env.ZOOM_LIVE_CLIENT_ID = "test-client";
  process.env.ZOOM_LIVE_CLIENT_SECRET = "test-secret";
  process.env.ZOOM_LIVE_MEETING_ID = "123456789";
  process.env.ZOOM_LIVE_ENCRYPTION_KEY = "ab".repeat(32);
  delete process.env.LIVE_ZOOM_DELIVERY_ENABLED;
});
afterEach(() => {
  for (const key of keys) {
    if (originals[key] === undefined) delete process.env[key];
    else process.env[key] = originals[key];
  }
  vi.unstubAllGlobals();
});

describe("October Zoom ticket delivery", () => {
  it("never registers or sends without an explicit enabled switch, even with credentials present", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(isZoomLiveDeliveryEnabled()).toBe(false);
    expect(await processLiveZoomTickets()).toMatchObject({ processed: 0, sent: 0, skipped: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses a deterministic UUID for Brevo batch idempotency", () => {
    expect(liveEmailIdempotencyKey(17)).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    expect(liveEmailIdempotencyKey(17)).toBe(liveEmailIdempotencyKey(17));
    expect(liveEmailIdempotencyKey(18)).not.toBe(liveEmailIdempotencyKey(17));
  });

  it("encrypts the unique join URL and releases it only for a delivered, non-test ticket", () => {
    const encrypted = encryptZoomJoinUrl(fakeUrl, process.env.ZOOM_LIVE_ENCRYPTION_KEY!);
    expect(encrypted).not.toContain("zoom.us");
    expect(decryptZoomJoinUrl(encrypted, process.env.ZOOM_LIVE_ENCRYPTION_KEY!)).toBe(fakeUrl);
    const [iv, tag, ciphertext] = encrypted.split(".");
    const tampered = `${iv}.${tag}.${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;
    expect(() => decryptZoomJoinUrl(tampered, process.env.ZOOM_LIVE_ENCRYPTION_KEY!)).toThrow();
    const ticket = { voucherCode: "HC31-TEST", revokedAt: null, zoomDeliveryState: "sent", zoomJoinUrlEncrypted: encrypted };
    expect(ticketJoinUrl(ticket)).toBe(fakeUrl);
    expect(ticketJoinUrl({ ...ticket, zoomDeliveryState: "registered" })).toBeNull();
    expect(ticketJoinUrl({ ...ticket, voucherCode: "TEST-HC31" })).toBeNull();
    expect(ticketJoinUrl({ ...ticket, revokedAt: Date.now() })).toBeNull();
    expect(() => encryptZoomJoinUrl("https://another.example/join", process.env.ZOOM_LIVE_ENCRYPTION_KEY!)).toThrow();
  });

  it("refuses automatic approval instead of opening an unpaid registration path", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "test-token", expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: { approval_type: 0 } }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(registerApprovedLiveAttendee({ email: "person@example.com", name: "דוגמה" })).rejects.toThrow("manual approval");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers an existing approved registrant instead of creating a duplicate", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: { approval_type: 1 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ registrants: [{ id: "existing", email: "person@example.com", join_url: fakeUrl }] }) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await registerApprovedLiveAttendee({ email: "PERSON@example.com", name: "שם" });
    expect(result).toEqual({ registrantId: "existing", joinUrl: fakeUrl });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(call => call[1]?.method !== "POST")).toBe(true);
  });

  it("adds and approves a pending registrant, then fetches the personal URL", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: { approval_type: 1 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ registrants: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ registrants: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "pending-reg" }) })
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ registrants: [{ id: "pending-reg", email: "person@example.com", join_url: fakeUrl }] }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await registerApprovedLiveAttendee({ email: "person@example.com", name: "שם שני" })).toEqual({ registrantId: "pending-reg", joinUrl: fakeUrl });
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === "PUT")).toHaveLength(1);
  });

  it("produces a Hebrew branded ticket, escaping names and using no common meeting passcode", () => {
    const questionToken = `17.${"a".repeat(43)}`;
    const email = buildLiveZoomTicketEmail({ name: '<img src=x onerror=alert(1)>', joinUrl: fakeUrl, source: "database_live", questionToken, registrationEmail: "attendee@example.com" });
    expect(email.subject).toContain("כרטיס המתנה");
    expect(email.htmlContent).toContain("31.10.2026");
    expect(email.htmlContent).toContain("Rubik");
    expect(email.htmlContent).toContain("&lt;img");
    expect(email.htmlContent).not.toContain("<img src=x onerror");
    expect(email.htmlContent).toContain(fakeUrl.replace(/&/g, "&amp;"));
    expect(email.textContent).toContain(fakeUrl);
    expect(email.textContent).not.toContain("קוד כניסה");
    expect(email.htmlContent).toContain(`/live/question#q=${questionToken}`);
    expect(email.textContent).toContain(`/live/question#q=${questionToken}`);
    expect(email.htmlContent).not.toContain("/my-profile");
    expect(email.htmlContent).toContain("attendee@example.com");
    expect(email.htmlContent).toContain("אין להעביר");
    expect(email.htmlContent).toContain("שליחת שאלה להילית");
    expect(email.htmlContent).toContain("בלי להזין שוב מייל");
    expect(email.textContent).not.toMatch(/הכניסה.*רק.*מייל|מחייב.*חשבון Zoom/);
    const standalone = buildLiveZoomTicketEmail({ name: "דוגמה", joinUrl: fakeUrl, source: "standalone", questionToken });
    expect(standalone.htmlContent).toContain(`/live/question#q=${questionToken}`);
    expect(standalone.subject).not.toContain("מתנה");
  });
});
