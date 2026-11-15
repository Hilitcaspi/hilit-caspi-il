import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquisitionStorageKeys,
  captureAcquisition,
  getFirstTouchAcquisition,
  getLastUtmAcquisition,
  getMarketingUtmParams,
} from "../client/src/lib/acquisitionTracking";
import { getUtmParams as checkoutUtmParams } from "../client/src/lib/utils";
import {
  track,
  trackPageView,
  getLandingPath,
  rememberLandingPath,
} from "../client/src/lib/track";
import { gaViewItem } from "../client/src/lib/ga";
import {
  sanitizeMarketingAttributionValue,
  sanitizeMarketingAttributionSnapshot,
  sanitizeMarketingPagePath,
} from "../shared/marketingAttributionStorage";

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function browser(
  options: {
    search?: string;
    path?: string;
    referrer?: string;
    session?: MemoryStorage;
    local?: MemoryStorage;
  } = {}
) {
  const session = options.session ?? new MemoryStorage();
  const local = options.local ?? new MemoryStorage();
  const location = {
    hostname: "site.example.test",
    pathname: options.path ?? "/",
    search: options.search ?? "",
  };
  const context = {
    location,
    sessionStorage: session,
    localStorage: local,
    dataLayer: [] as Record<string, unknown>[],
  };
  vi.stubGlobal("window", context);
  vi.stubGlobal("document", { referrer: options.referrer ?? "" });
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("localStorage", local);
  // All analytics calls are intercepted. No network request or live tag runs.
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  return { ...context, session, local, fetchMock };
}

