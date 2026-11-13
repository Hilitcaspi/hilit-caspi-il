import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SDK_URL = "https://meshulam.co.il/_media/js/apple_pay_sdk/sdk.min.js";

function scriptDom() {
  const scripts: any[] = [];
  const createElement = vi.fn(() => {
    const attrs = new Map<string, string>();
    const listeners = new Map<string, Set<() => void>>();
    const tag = {
      type: "", async: false, src: "",
      setAttribute: (key: string, value: string) => { attrs.set(key, value); },
      getAttribute: (key: string) => attrs.get(key) ?? null,
      addEventListener: (name: string, callback: () => void) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)!.add(callback);
      },
      removeEventListener: (name: string, callback: () => void) => { listeners.get(name)?.delete(callback); },
      remove: () => { const index = scripts.indexOf(tag); if (index >= 0) scripts.splice(index, 1); },
      emit: (name: string) => { for (const callback of [...listeners.get(name) ?? []]) callback(); },
    };
    return tag;
  });
  const appendChild = vi.fn((tag: any) => { scripts.push(tag); });
  vi.stubGlobal("document", {
    querySelector: () => scripts.find(tag => tag.src === SDK_URL) ?? null,
    createElement,
    head: { appendChild },
  });
  // No SDK/provider execution or network access is permitted in this suite.
  vi.stubGlobal("fetch", () => { throw new Error("Network forbidden"); });
  return { scripts, createElement, appendChild };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function loader() {
  return (await import("../client/src/lib/applePaySdk")).preloadApplePaySDKScript;
}

describe("wallet-only optional Apple Pay SDK preloader", () => {
  it("does nothing on module import, then shares one asynchronous tag and promise across callers", async () => {
    const dom = scriptDom();
    const preload = await loader();
    expect(dom.scripts).toHaveLength(0);
    const first = preload();
    const second = preload();
    expect(second).toBe(first);
    expect(dom.scripts).toHaveLength(1);
    expect(dom.scripts[0]).toMatchObject({ src: SDK_URL, type: "text/javascript", async: true });
    let ready = false;
    void first.then(() => { ready = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(ready).toBe(false);
    dom.scripts[0].emit("load");
    await first;
    expect(preload()).toBe(first);
    expect(dom.createElement).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not skip loading just because a browser-native ApplePaySession already exists", async () => {
    const dom = scriptDom();
    vi.stubGlobal("window", { ApplePaySession: { canMakePayments: vi.fn(() => true) } });
    const preload = await loader();
    const loading = preload();
    let ready = false;
    void loading.then(() => { ready = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(ready).toBe(false);
    expect(dom.scripts).toHaveLength(1);
    dom.scripts[0].emit("load");
    await loading;
  });

  it("accepts successful script load even when ApplePaySession is unavailable (card-only browser)", async () => {
    const dom = scriptDom();
    vi.stubGlobal("window", {});
    const preload = await loader();
    const loading = preload();
    dom.scripts[0].emit("load");
    await expect(loading).resolves.toBeUndefined();
    expect(preload()).toBe(loading);
  });

  it("joins an existing in-flight tag instead of injecting a duplicate", async () => {
    const dom = scriptDom();
    const existing = dom.createElement();
    existing.src = SDK_URL;
    dom.scripts.push(existing);
    const preload = await loader();
    const loading = preload();
    expect(dom.scripts).toHaveLength(1);
    expect(existing.async).toBe(true);
    expect(dom.appendChild).not.toHaveBeenCalled();
    existing.emit("load");
    await loading;
  });

  it("removes failed tags and shares a single clean retry without stale event duplication", async () => {
    const dom = scriptDom();
    const preload = await loader();
    const loading = preload();
    const failed = dom.scripts[0];
    const rejected = expect(loading).rejects.toThrow("Failed to load Apple Pay SDK");
    failed.emit("error");
    await rejected;
    expect(dom.scripts).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    const retry = preload();
    expect(preload()).toBe(retry);
    expect(retry).not.toBe(loading);
    expect(dom.scripts).toHaveLength(1);
    failed.emit("load");
    failed.emit("error");
    expect(dom.scripts).toHaveLength(1);
    dom.scripts[0].emit("load");
    await retry;
    expect(preload()).toBe(retry);
    expect(dom.createElement).toHaveBeenCalledTimes(2);
  });

  it("bounds a hung shared load to 5s total rather than restarting the budget for a later caller", async () => {
    const dom = scriptDom();
    const preload = await loader();
    const loading = preload();
    const rejected = expect(loading).rejects.toThrow("Apple Pay SDK script load timeout");
    await vi.advanceTimersByTimeAsync(4_000);
    expect(preload()).toBe(loading);
    await vi.advanceTimersByTimeAsync(999);
    expect(dom.scripts).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(dom.scripts).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    const retry = preload();
    expect(dom.scripts).toHaveLength(1);
    dom.scripts[0].emit("load");
    await retry;
  });

  it("allows retry after DOM insertion failure without leaving a duplicate", async () => {
    const dom = scriptDom();
    dom.appendChild.mockImplementationOnce(() => { throw new Error("Synthetic insertion failure"); });
    const preload = await loader();
    await expect(preload()).rejects.toThrow("Failed to append Apple Pay SDK script");
    expect(dom.scripts).toHaveLength(0);
    const retry = preload();
    dom.scripts[0].emit("load");
    await retry;
    expect(dom.scripts).toHaveLength(1);
  });

  it("keeps the external Apple SDK out of the parser-blocking HTML shell", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    expect(html).not.toContain(SDK_URL);
    expect(html).not.toContain("apple_pay_sdk");
  });
});
