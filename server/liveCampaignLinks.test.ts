import { describe, expect, it } from "vitest";
import { liveDatabaseOfferHref, liveSmsAliasTarget } from "../shared/liveCampaignLinks";

describe("live campaign links", () => {
  it.each(["whatsapp", "instagram", "facebook", "sms", "newsletter"])("preserves %s campaign handoff without personal secrets", source => {
    const href = liveDatabaseOfferHref(`?utm_source=${source}&utm_medium=organic_social&utm_campaign=live_oct2026&utm_content=story_live&email=private%40example.com&token=private&coupon=TEST1&next=https://evil.example`);
    const result = new URL(href, "https://hilitcaspi.com");
    expect(result.pathname).toBe("/live/database");
    expect(result.searchParams.get("utm_source")).toBe(source);
    expect(result.searchParams.get("utm_content")).toBe("story_live");
    expect(result.search).not.toMatch(/private|token|coupon|next|evil/);
  });
  it("uses a clean destination without tracking", () => expect(liveDatabaseOfferHref("")).toBe("/live/database"));
  it.each([["/ld", "/live/database", "cold_database"], ["/ll", "/live", "member_live"], ["/lp", "/live", "plus_live"]])("tracks fixed alias %s", (path, destination, content) => {
    const url = new URL(liveSmsAliasTarget(path)!, "https://hilitcaspi.com");
    expect(url.pathname).toBe(destination);
    expect(url.searchParams.get("utm_source")).toBe("sms");
    expect(url.searchParams.get("utm_campaign")).toBe("live_oct2026");
    expect(url.searchParams.get("utm_content")).toBe(content);
  });
  it("never redirects an arbitrary target", () => expect(liveSmsAliasTarget("https://evil.example")).toBeNull());
});
