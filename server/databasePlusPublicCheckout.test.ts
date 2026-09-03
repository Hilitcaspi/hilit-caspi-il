import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPaymentProcess, getPlusCheckoutConfig, PRODUCT_CONFIGS } from "./growPayment";
import { isPotentialPlusCharge } from "./growWebhook";

const originalEnv = {
  nodeEnv: process.env.NODE_ENV,
  productionUserId: process.env.GROW_USER_ID,
  productionPageCode: process.env.GROW_PAGE_CODE_PLUS,
  databasePageCode: process.env.GROW_PAGE_CODE_DATABASE,
  sandboxUserId: process.env.GROW_SANDBOX_USER_ID,
  sandboxPageCode: process.env.GROW_SANDBOX_RECURRING_PAGE_CODE,
};
const originalFetch = globalThis.fetch;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function configureSandboxOnly() {
  delete process.env.GROW_USER_ID;
  delete process.env.GROW_PAGE_CODE_PLUS;
  delete process.env.GROW_PAGE_CODE_DATABASE;
  process.env.GROW_SANDBOX_USER_ID = "synthetic-sandbox-user";
  process.env.GROW_SANDBOX_RECURRING_PAGE_CODE = "synthetic-recurring-page";
}

afterEach(() => {
  restoreEnv("NODE_ENV", originalEnv.nodeEnv);
  restoreEnv("GROW_USER_ID", originalEnv.productionUserId);
  restoreEnv("GROW_PAGE_CODE_PLUS", originalEnv.productionPageCode);
  restoreEnv("GROW_PAGE_CODE_DATABASE", originalEnv.databasePageCode);
  restoreEnv("GROW_SANDBOX_USER_ID", originalEnv.sandboxUserId);
  restoreEnv("GROW_SANDBOX_RECURRING_PAGE_CODE", originalEnv.sandboxPageCode);
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Database Plus public checkout", () => {
  it("keeps the displayed product price at 99 ILS while an isolated Sandbox form uses 1 ILS", () => {
    configureSandboxOnly();
    process.env.NODE_ENV = "test";

    expect(PRODUCT_CONFIGS.plus.sum).toBe(99);
    expect(getPlusCheckoutConfig()).toEqual({
      configured: true,
      mode: "sandbox",
      checkoutAmount: 1,
      displayAmount: 99,
    });
  });

  it("keeps Sandbox available only when no production credentials are configured", () => {
    configureSandboxOnly();
    process.env.NODE_ENV = "production";

    expect(getPlusCheckoutConfig()).toEqual({
      configured: true,
      mode: "sandbox",
      checkoutAmount: 1,
      displayAmount: 99,
    });
  });

  it("prefers a dedicated production Plus page when it is configured", () => {
    process.env.NODE_ENV = "production";
    process.env.GROW_USER_ID = "synthetic-production-user";
    process.env.GROW_PAGE_CODE_PLUS = "synthetic-production-plus-page";
    process.env.GROW_PAGE_CODE_DATABASE = "synthetic-database-page";
    process.env.GROW_SANDBOX_USER_ID = "synthetic-sandbox-user";
    process.env.GROW_SANDBOX_RECURRING_PAGE_CODE = "synthetic-recurring-page";

    expect(getPlusCheckoutConfig()).toEqual({
      configured: true,
      mode: "production",
      checkoutAmount: 99,
      displayAmount: 99,
    });
  });

  it("uses the existing production database page when a dedicated Plus page is not configured", () => {
    process.env.NODE_ENV = "production";
    process.env.GROW_USER_ID = "synthetic-production-user";
    delete process.env.GROW_PAGE_CODE_PLUS;
    process.env.GROW_PAGE_CODE_DATABASE = "synthetic-database-page";
    process.env.GROW_SANDBOX_USER_ID = "synthetic-sandbox-user";
    process.env.GROW_SANDBOX_RECURRING_PAGE_CODE = "synthetic-recurring-page";

    expect(getPlusCheckoutConfig()).toEqual({
      configured: true,
      mode: "production",
      checkoutAmount: 99,
      displayAmount: 99,
    });
  });

  it("recognizes the 99 ILS production amount and isolates the old 1 ILS Sandbox amount", () => {
    expect(isPotentialPlusCharge(99, false)).toBe(true);
    expect(isPotentialPlusCharge(1, true)).toBe(true);
    expect(isPotentialPlusCharge(1, false)).toBe(false);
    expect(isPotentialPlusCharge(19.9, true)).toBe(false);
    expect(isPotentialPlusCharge(299, true)).toBe(false);
  });

  it("creates the hosted Sandbox form on the server when production credentials are absent", async () => {
    configureSandboxOnly();
    process.env.NODE_ENV = "test";

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

  it("creates a 99 ILS recurring Plus process against the production endpoint", async () => {
    process.env.NODE_ENV = "production";
    process.env.GROW_USER_ID = "synthetic-production-user";
    delete process.env.GROW_PAGE_CODE_PLUS;
    process.env.GROW_PAGE_CODE_DATABASE = "synthetic-database-page";

    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess");
      const params = new URLSearchParams(String(init?.body));
      expect(params.get("userId")).toBe("synthetic-production-user");
      expect(params.get("pageCode")).toBe("synthetic-database-page");
      expect(params.get("chargeType")).toBe("1");
      expect(params.get("sum")).toBe("99");
      expect(params.get("description")).toBe("Database Plus - מנוי חודשי");
      expect(params.get("notifyUrl")).toBe("https://hilitcaspi.com/api/grow/webhook?plus_ref=synthetic-plus-reference");
      return new Response(JSON.stringify({
        status: 1,
        data: { authCode: "synthetic-production-auth", processToken: "synthetic-production-process" },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await createPaymentProcess({
      product: "plus",
      fullName: "Production Test Member",
      email: "production.member@example.com",
      phone: "0500000000",
      plusWebhookReference: "synthetic-plus-reference",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      authCode: "synthetic-production-auth",
      processToken: "synthetic-production-process",
    });
  });

  it("keeps the checkout open to everyone while enforcing all three consents and a server-side intent", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "client/src/pages/DatabasePlusSales.tsx"), "utf8");
    const wallet = fs.readFileSync(path.join(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");
    const router = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");
    const webhook = fs.readFileSync(path.join(process.cwd(), "server/growWebhook.ts"), "utf8");
    const index = fs.readFileSync(path.join(process.cwd(), "server/_core/index.ts"), "utf8");
    const thankYou = fs.readFileSync(path.join(process.cwd(), "client/src/pages/ThankYouPlus.tsx"), "utf8");
    const growPayment = fs.readFileSync(path.join(process.cwd(), "server/growPayment.ts"), "utf8");
    const plusBlock = router.slice(router.indexOf('if (input.product === "plus")'), router.indexOf("// Server-side coupon validation"));

    expect(page).toContain("checkoutConfig?.configured && !alreadyActive");
    expect(page).not.toContain("isPersonalLink && plusData?.paymentConfigured");
    expect(page).toContain("אפשר להצטרף ישירות מהעמוד");
    expect(page).toContain("הצטרפות פתוחה לכולם");
    expect(page).not.toContain("לחברים פעילים במאגר בלבד");
    expect(wallet).toContain("if (result.url)");
    expect(wallet).not.toContain("https://hilitcaspi.com/api/plus/recurring-mandate");
    expect(wallet).not.toContain('if (product === "plus") return;');
    expect(wallet).not.toContain('if (product !== "plus") {');
    expect(wallet).toContain("await preloadGrowSDKScript();");
    expect(wallet).toContain("await waitForGrowRuntime(12000);");
    expect(wallet).toContain('typeof growPaymentSdk.renderPaymentOptions !== "function"');
    expect(wallet).toContain("לא ניתן להתחבר כרגע למערכת התשלום");
    expect(wallet).not.toContain("שגיאה ביצירת תהליך תשלום: ${err?.message");
    expect(wallet).toContain('authCode=${result.authCode ? "present" : "missing"}');
    expect(wallet).not.toContain("result.authCode?.slice(0,8)");
    expect(wallet).not.toContain("token=${result.processToken");
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
    expect(growPayment).not.toContain('JSON.stringify(json).slice(0, 500)');
  });
});
