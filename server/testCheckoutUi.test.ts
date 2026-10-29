import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const source = (name: string) => readFileSync(resolve(process.cwd(), name), "utf8");

describe("owner TEST1 checkout UI safety", () => {
  it("initializes the one-time wallet for Plus tests without changing normal Plus routing", () => {
    const wallet = source("client/src/components/GrowWallet.tsx");
    expect(wallet).toContain('if (product !== "plus" || attempt.couponCode === "TEST1")');
    expect(wallet).toContain("await preloadGrowSDKScript()");
    expect(wallet).toContain("window.location.assign(result.url)");
  });
  it("does not call real product-success handlers for diagnostic test payments", () => {
    const wallet = source("client/src/components/GrowWallet.tsx");
    const success = wallet.slice(wallet.indexOf("onSuccess: (r: any) => {"), wallet.indexOf("onFailure: (r: any) => {"));
    expect(success).toMatch(/attempt\.couponCode === "TEST1"[\s\S]*?toast\.success\([\s\S]*?return;[\s\S]*?attempt\.callbacks\.onSuccess/);
    expect(success).toContain("יש לוודא את החיוב ב־Grow");
  });
  it("retains server-validated coupon submission and browser advertising exclusion", () => {
    const wallet = source("client/src/components/GrowWallet.tsx");
    expect(wallet).toContain('attempt.couponCode !== "TEST1"');
    expect(wallet).toContain("couponCode: attempt.couponCode || undefined");
    expect(wallet).toContain("boostTermsAccepted: product === \"match_boost\" ? true : undefined");
    expect(wallet).toMatch(/plusRenewalAccepted:\s*product === "plus"/);
  });
  it("allows a discreet coupon at the existing eligible Boost wallet", () => {
    const dashboard = source("client/src/pages/UserDashboard.tsx");
    const terms = dashboard.indexOf('termsPath="/terms/match-boost"');
    expect(terms).toBeGreaterThan(-1);
    const wallet = dashboard.slice(terms, terms + 300);
    expect(wallet).toContain("personalToken={token}");
    expect(wallet).toContain("boostMatchId={option.matchId}");
    expect(wallet).not.toContain("showCoupon={false}");
  });
});
