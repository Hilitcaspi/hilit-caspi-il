import { describe, expect, it } from "vitest";

const plusUserId = process.env.GROW_PLUS_USER_ID;
const plusPageCode = process.env.GROW_PAGE_CODE_PLUS;
const hasLiveConfiguration = Boolean(
  process.env.RUN_GROW_PLUS_LIVE === "1"
  && plusUserId
  && plusPageCode,
);

describe.skipIf(!hasLiveConfiguration)("Database Plus Grow Live recurring configuration", () => {
  it("creates a hosted recurring-payment form on secure without charging a card", async () => {
    const form = new FormData();
    form.append("userId", plusUserId!);
    form.append("pageCode", plusPageCode!);
    form.append("chargeType", "1");
    form.append("sum", "99");
    form.append("description", "Database Plus Live Configuration Check");
    form.append("pageField[invoiceName]", "Database Plus Configuration Check");
    form.append("pageField[fullName]", "Database Plus Configuration Check");
    form.append("pageField[phone]", "0500000000");
    form.append("pageField[email]", "database-plus-live-check@example.com");
    form.append("successUrl", "https://hilitcaspi.com/thank-you/plus");
    form.append("cancelUrl", "https://hilitcaspi.com/");
    form.append("notifyUrl", "https://hilitcaspi.com/api/grow/webhook");

    const response = await fetch(
      "https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess",
      {
        method: "POST",
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
          origin: "https://hilitcaspi.com",
          referer: "https://hilitcaspi.com/",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: form,
      },
    );
    const responseText = await response.text();
    const payload = (() => {
      try {
        return JSON.parse(responseText) as {
          status?: number | boolean;
          data?: { url?: string; processToken?: string };
          err?: string;
        };
      } catch {
        throw new Error(`Grow Live returned a non-JSON response (HTTP ${response.status})`);
      }
    })() as {
      status?: number | boolean;
      data?: { url?: string; processToken?: string };
      err?: string;
    };

    expect(response.ok, payload.err || "Grow Live returned a non-success HTTP status").toBe(true);
    expect(
      payload.status === 1 || payload.status === true,
      payload.err || "Grow Live rejected the supplied recurring configuration",
    ).toBe(true);
    expect(payload.data?.url).toMatch(/^https:\/\//);
  }, 20_000);
});
