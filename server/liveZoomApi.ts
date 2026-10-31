import crypto from "node:crypto";

const API_BASE = "https://api.zoom.us/v2";
const TOKEN_URL = "https://zoom.us/oauth/token";
let cachedToken: { value: string; until: number } | null = null;

export function zoomLiveConfig() {
  const accountId = process.env.ZOOM_LIVE_ACCOUNT_ID?.trim();
  const clientId = process.env.ZOOM_LIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOOM_LIVE_CLIENT_SECRET?.trim();
  const meetingId = process.env.ZOOM_LIVE_MEETING_ID?.trim();
  const encryptionKey = process.env.ZOOM_LIVE_ENCRYPTION_KEY?.trim() || (process.env.JWT_SECRET
    ? crypto.createHash("sha256").update("live-zoom-join-url:v1\0").update(process.env.JWT_SECRET).digest("hex") : null);
  if (!accountId || !clientId || !clientSecret || !meetingId || !/^\d{9,15}$/.test(meetingId)
      || !encryptionKey || !/^[a-f0-9]{64}$/i.test(encryptionKey)) return null;
  return { accountId, clientId, clientSecret, meetingId, encryptionKey };
}

export function isZoomLiveDeliveryEnabled() {
  return process.env.LIVE_ZOOM_DELIVERY_ENABLED === "true" && Boolean(zoomLiveConfig());
}

