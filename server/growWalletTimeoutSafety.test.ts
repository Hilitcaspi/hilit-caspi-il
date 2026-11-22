import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { transformSync } from "esbuild";
import * as readiness from "../client/src/lib/growSdkReadiness";
import * as safety from "../client/src/lib/checkoutSafety";
import * as identity from "../shared/checkoutIdentity";
import { normalizeIsraeliPhone } from "../shared/profileValidation";
import * as checkoutFunnel from "../shared/checkoutFunnel";
import * as paymentFailureClassification from "../shared/paymentFailureClassification";

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const EXPIRY = "התשלום נכשל: נגמר הזמן לתשלום. אנא רענן את הדף ונסה שנית";
const walletSource = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");

/** Execute the real component with tiny hook/JSX/DOM mocks, not a browser. */
function walletHarness(servicesLoaded = true, visible = true, withTrackingProof = false,
  opts: { showCoupon?: boolean; validateCoupon?: ReturnType<typeof vi.fn>;
    applePay?: ReturnType<typeof vi.fn>; product?: "guide" | "plus"; prefillCoupon?: string;
    keepDetailsVisible?: boolean } = {}) {
  const storage = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
  };
  const states: any[] = [];
  const refs: any[] = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0;
  const effects: Array<() => unknown> = [];
  const effectDeps: Array<any[] | undefined> = [];
  const cleanups: Array<unknown> = [];
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
    useEffect(effect: () => unknown, deps?: any[]) {
      const index = effectIndex++;
      const previous = effectDeps[index];
      if (!deps || !previous || deps.some((value, i) => !Object.is(value, previous[i]))) {
        effectDeps[index] = deps;
        effects.push(() => {
          if (typeof cleanups[index] === "function") (cleanups[index] as () => void)();
          cleanups[index] = effect();
        });
      }
    },
    useCallback(callback: any) { return callback; },
    useId: () => "synthetic-wallet",
  };
  let events: Record<string, (response?: any) => void> = {};
  let loaded = servicesLoaded;
  let walletVisible = visible;
  const renderPaymentOptions = vi.fn();
  const init = vi.fn(async (config: any) => { events = config.events; });
  const applePay = opts.applePay ?? vi.fn().mockResolvedValue(undefined);
  const createProcess = vi.fn().mockResolvedValue({ authCode: "synthetic-auth", processToken: "synthetic-process",
    ...(withTrackingProof ? { purchaseTrackingToken: "a".repeat(64) } : {}) });
  const checkoutStatus = vi.fn().mockResolvedValue({ status: "pending" });
  const saveLead = vi.fn().mockResolvedValue({});
  const reportFailure = vi.fn();
  const logStep = vi.fn();
  const success = vi.fn();
  const failure = vi.fn();
  const toast = { error: vi.fn().mockReturnValue("unknown-payment-toast"), success: vi.fn(), message: vi.fn(), dismiss: vi.fn() };
  const root = { style: { display: "", removeProperty: vi.fn(function (this: { display: string }, key: string) {
    if (key === "display") this.display = "";
  }) } };
  const windowMock = {
    location: { origin: "https://synthetic.example.test", search: "", assign: vi.fn() },
    sessionStorage,
    growRuntime: {},
    growPayment: { init, renderPaymentOptions, updateEvents: vi.fn() },
    __growServicesLoaded: () => loaded,
    getComputedStyle: () => ({ display: root.style.display || "block", visibility: walletVisible ? "visible" : "hidden", opacity: walletVisible ? "1" : "0" }),
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
      useUtils: () => ({ client: { payment: { checkoutStatus: { query: checkoutStatus } } } }),
      coupons: { validate: mutation(opts.validateCoupon), saveLead: mutation(saveLead) },
      payment: { createProcess: mutation(createProcess), reportFailure: mutation(undefined, reportFailure), logStep: mutation(undefined, logStep) },
    } },
    "@/lib/ga": { gaBeginCheckout: vi.fn() },
    "@/lib/metaPixel": { trackInitiateCheckout: vi.fn() },
    "@/lib/track": { track: vi.fn(), trackCheckoutStage: vi.fn() },
    "@/lib/applePaySdk": { preloadApplePaySDKScript: applePay },
    "@shared/checkoutFunnel": checkoutFunnel,
    "@/lib/growSdkReadiness": readiness,
    "@shared/profileValidation": { normalizeIsraeliPhone },
    "@/lib/purchaseTracking": { getMetaBrowserIdentifiers: () => ({}), rememberPurchaseTrackingToken: vi.fn() },
    "@shared/paymentFailureClassification": paymentFailureClassification,
    "@shared/checkoutIdentity": identity,
    "@/lib/acquisitionTracking": { getFirstTouchAcquisition: () => undefined, getLastUtmAcquisition: () => undefined },
    "@/lib/checkoutSafety": safety,
    "@shared/plusWednesdayOffer": { isPlusBonusCouponCode: () => false },
    "@shared/livePostOffer": { LIVE_POST_DATABASE_CODE: "LIVEPOST", LIVE_POST_PLUS_CODE: "LIVEPOSTPLUS" },
    "../../../shared/boostEntryChannel": { boostEntryChannelFromSearch: () => undefined },
  };
  const context = createContext({
    window: windowMock,
    document: { cookie: "", getElementById: () => root },
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
    stateIndex = 0; refIndex = 0; effectIndex = 0;
    const tree = Component({ product: opts.product ?? "guide", prefillCoupon: opts.prefillCoupon, prefillName: "Synthetic Buyer", prefillEmail: "synthetic@example.test", prefillPhone: "0500000000", showCoupon: opts.showCoupon ?? false, keepDetailsVisible: opts.keepDetailsVisible, onSuccess: success, onFailure: failure });
    effects.splice(0).forEach(effect => effect());
    const all = nodes(tree);
    return { tree, button: all.find(node => node.type === "button" && node.props.onClick && node.props.className?.includes("bg-[#ffe27c]")) ?? all.find(node => node.type === "button" && node.props.onClick),
      age: all.find(node => node.type === "Checkbox"), coupon: all.find(node => node.type === "Input" && String(node.props.id).startsWith("gw-coupon-")),
      name: all.find(node => node.type === "Input" && String(node.props.id).startsWith("gw-name-")),
      email: all.find(node => node.type === "Input" && String(node.props.id).startsWith("gw-email-")),
      phone: all.find(node => node.type === "Input" && String(node.props.id).startsWith("gw-phone-")),
      removeCoupon: all.find(node => node.type === "button" && node.props.children === "✕") };
  }
  const initial = render();
  initial.age.props.onCheckedChange(true);
  return {
    render, createProcess, checkoutStatus, saveLead, renderPaymentOptions, init, applePay, reportFailure, logStep, toast, success, failure, root,
    location: windowMock.location,
    storage, sessionStorage,
    unmount: () => { cleanups.forEach(cleanup => { if (typeof cleanup === "function") cleanup(); }); },
    remount: () => {
      cleanups.forEach(cleanup => { if (typeof cleanup === "function") cleanup(); });
      states.length = refs.length = effectDeps.length = cleanups.length = 0;
      render().age.props.onCheckedChange(true);
    },
    events: () => events,
    setServicesLoaded: (value: boolean) => { loaded = value; },
    setWalletVisible: (value: boolean) => { walletVisible = value; },
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
  it("preloads Apple on wallet mount and an immediate pay click waits for script readiness before draw", async () => {
    let ready!: () => void;
    const applePay = vi.fn(() => new Promise<void>(resolve => { ready = resolve; }));
    // The mocked provider shares the same pending load, like the real loader.
    const shared = applePay();
    applePay.mockReturnValue(shared); applePay.mockClear();
    const h = walletHarness(true, true, false, { applePay });
    expect(applePay).toHaveBeenCalledOnce();
    expect(h.init).not.toHaveBeenCalled();
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    expect(h.init).toHaveBeenCalledOnce();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    ready();
    await vi.advanceTimersByTimeAsync(400); await paying;
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.reportFailure).not.toHaveBeenCalled();
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("bounds optional Apple hang to the shared total 5s boot budget and permits card checkout", async () => {
    const shared = new Promise<void>((_resolve, reject) => {
      setTimeout(() => reject(new Error("Apple Pay SDK script load timeout")), 5_000);
    });
    const h = walletHarness(true, true, false, { applePay: vi.fn().mockReturnValue(shared) });
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(401); await paying;
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.reportFailure).not.toHaveBeenCalled();
    expect(h.toast.error).not.toHaveBeenCalled();
    expect(h.attempt().outcomeUnknown).toBeUndefined();
    expect(h.failure).not.toHaveBeenCalled();
  });

  it("overlaps Apple timeout with slow native boot instead of adding another five seconds", async () => {
    const shared = new Promise<void>((_resolve, reject) => {
      setTimeout(() => reject(new Error("Optional Apple timeout")), 5_000);
    });
    const h = walletHarness(false, true, false, { applePay: vi.fn().mockReturnValue(shared) });
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(6_000);
    expect(h.createProcess).not.toHaveBeenCalled();
    h.setServicesLoaded(true);
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.reportFailure).not.toHaveBeenCalled();
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("ignores optional Apple script failure without outcomeUnknown or operational alerts", async () => {
    const h = walletHarness(true, true, false, { applePay: vi.fn().mockRejectedValue(new Error("Apple script failed")) });
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.reportFailure).not.toHaveBeenCalled();
    expect(h.toast.error).not.toHaveBeenCalled();
    expect(h.failure).not.toHaveBeenCalled();
    expect(h.attempt().outcomeUnknown).toBeUndefined();
  });

  it.each(["unmounted", "stale lease"])("never creates or draws when %s during native boot", async mode => {
    const h = walletHarness(false);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(1_000);
    let other;
    if (mode === "unmounted") h.unmount();
    else {
      safety.releaseCheckoutOwner(h.attempt().lease);
      other = safety.acquireCheckoutOwner("22222222-2222-4222-8222-222222222222", "other-wallet");
    }
    h.setServicesLoaded(true);
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.createProcess).not.toHaveBeenCalled();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    expect(h.reportFailure).not.toHaveBeenCalled();
    if (other) expect(safety.isCheckoutOwner(other)).toBe(true);
  });

  it.each(["unmounted", "stale lease"])("never draws a created process when %s during the optional Apple wait", async mode => {
    let ready!: () => void;
    const shared = new Promise<void>(resolve => { ready = resolve; });
    const h = walletHarness(true, true, false, { applePay: vi.fn().mockReturnValue(shared) });
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    expect(h.createProcess).toHaveBeenCalledOnce();
    let other;
    if (mode === "unmounted") h.unmount();
    else {
      safety.releaseCheckoutOwner(h.attempt().lease);
      other = safety.acquireCheckoutOwner("22222222-2222-4222-8222-222222222222", "other-wallet");
    }
    ready();
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    expect(h.reportFailure).not.toHaveBeenCalled();
    if (other) expect(safety.isCheckoutOwner(other)).toBe(true);
  });

  it("ordinary hosted Plus never preloads or waits for Apple or initializes the embedded wallet", async () => {
    const applePay = vi.fn(() => new Promise<void>(() => {}));
    const h = walletHarness(false, true, false, { product: "plus", applePay });
    h.createProcess.mockResolvedValue({ url: "https://synthetic.example.test/hosted-plus" } as any);
    await h.pay();
    expect(applePay).not.toHaveBeenCalled();
    expect(h.init).not.toHaveBeenCalled();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.location.assign).toHaveBeenCalledWith("https://synthetic.example.test/hosted-plus");
    expect(h.reportFailure).not.toHaveBeenCalled();
  });

  it("validated TEST1 Plus includes Apple readiness and the one-time native wallet", async () => {
    let ready!: () => void;
    const shared = new Promise<void>(resolve => { ready = resolve; });
    const applePay = vi.fn().mockReturnValue(shared);
    const validateCoupon = vi.fn().mockResolvedValue({ valid: true, code: "TEST1", fixedPrice: 1 });
    const h = walletHarness(true, true, false, { product: "plus", prefillCoupon: "TEST1", applePay, validateCoupon });
    expect(applePay).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(0);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    expect(h.init).toHaveBeenCalledOnce();
    expect(h.createProcess).toHaveBeenCalledWith(expect.objectContaining({ product: "plus", couponCode: "TEST1" }));
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    ready();
    await vi.advanceTimersByTimeAsync(400); await paying;
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.location.assign).not.toHaveBeenCalled();
    expect(h.reportFailure).not.toHaveBeenCalled();
    expect(h.saveLead).not.toHaveBeenCalled();
  });

  it("refreshes corrected phone after exact safe rejection, retaining UUID and ignoring retired callbacks", async () => {
    const h = walletHarness(true, true, false, { keepDetailsVisible: true });
    h.createProcess.mockRejectedValueOnce(new Error("PAYMENT_PHONE_INVALID"));
    let paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    const rejectedEvents = h.events();
    const stored = [...h.storage.entries()];
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.createProcess.mock.calls[0][0]).toMatchObject({ phone: "0500000000", checkoutAttemptId: ATTEMPT_ID });
    expect(h.attempt()).toBeUndefined();
    expect(h.render().phone.props.disabled).toBe(false);
    expect(h.reportFailure).not.toHaveBeenCalled();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();

    h.render().phone.props.onChange({ target: { value: "052-1234567" } });
    paying = h.pay();
    // Same-turn second click is still guarded, even before disabled UI commits.
    await h.pay();
    rejectedEvents.onTimeout();
    rejectedEvents.onSuccess({ status: 1, data: { confirmation_number: "123456" } });
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.createProcess).toHaveBeenCalledTimes(2);
    expect(h.createProcess.mock.calls[1][0]).toMatchObject({ email: "synthetic@example.test", phone: "0521234567", checkoutAttemptId: ATTEMPT_ID });
    expect(h.attempt()).toMatchObject({ phone: "0521234567", authCode: "synthetic-auth" });
    expect(h.attempt().outcomeUnknown).toBeUndefined();
    expect([...h.storage.entries()]).toEqual(stored);
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.success).not.toHaveBeenCalled();
    expect(h.saveLead).toHaveBeenCalledTimes(2); // ordinary production behavior retained
  });

  it.each(["remove", "replace"])("snapshots edited name and %s coupon only after safe pre-provider rejection", async mode => {
    const validateCoupon = vi.fn(async ({ code }: { code: string }) => ({ valid: true, code, discountPercent: 10 }));
    const h = walletHarness(true, true, false, { showCoupon: true, keepDetailsVisible: true, validateCoupon });
    h.render().coupon.props.onChange({ target: { value: "OLD10" } });
    await h.pay(); h.render();
    h.createProcess.mockRejectedValueOnce(new Error("PAYMENT_PHONE_INVALID"));
    await vi.advanceTimersByTimeAsync(700);
    expect(h.createProcess.mock.calls[0][0]).toMatchObject({ fullName: "Synthetic Buyer", couponCode: "OLD10" });
    expect(h.attempt()).toBeUndefined();
    h.render().name.props.onChange({ target: { value: "Corrected Buyer" } });
    h.render().removeCoupon.props.onClick();
    if (mode === "replace") h.render().coupon.props.onChange({ target: { value: "NEW10" } });
    const paying = h.pay();
    if (mode === "replace") { await paying; h.render(); }
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.createProcess).toHaveBeenCalledTimes(2);
    expect(h.createProcess.mock.calls[1][0]).toMatchObject({ fullName: "Corrected Buyer", couponCode: mode === "replace" ? "NEW10" : undefined, checkoutAttemptId: ATTEMPT_ID });
    expect(h.attempt().couponCode).toBe(mode === "replace" ? "NEW10" : undefined);
    h.events().onSuccess({ status: 1, data: { confirmation_number: "123456" } });
    expect(h.success).toHaveBeenCalledWith(expect.anything(), mode === "replace" ? "NEW10" : undefined);
  });

  it.each(["fullName", "phone", "couponCode"])("allows refresh after structured tRPC %s input validation before mutation", async field => {
    const h = walletHarness(true, true, false, { keepDetailsVisible: true });
    h.createProcess.mockRejectedValueOnce(Object.assign(new Error(JSON.stringify([
      { code: "custom", path: [field], message: "Synthetic input validation" },
    ])), { data: { code: "BAD_REQUEST", path: "payment.createProcess" } }));
    let paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.attempt()).toBeUndefined();
    h.render().name.props.onChange({ target: { value: "Corrected Buyer" } });
    paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.createProcess).toHaveBeenCalledTimes(2);
    expect(h.createProcess.mock.calls[1][0]).toMatchObject({ fullName: "Corrected Buyer", checkoutAttemptId: ATTEMPT_ID });
    expect(h.reportFailure).not.toHaveBeenCalled();
  });

  it.each([
    "fetch failed: timeout", "Unknown create failure", "HTTP 503",
    "fetch failed: PAYMENT_PHONE_INVALID", "בקשת התשלום כבר נמצאת בעיבוד",
    "כבר נפתח תהליך תשלום עבור בקשה זו",
    "לא ניתן לאמת את מצב התשלום כרגע. לא נפתח תהליך תשלום חדש. אם כבר ניסית לשלם, אין לשלם שוב לפני בדיקה.",
  ])("cannot refresh fields or duplicate after unproven create rejection: %s", async message => {
    const h = walletHarness(true, true, false, { showCoupon: true, keepDetailsVisible: true });
    h.createProcess.mockRejectedValueOnce(new Error(message));
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    const original = h.attempt();
    const stored = [...h.storage.entries()];
    expect(original.outcomeUnknown).toBe(true);
    const view = h.render();
    expect(view.name.props.disabled).toBe(true);
    expect(view.phone.props.disabled).toBe(true);
    expect(view.coupon.props.disabled).toBe(true);
    // Even bypassing disabled mocked DOM handlers cannot reset the attempt.
    view.name.props.onChange({ target: { value: "Changed Buyer" } });
    view.phone.props.onChange({ target: { value: "0521234567" } });
    view.email.props.onChange({ target: { value: "different@example.test" } });
    view.coupon.props.onChange({ target: { value: "NEW10" } });
    h.events().onClose();
    await h.pay();
    expect(h.attempt()).toBe(original);
    expect(original).toMatchObject({ fullName: "Synthetic Buyer", email: "synthetic@example.test", phone: "0500000000", attemptId: ATTEMPT_ID });
    expect([...h.storage.entries()]).toEqual(stored);
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
    expect(h.render().button.props.disabled).toBe(true);
    expect(h.toast.error.mock.calls.some(([text]) => text === "מספר הטלפון אינו תקין. יש לבדוק את הספרות ולנסות שוב.")).toBe(false);
    if (paymentFailureClassification.isExpectedCheckoutRejection(message)) expect(h.reportFailure).not.toHaveBeenCalled();
  });

  it.each(["generic BAD_REQUEST", "wrong endpoint", "non-editable issue"])("does not treat %s as schema proof", async mode => {
    const h = walletHarness();
    const message = mode === "generic BAD_REQUEST" ? "Invalid input" : JSON.stringify([
      { code: "custom", path: [mode === "non-editable issue" ? "checkoutAttemptId" : "phone"], message: "Invalid input" },
    ]);
    h.createProcess.mockRejectedValue(Object.assign(new Error(message), {
      data: { code: "BAD_REQUEST", path: mode === "wrong endpoint" ? "payment.other" : "payment.createProcess" },
    }));
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.attempt().outcomeUnknown).toBe(true);
    await h.pay();
    expect(h.createProcess).toHaveBeenCalledOnce();
  });

  it.each(["processToken", "purchaseTrackingToken", "authCode"])("does not clear safe-looking rejection with existing %s proof", async proof => {
    const h = walletHarness();
    let reject!: (error: Error) => void;
    h.createProcess.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    const original = h.attempt();
    original[proof] = "synthetic-existing-proof";
    reject(new Error("PAYMENT_PHONE_INVALID"));
    await vi.advanceTimersByTimeAsync(0); await paying;
    expect(h.attempt()).toBe(original);
    expect(original.outcomeUnknown).toBe(true);
    await h.pay();
    expect(h.createProcess).toHaveBeenCalledOnce();
  });

  it("never clears exact phone-like SDK failure after a provider process was already created", async () => {
    const h = walletHarness(true, true, true);
    h.renderPaymentOptions.mockImplementation(() => { throw new Error("PAYMENT_PHONE_INVALID"); });
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    const original = h.attempt();
    expect(original).toMatchObject({ outcomeUnknown: true, authCode: "synthetic-auth", processToken: "synthetic-process", purchaseTrackingToken: "a".repeat(64) });
    await h.pay();
    expect(h.attempt()).toBe(original);
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.checkoutStatus).toHaveBeenCalledWith({ trackingToken: "a".repeat(64), processToken: "synthetic-process", expectedProduct: "guide" });
  });

  it("does not clear a late phone rejection after an in-flight close marked the attempt unknown", async () => {
    const h = walletHarness();
    let reject!: (error: Error) => void;
    h.createProcess.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    const original = h.attempt();
    h.events().onClose();
    reject(new Error("PAYMENT_PHONE_INVALID"));
    await vi.advanceTimersByTimeAsync(0); await paying;
    await h.pay();
    expect(h.attempt()).toBe(original);
    expect(original.outcomeUnknown).toBe(true);
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
  });

  it.each([false, true])("preserves closed but open-provider snapshot after edits (email changed: %s)", async changeEmail => {
    const validateCoupon = vi.fn(async ({ code }: { code: string }) => ({ valid: true, code, discountPercent: 10 }));
    const h = walletHarness(true, true, false, { keepDetailsVisible: true, showCoupon: true, validateCoupon });
    let paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    const original = h.attempt();
    const stored = [...h.storage.entries()];
    h.events().onClose();
    h.render().name.props.onChange({ target: { value: "Changed Buyer" } });
    h.render().phone.props.onChange({ target: { value: "0521234567" } });
    if (changeEmail) h.render().email.props.onChange({ target: { value: "different@example.test" } });
    h.render().coupon.props.onChange({ target: { value: "NEW10" } });
    await h.pay(); h.render();
    await vi.advanceTimersByTimeAsync(700);
    expect(h.attempt()).toBe(original);
    expect(original).toMatchObject({ fullName: "Synthetic Buyer", phone: "0500000000", email: "synthetic@example.test", couponCode: undefined, authCode: "synthetic-auth" });
    expect([...h.storage.entries()]).toEqual(stored);
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledTimes(changeEmail ? 1 : 2);
  });

  it.each(["guide", "plus"] as const)("TEST1 %s skips production lead saving even across a safe phone correction", async product => {
    const validateCoupon = vi.fn().mockResolvedValue({ valid: true, code: "TEST1", fixedPrice: 1 });
    const h = walletHarness(true, true, false, { product, prefillCoupon: "TEST1", keepDetailsVisible: true, validateCoupon });
    await vi.advanceTimersByTimeAsync(0);
    h.createProcess.mockRejectedValueOnce(new Error("PAYMENT_PHONE_INVALID"));
    let paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.attempt()).toBeUndefined();
    h.render().phone.props.onChange({ target: { value: "0521234567" } });
    paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.createProcess).toHaveBeenCalledTimes(2);
    expect(h.createProcess.mock.calls[1][0]).toMatchObject({ product, phone: "0521234567", couponCode: "TEST1", checkoutAttemptId: ATTEMPT_ID });
    expect(h.saveLead).not.toHaveBeenCalled();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.location.assign).not.toHaveBeenCalled();
  });

  it.each(["העסקה כבר בוצעה", "התשלום כבר בוצע", "Payment Not Completed", "PaymentNotCompleted", "already charged"])("treats %s as unknown, never paid or safe to replay", message => {
    expect(readiness.isGrowPaymentOutcomeUnknown({ status: 0, message })).toBe(true);
  });

  it("reconciles an ApplePay error from the exact attempt proof and completes once without another charge", async () => {
    const h = walletHarness(true, true, true);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    h.checkoutStatus.mockResolvedValue({ status: "confirmed", product: "guide", amountAgorot: 14900, currency: "ILS", confirmedAt: Date.now() });
    h.events().onError({ message: "העסקה כבר בוצעה" });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.checkoutStatus).toHaveBeenCalledOnce();
    expect(h.checkoutStatus).toHaveBeenCalledWith({ trackingToken: "a".repeat(64), processToken: "synthetic-process", expectedProduct: "guide" });
    expect(h.success).toHaveBeenCalledOnce();
    expect(h.success).toHaveBeenCalledWith({ status: 1, serverVerified: true, product: "guide", amountAgorot: 14900 }, undefined);
    expect(h.toast.dismiss).toHaveBeenCalledOnce();
    expect(h.toast.dismiss).toHaveBeenCalledWith("unknown-payment-toast");
    expect(safety.isCheckoutAttemptCompleted(ATTEMPT_ID, h.sessionStorage)).toBe(true);
    h.events().onError({ message: "another error" });
    h.events().onTimeout();
    h.events().onClose();
    await h.pay();
    expect(h.success).toHaveBeenCalledOnce();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
  });

  it("waits for a delayed server confirmation after a pending response", async () => {
    const h = walletHarness(true, true, true);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    h.checkoutStatus.mockResolvedValueOnce({ status: "pending" }).mockResolvedValue({ status: "confirmed", product: "guide", amountAgorot: 14900, currency: "ILS", confirmedAt: Date.now() });
    h.events().onFailure({ message: "PaymentNotCompleted" });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.success).not.toHaveBeenCalled();
    expect(JSON.stringify(h.render().tree)).toContain("מאמתים את אישור התשלום");
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.success).toHaveBeenCalledOnce();
    expect(h.checkoutStatus).toHaveBeenCalledTimes(2);
    expect(h.createProcess).toHaveBeenCalledOnce();
  });

  it.each(["pending", "invalid", "review", "unavailable"])("never treats %s as unpaid, unlocks, or calls success", async status => {
    const h = walletHarness(true, true, true);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    h.checkoutStatus.mockResolvedValue({ status });
    h.events().onError({ message: "העסקה כבר בוצעה" });
    await vi.advanceTimersByTimeAsync(60000);
    expect(h.checkoutStatus).toHaveBeenCalledTimes(status === "pending" ? 30 : 1);
    expect(h.success).not.toHaveBeenCalled();
    expect(h.attempt().outcomeUnknown).toBe(true);
    expect(h.render().button.props.disabled).toBe(true);
    expect(JSON.stringify(h.render().tree)).toContain("עזרה בבדיקת התשלום בוואטסאפ");
    await h.pay();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
  });

  it("never offers a new purchase after reconciliation ends without unpaid proof", async () => {
    const h = walletHarness(true, true, true);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    h.checkoutStatus.mockResolvedValue({ status: "pending" });
    h.events().onFailure({ message: "PaymentNotCompleted" });
    await vi.advanceTimersByTimeAsync(0);
    // While checking: no retry is offered and paying again is blocked.
    expect(JSON.stringify(h.render().tree)).not.toContain("ניסיון תשלום חדש");
    await vi.advanceTimersByTimeAsync(60000);
    expect(h.checkoutStatus).toHaveBeenCalledTimes(30);
    expect(JSON.stringify(h.render().tree)).not.toContain("ניסיון תשלום חדש");
    expect(JSON.stringify(h.render().tree)).toContain("אין לשלם שוב");
    expect(h.render().button.props.disabled).toBe(true);
    await h.pay();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.success).not.toHaveBeenCalled();
  });

  it("validates a typed but unapplied coupon on the pay click and then continues the same payment", async () => {
    const validateCoupon = vi.fn().mockResolvedValue({ valid: true, code: "LOVE10", discountPercent: 10 });
    const h = walletHarness(true, true, false, { showCoupon: true, validateCoupon });
    h.render().coupon.props.onChange({ target: { value: "love10" } });
    await h.pay();
    expect(validateCoupon).toHaveBeenCalledOnce();
    expect(validateCoupon.mock.calls[0][0]).toMatchObject({ code: "LOVE10", product: "guide" });
    expect(h.createProcess).not.toHaveBeenCalled();
    h.render(); // commit the applied coupon; the pending click continues
    await vi.advanceTimersByTimeAsync(700);
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.createProcess.mock.calls[0][0]).toMatchObject({ couponCode: "LOVE10" });
    h.render();
    await vi.advanceTimersByTimeAsync(700);
    expect(h.createProcess).toHaveBeenCalledOnce();
  });

  it("keeps an invalid typed coupon from opening payment and explains what to do", async () => {
    const validateCoupon = vi.fn().mockResolvedValue({ valid: false, error: "קוד קופון לא תקין" });
    const h = walletHarness(true, true, false, { showCoupon: true, validateCoupon });
    h.render().coupon.props.onChange({ target: { value: "nope" } });
    await h.pay();
    h.render();
    await vi.advanceTimersByTimeAsync(700);
    expect(validateCoupon).toHaveBeenCalledOnce();
    expect(h.createProcess).not.toHaveBeenCalled();
    expect(h.toast.error.mock.calls.at(-1)?.[0]).toContain("קוד ההנחה שהוזן לא הופעל");
    expect(JSON.stringify(h.render().tree)).toContain("קוד קופון לא תקין");
  });

  it.each([
    { product: "database" }, { amountAgorot: 0 }, { amountAgorot: 12.5 },
    { currency: "USD" }, { confirmedAt: 0 }, { confirmedAt: Number.MAX_SAFE_INTEGER },
  ])("rejects malformed or mismatched confirmation %j", async changed => {
    const h = walletHarness(true, true, true);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    h.checkoutStatus.mockResolvedValue({ status: "confirmed", product: "guide", amountAgorot: 14900, currency: "ILS", confirmedAt: Date.now(), ...changed });
    h.events().onError({ message: "error" });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.success).not.toHaveBeenCalled();
    expect(h.attempt().outcomeUnknown).toBe(true);
  });

  it("ignores a late read-only result after the component is unmounted", async () => {
    const h = walletHarness(true, true, true);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    let finish!: (value: any) => void;
    h.checkoutStatus.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    h.events().onError({ message: "error" });
    h.unmount();
    finish({ status: "confirmed", product: "guide", amountAgorot: 14900, currency: "ILS", confirmedAt: Date.now() });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.success).not.toHaveBeenCalled();
    expect(safety.isCheckoutAttemptCompleted(ATTEMPT_ID, h.sessionStorage)).toBe(false);
  });

  it("does not steal an SDK lease held by another wallet when confirmation arrives", async () => {
    const h = walletHarness(true, true, true);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    let finish!: (value: any) => void;
    h.checkoutStatus.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    h.events().onError({ message: "error" });
    const other = safety.acquireCheckoutOwner("22222222-2222-4222-8222-222222222222", "another-wallet");
    finish({ status: "confirmed", product: "guide", amountAgorot: 14900, currency: "ILS", confirmedAt: Date.now() });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.success).not.toHaveBeenCalled();
    expect(safety.isCheckoutOwner(other)).toBe(true);
  });

  it("never consumes the analytics claim or uses a shared tracking token for confirmation", () => {
    expect(walletSource).not.toContain("confirmPurchaseTracking");
    expect(walletSource).not.toContain("readPurchaseTrackingToken");
    expect(walletSource).toContain("attempt.purchaseTrackingToken");
  });

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
    expect(h.failure).not.toHaveBeenCalled();
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
    expect(h.failure).not.toHaveBeenCalled();
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
    expect(h.failure).not.toHaveBeenCalled();
    expect(h.render().button.props.disabled).toBe(true);
  });

  it("preserves success callback/coupon snapshot and ignores all later failure/timeout/close events", async () => {
    const h = walletHarness();
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700);
    await paying;
    const response = { status: 1, data: { confirmation_number: "123456" } };
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

  it.each(["אירעה שגיאה בתהליך", "חיוב העסקה בביט נכשל", "תוצאת התשלום אינה ידועה. אין לשלם שוב לפני בדיקה."])(
    "treats native '%s' as pending until delayed exact-ledger confirmation, never false failure", async message => {
      const h = walletHarness(true, true, true);
      const paying = h.pay();
      await vi.advanceTimersByTimeAsync(700); await paying;
      h.checkoutStatus.mockResolvedValueOnce({ status: "pending" }).mockResolvedValue({
        status: "confirmed", product: "guide", currency: "ILS", amountAgorot: 14900, confirmedAt: Date.now(),
      });
      const staleClick = h.render().button.props.onClick;
      h.events().onFailure({ status: 0, message });
      h.events().onClose(); h.events().onCancel(); h.events().onWalletChange("close");
      await staleClick();
      await vi.advanceTimersByTimeAsync(0);
      expect(h.failure).not.toHaveBeenCalled();
      expect(h.success).not.toHaveBeenCalled();
      expect(h.attempt().outcomeUnknown).toBe(true);
      expect(h.render().button.props.disabled).toBe(true);
      await vi.advanceTimersByTimeAsync(2000);
      expect(h.success).toHaveBeenCalledOnce();
      expect(h.success).toHaveBeenCalledWith(expect.objectContaining({ serverVerified: true }), undefined);
      expect(h.failure).not.toHaveBeenCalled();
      expect(h.createProcess).toHaveBeenCalledOnce();
      expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
      expect(h.toast.dismiss).toHaveBeenCalledWith("unknown-payment-toast");
    },
  );

  it("uses late SDK success only to restart exact read-only verification after the bounded pending window", async () => {
    const h = walletHarness(true, true, true);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    h.events().onTimeout();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.checkoutStatus).toHaveBeenCalledTimes(30);
    expect(h.success).not.toHaveBeenCalled();
    h.checkoutStatus.mockResolvedValue({ status: "confirmed", product: "guide", currency: "ILS", amountAgorot: 14900, confirmedAt: Date.now() });
    h.events().onSuccess({ status: 1, data: { confirmation_number: "123456" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.checkoutStatus).toHaveBeenCalledTimes(31);
    expect(h.success).toHaveBeenCalledOnce();
    expect(h.failure).not.toHaveBeenCalled();
    expect(h.createProcess).toHaveBeenCalledOnce();
  });

  it.each([null, {}, { authCode: "" }, { authCode: {} }, { authCode: "synthetic-auth", processToken: "" }])(
    "blocks malformed process response %j without rendering or extra purchase on close/reclick", async response => {
      const h = walletHarness();
      h.createProcess.mockResolvedValue(response as any);
      const paying = h.pay();
      await vi.advanceTimersByTimeAsync(700); await paying;
      h.events().onClose(); h.events().onPaymentCancel();
      await h.pay();
      await vi.advanceTimersByTimeAsync(1000);
      expect(h.createProcess).toHaveBeenCalledOnce();
      expect(h.renderPaymentOptions).not.toHaveBeenCalled();
      expect(h.attempt().outcomeUnknown).toBe(true);
      expect(h.render().button.props.disabled).toBe(true);
      expect(h.success).not.toHaveBeenCalled();
      expect(h.failure).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, { status: 0 }, { status: 1 }, { status: 1, data: { confirmation_number: "" } }])(
    "does not manufacture paid status from malformed success %j", async response => {
      const h = walletHarness(true, true, true);
      const paying = h.pay();
      await vi.advanceTimersByTimeAsync(700); await paying;
      h.events().onSuccess(response);
      h.events().onClose();
      await h.pay();
      await vi.advanceTimersByTimeAsync(0);
      expect(h.success).not.toHaveBeenCalled();
      expect(safety.isCheckoutAttemptCompleted(ATTEMPT_ID, h.sessionStorage)).toBe(false);
      expect(h.attempt().outcomeUnknown).toBe(true);
      expect(h.createProcess).toHaveBeenCalledOnce();
    },
  );

  it("restores a root hidden by prior verification for a legitimately different checkout owner", async () => {
    const h = walletHarness(true, true, true);
    let paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    h.checkoutStatus.mockResolvedValue({ status: "confirmed", product: "guide", currency: "ILS", amountAgorot: 14900, confirmedAt: Date.now() });
    h.events().onError({ message: "error" });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.root.style.display).toBe("none");
    expect(h.success).toHaveBeenCalledOnce();
    h.storage.clear(); // different synthetic checkout, not an unknown replay
    vi.stubGlobal("crypto", { randomUUID: () => "22222222-2222-4222-8222-222222222222" });
    h.remount();
    paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    expect(h.root.style.removeProperty).toHaveBeenCalledWith("display");
    expect(h.root.style.display).toBe("");
    expect(h.createProcess).toHaveBeenCalledTimes(2);
    expect(h.renderPaymentOptions).toHaveBeenCalledTimes(2);
    expect(h.reportFailure).toHaveBeenCalledOnce(); // prior unknown only
  });

  it("does not unhide a root hidden by somebody else", async () => {
    const h = walletHarness();
    h.root.style.display = "none";
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(50_000); await paying;
    expect(h.root.style.removeProperty).not.toHaveBeenCalled();
    expect(h.root.style.display).toBe("none");
    expect(h.success).not.toHaveBeenCalled();
  });

  it("waits for a slow 18s read/fallback draw to become visible without overlapping redraw or false error", async () => {
    const h = walletHarness(true, false);
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(18_000);
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.reportFailure).not.toHaveBeenCalled();
    h.setWalletVisible(true);
    await vi.advanceTimersByTimeAsync(200); await paying;
    expect(h.renderPaymentOptions).toHaveBeenCalledOnce();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it.each(["onClose", "onCancel", "onPaymentCancel"])(
    "%s during process creation cannot create another purchase or draw its late authorization", async event => {
      const h = walletHarness(true, true, true);
      let finish!: (result: any) => void;
      h.createProcess.mockReturnValue(new Promise(resolve => { finish = resolve; }));
      const paying = h.pay();
      await vi.advanceTimersByTimeAsync(700);
      expect(h.createProcess).toHaveBeenCalledOnce();
      h.events()[event]();
      await h.pay();
      finish({ authCode: "synthetic-auth", processToken: "synthetic-process", purchaseTrackingToken: "a".repeat(64) });
      await vi.advanceTimersByTimeAsync(0); await paying;
      expect(h.createProcess).toHaveBeenCalledOnce();
      expect(h.renderPaymentOptions).not.toHaveBeenCalled();
      expect(h.attempt().outcomeUnknown).toBe(true);
      expect(h.attempt().processToken).toBe("synthetic-process");
      expect(h.checkoutStatus).toHaveBeenCalledOnce();
      expect(h.failure).not.toHaveBeenCalled();
      expect(h.success).not.toHaveBeenCalled();
    },
  );

  it("never replays process creation after a transport timeout", async () => {
    const h = walletHarness();
    h.createProcess.mockRejectedValue(new Error("fetch failed: timeout"));
    const paying = h.pay();
    await vi.advanceTimersByTimeAsync(700); await paying;
    h.events().onClose();
    await h.pay();
    expect(h.createProcess).toHaveBeenCalledOnce();
    expect(h.attempt().outcomeUnknown).toBe(true);
    expect(h.renderPaymentOptions).not.toHaveBeenCalled();
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
