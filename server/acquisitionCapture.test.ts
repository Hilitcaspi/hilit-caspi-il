import { afterEach, describe, expect, it, vi } from "vitest";
import { acquisitionActorKey, prepareAcquisitionSnapshot, recordAcquisitionSafely } from "./acquisitionCapture";
import { metaAcquisitionSnapshot, fetchMetaLeadDetails } from "./metaAcquisitionSnapshot";

const mocks = vi.hoisted(() => ({ execute: vi.fn(), getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
const now = Date.parse("2026-10-13T15:00:00Z");
const first = { utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "campaign-a", capturedAt: now - 1000 };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("immutable acquisition capture", () => {
  it("keeps the exact first tagged channel and campaign", () => {
    expect(prepareAcquisitionSnapshot(first, now, now)).toMatchObject(first);
  });
  it("rejects a newly observed touch for a pre-existing lead", () => {
    expect(prepareAcquisitionSnapshot(first, now, now - 2000)).toBeNull();
  });
  it("rejects future, stale and malformed timestamps", () => {
    for (const capturedAt of [now + 120000, now - 366 * 86400000, 0, NaN]) {
      expect(prepareAcquisitionSnapshot({ ...first, capturedAt }, now)).toBeNull();
    }
  });
  it("does not store contact details or full referrer URLs in tags", () => {
    expect(prepareAcquisitionSnapshot({ ...first, utmCampaign: "private@example.test", utmContent: "https://example.test/?token=secret" }, now)).toMatchObject({ utmCampaign: null, utmContent: null });
  });
  it("uses a scoped non-reversible actor key with normalized identity", () => {
    vi.stubEnv("JWT_SECRET", "test-key");
    expect(acquisitionActorKey(" EXAMPLE@example.test ")).toBe(acquisitionActorKey("example@example.test"));
    expect(acquisitionActorKey("example@example.test")).toHaveLength(64);
  });
  it("never writes acquisition data in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await recordAcquisitionSafely("sample@example.test", first);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("writes one complete snapshot using atomic insert-ignore without historical updates", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("JWT_SECRET", "test-key");
    mocks.getDb.mockResolvedValue({ execute: mocks.execute });
    mocks.execute.mockResolvedValueOnce([[{ firstAt: null }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    await recordAcquisitionSafely("sample@example.test", { ...first, capturedAt: Date.now() - 1000 });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    const query = mocks.execute.mock.calls[1][0];
    const rendered = query.queryChunks.map((c: any) => c?.value || "").join(" ");
    expect(rendered).toContain("INSERT IGNORE INTO acquisition_first_touches");
    expect(rendered).not.toMatch(/UPDATE|DELETE/);
  });
  it("does not overwrite old contact history with a new email click", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("JWT_SECRET", "test-key");
    mocks.getDb.mockResolvedValue({ execute: mocks.execute });
    mocks.execute.mockResolvedValue([[{ firstAt: Date.now() - 86400000 }]]);
    await recordAcquisitionSafely("sample@example.test", { utmSource: "email", capturedAt: Date.now() - 1000 });
    expect(mocks.execute).toHaveBeenCalledTimes(1);
  });
});

describe("Meta first-source evidence", () => {
  it("keeps exact ad and campaign from the provider response", () => {
    expect(metaAcquisitionSnapshot({ created_time: "2026-10-13T14:00:00Z", ad_id: "101", campaign_id: "202", adset_id: "303" }, now)).toMatchObject({ utmSource: "meta", utmMedium: "paid_social", metaAdId: "101", metaCampaignId: "202" });
  });
  it("never calls an organic form submission a paid ad", () => {
    expect(metaAcquisitionSnapshot({ created_time: "2026-10-13T14:00:00Z" }, now)).toBeUndefined();
    expect(metaAcquisitionSnapshot({ ad_id: "101" }, now)).toBeUndefined();
  });
  it("falls back to the working original GET if additional fields are unavailable", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("", { status: 400 })).mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect((await fetchMetaLeadDetails("https://graph.example.test/lead?fields=id,field_data")).ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0].searchParams.get("fields")).toContain("campaign_id");
    expect(fetch.mock.calls[1][0]).toBe("https://graph.example.test/lead?fields=id,field_data");
  });
  it("keeps lead intake working when enrichment times out", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect((await fetchMetaLeadDetails("https://graph.example.test/lead?fields=id,field_data")).ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
