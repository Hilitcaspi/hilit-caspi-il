import { describe, it, expect } from "vitest";

/**
 * Validates that the configured Grow/Meshulam PRODUCTION credentials
 * (GROW_USER_ID + GROW_PAGE_CODE_*) are accepted by secure.meshulam.co.il.
 * A correct credential returns status:1 with an authCode; a wrong one returns
 * error 701 "userId is invalid".
 */
describe("Grow production credentials", () => {
  it("createPaymentProcess returns an authCode against secure.meshulam.co.il", async () => {
    const userId = process.env.GROW_USER_ID;
    const pageCode = process.env.GROW_PAGE_CODE_DATABASE;
    expect(userId, "GROW_USER_ID must be set").toBeTruthy();
    expect(pageCode, "GROW_PAGE_CODE_DATABASE must be set").toBeTruthy();

    const params = new URLSearchParams();
    params.append("pageCode", pageCode!);
    params.append("userId", userId!);
    params.append("sum", "249");
    params.append("description", "vitest credential check");
    params.append("successUrl", "https://hilitcaspi.com/thank-you/database");
    params.append("cancelUrl", "https://hilitcaspi.com");
    params.append("paymentNum", "1");

    const res = await fetch(
      "https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Origin: "https://hilitcaspi.com",
          Referer: "https://hilitcaspi.com/",
        },
      }
    );
    const json = (await res.json()) as any;
    console.log("[GrowLiveTest] response:", JSON.stringify(json).slice(0, 300));
    expect(json.status).toBe(1);
    expect(json.data?.authCode).toBeTruthy();
  }, 30000);
});
