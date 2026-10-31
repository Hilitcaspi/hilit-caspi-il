import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const keys = ["ZOOM_LIVE_ACCOUNT_ID", "ZOOM_LIVE_CLIENT_ID", "ZOOM_LIVE_CLIENT_SECRET", "ZOOM_LIVE_MEETING_ID", "ZOOM_LIVE_ENCRYPTION_KEY"] as const;
const originals = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const configuredMeetingId = "12345678901";

beforeEach(() => {
  vi.resetModules();
  process.env.ZOOM_LIVE_ACCOUNT_ID = "test-account";
  process.env.ZOOM_LIVE_CLIENT_ID = "test-client";
  process.env.ZOOM_LIVE_CLIENT_SECRET = "test-secret";
  process.env.ZOOM_LIVE_MEETING_ID = configuredMeetingId;
  process.env.ZOOM_LIVE_ENCRYPTION_KEY = "ab".repeat(32);
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of keys) {
    if (originals[key] === undefined) delete process.env[key];
    else process.env[key] = originals[key];
  }
});

function mockMeeting(meeting: object) {
  const calls: Array<{ url: string; method: string }> = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method || "GET" });
    const json = (body: object, status = 200) => ({ ok: status < 400, status, json: async () => body });
    if (url.includes("/oauth/token")) return json({ access_token: "test-access", expires_in: 3600 });
    if (url.endsWith(`/meetings/${configuredMeetingId}`)) return json(meeting);
    throw new Error("Unexpected mocked URL");
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

function registrationDisabledMeeting(overrides: object = {}) {
  return {
    start_time: "2026-10-31T18:30:00Z",
    join_url: `https://example.zoom.us/j/${configuredMeetingId}`,
    settings: { approval_type: 2, waiting_room: true },
    ...overrides,
  };
}

