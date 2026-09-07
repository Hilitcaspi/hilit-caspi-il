import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPaymentProcess,
  getPlusCheckoutConfig,
  PLUS_CHECKOUT_PUBLICLY_AVAILABLE,
  PRODUCT_CONFIGS,
} from "./growPayment";
import { isPotentialPlusCharge } from "./growWebhook";

const originalEnv = {
  productionUserId: process.env.GROW_USER_ID,
  plusUserId: process.env.GROW_PLUS_USER_ID,
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

afterEach(() => {
  restoreEnv("GROW_USER_ID", originalEnv.productionUserId);
  restoreEnv("GROW_PLUS_USER_ID", originalEnv.plusUserId);
  restoreEnv("GROW_PAGE_CODE_PLUS", originalEnv.productionPageCode);
  restoreEnv("GROW_PAGE_CODE_DATABASE", originalEnv.databasePageCode);
  restoreEnv("GROW_SANDBOX_USER_ID", originalEnv.sandboxUserId);
  restoreEnv("GROW_SANDBOX_RECURRING_PAGE_CODE", originalEnv.sandboxPageCode);
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Database Plus hidden checkout", () => {
  it("keeps checkout publicly unavailable even when Production recurring secrets exist", () => {
    process.env.GROW_PLUS_USER_ID = "synthetic-production-user";
    process.env.GROW_PAGE_CODE_PLUS = "synthetic-recurring-page";

    expect(PLUS_CHECKOUT_PUBLICLY_AVAILABLE).toBe(false);
    expect(PRODUCT_CONFIGS.plus.sum).toBe(99);
    expect(getPlusCheckoutConfig()).toEqual({
      configured: false,
      mode: "unconfigured",
      checkoutAmount: null,
      displayAmount: 99,
    });
  });

  it("does not expose Plus while the public availability gate is closed", () => {
    process.env.GROW_PLUS_USER_ID = "synthetic-production-user";
    process.env.GROW_PAGE_CODE_PLUS = "synthetic-production-plus-page";
    process.env.GROW_PAGE_CODE_DATABASE = "synthetic-database-page";

    expect(getPlusCheckoutConfig().configured).toBe(false);
  });

  it("rejects Plus before making any provider request", async () => {
    process.env.GROW_PLUS_USER_ID = "synthetic-production-user";
    process.env.GROW_PAGE_CODE_PLUS = "synthetic-recurring-page";
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({
      product: "plus",
      fullName: "Test Member",
      email: "member@example.com",
      phone: "0500000000",
      origin: "https://preview.example",
      plusWebhookReference: "synthetic-plus-reference",
    })).rejects.toThrow("Database Plus payment product is not configured");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the hidden Plus integration on secure with recurring charge type and Production identifiers", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/growPayment.ts"), "utf8");

    expect(source).toContain('const GROW_PLUS_API_URL = "https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess"');
    expect(source).toContain('const GROW_PLUS_APPROVE_URL = "https://secure.meshulam.co.il/api/light/server/1.0/approveTransaction"');
    expect(source).toContain('process.env.GROW_PLUS_USER_ID?.trim()');
    expect(source).toContain('process.env.GROW_PAGE_CODE_PLUS?.trim()');
    expect(source).toContain('form.append("chargeType", "1")');
    expect(source).toContain('form.append("sum", String(config.sum))');
    expect(source).not.toContain('globalThis.fetch(GROW_SANDBOX_API_URL');
    expect(source).not.toContain('usePlusSandbox');
  });

  it("still recognizes historical Plus webhook amounts for already-created processes", () => {
    expect(isPotentialPlusCharge(99, false)).toBe(true);
    expect(isPotentialPlusCharge(1, true)).toBe(true);
    expect(isPotentialPlusCharge(1, false)).toBe(false);
  });

  it("hides all public Plus routes and purchase links", () => {
    const app = fs.readFileSync(path.join(process.cwd(), "client/src/App.tsx"), "utf8");
    const dashboard = fs.readFileSync(path.join(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");
    const pilotRouter = fs.readFileSync(path.join(process.cwd(), "server/plusPilotRouter.ts"), "utf8");

    expect(app).toContain('<Route path={"/database-plus"} component={NotFound} />');
    expect(app).toContain('<Route path={"/terms/plus"} component={NotFound} />');
    expect(app).toContain('<Route path={"/thank-you/plus"} component={NotFound} />');
    expect(app).not.toContain('import("@/pages/DatabasePlusSales")');
    expect(dashboard).not.toContain("checkoutUrl");
    expect(dashboard).not.toContain("לפרטים ולמסך התשלום");
    expect(pilotRouter).toContain("PLUS_CHECKOUT_PUBLICLY_AVAILABLE && input.status === \"invited\"");
  });
});
