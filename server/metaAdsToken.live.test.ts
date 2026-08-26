import { describe, expect, it } from "vitest";

const ACCOUNT_IDS = ["act_254697595735216", "act_3841144459522772"];

describe("META_ADS_TOKEN live validation", () => {
  it("authenticates and can read both dashboard ad accounts", async () => {
    const token = process.env.META_ADS_TOKEN;
    expect(token, "META_ADS_TOKEN must be set").toBeTruthy();

    const identityResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(token!)}`,
    );
    const identity = await identityResponse.json();
    expect(identityResponse.status, JSON.stringify(identity?.error ?? identity)).toBe(200);
    expect(identity.id).toBeTruthy();

    for (const accountId of ACCOUNT_IDS) {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${accountId}?fields=id,name,account_status&access_token=${encodeURIComponent(token!)}`,
      );
      const data = await response.json();
      expect(response.status, `${accountId}: ${JSON.stringify(data?.error ?? data)}`).toBe(200);
      expect([accountId, accountId.replace("act_", "")]).toContain(data.id);
      expect(data.name).toBeTruthy();

      const until = new Date().toISOString().slice(0, 10);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v21.0/${accountId}/insights?fields=campaign_name,spend,actions&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&level=campaign&limit=5&access_token=${encodeURIComponent(token!)}`,
      );
      const insights = await insightsResponse.json();
      expect(insightsResponse.status, `${accountId} insights: ${JSON.stringify(insights?.error ?? insights)}`).toBe(200);
      expect(Array.isArray(insights.data)).toBe(true);
    }
  }, 20_000);
});
