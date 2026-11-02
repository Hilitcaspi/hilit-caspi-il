import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { transformSync } from "esbuild";
import * as readiness from "../client/src/lib/growSdkReadiness";
import * as safety from "../client/src/lib/checkoutSafety";
import * as identity from "../shared/checkoutIdentity";
import { normalizeIsraeliPhone } from "../shared/profileValidation";

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const EXPIRY = "התשלום נכשל: נגמר הזמן לתשלום. אנא רענן את הדף ונסה שנית";
const walletSource = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");

/** Execute the real component with tiny hook/JSX/DOM mocks, not a browser. */
function walletHarness(servicesLoaded = true, visible = true) {
  const storage = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
  };
  const states: any[] = [];
  const refs: any[] = [];
  let stateIndex = 0, refIndex = 0;
  const effects: Array<() => unknown> = [];
  const jsx = (type: any, props: any) => ({ type, props });
  const react = {
    useState(initial: any) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value: any) => {
        states[index] = typeof value === "function" ? value(states[index]) : value;
      }];
    },
    useRef(initial: any) {
      const index = refIndex++;
      return refs[index] ??= { current: initial };
    },
    useEffect(effect: () => unknown) { effects.push(effect); },
    useCallback(callback: any) { return callback; },
    useId: () => "synthetic-wallet",
  };
  let events: Record<string, (response?: any) => void> = {};
  let loaded = servicesLoaded;
  const renderPaymentOptions = vi.fn();
  const init = vi.fn(async (config: any) => { events = config.events; });
  const createProcess = vi.fn().mockResolvedValue({ authCode: "synthetic-auth", processToken: "synthetic-process" });
  const reportFailure = vi.fn();
  const logStep = vi.fn();
  const success = vi.fn();
  const failure = vi.fn();
  const toast = { error: vi.fn(), success: vi.fn(), message: vi.fn() };
  const windowMock = {
    location: { origin: "https://synthetic.example.test", search: "", assign: vi.fn() },
    sessionStorage,
    growRuntime: {},
    growPayment: { init, renderPaymentOptions, updateEvents: vi.fn() },
    __growServicesLoaded: () => loaded,
    getComputedStyle: () => ({ display: "block", visibility: visible ? "visible" : "hidden", opacity: visible ? "1" : "0" }),
  };
  vi.stubGlobal("window", windowMock); // real checkoutSafety uses only synthetic storage
  vi.stubGlobal("crypto", { randomUUID: () => ATTEMPT_ID });
  const mutation = (mutateAsync = vi.fn().mockResolvedValue({}), mutate = vi.fn()) => ({ useMutation: () => ({ mutateAsync, mutate }) });
  const modules: Record<string, any> = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "@/components/ui/checkbox": { Checkbox: "Checkbox" },
    "lucide-react": { Loader2: "Loader2" },
    "@/components/ui/input": { Input: "Input" },
    "@/components/ui/label": { Label: "Label" },
    sonner: { toast },
    "@/lib/trpc": { trpc: {
      coupons: { validate: mutation(), saveLead: mutation() },
      payment: { createProcess: mutation(createProcess), reportFailure: mutation(undefined, reportFailure), logStep: mutation(undefined, logStep) },
    } },
    "@/lib/ga": { gaBeginCheckout: vi.fn() },
    "@/lib/metaPixel": { trackInitiateCheckout: vi.fn() },
    "@/lib/track": { track: vi.fn() },
    "@/lib/growSdkReadiness": readiness,
    "@shared/profileValidation": { normalizeIsraeliPhone },
    "@/lib/purchaseTracking": { getMetaBrowserIdentifiers: () => ({}), rememberPurchaseTrackingToken: vi.fn() },
    "@shared/paymentFailureClassification": { isExpectedCheckoutRejection: () => false },
    "@shared/checkoutIdentity": identity,
    "@/lib/acquisitionTracking": { getFirstTouchAcquisition: () => undefined, getLastUtmAcquisition: () => undefined },
    "@/lib/checkoutSafety": safety,
    "@shared/plusWednesdayOffer": { isPlusBonusCouponCode: () => false },
    "@shared/livePostOffer": { LIVE_POST_DATABASE_CODE: "LIVEPOST", LIVE_POST_PLUS_CODE: "LIVEPOSTPLUS" },
    "../../../shared/boostEntryChannel": { boostEntryChannelFromSearch: () => undefined },
  };
  const context = createContext({
    window: windowMock,
    document: { cookie: "", getElementById: () => visible ? {} : null },
    console: { log: vi.fn(), warn: vi.fn() },
    setInterval, clearInterval, setTimeout, Date,
    exports: {},
    module: { exports: {} },
    require: (name: string) => {
      if (!(name in modules)) throw new Error(`Unmocked import forbidden: ${name}`);
      return modules[name];
    },
    fetch: () => { throw new Error("Network forbidden"); },
  });
  const compiled = transformSync(walletSource, {
    loader: "tsx", format: "cjs", jsx: "automatic", define: { "import.meta.env": "{}" },
  }).code;
  runInContext(compiled, context);
  const Component = (context as any).module?.exports?.default ?? (context as any).exports.default;
  function nodes(node: any): any[] {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  function render() {
    stateIndex = 0; refIndex = 0;
    const tree = Component({ product: "guide", prefillName: "Synthetic Buyer", prefillEmail: "synthetic@example.test", prefillPhone: "0500000000", showCoupon: false, onSuccess: success, onFailure: failure });
    effects.splice(0).forEach(effect => effect());
    return { tree, button: nodes(tree).find(node => node.type === "button" && node.props.onClick), age: nodes(tree).find(node => node.type === "Checkbox") };
  }
  const initial = render();
  initial.age.props.onCheckedChange(true);
  return {
    render, createProcess, renderPaymentOptions, init, reportFailure, logStep, toast, success, failure,
    storage, sessionStorage,
    events: () => events,
    setServicesLoaded: (value: boolean) => { loaded = value; },
    attempt: () => refs.find(ref => ref.current?.attemptId)?.current,
    pay: () => render().button.props.onClick() as Promise<void>,
  };
}