function snapshot(
  store: MemoryStorage,
  key: string,
  value: Record<string, unknown>
) {
  store.setItem(key, JSON.stringify(value));
}
function lastTrafficPayload(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetchMock.mock.calls.at(-1)![1].body as string);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("atomic marketing attribution storage", () => {
  it("keeps first touch while direct and internal navigation retain one last bundle for all consumers", () => {
    const b = browser({
      search:
        "?utm_source=google&utm_medium=cpc&utm_campaign=November_2026&utm_content=creative-a&utm_term=general",
    });
    captureAcquisition(100);
    b.location.search = "";
    b.location.pathname = "/join";
    captureAcquisition(200);
    const expected = {
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "November_2026",
      utmContent: "creative-a",
      utmTerm: "general",
    };
    expect(getMarketingUtmParams()).toEqual(expected);
    expect(checkoutUtmParams()).toEqual(expected);
    expect(getFirstTouchAcquisition()).toEqual({
      ...expected,
      capturedAt: 100,
    });
    expect(getLastUtmAcquisition()).toEqual({ ...expected, capturedAt: 100 });
    trackPageView();
    expect(lastTrafficPayload(b.fetchMock)).toMatchObject({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "November_2026",
      page: "/join",
    });
    gaViewItem("database");
    expect(b.dataLayer.at(-1)).toMatchObject({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "November_2026",
      utm_term: "general",
    });
  });

  it("replaces the whole last bundle on a later tagged entry, never filling its missing fields", () => {
    const b = browser({
      search:
        "?utm_source=google&utm_medium=cpc&utm_campaign=old&meta_ad_id=123456789012345",
    });
    captureAcquisition(100);
    snapshot(b.session, acquisitionStorageKeys.lastUtm, {
      utmSource: "older-session",
      utmMedium: "cpc",
      capturedAt: 80,
    });
    b.local.setItem("utm_medium", "legacy-paid");
    b.local.setItem("utm_campaign", "legacy-campaign");
    browser({
      search: "?utm_source=youtube&utm_content=episode-2",
      session: b.session,
      local: b.local,
    });
    captureAcquisition(200);
    expect(getLastUtmAcquisition()).toEqual({
      utmSource: "youtube",
      utmContent: "episode-2",
      capturedAt: 200,
    });
    expect(getMarketingUtmParams()).toEqual({
      utmSource: "youtube",
      utmContent: "episode-2",
    });
    expect(getFirstTouchAcquisition()).toMatchObject({
      utmSource: "google",
      utmCampaign: "old",
      capturedAt: 100,
    });
  });

  it("chooses oldest first/newest last snapshot as whole objects across conflicting stores", () => {
    const b = browser();
    snapshot(b.session, acquisitionStorageKeys.firstTouch, {
      utmSource: "first",
      utmCampaign: "first-campaign",
      capturedAt: 10,
    });
    snapshot(b.local, acquisitionStorageKeys.firstTouch, {
      utmSource: "later",
      capturedAt: 20,
    });
    snapshot(b.session, acquisitionStorageKeys.lastUtm, {
      utmSource: "old",
      utmMedium: "cpc",
      utmCampaign: "old-campaign",
      capturedAt: 10,
    });
    snapshot(b.local, acquisitionStorageKeys.lastUtm, {
      utmSource: "new",
      utmContent: "new-content",
      capturedAt: 20,
    });
    expect(getFirstTouchAcquisition()).toEqual({
      utmSource: "first",
      utmCampaign: "first-campaign",
      capturedAt: 10,
    });
    expect(getMarketingUtmParams()).toEqual({
      utmSource: "new",
      utmContent: "new-content",
    });
  });

  it("does not silently migrate unverifiable legacy keys even with a global capture time", () => {
    const b = browser();
    b.session.setItem("utm_source", "legacy-source");
    b.local.setItem("utm_medium", "cpc");
    b.local.setItem("utm_campaign", "unrelated-visit");
    b.local.setItem("utm_captured_at", "1700000000000");
    captureAcquisition(500);
    expect(getFirstTouchAcquisition()).toBeUndefined();
    expect(getLastUtmAcquisition()).toBeUndefined();
    expect(getMarketingUtmParams()).toEqual({});
    trackPageView();
    expect(lastTrafficPayload(b.fetchMock).utmSource).toBeUndefined();
    gaViewItem("database");
    expect(b.dataLayer.at(-1)?.utm_source ?? undefined).toBeUndefined();
    expect(b.local.getItem(acquisitionStorageKeys.firstTouch)).toBeNull();
    expect(b.local.getItem(acquisitionStorageKeys.lastUtm)).toBeNull();
  });

  it.each([
    { search: "?utm_source=google&utm_medium=cpc", path: "/guide" },
    { search: "?utm_source=site_upsell&utm_medium=onsite", path: "/join" },
  ])(
    "does not overwrite from same-origin internal entry tags: $search",
    options => {
      const local = new MemoryStorage();
      snapshot(local, acquisitionStorageKeys.lastUtm, {
        utmSource: "newsletter",
        utmMedium: "email",
        capturedAt: 100,
      });
      browser({
        ...options,
        local,
        referrer:
          "https://site.example.test/article?email=synthetic%40example.test",
      });
      captureAcquisition(200);
      expect(getMarketingUtmParams()).toEqual({
        utmSource: "newsletter",
        utmMedium: "email",
      });
      expect(getFirstTouchAcquisition()).toBeUndefined();
    }
  );

  it("does not replace an acquisition snapshot when SPA navigation adds internal UTM tags", () => {
    const b = browser({ search: "?utm_source=instagram&utm_campaign=first" });
    captureAcquisition(100);
    b.location.pathname = "/guide";
    b.location.search =
      "?utm_source=google&utm_medium=cpc&utm_campaign=internal";
    captureAcquisition(200);
    expect(getMarketingUtmParams()).toEqual({
      utmSource: "instagram",
      utmCampaign: "first",
    });
    expect(getFirstTouchAcquisition()?.capturedAt).toBe(100);
  });

  it("does not recapture after internal navigation returns to the original entry path", () => {
    const b = browser({ search: "?utm_source=instagram&utm_campaign=first" });
    captureAcquisition(100);
    b.location.pathname = "/guide";
    captureAcquisition(200);
    b.location.pathname = "/";
    b.location.search = "?utm_source=google&utm_campaign=internal-return";
    captureAcquisition(300);
    expect(getLastUtmAcquisition()).toEqual({
      utmSource: "instagram",
      utmCampaign: "first",
      capturedAt: 100,
    });
  });

  it("explicitly clears fields absent from a later bundle in the persistent GTM data model", () => {
    const first = browser({
      search:
        "?utm_source=google&utm_medium=cpc&utm_campaign=old&utm_term=old-term",
    });
    captureAcquisition(100);
    gaViewItem("database");
    const second = browser({
      search: "?utm_source=youtube",
      session: first.session,
      local: first.local,
    });
    captureAcquisition(200);
    gaViewItem("database");
    expect(second.dataLayer.at(-1)).toMatchObject({
      utm_source: "youtube",
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    });
    const gtmState = Object.assign(
      {},
      first.dataLayer.at(-1),
      second.dataLayer.at(-1)
    );
    expect(gtmState.utm_campaign).toBeNull();
    expect(gtmState.utm_term).toBeNull();
  });

  it("never infers an organic or verified channel or persists click IDs from a tagged URL", () => {
    const b = browser({
      search:
        "?utm_source=google&utm_medium=cpc&gclid=synthetic-click&gbraid=synthetic-braid&wbraid=synthetic-web",
      referrer: "https://search.example.test/?q=synthetic",
    });
    captureAcquisition(100);
    expect(getLastUtmAcquisition()).toEqual({
      utmSource: "google",
      utmMedium: "cpc",
      capturedAt: 100,
    });
    expect(JSON.stringify(Array.from(b.local.values))).not.toMatch(
      /gclid|gbraid|wbraid|synthetic-click|sourceVerified|organic/
    );
  });

  it("uses hostname-only referral evidence, not organic classification, even with untagged click-ID presence", () => {
    const b = browser({
      search: "?gclid=synthetic-click",
      referrer:
        "https://search.example.test/path?email=synthetic%40example.test&q=private",
    });
    captureAcquisition(100);
    expect(getFirstTouchAcquisition()).toEqual({
      utmSource: "search.example.test",
      utmMedium: "referral",
      capturedAt: 100,
    });
    expect(getLastUtmAcquisition()).toBeUndefined();
    expect(JSON.stringify(Array.from(b.local.values))).not.toMatch(
      /private|synthetic-click|email|organic/
    );
  });

  it("retains existing Meta campaign/ad-set/ad IDs, placement, and source-name fields", () => {
    browser({
      search:
        "?utm_source=meta&meta_campaign_id=123456789012345&meta_adset_id=234567890123456&meta_ad_id=345678901234567&meta_placement=instagram_story&site_source_name=ig",
    });
    captureAcquisition(100);
    expect(getLastUtmAcquisition()).toEqual({
      utmSource: "meta",
      metaCampaignId: "123456789012345",
      metaAdSetId: "234567890123456",
      metaAdId: "345678901234567",
      metaPlacement: "instagram_story",
      siteSourceName: "ig",
      capturedAt: 100,
    });
    expect(getFirstTouchAcquisition()?.metaAdId).toBe("345678901234567");
    expect(getFirstTouchAcquisition()).not.toHaveProperty("metaPlacement");
  });

  it("sanitizes persisted fields and keeps the first timestamp rather than replacing redacted history", () => {
    const b = browser({ search: "?utm_source=newsletter" });
    snapshot(b.local, acquisitionStorageKeys.firstTouch, {
      utmSource: "synthetic@example.test",
      capturedAt: 10,
      sourceVerified: true,
      gclid: "synthetic-id",
    });
    snapshot(b.local, acquisitionStorageKeys.lastUtm, {
      utmSource: "youtube",
      utmCampaign: "synthetic@example.test",
      capturedAt: 20,
    });
    captureAcquisition(30);
    expect(getFirstTouchAcquisition()).toEqual({ capturedAt: 10 });
    expect(getLastUtmAcquisition()).toEqual({
      utmSource: "newsletter",
      capturedAt: 30,
    });
    expect(
      sanitizeMarketingAttributionSnapshot({
        utmSource: "youtube",
        utmCampaign: "synthetic@example.test",
        capturedAt: 20,
        gclid: "synthetic-id",
        sourceVerified: true,
      })
    ).toEqual({ utmSource: "youtube", capturedAt: 20 });
  });

  it("ignores malformed storage and tolerates both blocked property access and write failure", () => {
    const b = browser({ search: "?utm_source=youtube&utm_campaign=episode" });
    b.local.setItem(acquisitionStorageKeys.lastUtm, "{invalid");
    Object.defineProperty(window, "localStorage", {
      get: () => {
        throw new Error("blocked");
      },
    });
    Object.defineProperty(window, "sessionStorage", {
      get: () => {
        throw new Error("blocked");
      },
    });
    expect(() => captureAcquisition(100)).not.toThrow();
    expect(getMarketingUtmParams()).toEqual({
      utmSource: "youtube",
      utmCampaign: "episode",
    });
    expect(() => trackPageView()).not.toThrow();
    expect(lastTrafficPayload(b.fetchMock)).toMatchObject({
      utmSource: "youtube",
      utmCampaign: "episode",
    });
  });

  it("tolerates storage write errors and uses current sanitized tags without adding a persistence fallback", () => {
    const b = browser({ search: "?utm_source=youtube&utm_campaign=episode" });
    vi.spyOn(b.session, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(b.local, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => captureAcquisition(100)).not.toThrow();
    expect(getFirstTouchAcquisition()).toBeUndefined();
    expect(getLastUtmAcquisition()).toBeUndefined();
    expect(getMarketingUtmParams()).toEqual({
      utmSource: "youtube",
      utmCampaign: "episode",
    });
    expect(b.local.values.size).toBe(0);
  });

  it("is browserless-safe and does not leak Israeli persisted attribution into English routes", () => {
    vi.stubGlobal("window", undefined);
    expect(() => captureAcquisition(100)).not.toThrow();
    expect(getMarketingUtmParams()).toEqual({});
    const b = browser({ path: "/en/join", search: "?utm_source=youtube" });
    snapshot(b.local, acquisitionStorageKeys.lastUtm, {
      utmSource: "israel-only",
      utmCampaign: "old",
      capturedAt: 10,
    });
    b.local.setItem("utm_medium", "stale-legacy");
    captureAcquisition(100);
    expect(getFirstTouchAcquisition()).toBeUndefined();
    expect(getLastUtmAcquisition()).toBeUndefined();
    expect(getMarketingUtmParams()).toEqual({ utmSource: "youtube" });
    expect(
      JSON.parse(b.local.getItem(acquisitionStorageKeys.lastUtm)!)
    ).toEqual({ utmSource: "israel-only", utmCampaign: "old", capturedAt: 10 });
  });

  it("uses explicit tracking override fields atomically and sanitizes them without changing other tracking fields", () => {
    const b = browser({
      search: "?utm_source=google&utm_medium=cpc&utm_campaign=old",
    });
    captureAcquisition(100);
    track({
      eventType: "button_click",
      utmSource: "newsletter",
      metadata: { action: "synthetic_action" },
    });
    expect(lastTrafficPayload(b.fetchMock)).toEqual({
      eventType: "button_click",
      utmSource: "newsletter",
      page: "/",
      metadata: { action: "synthetic_action" },
    });
    track({
      eventType: "button_click",
      utmSource: "synthetic@example.test",
      utmCampaign: "answer: private",
      page: "/dna-quiz?email=synthetic@example.test",
    });
    expect(lastTrafficPayload(b.fetchMock)).toEqual({
      eventType: "button_click",
      page: "/dna-quiz",
    });
  });

  it("redacts page URLs and stored landing paths containing synthetic personal identifiers", () => {
    const b = browser({ path: "/profile/synthetic%40example.test" });
    trackPageView();
    expect(lastTrafficPayload(b.fetchMock).page).toBe("/profile/:id");
    rememberLandingPath();
    expect(getLandingPath()).toBe("/profile/:id");
    b.session.setItem(
      "hc_landing_path",
      "/resume/synthetic-token?email=synthetic@example.test"
    );
    expect(getLandingPath()).toBe("/resume/:id");
  });
});

describe("attribution input whitelist", () => {
  it.each([
    "synthetic@example.test",
    "synthetic%40example.test",
    "synthetic%2540example.test",
    "https://site.example.test/dna?answer=private",
    "/questionnaire/answer",
    "site.example.test/profile",
    "phone: +1 (202) 555-0100",
    "+1 (202) 555-0100",
    "202-555-0100",
    "1234567890",
    "answer: private",
    "gender: private",
    "religion: private",
    "dna_result: private",
    "name: Synthetic",
    "token=synthetic",
    "campaign\nemail",
    "campaign\u0000private",
  ])("rejects unsafe UTM text: %s", value => {
    expect(
      sanitizeMarketingAttributionValue(value, "utmCampaign")
    ).toBeUndefined();
  });

  it.each([
    "November_2026",
    "Meta - November / Creative A",
    "Podcast & Community (A/B)",
    "קמפיין נובמבר - 2026",
    "november_20261115",
    "Launch_2026-11-15",
    "Launch_2026.11.15",
    "spring.sale",
    "Launch: 2026",
    "email_campaign_v2",
  ])('retains a legitimate campaign name "%s"', value => {
    expect(sanitizeMarketingAttributionValue(value, "utmCampaign")).toBe(value);
  });

  it("enforces field-specific lengths without truncating unsafe long content into a campaign", () => {
    expect(
      sanitizeMarketingAttributionValue("s".repeat(100), "utmSource")
    ).toBe("s".repeat(100));
    expect(
      sanitizeMarketingAttributionValue("s".repeat(101), "utmSource")
    ).toBeUndefined();
    expect(
      sanitizeMarketingAttributionValue("c".repeat(200), "utmCampaign")
    ).toBe("c".repeat(200));
    expect(
      sanitizeMarketingAttributionValue("c".repeat(201), "utmCampaign")
    ).toBeUndefined();
    expect(sanitizeMarketingAttributionValue("1".repeat(100), "metaAdId")).toBe(
      "1".repeat(100)
    );
    expect(
      sanitizeMarketingAttributionValue("1".repeat(101), "metaAdId")
    ).toBeUndefined();
  });

  it.each([
    null,
    [],
    {},
    { capturedAt: 0 },
    { capturedAt: "1" },
    { capturedAt: NaN },
    { capturedAt: Infinity },
  ])("rejects invalid snapshot shape/timestamp", value => {
    expect(sanitizeMarketingAttributionSnapshot(value)).toBeUndefined();
  });

  it.each([
    ["/dna-quiz?email=synthetic@example.test#answer", "/dna-quiz"],
    ["https://site.example.test/join?phone=202-555-0100", "/join"],
    ["/profile/synthetic%40example.test", "/profile/:id"],
    ["/questionnaire/private-answer", "/questionnaire/:id"],
    ["/202-555-0100", "/:id"],
    ["/blog/november-2026", "/blog/november-2026"],
  ])("redacts sensitive URL data in %s", (value, expected) => {
    expect(sanitizeMarketingPagePath(value)).toBe(expected);
  });
});
