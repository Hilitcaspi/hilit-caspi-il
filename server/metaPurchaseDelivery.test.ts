import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./db", () => ({ getDb: vi.fn() }));
import { buildCapiPurchasePayload, normalizeMetaPhone, sendMetaPurchasePayload } from "./_core/metaCapi";
import { decryptMetaPayload, encryptMetaPayload, metaAttemptOutcome, metaEventKey } from "./metaPurchaseDelivery";
import { ISRAEL_META_PIXEL_ID, META_RETRY_WINDOW_MS, META_MAX_ATTEMPTS, isProductionPurchaseMeasurement, isPaidGrowMeasurementNotification } from "../shared/metaPurchasePolicy";
const params = { email: "buyer@example.invalid", name: "Sample Buyer", phone: "0501234567",
  product: "live_october", sum: 49, eventId: "synthetic-checkout", paidAt: 1_800_000_000_000 };
beforeEach(() => { vi.stubEnv("NODE_ENV", "production"); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Israeli Meta verified purchase delivery", () => {
  it("does not send any production events from a development runtime", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await sendMetaPurchasePayload(buildCapiPurchasePayload(params)!)).toMatchObject({ category: "nonproduction_disabled" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects SDK failure reports and nonpaid callback identities", () => {
    expect(isPaidGrowMeasurementNotification({ statusCode: 2, transactionId: "123456", transactionToken: "synthetictoken123" })).toBe(true);
    expect(isPaidGrowMeasurementNotification({ statusCode: 1, transactionId: "123456", transactionToken: "synthetictoken123" })).toBe(false);
    expect(isPaidGrowMeasurementNotification({ statusCode: 2, transactionId: "encoded-confirmation", transactionToken: "" })).toBe(false);
    expect(isPaidGrowMeasurementNotification({ statusCode: undefined, transactionId: "123456", transactionToken: "synthetictoken123", paymentDate: "11/10/26" })).toBe(true);
    expect(isPaidGrowMeasurementNotification({ statusCode: undefined, transactionId: "123456", transactionToken: "synthetictoken123" })).toBe(false);
  });
  it("covers LIVE and uses the actual FRIENDS charge, not the list price", () => {
    const payload = buildCapiPurchasePayload(params)!;
    expect(payload.data[0].custom_data.value).toBe(49);
    expect(payload.data[0].custom_data.content_ids).toEqual(["live_october"]);
    expect(payload.data[0].event_time).toBe(params.paidAt / 1000);
    expect(JSON.stringify(payload)).not.toContain(params.email);
    expect(JSON.stringify(payload)).not.toContain(params.phone);
    expect(payload.data[0].user_data.em).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.data[0].user_data.ph).toMatch(/^[a-f0-9]{64}$/);
  });
  it("rejects unknown, missing/nonfinite/zero amounts and missing stable identities", () => {
    for (const sum of [undefined, 0, -1, NaN, Infinity]) expect(buildCapiPurchasePayload({ ...params, sum })).toBeNull();
    expect(buildCapiPurchasePayload({ ...params, product: "unknown" })).toBeNull();
    expect(buildCapiPurchasePayload({ ...params, eventId: undefined })).toBeNull();
  });
  it("excludes TEST1 and complimentary gifts from campaign learning", () => {
    expect(isProductionPurchaseMeasurement({ amount: 1, couponCode: "test1" })).toBe(false);
    expect(isProductionPurchaseMeasurement({ amount: 0 })).toBe(false);
    expect(isProductionPurchaseMeasurement({ amount: 49, couponCode: "FRIENDS" })).toBe(true);
  });
  it("normalizes local and international phones and rejects incomplete values", () => {
    expect(normalizeMetaPhone("0501234567")).toBe("972501234567");
    expect(normalizeMetaPhone("+972501234567")).toBe("972501234567");
    expect(normalizeMetaPhone("abc")).toBeUndefined();
  });
  it("encrypts the entire payload with authenticated encryption", () => {
    const payload = buildCapiPurchasePayload(params)!;
    const encrypted = encryptMetaPayload(payload, "test-only-secret");
    expect(encrypted).not.toContain("synthetic-checkout");
    expect(encrypted).not.toContain("example.invalid");
    expect(decryptMetaPayload(encrypted, "test-only-secret")).toEqual(payload);
    expect(() => decryptMetaPayload(encrypted, "different-test-secret")).toThrow();
  });
  it("uses a stable non-reversible delivery key", () => {
    expect(metaEventKey(params.eventId)).toBe(metaEventKey(params.eventId));
    expect(metaEventKey(params.eventId)).not.toBe(metaEventKey("other-checkout"));
  });
  it("persists acceptance and removes payload, rather than retrying accepted events", () => {
    expect(metaAttemptOutcome({ attemptCount: 1, createdAt: 1000 }, { state: "accepted", category: "accepted", eventsReceived: 1 }, 2000))
      .toMatchObject({ state: "accepted", eventsReceived: 1, acceptedAt: 2000, payloadEncrypted: null });
  });
  it("limits retries to fresh events and terminates definite provider rejection", () => {
    expect(metaAttemptOutcome({ attemptCount: 1, createdAt: 1000 }, { state: "retryable", category: "network_uncertain" }, 2000).state).toBe("pending");
    expect(metaAttemptOutcome({ attemptCount: META_MAX_ATTEMPTS, createdAt: 1000 }, { state: "retryable", category: "network_uncertain" }, 2000).state).toBe("failed");
    expect(metaAttemptOutcome({ attemptCount: 1, createdAt: 1000 }, { state: "retryable", category: "network_uncertain" }, 1000 + META_RETRY_WINDOW_MS).state).toBe("expired");
    expect(metaAttemptOutcome({ attemptCount: 1, createdAt: 1000 }, { state: "permanent", category: "provider_rejected" }, 2000).state).toBe("failed");
  });
  it("requires explicit events_received=1 before recording provider acceptance", async () => {
    vi.stubEnv("META_PIXEL_ID", ISRAEL_META_PIXEL_ID); vi.stubEnv("META_CAPI_TOKEN", "test-only-token");
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ events_received: 1 }) });
    vi.stubGlobal("fetch", fetch);
    expect(await sendMetaPurchasePayload(buildCapiPurchasePayload(params)!)).toMatchObject({ state: "accepted", eventsReceived: 1 });
    expect(fetch.mock.calls[0][0]).not.toContain("test-only-token");
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    expect(await sendMetaPurchasePayload(buildCapiPurchasePayload(params)!)).toMatchObject({ state: "retryable", category: "acceptance_not_confirmed" });
  });
  it("does not route Israeli purchases to another pixel", async () => {
    vi.stubEnv("META_PIXEL_ID", "other-pixel"); vi.stubEnv("META_CAPI_TOKEN", "test-only-token");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await sendMetaPurchasePayload(buildCapiPurchasePayload(params)!)).toMatchObject({ state: "configuration_missing", category: "israeli_pixel_mismatch" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("classifies network uncertainty and rate limits without persisting provider details", async () => {
    vi.stubEnv("META_PIXEL_ID", ISRAEL_META_PIXEL_ID); vi.stubEnv("META_CAPI_TOKEN", "test-only-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sensitive upstream content")));
    expect(await sendMetaPurchasePayload(buildCapiPurchasePayload(params)!)).toEqual({ state: "retryable", category: "network_uncertain" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { message: "private-content" } }) }));
    expect(await sendMetaPurchasePayload(buildCapiPurchasePayload(params)!)).toEqual({ state: "retryable", category: "provider_transient", httpStatus: 429 });
  });
});