beforeEach(() => {
  safety.resetCheckoutSafetyForTests();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  safety.resetCheckoutSafetyForTests();
});

describe("Grow wallet payment timeout safety (isolated real component)", () => {
  it.each([EXPIRY, "פג תוקף התשלום", "פג  תוקף   התשלום", "נגמר  הזמן   לתשלום"])("recognizes exact Hebrew expiry as unknown: %s", message => {
    expect(readiness.isGrowPaymentOutcomeUnknown({ status: 0, message })).toBe(true);
  });

  it("does not broadly treat unrelated Hebrew validation failures as expiry", () => {
    expect(readiness.isGrowPaymentOutcomeUnknown({ message: "מספר הטלפון אינו תקין" })).toBe(false);
  });

  it("does not create early when wrapper/runtime exist but services are false, then proceeds on true", async () => {
    const h = walletHarness(false);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.init).toHaveBeenCalledOnce();
    expect(h.createProcess).not.toHaveBeenCalled();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    h.setServicesLoaded(true);
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledWith("synthetic-auth");
    expect(h.createProcess.mock.calls[0][0].checkoutAttemptId).toBe(ATTEMPT_ID);
  });

  it("bounds permanently false services without creating a process or a createProcess-stage alert", async () => {
    const h = walletHarness(false);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(35_200);
    await paying;
    expect(h.createProcess).not.toHaveBeenCalled();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    expect(h.reportFailure).toHaveBeenCalledOnce();
    expect(h.reportFailure.mock.calls[0][0].stage).toBe("sdk_failure");
  });

  it.each([
    ["onTimeout", EXPIRY], ["onFailure", EXPIRY], ["onError", EXPIRY],
    ["onTimeout", "פג תוקף התשלום"], ["onFailure", "פג תוקף התשלום"], ["onError", "פג תוקף התשלום"],
  ])("%s keeps expiry '%s' unknown, cached auth/dedupe, and a single failure notification", async (event, message) => {
    const h = walletHarness();
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    const originalAttempt = h.attempt();
    const stored = [...h.storage.entries()];
    h.events()[event]({ status: 0, message });
    h.events().onTimeout({ status: 0, message: EXPIRY });
    h.events().onFailure({ status: 0, message: EXPIRY });
    h.events().onError({ message: EXPIRY });
    h.events().onClose();
    h.events().onCancel();
    h.events().onPaymentCancel();
    h.events().onWalletChange("close");
    expect(h.render().button.props.disabled).toBe(true);
    expect(JSON.stringify(h.render().tree)).toContain("מצב התשלום דורש בדיקה");
    expect(h.attempt()).toBe(originalAttempt);
    expect(h.attempt()).toMatchObject({ authCode: "synthetic-auth", processToken: "synthetic-process", attemptId: ATTEMPT_ID, terminal: false });
    expect([...h.storage.entries()]).toEqual(stored);
    expect(safety.isCheckoutAttemptCompleted(ATTEMPT_ID, h.sessionStorage)).toBe(false);
    expect(h.reportFailure).toHaveBeenCalledOnce();
    expect(h.reportFailure.mock.calls[0][0].stage).toBe("sdk_failure");
    expect(h.toast.error).toHaveBeenCalledOnce();
    expect(h.toast.error.mock.calls[0][0]).toContain("אין לשלם שוב");
    expect(h.failure).toHaveBeenCalledTimes(event === "onError" ? 0 : 1);
    await h.pay();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
  });

  it("onTimeout without a message is also unknown rather than definitely unpaid", async () => {
    const h = walletHarness();
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    h.events().onTimeout({ status: 0 });
    expect(h.render().button.props.disabled).toBe(true);
    expect(h.failure).toHaveBeenCalledOnce();
    expect(h.attempt().terminal).toBe(false);
    expect(h.logStep).toHaveBeenCalledWith(expect.objectContaining({ step: "sdk_timeout", detail: "outcome_unknown" }));
  });

  it("blocks an immediate stale click before the timeout UI has rerendered", async () => {
    const h = walletHarness();
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    const staleClick = h.render().button.props.onClick;
    h.events().onTimeout({ status: 0, message: EXPIRY });
    await staleClick();
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.init).toHaveBeenCalledOnce();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.attempt().outcomeUnknown).toBe(true);
  });

  it("does not blindly redraw after expiry during a hidden first draw or emit a second catch alert", async () => {
    const h = walletHarness(true, false);
    h.renderPaymentOptions.mockImplementation(() => h.events().onTimeout({ status: 0, message: EXPIRY }));
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(20_000);
    await paying;
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.reportFailure).toHaveBeenCalledOnce();
    expect(h.toast.error).toHaveBeenCalledOnce();
    expect(h.failure).toHaveBeenCalledOnce();
    expect(h.render().button.props.disabled).toBe(true);
  });

  it("preserves success callback/coupon snapshot and ignores all later failure/timeout/close events", async () => {
    const h = walletHarness();
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    const response = { status: 1, data: { confirmation_number: "synthetic-confirmation" } };
    h.events().onSuccess(response);
    h.events().onSuccess(response);
    h.events().onTimeout({ status: 0, message: EXPIRY });
    h.events().onFailure({ status: 0, message: EXPIRY });
    h.events().onError({ message: EXPIRY });
    h.events().onClose();
    expect(h.success).toHaveBeenCalledOnce();
    expect(h.success).toHaveBeenCalledWith(response, undefined);
    expect(h.failure).not.toHaveBeenCalled();
    expect(h.reportFailure).not.toHaveBeenCalled();
    expect(h.toast.error).not.toHaveBeenCalled();
    expect(safety.isCheckoutAttemptCompleted(ATTEMPT_ID, h.sessionStorage)).toBe(true);
    await h.pay();
    expect(h.createProcess).toHaveBeenCalledOnce();
  });

  it("keeps ordinary recoverable close/reopen on the same cached process and UUID", async () => {
    const h = walletHarness();
    let paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    h.events().onClose();
    paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions.mock.calls).toEqual([["synthetic-auth"], ["synthetic-auth"]]);
    expect(h.attempt().attemptId).toBe(ATTEMPT_ID);
  });
});

