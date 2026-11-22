import { describe, it, expect, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "net";

vi.mock("./routers", () => ({ addToPaymentLogBuffer: vi.fn() }));
vi.mock("./checkoutReservation", () => ({ markCheckoutReservationPaymentUncertain: vi.fn() }));
import { encodeGrowUrlEncodedBody, registerGrowProxy } from "./_core/growProxy";

/** Real local HTTP/body parsers; all provider requests use synthetic responses. */
describe("grow proxy (post-body-parser, no hang)", () => {
  it("rebuilds nested Apple Pay fields with bracket notation", () => {
    const encoded = encodeGrowUrlEncodedBody({
      token_type: "ApplePay",
      initial_payment_id: "payment-id",
      card_token: {
        paymentData: {
          data: "encrypted+payload/with=symbols",
          signature: "signature-value",
          header: { transactionId: "transaction-id" },
        },
        paymentMethod: { network: "Visa", type: "debit" },
      },
    });
    const decoded = new URLSearchParams(encoded);
    expect(decoded.get("card_token[paymentData][data]")).toBe("encrypted+payload/with=symbols");
    expect(decoded.get("card_token[paymentData][header][transactionId]")).toBe("transaction-id");
    expect(decoded.get("card_token[paymentMethod][network]")).toBe("Visa");
    expect(encoded).not.toContain("%5Bobject+Object%5D");
  });

  it("returns a synthetic authCode quickly through the proxy without provider egress", async () => {
    const app = express();
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));
    registerGrowProxy(app);
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const port = (server.address() as AddressInfo).port;
    const localFetch = globalThis.fetch;
    const providerFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 1, data: { authCode: "synthetic-auth-code" },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    // Only the captured native fetch talks to the loopback server. The route
    // itself sees this stub and can never contact a live payment provider.
    globalThis.fetch = providerFetch;
    try {
      const body = new URLSearchParams({
        pageCode: "synthetic-page", userId: "synthetic-user", sum: "299",
        description: "synthetic proxy check", successUrl: "https://example.invalid/thank-you",
        cancelUrl: "https://example.invalid", paymentNum: "1",
      });
      const start = Date.now();
      const res = await localFetch(`http://127.0.0.1:${port}/api/grow-proxy/api/light/server/1.0/createPaymentProcess`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(),
      });
      expect(Date.now() - start).toBeLessThan(25000);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe(1);
      expect(json.data.authCode).toBe("synthetic-auth-code");
      expect(providerFetch).toHaveBeenCalledOnce();
      const upstreamBody = new URLSearchParams(String(providerFetch.mock.calls[0][1].body));
      expect(upstreamBody.get("pageCode")).toBe("synthetic-page");
      expect(upstreamBody.get("sum")).toBe("299");
    } finally {
      globalThis.fetch = localFetch;
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }, 30000);
});
