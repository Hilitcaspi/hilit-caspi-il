import { describe, expect, it } from "vitest";
import { disableQuickTextConsent, enableQuickTextConsent } from "../shared/testimonialConsent";

describe("testimonial quick consent", () => {
  it("enables first-name text use on website, organic social and email in one action", () => {
    expect(enableQuickTextConsent([])).toEqual({
      consentText: true,
      identityScope: "first_name",
      allowedChannels: ["website", "organic_social", "email"],
      allowSpellingEdits: true,
    });
  });

  it("does not silently add paid advertising or PR permission", () => {
    const consent = enableQuickTextConsent(["paid_ads"]);
    expect(consent.allowedChannels).toContain("paid_ads");
    expect(consent.allowedChannels).not.toContain("pr");
  });

  it("removes the quick channels when no separate media permission depends on them", () => {
    expect(disableQuickTextConsent(["website", "organic_social", "email", "paid_ads"], false)).toEqual({
      consentText: false,
      identityScope: "anonymous",
      allowedChannels: ["paid_ads"],
      allowSpellingEdits: false,
    });
  });
});