describe("Grow native 1.3.5 boot contract (local SDK in VM, synthetic assets only)", () => {
  it("publishes window-level false during boot and becomes true only when every native asset loads", async () => {
    const appended: any[] = [];
    const windowMock: any = { location: { origin: "https://synthetic.example.test", host: "synthetic.example.test" } };
    windowMock.navigator = { userAgent: "synthetic" };
    const node = () => ({ style: {}, appendChild: vi.fn(), removeAttribute: vi.fn(), setAttribute: vi.fn(), addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } });
    const assets = ["growAP", "growBP", "growCP", "growGP", "growRP", "growGA", "growPB"];
    for (const name of assets) windowMock[name] = { init: vi.fn(), updateCallbacks: vi.fn() };
    const documentMock = {
      body: { appendChild: vi.fn() },
      createElement: node,
      getElementsByTagName: (tag: string) => tag === "head" ? [{ appendChild: (asset: any) => appended.push(asset) }] : [{ parentNode: { insertBefore: (asset: any) => appended.push(asset) } }],
      getElementsByClassName: () => [],
      getElementById: node,
    };
    const fetched: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      fetched.push(url);
      if (url.endsWith("api-versions.json")) return { json: async () => ({ 1: { production: "1.3.5" } }) };
      if (url.endsWith("/html/w.html")) return { text: async () => "<div>synthetic shell</div>" };
      if (url.endsWith("/config/params.json")) return { text: async () => JSON.stringify({ api: { baseUrls: {} } }) };
      throw new Error(`Provider/network request forbidden: ${url}`);
    });
    windowMock.fetch = fetchMock;
    const context = createContext({ window: windowMock, location: windowMock.location, document: documentMock, navigator: { userAgent: "synthetic" }, localStorage: { getItem: () => null }, console: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, fetch: fetchMock, setTimeout, DOMParser: class { parseFromString() { return { body: { firstChild: node() } }; } } });
    runInContext(readFileSync(resolve(process.cwd(), "client/public/grow-sdk/gs.min.js"), "utf8"), context);
    expect(typeof windowMock.growPayment.renderPaymentOptions).toBe("function");
    await windowMock.growPayment.init({ environment: "PRODUCTION", version: 1, events: {} });
    expect(appended).toHaveLength(1);
    expect(windowMock.growRuntime).toBeUndefined(); // init only awaited script injection
    runInContext(readFileSync(resolve(process.cwd(), "client/public/grow-sdk/1.3.5/js/mp.min.js"), "utf8"), context);
    expect(typeof windowMock.__growServicesLoaded).toBe("function");
    expect(windowMock.growRuntime.__growServicesLoaded).toBeUndefined();
    expect(windowMock.__growServicesLoaded()).toBe(false);
    expect(readiness.isGrowPaymentRendererReady(windowMock)).toBe(false);
    const onError = vi.fn();
    windowMock.growRuntime.updateConfig({ environment: "PRODUCTION", version: "1.3.5", events: { onError } });
    windowMock.growPayment.renderPaymentOptions("synthetic-expired-auth");
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith("Wallet not initialized");
    expect(fetched.some(url => url.includes("drawWalletPageData"))).toBe(false);
    appended[0].onload(); // loader calls runtime.init(), which starts service loads
    await vi.advanceTimersByTimeAsync(0);
    expect(windowMock.__growServicesLoaded()).toBe(false);
    const serviceAssets = appended.slice(1);
    expect(serviceAssets).toHaveLength(8); // seven JS + CSS; HTML/config are mock fetches
    serviceAssets.slice(0, -1).forEach(asset => asset.onload({}));
    expect(readiness.isGrowPaymentRendererReady(windowMock)).toBe(false);
    serviceAssets.at(-1).onload({});
    expect(windowMock.__growServicesLoaded()).toBe(true);
    expect(readiness.isGrowPaymentRendererReady(windowMock)).toBe(true);
    await vi.advanceTimersByTimeAsync(500); // actual SDK's deferred DOM listeners
    expect(fetchMock.mock.calls.every(([url]) => url.startsWith("https://synthetic.example.test/grow-sdk/"))).toBe(true);
  });
});
