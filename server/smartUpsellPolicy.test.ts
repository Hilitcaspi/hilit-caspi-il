import { describe, expect, it } from "vitest";
import { purchaseFromThankYouPath, selectSmartUpsell } from "../client/src/lib/smartUpsellPolicy";

describe("smart upsell policy", () => {
  it("does not show upsells in CRM, legal pages or the personal area", () => {
    expect(selectSmartUpsell("/crm", {})).toBeNull();
    expect(selectSmartUpsell("/terms/database", {})).toBeNull();
    expect(selectSmartUpsell("/my-profile", {})).toBeNull();
  });

  it("keeps the complete database funnel free of upsells", () => {
    expect(selectSmartUpsell("/database", {})).toBeNull();
    expect(selectSmartUpsell("/maagar", {})).toBeNull();
    expect(selectSmartUpsell("/dna", {})).toBeNull();
    expect(selectSmartUpsell("/dna-quiz", {})).toBeNull();
    expect(selectSmartUpsell("/join", {})).toBeNull();
    expect(selectSmartUpsell("/join/questionnaire", {})).toBeNull();
    expect(selectSmartUpsell("/join/complete", {})).toBeNull();
    expect(selectSmartUpsell("/thank-you/database", { database: true })).toBeNull();
  });

  it("moves a session buyer to coaching", () => {
    expect(selectSmartUpsell("/thank-you/session", { session: true })?.id).toBe("personal_coaching");
  });

  it("keeps the October live funnel focused while upselling other public products", () => {
    expect(selectSmartUpsell("/guide-free", {})?.id).toBe("relationship_course");
    expect(selectSmartUpsell("/live", {})).toBeNull();
    expect(selectSmartUpsell("/live/database", {})).toBeNull();
    expect(selectSmartUpsell("/live/thank-you", { session: true })).toBeNull();
    expect(selectSmartUpsell("/tu-bav", {})?.id).toBe("intro_session");
    expect(selectSmartUpsell("/lead", {})).toBeNull();
  });

  it("does not sell a purchased homepage product again", () => {
    expect(selectSmartUpsell("/", { database: true })?.id).toBe("intro_session");
    expect(selectSmartUpsell("/", { database: true, session: true })?.id).toBe("relationship_course");
  });

  it("maps thank-you paths to persistent purchase flags", () => {
    expect(purchaseFromThankYouPath("/thank-you/database")).toBe("database");
    expect(purchaseFromThankYouPath("/thank-you/session")).toBe("session");
  });
});