export function encryptZoomJoinUrl(url: string, keyHex: string): string {
  assertZoomJoinUrl(url);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  const ciphertext = Buffer.concat([cipher.update(url, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptZoomJoinUrl(value: string, keyHex: string): string {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted Zoom URL");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(parts[0], "base64url"));
  decipher.setAuthTag(Buffer.from(parts[1], "base64url"));
  const url = Buffer.concat([decipher.update(Buffer.from(parts[2], "base64url")), decipher.final()]).toString("utf8");
  assertZoomJoinUrl(url);
  return url;
}

export function assertZoomJoinUrl(value: string): void {
  const url = new URL(value);
  if (url.protocol !== "https:" || !(url.hostname === "zoom.us" || url.hostname.endsWith(".zoom.us"))) {
    throw new Error("Zoom did not return a valid join URL");
  }
}

async function accessToken(config: NonNullable<ReturnType<typeof zoomLiveConfig>>) {
  if (cachedToken && cachedToken.until > Date.now()) return cachedToken.value;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "account_credentials", account_id: config.accountId }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Zoom OAuth failed (${res.status})`);
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Zoom OAuth response missing token");
  cachedToken = { value: data.access_token, until: Date.now() + Math.max(0, (data.expires_in ?? 3600) - 120) * 1000 };
  return cachedToken.value;
}

async function zoomRequest<T>(config: NonNullable<ReturnType<typeof zoomLiveConfig>>, path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken(config)}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000),
  });
  // Never include the upstream response in errors or logs: it may contain a join URL or private registrant details.
  if (!res.ok) throw new Error(`Zoom ${method} failed (${res.status})`);
  return res.status === 204 ? ({} as T) : await res.json() as T;
}

type Registrant = { id?: string; registrant_id?: string; email?: string; join_url?: string; status?: string };
type CreatedMeetingRegistrant = { id?: number; registrant_id?: string; join_url?: string };

export async function verifyZoomLiveMeeting() {
  const config = zoomLiveConfig();
  if (!config) return { configured: false, manualApproval: false, correctTime: false, canReadRegistrants: false };
  const meeting = await zoomRequest<{ start_time?: string; settings?: { approval_type?: number } }>(
    config, `/meetings/${config.meetingId}`,
  );
  // Only inspect status 200. Never return or log names, emails, IDs or personal join links.
  await zoomRequest(config, `/meetings/${config.meetingId}/registrants?status=approved&page_size=1`);
  return {
    configured: true,
    manualApproval: meeting.settings?.approval_type === 1,
    correctTime: meeting.start_time ? Date.parse(meeting.start_time) === Date.parse("2026-10-31T18:30:00Z") : false,
    canReadRegistrants: true,
  };
}

async function findRegistrant(config: NonNullable<ReturnType<typeof zoomLiveConfig>>, email: string, status: "approved" | "pending") {
  let next = "";
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ status, page_size: "300" });
    if (next) params.set("next_page_token", next);
    const result = await zoomRequest<{ registrants?: Registrant[]; next_page_token?: string }>(
      config, `/meetings/${config.meetingId}/registrants?${params}`,
    );
    const match = result.registrants?.find(item => item.email?.trim().toLowerCase() === email);
    if (match) return match;
    if (!result.next_page_token || result.next_page_token === next) break;
    next = result.next_page_token;
  }
  return null;
}

export async function registerApprovedLiveAttendee(input: { email: string; name: string }) {
  const config = zoomLiveConfig();
  if (!config) throw new Error("Zoom live configuration missing");
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid ticket email");
  const meeting = await zoomRequest<{ settings?: { approval_type?: number } }>(config, `/meetings/${config.meetingId}`);
  if (meeting.settings?.approval_type !== 1) throw new Error("Zoom meeting must require manual approval");

  let approved = await findRegistrant(config, email, "approved");
  let approvedReferenceId = approved?.id || approved?.registrant_id;
  if (!approved) {
    let pending = await findRegistrant(config, email, "pending");
    if (!pending) {
      const [firstName, ...remainder] = input.name.trim().split(/\s+/);
      try {
        const created = await zoomRequest<CreatedMeetingRegistrant>(config, `/meetings/${config.meetingId}/registrants`, "POST", {
          email, first_name: firstName || "משתתף", ...(remainder.length ? { last_name: remainder.join(" ") } : {}),
        });
        // The creation response's `id` is the MEETING ID, unlike list/detail
        // responses where `id` identifies the registrant. Never use it for approval.
        pending = created.registrant_id ? { registrant_id: created.registrant_id, email } : await findRegistrant(config, email, "pending");
      } catch (error) {
        // The POST may have succeeded before a timeout; recover only by looking up this same email.
        pending = await findRegistrant(config, email, "pending");
        approved = await findRegistrant(config, email, "approved");
        if (!pending && !approved) throw error;
      }
    }
    if (!approved) {
      const id = pending?.registrant_id || pending?.id;
      if (!id) throw new Error("Zoom registrant ID unavailable");
      await zoomRequest(config, `/meetings/${config.meetingId}/registrants/status`, "PUT", {
        action: "approve", registrants: [{ id, email }],
      });
      approvedReferenceId = id;
      approved = await findRegistrant(config, email, "approved");
    }
  }
  // The list endpoint may lag behind an approval or omit its personal join URL.
  // Read this exact approved registrant; never repeat POST/PUT while waiting.
  const referenceId = approved?.id || approved?.registrant_id || approvedReferenceId;
  if (!approved?.join_url && referenceId) {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 300 * 2 ** (attempt - 1)));
      let details: Registrant | null = null;
      try {
        details = await zoomRequest<Registrant>(config,
          `/meetings/${config.meetingId}/registrants/${encodeURIComponent(referenceId)}`);
      } catch {
        // Keep installations with list-only read scope usable without changing scopes.
        const listed = await findRegistrant(config, email, "approved");
        if (listed?.join_url) { approved = listed; break; }
      }
      if (details?.status === "approved" && (details.id || details.registrant_id) === referenceId
          && details.email?.trim().toLowerCase() === email && details.join_url) {
        approved = details;
        break;
      }
    }
  }
  const id = approved?.id || approved?.registrant_id;
  if (!id || !approved?.join_url) throw new Error("Approved Zoom join URL unavailable");
  assertZoomJoinUrl(approved.join_url);
  return { registrantId: id, joinUrl: approved.join_url };
}
