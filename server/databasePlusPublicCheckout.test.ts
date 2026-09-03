import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPaymentProcess, getPlusCheckoutConfig, PRODUCT_CONFIGS } from "./growPayment";
import { isPotentialPlusCharge } from "./growWebhook";

const originalEnv = {
  nodeEnv: process.env.NODE_ENV,
  productionPageCode: process.env.GROW_PAGE_CODE_PLUS,
  sandboxUserId: process.env.GROW_SANDBOX_USER_ID,
  sandboxPageCode: process.env.GROW_SANDBOX_RECURRING_PAGE_CODE,
};
const originalFetch = globalThis.fetch;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  restoreEnv("NODE_ENV", originalEnv.nodeEnv);
  restoreEnv("GROW_PAGE_CODE_PLUS", originalEnv.productionPageCode);
  restoreEnv("GROW_SANDBOX_USER_ID", originalEnv.sandboxUserId);
  restoreEnv("GROW_SANDBOX_RECURRING_PAGE_CODE", originalEnv.sandboxPageCode);
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Database Plus public checkout", () => {
  it("keeps the displayed product price at 99 ILS while an explicitly configured Sandbox form uses 1 ILS", () => {
    delete process.env.GROW_PAGE_CODE_PLUS;
    process.env.NODE_ENV = "test";
    process.env.GROW_SANDBOX_USER_ID = "synthetic-sandbox-user";
    process.env.GROW_SANDBOX_RECURRING_PAGE_CODE = "synthetic-recurring-page";

    expect(PRODUCT_CONFIGS.plus.sum).toBe(99);
    expect(getPlusCheckoutConfig()).toEqual({
      configured: true,
      mode: "sandbox",
      checkoutAmount: 1,
      displayAmount: 99,
    });
  });

  it("keeps the explicitly configured Sandbox available for the published test entry point", () => {
    delete process.env.GROW_PAGE_CODE_PLUS;
    process.env.NODE_ENV = "production";
    process.env.GROW_SANDBOX_USER_ID = "synthetic-sandbox-user";
    process.env.GROW_SANDBOX_RECURRING_PAGE_CODE = "synthetic-recurring-page";

    expect(getPlusCheckoutConfig()).toEqual({
      configured: true,
      mode: "sandbox",
      checkoutAmount: 1,
      displayAmount: 99,
    });
  });

  it("prefers the production recurring page when Grow production configuration is added", () => {
    process.env.NODE_ENV = "production";
    process.env.GROW_PAGE_CODE_PLUS = "synthetic-production-page";
    process.env.GROW_SANDBOX_USER_ID = "synthetic-sandbox-user";
    process.env.GROW_SANDBOX_RECURRING_PAGE_CODE = "synthetic-recurring-page";

    expect(getPlusCheckoutConfig()).toEqual({
      configured: true,
      mode: "production",
      checkoutAmount: 99,
      displayAmount: 99,
    });
  });

  it("recognizes both the 99 ILS launch amount and the explicit 1 ILS Sandbox webhook amount", () => {
    expect(isPotentialPlusCharge(99, false)).toBe(true);
    expect(isPotentialPlusCharge(1, true)).toBe(true);
    expect(isPotentialPlusCharge(1, false)).toBe(false);
    expect(isPotentialPlusCharge(19.9, true)).toBe(false);
    expect(isPotentialPlusCharge(299, true)).toBe(false);
  });

  it("creates the hosted Sandbox form on the server with synthetic customer data", async () => {
    delete process.env.GROW_PAGE_CODE_PLUS;
    process.env.NODE_ENV = "test";
    process.env.GROW_SANDBOX_USER_ID = "synthetic-sandbox-user";
    process.env.GROW_SANDBOX_RECURRING_PAGE_CODE = "synthetic-recurring-page";

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect(form.get("userId")).toBe("synthetic-sandbox-user");
      expect(form.get("pageCode")).toBe("synthetic-recurring-page");
      expect(form.get("chargeType")).toBe("1");
      expect(form.get("sum")).toBe("1");
      expect(form.get("description")).toBe("Database Plus Monthly");
      expect(form.get("notifyUrl")).toBe("https://preview.example/api/grow/webhook?plus_ref=synthetic-plus-reference");
      return new Response(JSON.stringify({
        status: 1,
        data: { url: "https://sandbox.meshulam.co.il/hosted/test", processToken: "synthetic-process-token" },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await createPaymentProcess({
      product: "plus",
      fullName: "Test Member",
      email: "member@example.com",
      phone: "0500000000",
      origin: "https://preview.example",
      plusWebhookReference: "synthetic-plus-reference",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      authCode: "",
      processToken: "synthetic-process-token",
      url: "https://sandbox.meshulam.co.il/hosted/test",
      checkoutMode: "sandbox",
    });
  });

  it("keeps the checkout open to everyone while enforcing all three consents and a server-side intent", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "client/src/pages/DatabasePlusSales.tsx"), "utf8");
    const wallet = fs.readFileSync(path.join(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");
    const router = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");
    const webhook = fs.readFileSync(path.join(process.cwd(), "server/growWebhook.ts"), "utf8");
    const index = fs.readFileSync(path.join(process.cwd(), "server/_core/index.ts"), "utf8");
    const thankYou = fs.readFileSync(path.join(process.cwd(), "client/src/pages/ThankYouPlus.tsx"), "utf8");
    const plusBlock = router.slice(router.indexOf('if (input.product === "plus")'), router.indexOf("// Server-side coupon validation"));

    expect(page).toContain("checkoutConfig?.configured && !alreadyActive");
    expect(page).not.toContain("isPersonalLink && plusData?.paymentConfigured");
    expect(page).toContain("אפשר להצטרף ישירות מהעמוד");
    expect(page).toContain("הצטרפות פתוחה לכולם");
    expect(page).not.toContain("לחברים פעילים במאגר בלבד");
    expect(wallet).toContain("if (result.url)");
    expect(wallet).not.toContain("https://hilitcaspi.com/api/plus/recurring-mandate");
    expect(plusBlock).toContain("input.plusRenewalAccepted !== true");
    expect(plusBlock).toContain("input.plusTermsAccepted !== true");
    expect(plusBlock).toContain("input.plusBoostAccepted !== true");
    expect(plusBlock).toContain("plusCheckoutIntents");
    expect(plusBlock).toContain("createPlusCheckoutReference");
    expect(plusBlock).not.toContain("Plus זמין לחברים פעילים במאגר בלבד");
    expect(plusBlock).not.toContain("assessPlusEligibility");
    expect(index).toContain('req.query.plus_ref === "string"');
    expect(webhook).toContain("verifyPlusCheckoutReference(context.plusCheckoutReference, email)");
    expect(router).toContain("activatePendingPlusAfterRegistration");
    expect(thankYou).toContain("אם עדיין אין פרופיל");
    expect(thankYou).toContain("קישור להשלמת הפרטים והשאלון");
  });
});
