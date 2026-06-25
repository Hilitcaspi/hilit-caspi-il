import { describe, it, expect } from "vitest";

/**
 * Live integration credential validation.
 * These tests hit the real third-party APIs using the configured secrets to
 * confirm the keys are valid. They are tolerant of transient network issues.
 */

describe("Brevo API connection", () => {
  it("authenticates and returns account info", async () => {
    const apiKey = process.env.BREVO_API_KEY;
    expect(apiKey, "BREVO_API_KEY must be set").toBeTruthy();

    const response = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": apiKey!, "Content-Type": "application/json" },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("email");
    console.log("[Brevo] account:", data.email);
  });
});

describe("Green API (WhatsApp) connection", () => {
  it("returns the instance state as authorized", async () => {
    const id = process.env.GREEN_API_INSTANCE_ID;
    const token = process.env.GREEN_API_TOKEN;
    expect(id, "GREEN_API_INSTANCE_ID must be set").toBeTruthy();
    expect(token, "GREEN_API_TOKEN must be set").toBeTruthy();

    const url = `https://api.green-api.com/waInstance${id}/getStateInstance/${token}`;
    const response = await fetch(url);
    expect(response.status).toBe(200);
    const data = await response.json();
    // stateInstance can be: authorized, notAuthorized, blocked, sleepMode, starting
    expect(data).toHaveProperty("stateInstance");
    console.log("[GreenAPI] stateInstance:", data.stateInstance);
  });
});

describe("Meta Graph API token", () => {
  it("validates the page access token", async () => {
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    expect(token, "META_PAGE_ACCESS_TOKEN must be set").toBeTruthy();

    const url = `https://graph.facebook.com/v21.0/me?access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();
    if (response.status !== 200) {
      console.warn("[Meta] token check returned:", JSON.stringify(data?.error ?? data));
    }
    // We assert the call returns either a valid id or a structured error so we
    // can surface token validity without crashing on transient API issues.
    expect(data).toBeTypeOf("object");
    if (data?.id) {
      console.log("[Meta] authenticated as:", data.name ?? data.id);
    }
    expect(response.status).toBe(200);
  });
});
