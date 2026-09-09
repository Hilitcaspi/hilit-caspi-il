import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isGrowPaymentRendererReady } from "../client/src/lib/growSdkReadiness";

describe("Grow wallet SDK readiness", () => {
  it("does not treat a partial runtime as payment-ready", () => {
    expect(isGrowPaymentRendererReady({
      growRuntime: {},
      growPayment: {},
    })).toBe(false);
  });

  it("requires renderPaymentOptions to be callable", () => {
    expect(isGrowPaymentRendererReady({
      growRuntime: {},
      growPayment: { renderPaymentOptions: "loading" },
    })).toBe(false);
  });

  it("accepts the SDK only after the public payment renderer is callable", () => {
    expect(isGrowPaymentRendererReady({
      growRuntime: {},
      growPayment: { renderPaymentOptions: () => undefined },
    })).toBe(true);
  });

  it("rechecks renderer readiness after createProcess and before opening Grow", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");
    const createProcessIndex = source.indexOf("const result = await createProcessMutation.mutateAsync");
    const postCreateWaitIndex = source.indexOf("await waitForGrowRuntime(12000);", createProcessIndex);
    const renderIndex = source.indexOf("growPaymentSdk.renderPaymentOptions(result.authCode)", createProcessIndex);

    expect(createProcessIndex).toBeGreaterThan(-1);
    expect(postCreateWaitIndex).toBeGreaterThan(createProcessIndex);
    expect(renderIndex).toBeGreaterThan(postCreateWaitIndex);
  });
});
