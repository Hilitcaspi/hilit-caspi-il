import { describe, expect, it } from "vitest";

const sandboxUserId = process.env.GROW_SANDBOX_USER_ID;
const sandboxPageCode = process.env.GROW_SANDBOX_RECURRING_PAGE_CODE;
const hasSandboxConfiguration = Boolean(
  process.env.RUN_GROW_SANDBOX_LIVE === "1"
  && sandboxUserId
  && sandboxPageCode,
);

describe.skipIf(!hasSandboxConfiguration)("Database Plus Grow Sandbox configuration", () => {
  it("creates a hosted recurring-payment test form without charging a card", async () => {
    const form = new FormData();
    form.append("userId", sandboxUserId!);
    form.append("pageCode", sandboxPageCode!);
    form.append("chargeType", "1");
    form.append("sum", "1");
    form.append("pageField[invoiceName]", "Sandbox Test User");
    form.append("pageField[fullName]", "Sandbox Test User");
    form.append("pageField[phone]", "0500000000");
    form.append("pageField[email]", "database-plus-sandbox@example.com");

    const response = await fetch(
      "https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess",
      {
        method: "POST",
        headers: { accept: "application/json" },
        body: form,
      },
    );
    const payload = await response.json() as {
      status?: number;
      data?: { url?: string; processToken?: string };
      err?: string;
    };

    expect(response.ok, payload.err || "Grow Sandbox returned a non-success HTTP status").toBe(true);
    expect(payload.status, payload.err || "Grow Sandbox rejected the supplied configuration").toBe(1);
    expect(payload.data?.url).toMatch(/^https:\/\//);
  }, 20_000);
});
