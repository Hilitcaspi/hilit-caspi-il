import { describe, it, expect } from "vitest";

import { createPaymentProcess } from "./growPayment";

/** Validates the same production create path used by checkout, including its WAF fallback. */
describe("Grow production credentials", () => {
  it("createPaymentProcess returns an authCode through the resilient production path", async () => {
    const userId = process.env.GROW_USER_ID;
    const pageCode = process.env.GROW_PAGE_CODE_DATABASE;
    expect(userId, "GROW_USER_ID must be set").toBeTruthy();
    expect(pageCode, "GROW_PAGE_CODE_DATABASE must be set").toBeTruthy();

    const result = await createPaymentProcess({
      product: "database",
      fullName: "Vitest QA",
      email: "qa.grow.live@example.com",
    });

    expect(result.authCode).toBeTruthy();
    expect(result.processToken).toBeTruthy();
  }, 30000);
});
