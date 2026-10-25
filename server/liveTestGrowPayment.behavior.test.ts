import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));

import { createPaymentProcess } from "./growPayment";

function paidDatabaseMemberDb() {
  const profile = { id: 7, gender: "female", isPaid: true, isActive: true, isSeed: false, market: "il" };
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([profile]) })),
      })),
    })),
  };
}

describe("TEST1 one-time Grow process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDb.mockResolvedValue(paidDatabaseMemberDb());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uses a one-time ₪1 authCode flow for Plus rather than a recurring hosted subscription", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      clone: () => ({ text: async () => '{"status":1}' }),
      json: async () => ({ status: 1, data: { authCode: "diagnostic-auth", processToken: "diagnostic-process" } }),
    });
    vi.stubGlobal("fetch", fetch);

    const result = await createPaymentProcess({
      product: "plus",
      fullName: "Synthetic Paid Member",
      email: "member@example.test",
      phone: "0500000000",
      personalToken: "synthetic-personal-token-123456",
      sum: 1,
      diagnosticTest: true,
    });

    expect(result).toEqual({ authCode: "diagnostic-auth", processToken: "diagnostic-process" });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, request] = fetch.mock.calls[0]!;
    expect(String(url)).toContain("createPaymentProcess");
    const form = new URLSearchParams(String(request.body));
    expect(form.get("sum")).toBe("1");
    expect(form.get("paymentNum")).toBe("1");
    expect(form.get("description")).toContain("Database Plus");
    expect(form.get("chargeType")).toBeNull();
    expect(form.get("successUrl")).toContain("?test_checkout=1");
    expect(form.get("successUrl")).not.toContain("/thank-you/plus");
  });

  it("keeps normal Plus subscription configuration separate from the diagnostic marker", () => {
    const source = String(createPaymentProcess);
    expect(source).toContain('input.product === "plus" && !input.diagnosticTest');
    expect(source).toContain('input.diagnosticTest && input.product === "plus" ? "database" : input.product');
  });
});
