import { describe, expect, it } from "vitest";
import { purchaseFromThankYouPath, selectSmartUpsell } from "../client/src/lib/smartUpsellPolicy";

describe("smart upsell policy", () => {
  it("does not show upsells in CRM, legal pages or the personal area", () => {
    expect(selectSmartUpsell("/crm", {})).toBeNull();
    expect(selectSmartUpsell("/terms/database", {})).toBeNull();
    expect(selectSmartUpsell("/my-profile", {})).toBeNull();
  });

  it("moves a database buyer to a personal session", () => {
    expect(selectSmartUpsell("/thank-you/database", { database: true })?.id).toBe("intro_session");
  });

  it("moves a session buyer to coaching", () => {
    expect(selectSmartUpsell("/thank-you/session", { session: true })?.id).toBe("personal_coaching");
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
