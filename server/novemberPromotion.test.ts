import { isNovemberCouponAllowed } from "../shared/novemberCoupon";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canShowNovemberPopup, getSalesPromoCoupon, isNovemberPromoPage, isNovemberPopupPage, NOVEMBER10_PRODUCTS, PROMO_COOLDOWN_MS } from "../client/src/lib/novemberPromoPolicy";

const NOW = Date.parse("2026-11-07T20:30:00Z");
describe("November onsite promotion", () => {
  it.each(["/", "/database", "/maagar", "/course", "/course-sales", "/guide", "/single-session", "/coaching", "/blog", "/blog/story"])("shows bar only on a public marketing page %s", path => {
    expect(isNovemberPromoPage(path, NOW)).toBe(true);
  });
  it.each(["/join", "/join/recover", "/join/token", "/dna", "/dna-quiz", "/november-love", "/november", "/my-profile", "/crm", "/crm/analytics", "/en", "/en/course", "/thank-you/course", "/unsubscribe", "/u", "/database-plus", "/match-boost", "/course/view", "/terms/course"])("does not interrupt protected flow %s", path => {
    expect(isNovemberPromoPage(path, NOW)).toBe(false);
    expect(isNovemberPopupPage(path, NOW)).toBe(false);
  });
  it("limits automatic popups to home/blog", () => {
    expect(isNovemberPopupPage("/", NOW)).toBe(true);
    expect(isNovemberPopupPage("/blog/story", NOW)).toBe(true);
    expect(isNovemberPopupPage("/course", NOW)).toBe(false);
    expect(isNovemberPopupPage("/database", NOW)).toBe(false);
  });
  it("expires at Israel midnight on December 1, not UTC midnight", () => {
    expect(isNovemberPromoPage("/", Date.parse("2026-11-30T21:59:59Z"))).toBe(true);
    expect(isNovemberPromoPage("/", Date.parse("2026-11-30T22:00:00Z"))).toBe(false);
    expect(isNovemberPromoPage("/", Date.parse("2026-10-31T21:59:59Z"))).toBe(false);
  });
  it("limits to one exposure per session and seven days per browser", () => {
    expect(canShowNovemberPopup("/", null, null, NOW)).toBe(true);
    expect(canShowNovemberPopup("/", null, "1", NOW)).toBe(false);
    expect(canShowNovemberPopup("/", String(NOW - 1000), null, NOW)).toBe(false);
    expect(canShowNovemberPopup("/", String(NOW - PROMO_COOLDOWN_MS), null, NOW)).toBe(true);
    expect(canShowNovemberPopup("/join", null, null, NOW)).toBe(false);
  });
  it.each(["bad", "NaN", "0", "", String(NOW + 1000)])("fails closed with invalid seen timestamp %s", value => {
    expect(canShowNovemberPopup("/", value, null, NOW)).toBe(false);
  });
  it("prefills only explicit valid onsite codes without replacing special offers", () => {
    expect(getSalesPromoCoupon("coupon=november10")).toBe("NOVEMBER10");
    expect(getSalesPromoCoupon("coupon=BACK10")).toBe("BACK10");
    expect(getSalesPromoCoupon("coupon=TEST1")).toBeUndefined();
    expect(getSalesPromoCoupon("coupon=PLUS50")).toBeUndefined();
    expect(getSalesPromoCoupon("")).toBeUndefined();
  });
  it("links only eligible regular products and does not overwrite acquisition UTM", () => {
    expect(NOVEMBER10_PRODUCTS.map(p => p.id)).toEqual(["database", "course", "guide", "session", "coaching"]);
    for (const product of NOVEMBER10_PRODUCTS) {
      const url = new URL(product.href, "https://hilitcaspi.com");
      expect(url.searchParams.get("coupon")).toBe("NOVEMBER10");
      expect(url.searchParams.has("utm_source")).toBe(false);
    }
  });
  it("keeps interactions anonymous, has no sending/payment/lead calls and uses accessible modal", () => {
    const source = readFileSync("client/src/components/NovemberPromotion.tsx", "utf8");
    expect(source).toContain("<DialogTitle");
    expect(source).toContain("<DialogDescription");
    expect(source).toContain('aria-label="סגירת ההטבה"');
    expect(source).toContain('active.closest("form")');
    expect(source).not.toMatch(/trpc\.|email:|phone:|leadId:|utm_source=/);
    expect(source).toContain("לא כולל חבילת נובמבר, מנוי Plus ובוסט");
  });
});


describe("NOVEMBER10 server policy", () => {
  it.each(["database", "course", "guide", "session", "coaching", "coaching_mas"])("allows regular product %s", product => {
    expect(isNovemberCouponAllowed(product, NOW)).toBe(true);
  });
  it.each(["bundle_november", "plus", "match_boost", "bundle", "unknown", ""])("rejects excluded product %s", product => {
    expect(isNovemberCouponAllowed(product, NOW)).toBe(false);
  });
  it("stops at the end of November and fails closed on missing product", () => {
    expect(isNovemberCouponAllowed("database", Date.parse("2026-12-01T00:00:00+02:00"))).toBe(false);
    expect(isNovemberCouponAllowed(undefined, NOW)).toBe(false);
  });
  it("enforces the same scope in coupon validation and process creation", () => {
    const source = readFileSync("server/routers.ts", "utf8");
    expect(source.match(/!isNovemberCouponAllowed\(input.product\)/g)).toHaveLength(2);
    expect(source).toContain("promo.discountPercent !== 10");
    expect(source).toContain("promo.expiresAt <= Date.now()");
    expect(source).toContain("לא נפתח תשלום במחיר מלא.");
  });
});
