import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { prepareSeoPage } from "./seoRoutes";
import { PUBLIC_ROUTE_META, PUBLIC_SITEMAP_PATHS } from "../shared/siteSeoMetadata";
import { PRIVACY_CONTACT, PRIVACY_SECTIONS } from "../shared/israeliPrivacyPolicy";

const template = '<html><head><title>old</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>';
const read = (p: string) => readFileSync(p, "utf8");

describe("Israeli privacy page", () => {
  it("serves the same readable policy without querying customer or blog data", async () => {
    const reader = { list: async () => { throw new Error("must not query"); }, article: async () => { throw new Error("must not query"); }, sitemap: async () => { throw new Error("must not query"); } };
    const result = await prepareSeoPage(template, "/privacy", reader);
    expect(result.status).toBe(200);
    expect(result.noindex).toBe(false);
    expect(result.html).toContain('href="https://hilitcaspi.com/privacy"');
    expect(result.html.match(/rel="canonical"/g)).toHaveLength(1);
    for (const section of PRIVACY_SECTIONS) expect(result.html).toContain(section.title);
    expect(result.html).toContain(PRIVACY_CONTACT.email);
    expect(result.html).toContain('src="/src/main.tsx"');
  });
  it("has an explicit Israeli route and leaves the English policy untouched", () => {
    const app = read("client/src/App.tsx");
    const he = app.slice(app.indexOf("function HeRouter"));
    expect(he).toContain('<Route path={"/privacy"} component={Privacy} />');
    expect(app).toContain('<Route path={"/en/privacy"} component={EnPrivacy} />');
    expect(PUBLIC_ROUTE_META["/privacy"].title).toContain("מדיניות פרטיות");
    expect(PUBLIC_SITEMAP_PATHS).toContain("/privacy");
  });
  it("states profile disclosure before mutual approval, with contact details after", () => {
    const text = JSON.stringify(PRIVACY_SECTIONS);
    expect(text).toContain("לפני אישור הדדי");
    expect(text).toContain("לאחר אישור הדדי");
    expect(text).toContain("בינה מלאכותית");
    expect(text).toContain("נטענים עם פתיחת האתר");
    expect(text).not.toContain("סודיות מוחלטת");
  });
  it("separates access/correction requests from automatic erasure guarantees", () => {
    const text = JSON.stringify(PRIVACY_SECTIONS);
    expect(text).toContain("עיון"); expect(text).toContain("תיקון");
    expect(text).toContain("אין בהגשת בקשה התחייבות למחיקה מיידית");
  });
  it("links the existing registration notice without changing consent handlers", () => {
    const source = read("client/src/pages/Register.tsx");
    expect(source).toContain('href="/privacy" target="_blank"');
    expect(source).toContain("checked={consentMatchmaking && consentDataSharing}");
    expect(source).toContain("setConsentEmailMarketing(event.target.checked)");
  });
});

describe("removed personal story", () => {
  it("is absent from current publication content and attraction links", () => {
    const content = read("content/published-articles-2026-11-15.json");
    expect(JSON.parse(content)).toHaveLength(3);
    expect(content).not.toContain("hilit-shahar-story-relationship-criteria");
    expect(read("client/src/pages/AttractionGuide.tsx")).not.toContain("hilit-shahar-story-relationship-criteria");
  });
});
