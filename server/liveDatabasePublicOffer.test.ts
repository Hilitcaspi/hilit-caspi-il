import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ open: true, search: "" }));
vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    liveOctober: { salesStatus: { useQuery: () => ({ data: { databaseGiftOpen: state.open }, isLoading: false }) } },
  },
}));
vi.mock("wouter", () => ({
  useSearch: () => state.search,
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement("a", { href }, children),
}));
vi.mock("../client/src/lib/track", () => ({ track: vi.fn() }));
vi.mock("../client/src/lib/metaPixel", () => ({ trackViewContent: vi.fn() }));
vi.mock("../client/src/lib/ga", () => ({ gaViewItem: vi.fn() }));

import { DatabaseSalesContent } from "../client/src/pages/DatabaseSales";

const render = () => renderToStaticMarkup(React.createElement(DatabaseSalesContent, { campaign: "live" }));
const joinUrls = (html: string) => Array.from(html.matchAll(/href="(\/join\?[^\"]+)"/g), m => new URL(m[1].replaceAll("&amp;", "&"), "https://example.com"));

describe("public database live gift offer", () => {
  beforeEach(() => {
    state.open = true;
    state.search = "?utm_source=whatsapp&utm_medium=community&utm_campaign=live_oct2026&utm_content=launch_database";
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", { sessionStorage: { getItem: () => null }, localStorage: { getItem: () => null } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the 299 ILS database offer and gift without a checkout-test form", () => {
    const html = render();
    expect(html).toContain("299 ₪");
    expect(html).toContain("+ כרטיס אחד ללייב במתנה");
    expect(html).toContain("להצטרפות למאגר ולקבלת הכרטיס");
    expect(html).toContain("נוסף אוטומטית, בלי צורך בקוד הטבה");
    expect(html).toContain("הכרטיס האישי ללייב יישלח לכתובת המייל שלך לאחר אישור התשלום");
    expect(html).toContain("מספר המקומות בלייב מוגבל");
    for (const technicalText of ["רוצים לבדוק את הקופה", "מייל בדיקה", "TEST1", "live-db-test-email", "live-db-test-code", "קוד ההטבה:"]) {
      expect(html).not.toContain(technicalText);
    }
    expect(html).not.toContain("<form");
  });

  it("keeps automatic LIVE and attribution on every enrollment button", () => {
    const urls = joinUrls(render());
    expect(urls.length).toBeGreaterThanOrEqual(3);
    for (const url of urls) {
      expect(url.searchParams.get("coupon")).toBe("LIVE");
      expect(url.searchParams.get("utm_source")).toBe("whatsapp");
      expect(url.searchParams.get("utm_campaign")).toBe("live_oct2026");
      expect(url.searchParams.get("utm_content")).toBe("launch_database");
    }
  });

  it("ignores a test coupon in an incoming public gift-page URL", () => {
    state.search += "&coupon=TEST1";
    const html = render();
    expect(html).not.toContain("TEST1");
    for (const url of joinUrls(html)) expect(url.searchParams.get("coupon")).toBe("LIVE");
  });

  it("does not send visitors to enrollment if the promised live gift is unavailable", () => {
    state.open = false;
    const html = render();
    expect(joinUrls(html)).toHaveLength(0);
    expect(html).toContain("לא נבצע רכישה בלי הכרטיס במתנה");
  });

  it("does not add the live gift to the regular database landing page", () => {
    const regularHtml = renderToStaticMarkup(React.createElement(DatabaseSalesContent, {}));
    expect(regularHtml).not.toContain('id="live-offer"');
    expect(regularHtml).not.toContain("live-db-test-email");
    expect(regularHtml).toContain("הצטרפות למאגר");
  });
});
