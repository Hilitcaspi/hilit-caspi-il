import { describe, expect, it } from "vitest";

/** Lightweight API smoke test for the WebDev runtime configuration. */
describe.skipIf(process.env.LIVE_OCTOBER_SALES_OPEN !== "true")("October live sales runtime", () => {
  it("reports ticket sales and database gift open via the live public API", async () => {
    expect(process.env.LIVE_OCTOBER_SALES_OPEN).toBe("true");
    const url = `${process.env.LIVE_STATUS_BASE_URL || "http://127.0.0.1:3000"}/api/trpc/liveOctober.salesStatus`;
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    expect(response.ok).toBe(true);
    const payload = await response.json();
    const data = payload?.result?.data?.json ?? payload?.result?.data;
    expect(data?.open).toBe(true);
    expect(data?.databaseGiftOpen).toBe(true);
  });
});
