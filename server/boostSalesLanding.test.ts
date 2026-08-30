import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GA4_PRODUCTS } from "./_core/ga4";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("Boost sales landing and purchase measurement", () => {
  it("publishes a dedicated member-only landing route that leads to the real Boost cards", () => {
    const app = read("client/src/App.tsx");
    const page = read("client/src/pages/BoostSalesLanding.tsx");

    expect(app).toContain('path="/boost-now"');
    expect(page).toContain('/my-profile?${outgoing.toString()}#boost-card');
    expect(page).toContain("לחברי המאגר שאישרו Boost");
    expect(page).toContain("19.90 ₪");
    expect(page).toContain("המחשה");
    expect(page).not.toContain("5,000");
    expect(page).not.toContain("הצלחה מובטחת");
  });

  it("uses only the two approved sharp source portraits on the landing page", () => {
    const page = read("client/src/pages/BoostSalesLanding.tsx");
    expect(page).toContain("/manus-storage/boost-hilit-doorway-v3_28018118.jpeg");
    expect(page).toContain("/manus-storage/boost-hilit-closeup-v3_e29a47ce.jpeg");
    expect(page).not.toContain("hilit-profile_6821862b.jpg");
  });

  it("tracks the Boost funnel from content view to checkout and server purchase", () => {
    const page = read("client/src/pages/BoostSalesLanding.tsx");
    const wallet = read("client/src/components/GrowWallet.tsx");
    const webhook = read("server/growWebhook.ts");
    const capi = read("server/_core/metaCapi.ts");

    expect(page).toContain('gaViewItem("match_boost")');
    expect(page).toContain("trackViewContent");
    expect(wallet).toContain('gaBeginCheckout("match_boost")');
    expect(wallet).toContain("trackInitiateCheckout({ value: 19.9");
    expect(webhook).toContain('"match_boost"] as const');
    expect(capi).toContain('match_boost: { name: "Boost - שליחת הצעת התאמה", price: 19.9');
    expect(GA4_PRODUCTS.match_boost).toMatchObject({ id: "match_boost", price: 19.9 });
  });
});
