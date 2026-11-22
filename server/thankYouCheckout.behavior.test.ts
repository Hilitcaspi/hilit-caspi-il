import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { transformSync } from "esbuild";

const PROOF = "a".repeat(64);
const OTHER_PROOF = "b".repeat(64);

/** Run the actual TSX with mocked hooks/JSX and fail-closed module access. No provider, DB or mail imports. */
function pageHarness(page: "Database" | "NovemberBundle", proof: string | null = PROOF) {
  const states: any[] = [], refs: any[] = [], deps: Array<any[] | undefined> = [], cleanups: any[] = [];
  const effects: Array<() => void> = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, globalProof = proof ?? undefined, unmounted = false;
  const lateStateUpdates = vi.fn();
  const readProof = vi.fn(() => globalProof);
  const getLink = vi.fn().mockResolvedValue({ success: false, url: null, notFound: true });
  const personalLink = vi.fn().mockResolvedValue({ success: true });
  const receipt = vi.fn().mockResolvedValue({ status: "pending" });
  const forbidden = vi.fn(() => { throw new Error("Live network forbidden"); });
  const jsx = (type: any, props: any) => ({ type, props });
  const react = {
    useState(initial: any) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value: any) => {
        if (unmounted) lateStateUpdates();
        states[index] = typeof value === "function" ? value(states[index]) : value;
      }];
    },
    useRef(initial: any) { const index = refIndex++; return refs[index] ??= { current: initial }; },
    useEffect(effect: () => unknown, next?: any[]) {
      const index = effectIndex++;
      if (!next || !deps[index] || next.some((value, i) => !Object.is(value, deps[index]![i]))) {
        deps[index] = next;
        effects.push(() => { if (typeof cleanups[index] === "function") cleanups[index](); cleanups[index] = effect(); });
      }
    },
  };
  const location = { origin: "https://synthetic.example.test", search: "", href: "/thank-you/" };
  const windowMock = { location, setTimeout, clearTimeout };
  const mutation = (mutateAsync: any) => ({ useMutation: () => ({ mutateAsync, isPending: false }) });
  const modules: Record<string, any> = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "framer-motion": { motion: new Proxy({}, { get: (_target, key) => `motion.${String(key)}` }) },
    wouter: { Link: "Link" },
    "lucide-react": Object.fromEntries(["BookOpenCheck", "CheckCircle2", "CircleAlert", "Clock3", "Mail", "RefreshCw", "ShieldCheck"].map(name => [name, name])),
    "@/lib/trpc": { trpc: {
      singles: { getQuestionnaireLink: mutation(getLink), sendDashboardLink: mutation(personalLink) },
      payment: { confirmPurchaseTracking: mutation(receipt), createProcess: mutation(forbidden) },
    } },
    "@/lib/purchaseTracking": { readPurchaseTrackingToken: readProof },
    "@/components/DatabaseExpectations": { default: "DatabaseExpectations" },
    "@/components/LiveVoucherCard": { default: "LiveVoucherCard" },
    "@shared/novemberBundleOffer": { NOVEMBER_BUNDLE_PRODUCT: "bundle_november" },
    "@shared/novemberCampaignCopy": { NOVEMBER_CAMPAIGN_COPY: { course: "המסע לזוגיות" } },
  };
  const context = createContext({
    window: windowMock, document: { title: "" }, URLSearchParams, setTimeout, clearTimeout,
    exports: {}, module: { exports: {} }, fetch: forbidden,
    require: (name: string) => { if (!(name in modules)) throw new Error(`Unmocked module forbidden: ${name}`); return modules[name]; },
  });
  const source = readFileSync(resolve(process.cwd(), `client/src/pages/ThankYou${page}.tsx`), "utf8");
  runInContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, context);
  const Component = (context as any).module.exports.default;
  function nodes(node: any): any[] {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  function text(node: any): string {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node !== "object") return String(node);
    if (Array.isArray(node)) return node.map(text).join(" ");
    return text(node.props?.children);
  }
  function render() {
    stateIndex = refIndex = effectIndex = 0;
    const tree = Component();
    effects.splice(0).forEach(effect => effect());
    const all = nodes(tree);
    return { tree, text: text(tree), nodes: all,
      input: all.find(node => node.type === "input"), form: all.find(node => node.type === "form"),
      button: all.find(node => node.type === "button"),
      spinner: all.find(node => node.props?.className?.includes("animate-spin")),
    };
  }
  render();
  return { render, readProof, getLink, personalLink, receipt, forbidden, lateStateUpdates, location,
    setGlobalProof: (value: string | undefined) => { globalProof = value; },
    submit: (email: string) => {
      render().input.props.onChange({ target: { value: email } });
      return render().form.props.onSubmit({ preventDefault: vi.fn() }) as Promise<void>;
    },
    unmount: () => { unmounted = true; cleanups.forEach(cleanup => { if (typeof cleanup === "function") cleanup(); }); },
  };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("Database thank-you real component, mocked request/timer execution", () => {
  it("snapshots proof on mount, retaining exact normalized email and proof across global clearing and replacement", async () => {
    const h = pageHarness("Database");
    h.setGlobalProof(undefined); // global VerifiedPurchaseTracker has cleared storage before form submission
    const submitted = h.submit("  Buyer@Example.test  ");
    await vi.advanceTimersByTimeAsync(0);
    expect(h.getLink).toHaveBeenCalledOnce();
    expect(h.render().button.props.disabled).toBe(true);
    h.setGlobalProof(OTHER_PROOF);
    h.render().input.props.onChange({ target: { value: "changed@example.test" } });
    for (const delay of [3000, 6000, 9000, 12000]) {
      await vi.advanceTimersByTimeAsync(delay - 1);
      const before = h.getLink.mock.calls.length;
      await vi.advanceTimersByTimeAsync(1);
      expect(h.getLink).toHaveBeenCalledTimes(before + 1);
      h.render();
    }
    await submitted;
    expect(h.getLink).toHaveBeenCalledTimes(5);
    for (const [input] of h.getLink.mock.calls) expect(input).toEqual({ email: "buyer@example.test", origin: h.location.origin, trackingToken: PROOF });
    expect(h.readProof).toHaveBeenCalledOnce();
    expect(h.personalLink).not.toHaveBeenCalled();
    expect(h.render().button.props.disabled).toBe(false);
    expect(h.render().spinner).toBeUndefined();
    expect(h.render().text).toContain("אין לשלם שוב לפני בדיקה");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.getLink).toHaveBeenCalledTimes(5);
    expect(h.forbidden).not.toHaveBeenCalled();
  });

  it("no proof at mount uses private email fallback only, even if unrelated proof appears later", async () => {
    const h = pageHarness("Database", null);
    h.setGlobalProof(OTHER_PROOF);
    await h.submit("Buyer@Example.test");
    expect(h.personalLink).toHaveBeenCalledWith({ email: "buyer@example.test", origin: h.location.origin });
    expect(h.getLink).not.toHaveBeenCalled();
    expect(h.location.href).toBe("/thank-you/");
    expect(h.render().text).not.toMatch(/התשלום עבר בהצלחה|גם שלחנו|דמי הרישום שולמו/);
    expect(h.render().button.props.disabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("unmount cancels the retry wait, resolves the pending submission and ignores late results", async () => {
    const h = pageHarness("Database");
    const submitted = h.submit("buyer@example.test");
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    h.unmount();
    await submitted;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.getLink).toHaveBeenCalledOnce();
    expect(h.lateStateUpdates).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("requires successful server response for navigation and suppresses results after unmount", async () => {
    const h = pageHarness("Database");
    h.getLink.mockResolvedValue({ success: false, url: "https://synthetic.example.test/join/questionnaire" });
    await h.submit("buyer@example.test");
    expect(h.location.href).toBe("/thank-you/");
    let finish!: (value: any) => void;
    h.getLink.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const submitted = h.submit("buyer@example.test");
    h.unmount();
    finish({ success: true, url: "https://synthetic.example.test/join/questionnaire" });
    await submitted;
    expect(h.location.href).toBe("/thank-you/");
    expect(h.lateStateUpdates).not.toHaveBeenCalled();
  });

  it("navigates only on verified access and blocks immediate stale double submits", async () => {
    const h = pageHarness("Database");
    h.render().input.props.onChange({ target: { value: "buyer@example.test" } });
    const submit = h.render().form.props.onSubmit;
    h.getLink.mockResolvedValue({ success: true, url: "https://synthetic.example.test/join/questionnaire?token=server-proof" });
    const first = submit({ preventDefault: vi.fn() });
    await submit({ preventDefault: vi.fn() });
    await first;
    expect(h.getLink).toHaveBeenCalledOnce();
    expect(h.location.href).toContain("token=server-proof");
  });
});

describe("November thank-you real component, bounded receipt checks", () => {
  it("exhausts 90 pending polls, removes spinner, then checks the same proof for only five manual reads", async () => {
    const h = pageHarness("NovemberBundle");
    h.setGlobalProof(undefined);
    await vi.advanceTimersByTimeAsync(180_000);
    expect(h.receipt).toHaveBeenCalledTimes(90);
    expect(h.render().spinner).toBeUndefined();
    expect(h.render().text).toContain("הבדיקה האוטומטית נעצרה");
    expect(h.render().text).not.toContain("יתעדכן אוטומטית כשהאישור");
    expect(h.render().text).not.toContain("התשלום אומת, ברוכים הבאים.");
    const click = h.render().button.props.onClick;
    h.setGlobalProof(OTHER_PROOF);
    click(); click(); // stale double click cannot start two cycles
    h.render();
    await vi.advanceTimersByTimeAsync(12_000);
    expect(h.receipt).toHaveBeenCalledTimes(95);
    expect(h.render().spinner).toBeUndefined();
    expect(h.render().button).toBeDefined();
    for (const [input] of h.receipt.mock.calls) expect(input).toEqual({ trackingToken: PROOF, expectedProduct: "bundle_november" });
    expect(h.readProof).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(h.forbidden).not.toHaveBeenCalled();
    expect(h.personalLink).not.toHaveBeenCalled();
  });

  it("missing proof has no status requests, success claims, auto-update promise, or manual retry", async () => {
    const h = pageHarness("NovemberBundle", null);
    await vi.advanceTimersByTimeAsync(180_000);
    expect(h.receipt).not.toHaveBeenCalled();
    expect(h.render().button).toBeUndefined();
    expect(h.render().spinner).toBeUndefined();
    expect(h.render().text).not.toContain("התשלום אומת");
    expect(h.render().text).toContain("אין לשלם שוב");
  });

  it.each(["confirmed", "already_tracked"])("server %s confirms without claiming email delivery", async status => {
    const h = pageHarness("NovemberBundle");
    h.receipt.mockResolvedValue({ status });
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.render().text).toContain("התשלום אומת");
    expect(h.render().text).toContain("העמוד אינו מאמת שהמייל נשלח");
    expect(h.render().text).not.toMatch(/הקישור הוא אישי ונשלח למייל|יילשלחו|יישלחו/);
    expect(h.render().spinner).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("invalid proof stops and never reveals paid bundle content", async () => {
    const h = pageHarness("NovemberBundle");
    h.receipt.mockResolvedValue({ status: "invalid" });
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.render().text).toContain("לא נמצא אישור תשלום");
    expect(h.render().text).not.toContain("השלמת פרופיל המאגר");
    expect(h.render().spinner).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exhausts repeated network errors with help instead of a permanent spinner", async () => {
    const h = pageHarness("NovemberBundle");
    h.receipt.mockRejectedValue(new Error("Synthetic network rejection"));
    await vi.advanceTimersByTimeAsync(180_000);
    expect(h.receipt).toHaveBeenCalledTimes(90);
    expect(h.render().text).toContain("הבדיקה האוטומטית נעצרה");
    expect(h.render().spinner).toBeUndefined();
  });

  it("bounds hanging manual checks and ignores late confirmation after timeout", async () => {
    const h = pageHarness("NovemberBundle");
    await vi.advanceTimersByTimeAsync(180_000);
    const finishers: Array<(value: any) => void> = [];
    h.receipt.mockImplementation(() => new Promise(resolve => { finishers.push(resolve); }));
    h.render().button.props.onClick(); h.render();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.receipt).toHaveBeenCalledTimes(95);
    expect(h.render().spinner).toBeUndefined();
    finishers.forEach(finish => finish({ status: "confirmed" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(h.render().text).not.toContain("התשלום אומת");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("unmount cancels poll/request timers and ignores late rejection without new polls or state updates", async () => {
    const h = pageHarness("NovemberBundle");
    await vi.advanceTimersByTimeAsync(0);
    let fail!: (reason: any) => void;
    h.receipt.mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(vi.getTimerCount()).toBe(1);
    h.unmount(); fail(new Error("Synthetic late rejection"));
    await vi.advanceTimersByTimeAsync(180_000);
    expect(h.receipt).toHaveBeenCalledTimes(2);
    expect(h.lateStateUpdates).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
