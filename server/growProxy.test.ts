import { describe, it, expect } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import { registerGrowProxy } from "./_core/growProxy";

/**
 * Regression test for the wallet "hang" bug:
 * The proxy is registered AFTER express.json()/urlencoded(), so it must rebuild
 * the upstream body from req.body (not re-read the consumed stream). This test
 * spins up a tiny express app with the SAME middleware order as production and
 * confirms a createPaymentProcess call returns quickly with status:1 + authCode.
 */
describe("grow proxy (post-body-parser, no hang)", () => {
  it("returns an authCode quickly through the proxy", async () => {
    const app = express();
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));
    registerGrowProxy(app);

    const server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    const port = (server.address() as AddressInfo).port;

    try {
      const body = new URLSearchParams({
        pageCode: process.env.GROW_PAGE_CODE_DATABASE || "b497c06813ac",
        userId: process.env.GROW_USER_ID || "e02cfda4ca3d4736",
        sum: "249",
        description: "vitest proxy check",
        successUrl: "https://hilitcaspi.com/thank-you/database",
        cancelUrl: "https://hilitcaspi.com",
        paymentNum: "1",
      });

      const start = Date.now();
      const res = await fetch(
        `http://127.0.0.1:${port}/api/grow-proxy/api/light/server/1.0/createPaymentProcess`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        },
      );
      const elapsed = Date.now() - start;
      const json = (await res.json()) as any;
      console.log(
        "[GrowProxyTest] elapsed=" + elapsed + "ms resp=" +
          JSON.stringify(json).slice(0, 200),
      );

      // Must NOT hang — well under the old 100s+ freeze.
      expect(elapsed).toBeLessThan(15000);
      expect(res.status).toBe(200);
      expect(json.status).toBe(1);
      expect(json.data?.authCode).toBeTruthy();
    } finally {
      server.close();
    }
  }, 30000);
});
