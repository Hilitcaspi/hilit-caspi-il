import { describe, expect, it } from "vitest";

describe("match WhatsApp Make webhook secret", () => {
  it("is configured and reachable without triggering a message", async () => {
    const webhookUrl = process.env.MATCH_WHATSAPP_WEBHOOK_URL;
    expect(webhookUrl).toBeTruthy();

    const url = new URL(webhookUrl!);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("hook.eu1.make.com");

    const response = await fetch(url, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBeLessThan(500);
    expect(response.status).not.toBe(404);
  }, 15_000);
});
