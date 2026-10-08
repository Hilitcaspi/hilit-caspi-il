import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boostEntryChannelFromSearch, preserveBoostTracking, withBoostEmailTracking } from "../shared/boostEntryChannel";

const personalUrl = "https://hilitcaspi.com/my-profile?email=test%40example.com&token=fictional-test-token&tab=boost&boostMatch=42#boost-option-42";

describe("Boost tagged action origin", () => {
  it("recognizes newsletter, lifecycle and direct personal-area entry", () => {
    expect(boostEntryChannelFromSearch("?utm_source=brevo&utm_medium=email")).toBe("email");
    expect(boostEntryChannelFromSearch("?utm_source=email&utm_medium=lifecycle")).toBe("email");
    expect(boostEntryChannelFromSearch("?utm_source=%20EMAIL%20&utm_medium=lifecycle")).toBe("email");
    expect(boostEntryChannelFromSearch("?utm_source=meta&utm_medium=cpc")).toBe("other");
    expect(boostEntryChannelFromSearch("?tab=boost")).toBe("personal_area");
  });

  it.each(["boost_opportunity", "boost_approval_link"] as const)("tags %s without losing access or card focus", campaign => {
    const url = new URL(withBoostEmailTracking(personalUrl, campaign));
    expect(url.searchParams.get("email")).toBe("test@example.com");
    expect(url.searchParams.get("token")).toBe("fictional-test-token");
    expect(url.searchParams.get("boostMatch")).toBe("42");
    expect(url.hash).toBe("#boost-option-42");
    expect(url.searchParams.get("utm_campaign")).toBe(campaign);
    expect(url.searchParams.get("utm_content")).toBe(campaign === "boost_opportunity" ? "view_offer" : "approve_boost");
    expect(boostEntryChannelFromSearch(url.search)).toBe("email");
    const utmValues = [...url.searchParams].filter(([key]) => key.startsWith("utm_")).map(([, value]) => value).join(" ");
    expect(utmValues).not.toContain("test@example.com");
    expect(utmValues).not.toContain("fictional-test-token");
  });

  it("replaces stale email tags, drops unsafe terms and is idempotent", () => {
    const once = withBoostEmailTracking(`${personalUrl.split("#")[0]}&utm_source=meta&utm_term=fictional-test-token#boost-option-42`, "boost_opportunity");
    expect(new URL(once).searchParams.has("utm_term")).toBe(false);
    expect(withBoostEmailTracking(once, "boost_opportunity")).toBe(once);
  });

  it("preserves email entry through landing redirect without copying identity or arbitrary parameters", () => {
    const destination = "/my-profile?token=verified-test-token&tab=matches#boost-card";
    const redirected = preserveBoostTracking(destination, "?utm_source=brevo&utm_medium=email&utm_campaign=boost_launch&utm_content=primary_cta&token=wrong-token&email=other%40example.com&next=https://example.com");
    const url = new URL(redirected, "https://hilitcaspi.com");
    expect(redirected.startsWith("/my-profile?")).toBe(true);
    expect(url.searchParams.get("token")).toBe("verified-test-token");
    expect(url.searchParams.has("email")).toBe(false);
    expect(url.searchParams.has("next")).toBe(false);
    expect(url.searchParams.get("utm_campaign")).toBe("boost_launch");
    expect(url.hash).toBe("#boost-card");
    expect(boostEntryChannelFromSearch(url.search)).toBe("email");
  });

  it("leaves direct entry direct and limits tag lengths", () => {
    const destination = "/my-profile?token=verified-test-token&tab=matches#boost-card";
    expect(preserveBoostTracking(destination, "?next=anything")).toBe(destination);
    const tagged = new URL(preserveBoostTracking(destination, `?utm_source=${"x".repeat(500)}`), "https://hilitcaspi.com");
    expect(tagged.searchParams.get("utm_source")).toHaveLength(200);
  });

  it("rejects off-site or non-personal-area destinations", () => {
    for (const destination of ["https://example.com/my-profile", "https://hilitcaspi.com/live", "//example.com/my-profile"]) {
      expect(() => withBoostEmailTracking(destination, "boost_opportunity")).toThrow();
      expect(() => preserveBoostTracking(destination, "?utm_source=email")).toThrow();
    }
  });

  it("wires both free actions and paid checkout to the action-entry parser", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/UserDashboard.tsx", import.meta.url), "utf8");
    const wallet = readFileSync(new URL("../client/src/components/GrowWallet.tsx", import.meta.url), "utf8");
    const root = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const boost = readFileSync(new URL("./matchBoostRouter.ts", import.meta.url), "utf8");
    expect(dashboard).toMatch(/redeemCredit\.mutate\([^\n]+entryChannel: boostEntryChannelFromSearch/);
    expect(dashboard).toMatch(/redeemPlus\.mutate\([^\n]+entryChannel: boostEntryChannelFromSearch/);
    expect(wallet).toContain('boostEntryChannel: product === "match_boost" ? boostEntryChannelFromSearch(window.location.search)');
    expect(root).toContain("entryChannel: input.boostEntryChannel");
    expect(boost).toContain('entryChannel: input.entryChannel || "unknown"');
  });
});
