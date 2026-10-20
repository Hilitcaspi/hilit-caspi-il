import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { attractionChapters } from "../shared/attractionGuideContent";
import { attractionEntryHref, attractionHref, ATTRACTION_CAMPAIGN } from "../shared/attractionFunnel";
import { captureAcquisition, getFirstTouchAcquisition, getLastUtmAcquisition } from "../client/src/lib/acquisitionTracking";

const page = readFileSync("client/src/pages/AttractionGuide.tsx", "utf8");
const app = readFileSync("client/src/App.tsx", "utf8");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as { window?: unknown }).window;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else delete (globalThis as { document?: unknown }).document;
});

describe("attraction guide content and funnel", () => {
  it("has four original chapters, each with its own practical scene, script and exercise", () => {
    expect(attractionChapters).toHaveLength(4);
    expect(new Set(attractionChapters.map(chapter => chapter.id)).size).toBe(4);
    for (const chapter of attractionChapters) {
      expect(chapter.paragraphs.length).toBeGreaterThanOrEqual(3);
      for (const field of [chapter.title, chapter.scene, chapter.script, chapter.exercise, chapter.takeaway]) expect(field.length).toBeGreaterThan(15);
    }
  });
  it("keeps mutual choice, consent and realistic database terms explicit", () => {
    expect(page).toContain("סירוב לא מוכיח שמשהו חסר לך");
    expect(page).toContain("פרטי הקשר נחשפים רק לאחר אישור הדדי");
    expect(page).toContain("אין התחייבות למספר התאמות, לתדירות או לתוצאה");
    expect(page).toContain("המדריך החינמי אינו מקנה חברות במאגר");
  });
  it("opens without a lead gate, outbound messages or checkout", () => {
    expect(page).not.toMatch(/leads\.submit|startJourney|useMutation|GrowWallet|trackLead|trackPurchase|type="email"/);
    expect(page).toContain("המדריך פתוח כאן");
    expect(page).toContain('data-guide-cta="database"');
    expect(page).toContain('data-guide-cta="paid-guide"');
  });
  it("uses an isolated lazy Israeli route and leaves signs in place", () => {
    expect(app).toContain('path={"/attraction"} component={AttractionGuide}');
    expect(app).toContain('path={"/signs"} component={SignsGuide}');
  });
  it("gates newly added guide events and Meta view behind an explicit choice", () => {
    expect(page).toContain('>("undecided")');
    expect(page.match(/if \(measurement !== "allowed"\) return;/g)).toHaveLength(2);
    expect(page).toContain('setMeasurement("declined")');
    expect(page).toContain("observer.disconnect()");
    expect(page).not.toMatch(/email:|phone:|token:|leadId:/);
  });
  it.each(["database", "guide", "dna", "community"] as const)("tags %s as an internal touch without personal fields", destination => {
    const url = new URL(attractionHref(destination, "test"), "https://hilitcaspi.com");
    expect(url.searchParams.get("utm_source")).toBe("website");
    expect(url.searchParams.get("utm_medium")).toBe("onsite");
    expect(url.searchParams.get("utm_campaign")).toBe(ATTRACTION_CAMPAIGN);
    expect(url.searchParams.get("utm_content")).toBe(`${destination}_test`);
    expect([...url.searchParams.keys()]).not.toEqual(expect.arrayContaining(["email", "phone", "token"]));
    if (destination === "community") expect(url.searchParams.get("mode")).toBe("gi_t");
  });
  it.each(["instagram", "facebook", "youtube", "whatsapp"] as const)("makes a distinct public %s entry link", source => {
    const url = new URL(attractionEntryHref(source, "podcast_video"));
    expect(url.pathname).toBe("/attraction");
    expect(url.searchParams.get("utm_source")).toBe(source);
    expect(url.searchParams.get("utm_medium")).toBe(source === "whatsapp" ? "community" : "organic_social");
  });
  it("retains original external acquisition through the internal database CTA", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const entry = new URL(attractionEntryHref("instagram", "podcast_reel"));
    const location = { hostname: "hilitcaspi.com", pathname: entry.pathname, search: entry.search };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { location, sessionStorage: storage, localStorage: storage } });
    Object.defineProperty(globalThis, "document", { configurable: true, value: { referrer: "" } });
    captureAcquisition(1000);
    const first = getFirstTouchAcquisition();
    const internal = new URL(attractionHref("database", "main"), "https://hilitcaspi.com");
    location.pathname = internal.pathname;
    location.search = internal.search;
    captureAcquisition(2000);
    expect(getFirstTouchAcquisition()).toEqual(first);
    expect(first?.utmSource).toBe("instagram");
    expect(getLastUtmAcquisition()).toMatchObject({ utmSource: "website", utmMedium: "onsite", utmCampaign: ATTRACTION_CAMPAIGN, utmContent: "database_main" });
  });
});
