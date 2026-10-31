import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const keys = ["ZOOM_LIVE_ACCOUNT_ID", "ZOOM_LIVE_CLIENT_ID", "ZOOM_LIVE_CLIENT_SECRET", "ZOOM_LIVE_MEETING_ID", "ZOOM_LIVE_ENCRYPTION_KEY"] as const;
const originals = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const email = "registrant@example.com";
const joinUrl = "https://example.zoom.us/j/123456789?pwd=example-only&tk=example-only";

beforeEach(() => {
  vi.resetModules();
  process.env.ZOOM_LIVE_ACCOUNT_ID = "test-account";
  process.env.ZOOM_LIVE_CLIENT_ID = "test-client";
  process.env.ZOOM_LIVE_CLIENT_SECRET = "test-secret";
  process.env.ZOOM_LIVE_MEETING_ID = "123456789";
  process.env.ZOOM_LIVE_ENCRYPTION_KEY = "ab".repeat(32);
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of keys) {
    if (originals[key] === undefined) delete process.env[key];
    else process.env[key] = originals[key];
  }
});

function responder(options: { approvedInitially?: boolean; detail: (attempt: number) => object; detailDenied?: boolean }) {
  let detailAttempts = 0;
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method || "GET", body: typeof init.body === "string" ? init.body : undefined });
    const json = (body: object, status = 200) => ({ ok: status < 400, status, json: async () => body });
    if (url.includes("/oauth/token")) return json({ access_token: "test-access", expires_in: 3600 });
    if (url.endsWith("/meetings/123456789")) return json({ settings: { approval_type: 1 } });
    if (url.endsWith("/registrants/status")) return json({}, 204);
    if (url.endsWith("/registrants") && init.method === "POST") return json({ id: 123456789, registrant_id: "exact-id" });
    if (url.endsWith("/registrants/exact-id")) {
      detailAttempts++;
      if (options.detailDenied) return json({}, 403);
      return json(options.detail(detailAttempts));
    }
    if (url.includes("/registrants?")) {
      return json({ registrants: options.approvedInitially && url.includes("status=approved") ? [{ id: "exact-id", email }] : [] });
    }
    throw new Error("Unexpected mocked URL");
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock, attempts: () => detailAttempts };
}

describe("Zoom exact approved registrant join retrieval", () => {
  it("gets a personal join URL from the exact approved registrant when the list omits it", async () => {
    const mock = responder({ approvedInitially: true, detail: () => ({ id: "exact-id", email, status: "approved", join_url: joinUrl }) });
    const { registerApprovedLiveAttendee } = await import("./liveZoomApi");
    expect(await registerApprovedLiveAttendee({ email, name: "Demo" })).toEqual({ registrantId: "exact-id", joinUrl });
    expect(mock.attempts()).toBe(1);
    expect(mock.calls.every(call => call.method === "GET" || call.url.includes("/oauth/token"))).toBe(true);
  });

  it("waits only with GETs after one successful registration and approval", async () => {
    const mock = responder({ detail: attempt => ({ id: "exact-id", email, status: attempt === 1 ? "pending" : "approved", join_url: joinUrl }) });
    const { registerApprovedLiveAttendee } = await import("./liveZoomApi");
    expect(await registerApprovedLiveAttendee({ email, name: "Demo" })).toEqual({ registrantId: "exact-id", joinUrl });
    expect(mock.attempts()).toBe(2);
    expect(mock.calls.filter(call => call.method === "POST" && !call.url.includes("/oauth/token"))).toHaveLength(1);
    expect(mock.calls.filter(call => call.method === "PUT")).toHaveLength(1);
    const approval = mock.calls.find(call => call.method === "PUT");
    expect(JSON.parse(approval!.body!).registrants[0].id).toBe("exact-id");
  });

  it("never uses a URL bound to a different recipient and stops after four exact reads", async () => {
    const mock = responder({ approvedInitially: true, detail: () => ({ id: "exact-id", email: "other@example.com", status: "approved", join_url: joinUrl }) });
    const { registerApprovedLiveAttendee } = await import("./liveZoomApi");
    await expect(registerApprovedLiveAttendee({ email, name: "Demo" })).rejects.toThrow("Approved Zoom join URL unavailable");
    expect(mock.attempts()).toBe(4);
    expect(mock.calls.filter(call => call.method === "PUT")).toHaveLength(0);
  });
});
