import { afterEach, describe, expect, it } from "vitest";
import {
  acquisitionStorageKeys,
  captureAcquisition,
  getFirstTouchAcquisition,
  getLastUtmAcquisition,
} from "../client/src/lib/acquisitionTracking";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  keys() {
    return [...this.values.keys()];
  }
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

function installBrowser(options: {
  search?: string;
  hostname?: string;
  pathname?: string;
  referrer?: string;
  sessionStorage?: Storage;
  localStorage?: Storage;
}) {
  const sessionStorage = options.sessionStorage ?? new MemoryStorage();
  const localStorage = options.localStorage ?? new MemoryStorage();
  const location = {
    search: options.search ?? "",
    hostname: options.hostname ?? "hilitcaspi.com",
    pathname: options.pathname ?? "/",
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { location, sessionStorage, localStorage },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: { referrer: options.referrer ?? "" },
  });
  return { location, sessionStorage, localStorage };
}

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as { window?: unknown }).window;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else delete (globalThis as { document?: unknown }).document;
});

describe("browser acquisition tracking", () => {
  it("stores an atomic first-touch snapshot separately from the last UTM snapshot", () => {
    const { sessionStorage, localStorage } = installBrowser({
      search: "?utm_source=meta&utm_medium=cpc&utm_campaign=spring&meta_campaign_id=cmp-1&meta_ad_id=ad-9",
    });

    captureAcquisition(1_700_000_000_123);

    const expected = {
      utmSource: "meta",
      utmMedium: "cpc",
      utmCampaign: "spring",
      metaCampaignId: "cmp-1",
      metaAdId: "ad-9",
      capturedAt: 1_700_000_000_123,
    };
    expect(getFirstTouchAcquisition()).toEqual(expected);
    expect(getLastUtmAcquisition()).toEqual(expected);
    expect(JSON.parse(sessionStorage.getItem(acquisitionStorageKeys.firstTouch)!)).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(acquisitionStorageKeys.lastUtm)!)).toEqual(expected);
    expect((sessionStorage as unknown as MemoryStorage).keys()).toEqual([
      acquisitionStorageKeys.lastUtm,
      acquisitionStorageKeys.firstTouch,
    ]);
  });

  it("preserves first touch and replaces, rather than merges, a later last-UTM visit", () => {
    const { location } = installBrowser({ search: "?utm_source=instagram&utm_campaign=first" });
    captureAcquisition(100);

    location.search = "?utm_source=newsletter&utm_medium=email&utm_content=october";
    captureAcquisition(200);

    expect(getFirstTouchAcquisition()).toEqual({
      utmSource: "instagram",
      utmCampaign: "first",
      capturedAt: 100,
    });
    expect(getLastUtmAcquisition()).toEqual({
      utmSource: "newsletter",
      utmMedium: "email",
      utmContent: "october",
      capturedAt: 200,
    });
  });

  it("uses the newest persisted snapshot for last UTM while first touch stays earliest", () => {
    const sessionStorage = new MemoryStorage();
    const localStorage = new MemoryStorage();
    sessionStorage.setItem(acquisitionStorageKeys.firstTouch, JSON.stringify({ utmSource: "first", capturedAt: 10 }));
    localStorage.setItem(acquisitionStorageKeys.firstTouch, JSON.stringify({ utmSource: "later", capturedAt: 20 }));
    sessionStorage.setItem(acquisitionStorageKeys.lastUtm, JSON.stringify({ utmSource: "older", capturedAt: 10 }));
    localStorage.setItem(acquisitionStorageKeys.lastUtm, JSON.stringify({ utmSource: "newer", capturedAt: 20 }));
    installBrowser({
      sessionStorage: sessionStorage as unknown as Storage,
      localStorage: localStorage as unknown as Storage,
    });

    expect(getFirstTouchAcquisition()).toEqual({ utmSource: "first", capturedAt: 10 });
    expect(getLastUtmAcquisition()).toEqual({ utmSource: "newer", capturedAt: 20 });
  });

  it("does not reconstruct a first touch from legacy un-timestamped storage or guess a direct visit", () => {
    const localStorage = new MemoryStorage();
    localStorage.setItem("utm_source", "legacy_paid_source");
    localStorage.setItem("utm_captured_at", "not-a-valid-snapshot");
    installBrowser({ localStorage: localStorage as unknown as Storage });

    captureAcquisition(300);

    expect(getFirstTouchAcquisition()).toBeUndefined();
    expect(getLastUtmAcquisition()).toBeUndefined();
  });

  it("records only an external referrer hostname with referral medium and no full URL", () => {
    installBrowser({
      referrer: "https://news.example/path/to/article?email=person%40example.test",
      hostname: "www.hilitcaspi.com",
    });

    captureAcquisition(400);

    expect(getFirstTouchAcquisition()).toEqual({
      utmSource: "news.example",
      utmMedium: "referral",
      capturedAt: 400,
    });
    expect(getLastUtmAcquisition()).toBeUndefined();
  });

  it.each([
    { hostname: "matchbyhilit.com", pathname: "/" },
    { hostname: "www.matchbyhilit.com", pathname: "/" },
    { hostname: "hilitcaspi.com", pathname: "/en/register" },
  ])("never captures or sends Israeli snapshots on $hostname$pathname", (location) => {
    const localStorage = new MemoryStorage();
    localStorage.setItem(acquisitionStorageKeys.firstTouch, JSON.stringify({ utmSource: "meta", capturedAt: 1 }));
    const browser = installBrowser({ ...location, search: "?utm_source=email", localStorage: localStorage as unknown as Storage });
    captureAcquisition(400);
    expect(getFirstTouchAcquisition()).toBeUndefined();
    expect(getLastUtmAcquisition()).toBeUndefined();
    expect((browser.sessionStorage as unknown as MemoryStorage).keys()).toEqual([]);
    expect(localStorage.keys()).toEqual([acquisitionStorageKeys.firstTouch]);
  });

  it("updates last-visit placement without changing the first campaign", () => {
    const { location } = installBrowser({ search: "?utm_source=meta&utm_medium=cpc&meta_placement=feed" });
    captureAcquisition(400);
    location.search = "?utm_source=meta&utm_medium=cpc&meta_placement=story";
    captureAcquisition(500);
    expect(getFirstTouchAcquisition()?.capturedAt).toBe(400);
    expect(getLastUtmAcquisition()?.metaPlacement).toBe("story");
    expect(getLastUtmAcquisition()?.capturedAt).toBe(500);
  });

  it("does not throw when browser storage is blocked", () => {
    const location = { search: "?utm_source=meta&utm_medium=cpc", hostname: "hilitcaspi.com" };
    const blockedBrowser = { location } as Record<string, unknown>;
    Object.defineProperty(blockedBrowser, "sessionStorage", { get: () => { throw new Error("blocked"); } });
    Object.defineProperty(blockedBrowser, "localStorage", { get: () => { throw new Error("blocked"); } });
    Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: blockedBrowser });
    Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: { referrer: "" } });

    expect(() => captureAcquisition(500)).not.toThrow();
    expect(getFirstTouchAcquisition()).toBeUndefined();
  });
});
