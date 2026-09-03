import { describe, expect, it } from "vitest";

const runLive = process.env.RUN_GROW_PLUS_PRODUCTION_LIVE_TEST === "1";

describe.skipIf(!runLive)("Database Plus Grow production checkout", () => {
  it("accepts the existing production user and database page for a 99 ILS recurring process", async () => {
    const userId = process.env.GROW_USER_ID;
    const pageCode = process.env.GROW_PAGE_CODE_PLUS || process.env.GROW_PAGE_CODE_DATABASE;
    expect(userId, "GROW_USER_ID must be set").toBeTruthy();
    expect(pageCode, "A production Plus or database pageCode must be set").toBeTruthy();

    const form = new FormData();
    form.append("userId", userId!);
    form.append("pageCode", pageCode!);
    form.append("chargeType", "1");
    form.append("sum", "99");
    form.append("description", "Database Plus Monthly");
    form.append("pageField[invoiceName]", "Plus Production Check");
    form.append("pageField[fullName]", "Plus Production Check");
    form.append("pageField[phone]", "0500000000");
    form.append("pageField[email]", "qa-plus@hilitcaspi.com");
    form.append("successUrl", "https://hilitcaspi.com/thank-you/plus");
    form.append("cancelUrl", "https://hilitcaspi.com/database-plus");

    const response = await fetch(
      "https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Origin: "https://hilitcaspi.com",
          Referer: "https://hilitcaspi.com/",
        },
        body: form,
      },
    );
    const payload = await response.json() as any;
    expect(response.ok).toBe(true);
    expect(payload?.status).toBe(1);
    expect(payload?.data?.authCode).toBeTruthy();
    expect(payload?.data?.processToken).toBeTruthy();
  }, 30_000);
});
