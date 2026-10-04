import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDatabaseJoinHref, buildLiveDatabaseJoinHref, buildRegularDatabaseJoinHrefFromLive } from "../client/src/lib/landingPageExperiment";

function storage(values: Record<string, string>) {
  return {
    getItem(key: string) {
      return values[key] ?? null;
    },
  };
}

describe("landing page experiment attribution", () => {
  it("preserves every supported attribution parameter from the database page", () => {
    const href = buildDatabaseJoinHref(
      "utm_source=meta&utm_medium=paid_social&utm_campaign=database_lp_test_sep2026&utm_content=ad_database&meta_campaign_id=cmp-1&meta_adset_id=set-2&meta_ad_id=ad-3&meta_placement=instagram_story&site_source_name=facebook",
    );
    const params = new URLSearchParams(href.split("?")[1]);

    expect(href.startsWith("/join?")).toBe(true);
    expect(params.get("source")).toBe("database");
    expect(params.get("utm_source")).toBe("meta");
    expect(params.get("utm_content")).toBe("ad_database");
    expect(params.get("meta_campaign_id")).toBe("cmp-1");
    expect(params.get("meta_placement")).toBe("instagram_story");
  });

  it("prefers the current URL, then session storage, then local storage", () => {
    const href = buildDatabaseJoinHref(
      "utm_source=url-source&utm_content=url-content",
      storage({ utm_source: "session-source", utm_medium: "session-medium" }) as Storage,
      storage({ utm_source: "local-source", utm_medium: "local-medium", utm_campaign: "local-campaign" }) as Storage,
    );
    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.get("utm_source")).toBe("url-source");
    expect(params.get("utm_medium")).toBe("session-medium");
    expect(params.get("utm_campaign")).toBe("local-campaign");
    expect(params.get("utm_content")).toBe("url-content");
  });

  it("keeps campaign values URL-safe", () => {
    const href = buildDatabaseJoinHref("utm_campaign=קמפיין חג&utm_content=מודעת מאגר");
    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.get("utm_campaign")).toBe("קמפיין חג");
    expect(params.get("utm_content")).toBe("מודעת מאגר");
  });

  it("preserves a promotional coupon through the database page", () => {
    const href = buildDatabaseJoinHref("utm_source=email&utm_campaign=database_holiday_now_sep27&coupon=NOW");
    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.get("coupon")).toBe("NOW");
    expect(params.get("utm_campaign")).toBe("database_holiday_now_sep27");
  });

  it("pre-applies LIVE from its dedicated database page instead of an old NOW coupon", () => {
    const href = buildLiveDatabaseJoinHref(
      "?coupon=NOW&utm_source=instagram&utm_content=story_1",
      storage({ coupon: "NOW", utm_campaign: "old_campaign" }) as Storage,
      storage({ coupon: "OLD" }) as Storage,
    );
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("coupon")).toBe("LIVE");
    expect(params.get("source")).toBe("database");
    expect(params.get("utm_source")).toBe("instagram");
    expect(params.get("utm_content")).toBe("story_1");
    expect(params.get("utm_campaign")).toBe("live_october_2026");
  });

  it("uses explicit LIVE attribution even with no query string or browser history", () => {
    const params = new URLSearchParams(buildLiveDatabaseJoinHref("").split("?")[1]);
    expect(params.get("coupon")).toBe("LIVE");
    expect(params.get("utm_source")).toBe("site");
    expect(params.get("utm_medium")).toBe("live_page");
    expect(params.get("utm_campaign")).toBe("live_october_2026");
  });

  it("lets visitors join the ordinary database while the gift is closed, without a stale LIVE or NOW coupon", () => {
    const href = buildRegularDatabaseJoinHrefFromLive(
      "?coupon=LIVE&utm_source=instagram&utm_content=story",
      storage({ coupon: "NOW", utm_medium: "paid_social" }) as Storage,
    );
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("coupon")).toBeNull();
    expect(params.get("source")).toBe("database");
    expect(params.get("utm_source")).toBe("instagram");
    expect(params.get("utm_content")).toBe("story");
    expect(params.get("utm_medium")).toBe("paid_social");
    expect(params.get("utm_campaign")).toBe("database_regular_october_2026");
  });

  it("keeps the LIVE details on the database offer page and does not promise a Zoom access code", () => {
    const databasePage = readFileSync(resolve(process.cwd(), "client/src/pages/DatabaseSales.tsx"), "utf8");
    const livePage = readFileSync(resolve(process.cwd(), "client/src/pages/LiveEvent.tsx"), "utf8");
    const voucher = readFileSync(resolve(process.cwd(), "client/src/components/LiveVoucherCard.tsx"), "utf8");
    expect(databasePage).toContain('href="#about-live"');
    expect(databasePage).not.toContain('<Link href="/live"');
    expect(databasePage).toContain('offerLocked ? regularJoinHref : joinHref');
    expect(livePage).not.toContain("49 ₪ · חברי Plus");
    expect(voucher).toContain("לא קוד כניסה ל־Zoom");
  });

  it("tracks database_cta on real database-page clicks, not on join page load", () => {
    const databaseSource = readFileSync(resolve(process.cwd(), "client/src/pages/DatabaseSales.tsx"), "utf8");
    const registerSource = readFileSync(resolve(process.cwd(), "client/src/pages/Register.tsx"), "utf8");

    expect(databaseSource).toContain('eventType: "database_cta"');
    expect(databaseSource).toContain('trackJoinClick("navbar")');
    expect(databaseSource).toContain('trackJoinClick("hero")');
    expect(databaseSource).toContain('trackJoinClick("final")');
    expect(registerSource).not.toContain('track({ eventType: "database_cta" });');
  });

  it("persists DNA lead attribution in both the CRM lead and quiz result", () => {
    const dnaSource = readFileSync(resolve(process.cwd(), "client/src/pages/DnaQuiz.tsx"), "utf8");
    const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    for (const field of ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "metaCampaignId", "metaAdSetId", "metaAdId"]) {
      expect(dnaSource).toContain(field);
      expect(routerSource).toContain(field);
    }
    expect(routerSource).toContain("utmCampaign: input.utmCampaign");
    expect(routerSource).toContain("metaAdId: input.metaAdId");
  });
});
