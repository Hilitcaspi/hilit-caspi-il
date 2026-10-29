import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyPaymentFailure: vi.fn().mockResolvedValue(undefined),
  requirePlusDatabaseCheckout: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock("./paymentFailureAlert", () => ({
  notifyPaymentFailure: mocks.notifyPaymentFailure,
}));
vi.mock("./plusDatabaseCheckout", () => ({
  requirePlusDatabaseCheckout: mocks.requirePlusDatabaseCheckout,
}));

import {
  createPaymentProcess,
  isGrowCreateDefinitelyRejected,
  isGrowCreateOutcomeUncertain,
} from "./growPayment";

const originalFetch = globalThis.fetch;
const originalPlusUserId = process.env.GROW_PLUS_USER_ID;
const originalPlusPageCode = process.env.GROW_PAGE_CODE_PLUS;
const customer = {
  fullName: "Synthetic QA",
  email: "synthetic@example.test",
  phone: "0500000000",
};

function reply(status: number, body: string, contentType = "application/json"): Response {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

function enablePlus(): void {
  process.env.GROW_PLUS_USER_ID = "synthetic-plus-user";
  process.env.GROW_PAGE_CODE_PLUS = "synthetic-plus-page";
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("GROW_PLUS_USER_ID", originalPlusUserId);
  restoreEnv("GROW_PAGE_CODE_PLUS", originalPlusPageCode);
  vi.restoreAllMocks();
});

describe("Grow createPaymentProcess ambiguity safeguards", () => {
  it.each(["timeout", "connection reset"])("makes exactly one POST and retains an uncertain outcome after %s", async reason => {
    const fetchMock = vi.fn().mockRejectedValue(new Error(reason));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({ product: "database", ...customer })).rejects.toSatisfy(isGrowCreateOutcomeUncertain);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("secure.meshulam.co.il");
    expect(mocks.notifyPaymentFailure).toHaveBeenCalledOnce();
  });

  it("uses the established fallback only after a confirmed Incapsula 403 block", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(403, "<html>Request unsuccessful - Incapsula</html>", "text/html"))
      .mockResolvedValueOnce(reply(200, JSON.stringify({ status: 1, data: { authCode: "auth-safe", processToken: "process-safe" } })));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({ product: "database", ...customer })).resolves.toMatchObject({
      authCode: "auth-safe",
      processToken: "process-safe",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("grow-proxy.hilitcaspi.workers.dev");
    expect(mocks.notifyPaymentFailure).not.toHaveBeenCalled();
  });

  it("does not repost an ambiguous HTTP 200 HTML response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, "<html>temporary upstream page</html>", "text/html"));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({ product: "database", ...customer })).rejects.toSatisfy(isGrowCreateOutcomeUncertain);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.notifyPaymentFailure).toHaveBeenCalledOnce();
  });

  it("treats a malformed successful response as uncertain without reposting", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, "not json", "application/json"));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({ product: "database", ...customer })).rejects.toSatisfy(isGrowCreateOutcomeUncertain);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.notifyPaymentFailure).toHaveBeenCalledOnce();
  });

  it("requires a Plus process token even when Grow returns a hosted URL", async () => {
    enablePlus();
    const fetchMock = vi.fn().mockResolvedValue(reply(200, JSON.stringify({
      status: true,
      data: { url: "https://secure.meshulam.co.il/hosted-form" },
    })));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({ product: "plus", ...customer, personalToken: "synthetic-personal-token-long-enough" }))
      .rejects.toSatisfy(isGrowCreateOutcomeUncertain);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.notifyPaymentFailure).toHaveBeenCalledOnce();
  });

  it("makes exactly one bounded Plus POST after a timeout", async () => {
    enablePlus();
    const fetchMock = vi.fn().mockRejectedValue(new Error("The operation was aborted"));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({ product: "plus", ...customer, personalToken: "synthetic-personal-token-long-enough" }))
      .rejects.toSatisfy(isGrowCreateOutcomeUncertain);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.notifyPaymentFailure).toHaveBeenCalledOnce();
  });

  it("keeps the normal one-time response flow, price and callbacks intact", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, JSON.stringify({
      status: 1,
      data: { authCode: "auth-normal", processToken: "process-normal" },
    })));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({
      product: "match_boost",
      ...customer,
      webhookReference: "boost-reference",
      personalToken: "personal-token",
    })).resolves.toEqual({ authCode: "auth-normal", processToken: "process-normal" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = String(fetchMock.mock.calls[0][1]?.body);
    expect(body).toContain("sum=19.9");
    expect(body).toContain("paymentNum=1");
    expect(decodeURIComponent(body)).toContain("boost_ref=boost-reference");
    expect(body).toContain("successUrl=");
    expect(mocks.notifyPaymentFailure).not.toHaveBeenCalled();
  });

  it("keeps Plus TEST1 on the normal one-time path without a duplicate POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, JSON.stringify({
      status: 1,
      data: { authCode: "auth-plus-test", processToken: "process-plus-test" },
    })));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({
      product: "plus",
      ...customer,
      diagnosticTest: true,
      personalToken: "synthetic-personal-token-long-enough",
      sum: 1,
    })).resolves.toEqual({ authCode: "auth-plus-test", processToken: "process-plus-test" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = String(fetchMock.mock.calls[0][1]?.body);
    expect(body).toContain("sum=1");
    expect(body).toContain("paymentNum=1");
    expect(decodeURIComponent(body)).toContain("test_checkout=1");
    expect(mocks.notifyPaymentFailure).not.toHaveBeenCalled();
  });

  it("marks explicit provider validation rejection as definitely rejected", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(400, JSON.stringify({
      status: 0,
      err: { id: 946, message: "phone invalid" },
    })));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(createPaymentProcess({ product: "database", ...customer }))
      .rejects.toSatisfy(isGrowCreateDefinitelyRejected);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.notifyPaymentFailure).not.toHaveBeenCalled();
  });
});
