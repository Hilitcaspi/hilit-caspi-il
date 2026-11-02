import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isGrowPaymentRendererReady, isGrowWalletVisible } from "../client/src/lib/growSdkReadiness";

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

  it("rejects a callable wrapper while native services are still loading", () => {
    const __growServicesLoaded = vi.fn(() => false);
    expect(isGrowPaymentRendererReady({
      growRuntime: {},
      growPayment: { renderPaymentOptions: () => undefined },
      __growServicesLoaded,
    })).toBe(false);
    expect(__growServicesLoaded).toHaveBeenCalledOnce();
  });

  it("fails closed when the window-level native readiness flag is absent or throws", () => {
    const host = {
      growRuntime: { __growServicesLoaded: () => true },
      growPayment: { renderPaymentOptions: () => undefined },
    };
    expect(isGrowPaymentRendererReady(host)).toBe(false);
    expect(isGrowPaymentRendererReady({
      ...host,
      __growServicesLoaded: () => { throw new Error("partial boot"); },
    })).toBe(false);
  });

  it("accepts the SDK only after the callable renderer and all native services are ready", () => {
    expect(isGrowPaymentRendererReady({
      growRuntime: {},
      growPayment: { renderPaymentOptions: () => undefined },
      __growServicesLoaded: () => true,
    })).toBe(true);
  });

  it("does not treat Grow's hidden wallet shell as an open checkout", () => {
    expect(isGrowWalletVisible({ display: "block", visibility: "hidden", opacity: "0" })).toBe(false);
    expect(isGrowWalletVisible({ display: "none", visibility: "visible", opacity: "1" })).toBe(false);
  });

  it("accepts the wallet only after it is visibly open", () => {
    expect(isGrowWalletVisible({ display: "block", visibility: "visible", opacity: "1" })).toBe(true);
  });

  it("rechecks renderer readiness after createProcess and before opening Grow", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");
    const createProcessIndex = source.indexOf("const result = await createProcessMutation.mutateAsync");
    const guardedRenderIndex = source.indexOf("await renderGrowPaymentOptionsWithRetry(result.authCode, logStep, isCurrentAttempt)", createProcessIndex);

    expect(createProcessIndex).toBeGreaterThan(-1);
    expect(guardedRenderIndex).toBeGreaterThan(createProcessIndex);
    expect(source).toContain("for (let attempt = 1; attempt <= 2; attempt++)");
    expect(source).toContain("const GROW_RUNTIME_TIMEOUT_MS = 35_000");
    expect(source).toContain("await waitForGrowRuntime(GROW_RUNTIME_TIMEOUT_MS)");
    expect(source).toContain("await waitForGrowWalletOpen(9000)");
    expect(source).toContain("setWalletLoading(false)");
  });

  it("starts native initialization before waiting for services and creating a process", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");
    const initIndex = source.indexOf("await window.growPayment.init({");
    const waitIndex = source.indexOf("await waitForGrowRuntime(GROW_RUNTIME_TIMEOUT_MS)", initIndex);
    const createIndex = source.indexOf("const result = await createProcessMutation.mutateAsync", waitIndex);
    expect(initIndex).toBeGreaterThan(-1);
    expect(waitIndex).toBeGreaterThan(initIndex);
    expect(createIndex).toBeGreaterThan(waitIndex);
    expect(source).toContain("Date.now() - servicesReadyAt >= 200");
  });

  it("classifies slow SDK readiness separately from createProcess failures", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");
    const initIndex = source.indexOf('let failureStage: "createProcess" | "sdk_failure"');
    const createProcessStageIndex = source.indexOf('failureStage = "createProcess"', initIndex + 1);
    const createProcessIndex = source.indexOf("const result = await createProcessMutation.mutateAsync", createProcessStageIndex);
    const sdkStageIndex = source.indexOf('failureStage = "sdk_failure"', createProcessIndex);
    const reportIndex = source.indexOf("stage: failureStage", sdkStageIndex);

    expect(initIndex).toBeGreaterThan(-1);
    expect(createProcessStageIndex).toBeGreaterThan(initIndex);
    expect(createProcessIndex).toBeGreaterThan(createProcessStageIndex);
    expect(sdkStageIndex).toBeGreaterThan(createProcessIndex);
    expect(reportIndex).toBeGreaterThan(sdkStageIndex);
  });

  it("does not report expected checkout rejections as payment failures", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");
    const catchIndex = source.indexOf("const expectedRejection = isExpectedCheckoutRejection(technicalMessage)");
    const guardIndex = source.indexOf("if (!expectedRejection)", catchIndex);
    const reportIndex = source.indexOf("reportFailureMutation.mutate", guardIndex);

    expect(catchIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(catchIndex);
    expect(reportIndex).toBeGreaterThan(guardIndex);
  });

  it("uses the local proxied SDK instead of the Incapsula-prone CDN runtime", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");

    expect(source).toContain('const GROW_SDK_URL = "/grow-sdk/gs.min.js"');
    expect(source).not.toContain('const GROW_SDK_URL = "https://cdn.meshulam.co.il/sdk/gs.min.js"');
  });
});
