import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDatabaseJoinHref } from "../client/src/lib/landingPageExperiment";

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

  it("tracks database_cta on real database-page clicks, not on join page load", () => {
    const databaseSource = readFileSync(resolve(process.cwd(), "client/src/pages/DatabaseSales.tsx"), "utf8");
    const registerSource = readFileSync(resolve(process.cwd(), "client/src/pages/Register.tsx"), "utf8");

    expect(databaseSource).toContain('eventType: "database_cta"');
    expect(databaseSource).toContain('trackJoinClick("navbar")');
    expect(databaseSource).toContain('trackJoinClick("hero")');
    expect(databaseSource).toContain('trackJoinClick("final")');
    expect(registerSource).not.toContain('track({ eventType: "database_cta" });');
  });
});
