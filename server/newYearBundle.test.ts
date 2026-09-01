import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectProductByAmount, detectProductByDesc } from "./growWebhook";

const readProjectFile = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

describe("New Year holiday bundle", () => {
  it("detects the current 399 ILS bundle and historical 449 ILS callbacks", () => {
    expect(detectProductByAmount(399)).toBe("bundle_new_year");
    expect(detectProductByAmount(449)).toBe("bundle_new_year");
    expect(detectProductByAmount(349)).toBe("bundle_tubav");
    expect(detectProductByAmount(420)).toBe("coaching_mas");
    expect(detectProductByAmount(299)).toBe("database");
  });

  it("detects the bundle by its specific description before generic products", () => {
    expect(detectProductByDesc("חבילת שנה חדשה - מאגר + מדריך לבחור נכון + קורס המסע"))
      .toBe("bundle_new_year");
    expect(detectProductByDesc("bundle_new_year"))
      .toBe("bundle_new_year");
    expect(detectProductByDesc("חבילת טו באב - מאגר + מדריך"))
      .toBe("bundle_tubav");
  });

  it("fulfills database onboarding and one combined course-and-guide email", () => {
    const webhook = readProjectFile("server/growWebhook.ts");
    const handler = webhook.slice(
      webhook.indexOf("async function handleBundleNewYear"),
      webhook.indexOf("async function handlePlus"),
    );

    expect(handler).toContain("await handleDatabase");
    expect(handler).toContain('await handleCourse(email, name, { skipJourney: true, emailMode: "new_year_bundle" })');
    expect(handler).not.toContain("await handleGuide");
    expect(handler).not.toContain("startJourney");
    expect(handler).not.toContain("handlePlus");
  });

  it("keeps the standalone course journey but skips it for the holiday bundle", () => {
    const webhook = readProjectFile("server/growWebhook.ts");
    const courseHandler = webhook.slice(
      webhook.indexOf("async function handleCourse"),
      webhook.indexOf("async function handleCoaching"),
    );

    expect(courseHandler).toContain('opts.emailMode === "new_year_bundle"');
    expect(courseHandler).toContain("buildNewYearBundleAccessEmail");
    expect(courseHandler).toContain("if (!opts.skipJourney)");
    expect(courseHandler).toContain('journeyKey: "women_course"');
    expect(webhook).toContain('case "course":   await handleCourse(email, name); break;');
  });

  it("keeps the landing page separate from the database checkout funnel", () => {
    const app = readProjectFile("client/src/App.tsx");
    const landing = readProjectFile("client/src/pages/NewYearLoveBundle.tsx");

    expect(app).toContain('<Route path="/new-year-love" component={NewYearLoveBundle} />');
    expect(app).toContain('<Route path={"/join/:token"} component={Register} />');
    expect(landing).toContain('product="bundle_new_year"');
    expect(landing).toContain('termsPath="/terms/new-year-love"');
    expect(landing).toContain("trpc.publicProof.approvedTestimonials.useQuery");
    expect(landing).toContain("approvedTestimonials.length > 0");
    expect(landing).not.toContain("בתאל");
  });

  it("persists the full paid-social attribution contract into checkout", () => {
    const app = readProjectFile("client/src/App.tsx");
    const wallet = readProjectFile("client/src/components/GrowWallet.tsx");
    const router = readProjectFile("server/routers.ts");

    for (const key of ["meta_campaign_id", "meta_adset_id", "meta_ad_id", "meta_placement", "site_source_name"]) {
      expect(app).toContain(`"${key}"`);
    }
    for (const field of ["utmTerm", "metaCampaignId", "metaAdSetId", "metaAdId", "ga4SessionId"]) {
      expect(wallet).toContain(field);
      expect(router).toContain(field);
    }
    expect(wallet).toContain("const attributionTerm = [utmTerm, metaPlacement, metaSiteSource]");
  });

  it("states the service limits and does not promise a relationship or match cadence", () => {
    const landing = readProjectFile("client/src/pages/NewYearLoveBundle.tsx");

    expect(landing).toContain("אין מכסה קבועה");
    expect(landing).toContain("אינה מבטיחה התאמה, הסכמה של הצד השני או תוצאה זוגית");
    expect(landing).toContain("Plus אינו מופעל אוטומטית");
    expect(landing).toContain("Boost ו־Plus הם שירותים נפרדים");
  });

  it("keeps only two Hilit photos and replaces repeated portraits with substantive content", () => {
    const landing = readProjectFile("client/src/pages/NewYearLoveBundle.tsx");

    expect(landing).toContain("hilit-bundle-standing_b180bb60.jpeg");
    expect(landing).toContain("hilit-bundle-close-portrait_85abe6c9.jpeg");
    expect(landing).not.toContain("hilit-bundle-sofa-portrait_663387dc.jpeg");
    expect(landing).not.toContain("hilit-bundle-sofa-landscape_640c46ae.jpeg");
    expect(landing).toContain("יצרתי עבורכם דרך לעבוד גם בלעדיי");
    expect(landing).toContain("באלפי פגישות ליווי");
  });
});