describe("Zoom registration-disabled meeting delivery", () => {
  it("returns Zoom's configured participant URL without registrant API calls", async () => {
    const joinUrl = "https://example.zoom.us/j/98765432109?omn=12345678901";
    const mock = mockMeeting(registrationDisabledMeeting({ join_url: joinUrl }));
    const { registerApprovedLiveAttendee } = await import("./liveZoomApi");

    await expect(registerApprovedLiveAttendee({ email: "member@example.com", name: "Example Member" })).resolves.toEqual({
      registrantId: null,
      joinUrl,
      mode: "meeting",
    });
    expect(mock.calls.filter(call => !call.url.includes("/oauth/token"))).toEqual([
      { url: `https://api.zoom.us/v2/meetings/${configuredMeetingId}`, method: "GET" },
    ]);
    expect(mock.calls.some(call => call.url.includes("/registrants"))).toBe(false);
  });

  it("accepts a configured meeting URL without a password when Zoom reports no password", async () => {
    const mock = mockMeeting(registrationDisabledMeeting());
    const { registerApprovedLiveAttendee } = await import("./liveZoomApi");

    await expect(registerApprovedLiveAttendee({ email: "member@example.com", name: "Example Member" })).resolves.toMatchObject({
      registrantId: null,
      mode: "meeting",
    });
    expect(mock.calls.some(call => call.url.includes("/registrants"))).toBe(false);
  });

  it.each([
    ["a non-Zoom URL", registrationDisabledMeeting({ join_url: "https://example.invalid/j/12345678901" })],
    ["a foreign meeting URL", registrationDisabledMeeting({ join_url: "https://example.zoom.us/j/98765432109" })],
    ["an alias not bound by omn", registrationDisabledMeeting({ join_url: "https://example.zoom.us/j/98765432109?omn=11111111111" })],
    ["a raw numeric pwd token", registrationDisabledMeeting({ join_url: `https://example.zoom.us/j/${configuredMeetingId}?pwd=123456`, password: "123456" })],
    ["a password without an embedded encrypted token", registrationDisabledMeeting({ password: "123456" })],
  ])("rejects %s without registrant API calls", async (_label, meeting) => {
    const mock = mockMeeting(meeting);
    const { registerApprovedLiveAttendee } = await import("./liveZoomApi");

    await expect(registerApprovedLiveAttendee({ email: "member@example.com", name: "Example Member" })).rejects.toThrow();
    expect(mock.calls.some(call => call.url.includes("/registrants"))).toBe(false);
    expect(mock.calls.filter(call => !call.url.includes("/oauth/token"))).toHaveLength(1);
  });

  it.each([
    ["wrong time", registrationDisabledMeeting({ start_time: "2026-10-31T18:31:00Z" })],
    ["waiting room disabled", registrationDisabledMeeting({ settings: { approval_type: 2, waiting_room: false } })],
  ])("rejects %s before any registrant API call", async (_label, meeting) => {
    const mock = mockMeeting(meeting);
    const { registerApprovedLiveAttendee } = await import("./liveZoomApi");

    await expect(registerApprovedLiveAttendee({ email: "member@example.com", name: "Example Member" })).rejects.toThrow();
    expect(mock.calls.some(call => call.url.includes("/registrants"))).toBe(false);
  });

  it("reports registration-disabled readiness without claiming manual approval or registrant access", async () => {
    const mock = mockMeeting(registrationDisabledMeeting());
    const { verifyZoomLiveMeeting } = await import("./liveZoomApi");

    await expect(verifyZoomLiveMeeting()).resolves.toMatchObject({
      configured: true,
      manualApproval: false,
      correctTime: true,
      canReadRegistrants: false,
      registrationNotRequired: true,
      meetingJoinReady: true,
    });
    expect(mock.calls.some(call => call.url.includes("/registrants"))).toBe(false);
  });

  it("exports the current generic link and returns null for manual approval", async () => {
    const genericMock = mockMeeting(registrationDisabledMeeting());
    const { getRegistrationDisabledMeetingJoin } = await import("./liveZoomApi");

    await expect(getRegistrationDisabledMeetingJoin()).resolves.toMatchObject({
      registrantId: null,
      mode: "meeting",
    });
    expect(genericMock.calls.some(call => call.url.includes("/registrants"))).toBe(false);

    vi.resetModules();
    const manualMock = mockMeeting({ settings: { approval_type: 1 } });
    const { getRegistrationDisabledMeetingJoin: getManualMeetingJoin } = await import("./liveZoomApi");
    await expect(getManualMeetingJoin()).resolves.toBeNull();
    expect(manualMock.calls.some(call => call.url.includes("/registrants"))).toBe(false);
  });

  it("preserves manual approval registrant lookup behavior", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method || "GET" });
      const json = (body: object) => ({ ok: true, status: 200, json: async () => body });
      if (url.includes("/oauth/token")) return json({ access_token: "test-access", expires_in: 3600 });
      if (url.endsWith(`/meetings/${configuredMeetingId}`)) return json({ settings: { approval_type: 1 } });
      if (url.includes("/registrants?status=approved")) {
        return json({ registrants: [{ id: "synthetic-registrant", email: "member@example.com", join_url: "https://example.zoom.us/j/12345678901?pwd=synthetic-token" }] });
      }
      throw new Error("Unexpected mocked URL");
    });
    vi.stubGlobal("fetch", fetchMock);
    const { registerApprovedLiveAttendee } = await import("./liveZoomApi");

    await expect(registerApprovedLiveAttendee({ email: "member@example.com", name: "Example Member" })).resolves.toEqual({
      registrantId: "synthetic-registrant",
      joinUrl: "https://example.zoom.us/j/12345678901?pwd=synthetic-token",
    });
    expect(calls.some(call => call.url.includes("/registrants?status=approved"))).toBe(true);
    expect(calls.some(call => !call.url.includes("/oauth/token") && (call.method === "POST" || call.method === "PUT"))).toBe(false);
  });
});
