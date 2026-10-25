import { describe, expect, it } from "vitest";
import {
  RECOVERY_CAMPAIGN,
  RECOVERY_OFFER_EXPIRES_AT,
  RECOVERY_SEND_AT,
  RECOVERY_SEND_EXPIRES_AT,
  purchaseRecoveryOfferUrl,
  recoveryOfferCode,
} from "../shared/purchaseRecoveryLinks";

describe("purchase recovery campaign links", () => {
  it("uses the agreed one-time campaign schedule in Israel local time", () => {
    expect(RECOVERY_CAMPAIGN).toBe("recovery_oct25_2026");
    expect(RECOVERY_SEND_AT).toBe(Date.parse("2026-10-25T19:00:00+02:00"));
    expect(RECOVERY_SEND_EXPIRES_AT).toBe(Date.parse("2026-10-25T22:00:00+02:00"));
    expect(RECOVERY_OFFER_EXPIRES_AT).toBe(Date.parse("2026-10-26T23:59:59+02:00"));
  });

  it.each([
    ["database", "MATCH10"],
    ["session", "LOVE10DAY"],
    ["plus", "PLUSGIFT"],
  ] as const)("maps %s to its server-recognized coupon", (product, code) => {
    expect(recoveryOfferCode(product)).toBe(code);
  });

  it.each([
    ["database", "email", "/join", "MATCH10"],
    ["session", "sms", "/single-session", "LOVE10DAY"],
    ["plus", "email", "/database-plus", "PLUSGIFT"],
  ] as const)("builds a neutral tagged %s URL for %s", (product, channel, path, code) => {
    const url = new URL(purchaseRecoveryOfferUrl(product, channel), "https://hilitcaspi.com");
    expect(url.pathname).toBe(path);
    expect(url.searchParams.get("coupon")).toBe(code);
    expect(url.searchParams.get("utm_source")).toBe(channel);
    expect(url.searchParams.get("utm_medium")).toBe("recovery");
    expect(url.searchParams.get("utm_campaign")).toBe(RECOVERY_CAMPAIGN);
    expect(url.searchParams.get("utm_content")).toBe(`${product}_${channel}`);
    expect(url.searchParams.has("email")).toBe(false);
    expect(url.searchParams.has("token")).toBe(false);
  });

  it("retains the database source parameter", () => {
    const url = new URL(purchaseRecoveryOfferUrl("database", "email"), "https://hilitcaspi.com");
    expect(url.searchParams.get("source")).toBe("database");
  });
});
