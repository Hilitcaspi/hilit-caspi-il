import { describe, expect, it } from "vitest";
import { isAuthorizedLiveTestEmail } from "./liveTestCoupon";

/** Run after deploying the test-inbox secret; never log its actual value. */
describe.skipIf(!process.env.LIVE_TEST_CHECKOUT_EMAIL)("LIVE_TEST_CHECKOUT_EMAIL deployment configuration", () => {
  it("allows the configured owner's inbox but no arbitrary mailbox", () => {
    const configured = process.env.LIVE_TEST_CHECKOUT_EMAIL?.trim().toLowerCase();
    expect(configured).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(isAuthorizedLiveTestEmail(configured)).toBe(true);
    expect(isAuthorizedLiveTestEmail("unrelated@example.net")).toBe(false);
  });
});
