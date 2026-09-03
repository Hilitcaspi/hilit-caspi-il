import { describe, expect, it } from "vitest";
import { upgradeLegacyUnsubscribeLinks } from "./brevo";

describe("Brevo unsubscribe link hardening", () => {
  it("upgrades legacy email links without exposing the address", () => {
    const upgraded = upgradeLegacyUnsubscribeLinks(
      '<a href="https://hilitcaspi.com/unsubscribe?email=person%40example.com">remove</a>',
      "person@example.com",
    );
    expect(upgraded).toContain("https://hilitcaspi.com/unsubscribe?token=");
    expect(upgraded).not.toContain("?email=");
    expect(upgraded).not.toContain("person%40example.com");
  });

  it("preserves the original domain for the English site", () => {
    const upgraded = upgradeLegacyUnsubscribeLinks(
      "https://matchbyhilit.com/unsubscribe?email=person%40example.com&leadId=9",
      "person@example.com",
    );
    expect(upgraded).toMatch(/^https:\/\/matchbyhilit\.com\/unsubscribe\?token=/);
  });

  it("leaves already signed links unchanged", () => {
    const signed = "https://hilitcaspi.com/unsubscribe?token=already-signed";
    expect(upgradeLegacyUnsubscribeLinks(signed, "person@example.com")).toBe(signed);
  });
});
