import { describe, expect, it } from "vitest";
import { ISRAEL_META_PIXEL_ID } from "../shared/metaPurchasePolicy";
/** Explicit opt-in: GET metadata only. Never sends events, changes settings or reads people. */
describe.skipIf(process.env.RUN_META_CONFIGURATION_READONLY !== "true")("Israeli pixel configuration", () => {
  it("uses the user-confirmed Israeli asset and can read its metadata", async () => {
    expect(process.env.META_PIXEL_ID).toBe(ISRAEL_META_PIXEL_ID);
    const token = process.env.META_ADS_TOKEN;
    expect(Boolean(token)).toBe(true);
    const url = new URL(`https://graph.facebook.com/v25.0/${ISRAEL_META_PIXEL_ID}`);
    url.searchParams.set("fields", "name");
    url.searchParams.set("access_token", token!);
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(typeof body.name).toBe("string");
  });
});
