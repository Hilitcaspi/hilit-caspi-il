import { describe, expect, it } from "vitest";
import {
  buildNovemberDnaResultHref,
  parseNovemberDnaContext,
  resolveNovemberDnaContext,
  sanitizeNovemberDnaAttribution,
} from "../shared/novemberDnaContext";
import {
  NOVEMBER_BUNDLE_EXPIRES_AT,
  NOVEMBER_BUNDLE_STARTS_AT,
} from "../shared/novemberBundleOffer";

const ACTIVE_NOW = Date.parse("2026-11-15T12:00:00+02:00");
const storedNovemberContext = {
  offer: "november",
  capturedAt: ACTIVE_NOW - 1,
  attribution: {
    utmSource: "meta",
    utmMedium: "paid_social",
    utmCampaign: "november_launch",
    utmContent: "carousel_a",
  },
};

describe("optional November DNA campaign context", () => {
  it("keeps the free DNA funnel generic unless one explicit active allowlisted offer is present", () => {
    const regular = resolveNovemberDnaContext({
      search: "?utm_source=meta&utm_campaign=regular_dna",
      now: ACTIVE_NOW,
      persisted: storedNovemberContext,
    });

    expect(regular).toEqual({ context: null, shouldClear: true });
    expect(buildNovemberDnaResultHref(regular.context, ACTIVE_NOW)).toBeNull();
  });

  it("uses a fixed November payment destination while retaining known source, medium, campaign, and existing content", () => {
    const resolution = resolveNovemberDnaContext({
      search: "?offer=november&utm_source=instagram&utm_medium=paid_social&utm_campaign=november_2026&utm_content=reel_a",
      now: ACTIVE_NOW,
    });
    const href = buildNovemberDnaResultHref(resolution.context, ACTIVE_NOW);
    const url = new URL(href!, "https://hilitcaspi.com");

    expect(resolution.shouldClear).toBe(false);
    expect(url.pathname).toBe("/november-love");
    expect(url.hash).toBe("#payment");
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("utm_medium")).toBe("paid_social");
    expect(url.searchParams.get("utm_campaign")).toBe("november_2026");
    expect(url.searchParams.get("utm_content")).toBe("reel_a");
    expect(url.searchParams.get("dna_placement")).toBe("dna_results");
  });

  it("uses dna_results as content only when the original entry had no usable content, preserving stored source attribution across reloads", () => {
    const resolution = resolveNovemberDnaContext({
      search: "?offer=november",
      now: ACTIVE_NOW,
      persisted: {
        ...storedNovemberContext,
        attribution: {
          utmSource: "newsletter",
          utmMedium: "email",
          utmCampaign: "november_warm",
        },
      },
    });
    const url = new URL(buildNovemberDnaResultHref(resolution.context, ACTIVE_NOW)!, "https://hilitcaspi.com");

    expect(url.searchParams.get("utm_source")).toBe("newsletter");
    expect(url.searchParams.get("utm_medium")).toBe("email");
    expect(url.searchParams.get("utm_campaign")).toBe("november_warm");
    expect(url.searchParams.get("utm_content")).toBe("dna_results");
    expect(url.searchParams.has("dna_placement")).toBe(false);
  });

  it("falls back safely after the campaign end and rejects stale stored context", () => {
    const expired = resolveNovemberDnaContext({
      search: "?offer=november&utm_source=meta",
      now: NOVEMBER_BUNDLE_EXPIRES_AT,
      persisted: storedNovemberContext,
    });

    expect(expired).toEqual({ context: null, shouldClear: true });
    expect(parseNovemberDnaContext(storedNovemberContext, NOVEMBER_BUNDLE_EXPIRES_AT)).toBeNull();
    expect(buildNovemberDnaResultHref(storedNovemberContext, NOVEMBER_BUNDLE_EXPIRES_AT)).toBeNull();
    expect(resolveNovemberDnaContext({ search: "?offer=november", now: NOVEMBER_BUNDLE_STARTS_AT - 1 }).context).toBeNull();
  });

  it("rejects malformed or unrelated offers rather than inheriting a prior campaign", () => {
    for (const search of ["?offer=october", "?offer=november&offer=november", "?offer=november&offer=other", "?offer=https://evil.example"]) {
      const resolution = resolveNovemberDnaContext({ search, now: ACTIVE_NOW, persisted: storedNovemberContext });
      expect(resolution).toEqual({ context: null, shouldClear: true });
    }
    expect(parseNovemberDnaContext({ offer: "november", capturedAt: "not-a-date" }, ACTIVE_NOW)).toBeNull();
  });

  it("never copies redirects, entitlement/price controls, or PII into the November result URL", () => {
    const resolution = resolveNovemberDnaContext({
      search: "?offer=november&utm_source=meta&utm_medium=cpc&utm_campaign=november&email=private%40example.com&phone=0501234567&name=%D7%93%D7%A0%D7%94&token=secret&coupon=FREE&price=1&gift=course&next=https%3A%2F%2Fevil.example%2Fcheckout&redirect=%2Fjoin",
      now: ACTIVE_NOW,
    });
    const href = buildNovemberDnaResultHref(resolution.context, ACTIVE_NOW)!;

    expect(href).toContain("/november-love?");
    expect(href).not.toMatch(/private|0501234567|%D7|secret|FREE|price|gift|next|redirect|evil|coupon/i);
    expect(new URL(href, "https://hilitcaspi.com").searchParams.get("utm_content")).toBe("dna_results");
  });

  it("drops PII-like or URL-like UTM values instead of reflecting them into a link", () => {
    expect(sanitizeNovemberDnaAttribution({
      utm_source: "https://evil.example",
      utm_medium: "alex@example.com",
      utm_campaign: "safe_campaign",
      utm_content: "token=secret",
    })).toEqual({ utmCampaign: "safe_campaign" });
  });
});
