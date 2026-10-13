import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyGrowTransaction } from "./growInquiry";

const originalEnvironment = { ...process.env };

function setProductionCredentials() {
  process.env.NODE_ENV = "production";
  process.env.GROW_USER_ID = "merchantuser";
  process.env.GROW_PAGE_CODE_DATABASE = "databasepage";
}

function mockFetchResponse(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(body),
  });
}

const validInput = {
  product: "database" as const,
  transactionId: "33500000",
  transactionToken: "ecfd7fe4c8a16a1a1a1a1a1a1a1a1",
  expectedAmountAgorot: 1990,
};

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
});

describe("verifyGrowTransaction", () => {
  it("does not call Grow outside production", async () => {
    process.env.NODE_ENV = "development";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyGrowTransaction(validInput)).resolves.toEqual({ state: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call Grow when the product credentials are not configured", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.GROW_USER_ID;
    delete process.env.GROW_PAGE_CODE_DATABASE;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyGrowTransaction(validInput)).resolves.toEqual({ state: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts only documented lookup fields to the official production endpoint and confirms an exact paid sum", async () => {
    setProductionCredentials();
    const fetchMock = mockFetchResponse({
      status: 1,
      data: {
        status: "שולם",
        statusCode: 2,
        sum: "19.90",
        paymentDate: "21/9/23",
        // These deliberately must never appear in the returned value.
        cardSuffix: "1234",
        cardExp: "1111",
        fullName: "Sensitive Customer",
        payerEmail: "customer@example.com",
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyGrowTransaction(validInput)).resolves.toEqual({
      state: "confirmed",
      verified: {
        providerStatus: "שולם",
        providerStatusCode: 2,
        providerAmountAgorot: 1990,
        paymentDate: "21/9/23",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://secure.meshulam.co.il/api/light/server/1.0/getTransactionInfo");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    expect(new URLSearchParams(init.body as string)).toEqual(
      new URLSearchParams({
        userId: "merchantuser",
        pageCode: "databasepage",
        transactionId: validInput.transactionId,
        transactionToken: validInput.transactionToken,
      }),
    );
  });

  it("reports a documented paid transaction with a different sum as a mismatch", async () => {
    setProductionCredentials();
    const fetchMock = mockFetchResponse({
      status: "1",
      data: { status: "שולם", statusCode: "2", sum: "20", paymentDate: "1/10/2026" },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyGrowTransaction(validInput)).resolves.toEqual({
      state: "mismatch",
      verified: {
        providerStatus: "שולם",
        providerStatusCode: 2,
        providerAmountAgorot: 2000,
        paymentDate: "1/10/2026",
      },
    });
  });

  it("does not invent payment confirmation from an undocumented or non-paid response", async () => {
    setProductionCredentials();
    const fetchMock = mockFetchResponse({
      status: 1,
      data: { status: "ממתין", statusCode: 1, sum: "19.90" },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyGrowTransaction(validInput)).resolves.toEqual({ state: "unavailable" });
  });

  it("classifies network failures as unavailable without a fallback request", async () => {
    setProductionCredentials();
    const fetchMock = vi.fn().mockRejectedValue(new Error("provider failure"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyGrowTransaction(validInput)).resolves.toEqual({ state: "unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
