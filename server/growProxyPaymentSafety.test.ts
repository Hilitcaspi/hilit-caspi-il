import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";

const logs = vi.hoisted(() => ({ add: vi.fn() }));
const checkoutReservation = vi.hoisted(() => ({ markUncertain: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./routers", () => ({ addToPaymentLogBuffer: logs.add }));
vi.mock("./checkoutReservation", () => ({
  markCheckoutReservationPaymentUncertain: checkoutReservation.markUncertain,
}));

import { registerGrowProxy } from "./_core/growProxy";

type LocalResponse = { status: number; body: string };

type FetchMock = ReturnType<typeof vi.fn>;

function growJson(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function growHtml(status: number, html: string): Response {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function startProxy(): Promise<{ port: number; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  registerGrowProxy(app);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    port,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function requestProxy(
  port: number,
  path: string,
  body: Record<string, string> = { synthetic: "body" },
): Promise<LocalResponse> {
  const encoded = new URLSearchParams(body).toString();
  return new Promise((resolve, reject) => {
    const req = httpRequest({
      hostname: "127.0.0.1",
      port,
      path: `/api/grow-proxy${path}`,
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "content-length": Buffer.byteLength(encoded),
      },
    }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => resolve({ status: res.statusCode || 0, body: responseBody }));
    });
    req.on("error", reject);
    req.end(encoded);
  });
}

function responseJson(response: LocalResponse): any {
  return JSON.parse(response.body);
}

describe("Grow proxy payment retry safety", () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchMock: FetchMock;
  let proxy: Awaited<ReturnType<typeof startProxy>>;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    logs.add.mockReset();
    checkoutReservation.markUncertain.mockReset().mockResolvedValue(undefined);
    proxy = await startProxy();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await proxy.close();
  });

  it("does not replay doPayment after a timeout", async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("timeout"), { name: "AbortError" }));

    const response = await requestProxy(proxy.port, "/doPayment");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(502);
    expect(responseJson(response)).toMatchObject({
      status: false,
      err: { category: "outcome_unknown", message: expect.stringContaining("אין לשלם שוב") },
    });
  });

  it("marks only an opaque doPayment checkout reference uncertain after an ambiguous outcome", async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("timeout"), { name: "AbortError" }));

    const response = await requestProxy(proxy.port, "/doPayment", {
      authCode: "opaque-auth-code",
      processToken: "opaque-process-token",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(checkoutReservation.markUncertain).toHaveBeenCalledOnce();
    expect(checkoutReservation.markUncertain).toHaveBeenCalledWith({
      authCode: "opaque-auth-code",
      processToken: "opaque-process-token",
    });
    expect(responseJson(response).err.category).toBe("outcome_unknown");
    expect(logs.add.mock.calls.flat().join("\n")).not.toContain("opaque-");
  });

  it("does not replay doPayment after HTTP 500", async () => {
    fetchMock.mockResolvedValueOnce(growJson(500, { status: false, err: { id: "provider_error" } }));

    const response = await requestProxy(proxy.port, "/doPayment");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(502);
    expect(responseJson(response).err.category).toBe("outcome_unknown");
  });

  it("does not replay doPayment after a 200 non-JSON edge response", async () => {
    fetchMock.mockResolvedValueOnce(growHtml(200, "<html>gateway page</html>"));

    const response = await requestProxy(proxy.port, "/doPayment");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(502);
    expect(responseJson(response).err.category).toBe("outcome_unknown");
  });

  it("uses the fallback exactly once for doPayment only after proven Incapsula 403 HTML", async () => {
    fetchMock
      .mockResolvedValueOnce(growHtml(403, "<!doctype html><html><body>Incapsula _Incapsula_Resource</body></html>"))
      .mockResolvedValueOnce(growJson(200, { status: true, data: { synthetic: true } }));

    const response = await requestProxy(proxy.port, "/doPayment");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("secure.meshulam.co.il");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("grow-proxy.hilitcaspi.workers.dev");
    expect(response.status).toBe(200);
    expect(responseJson(response)).toMatchObject({ status: true });
  });

  it("retries a read-only drawWalletPageData lookup through the fallback after a timeout", async () => {
    fetchMock
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { name: "AbortError" }))
      .mockResolvedValueOnce(growJson(200, { status: true, data: { wallet: "synthetic" } }));

    const response = await requestProxy(proxy.port, "/drawWalletPageData");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(responseJson(response)).toMatchObject({ status: true });
  });

  it("returns a normal provider JSON success after one upstream call", async () => {
    fetchMock.mockResolvedValueOnce(growJson(200, { status: true, data: { receipt: "synthetic" } }));

    const response = await requestProxy(proxy.port, "/doPayment");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(responseJson(response)).toMatchObject({ status: true });
  });

  it("relays a semantic provider failure without fallback", async () => {
    fetchMock.mockResolvedValueOnce(growJson(200, { status: false, err: { id: "declined" } }));

    const response = await requestProxy(proxy.port, "/doPayment");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(responseJson(response)).toMatchObject({ status: false, err: { id: "declined" } });
  });

  it("keeps query values out of proxy logs", async () => {
    fetchMock.mockResolvedValueOnce(growJson(200, { status: true }));

    await requestProxy(proxy.port, "/doPayment?token=do-not-log", { synthetic: "do-not-log" });

    expect(logs.add.mock.calls.flat().join("\n")).not.toContain("do-not-log");
  });
});
