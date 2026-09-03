import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const holidayPage = readFileSync(resolve(root, "client/src/pages/NewYearLoveBundle.tsx"), "utf8");
const growWallet = readFileSync(resolve(root, "client/src/components/GrowWallet.tsx"), "utf8");

describe("September holiday campaign landing and checkout tracking", () => {
  it("uses the approved holiday message and the connected bundle product", () => {
    expect(holidayPage).toContain("פותחים לה מקום.");
    expect(holidayPage).toContain('product="bundle_new_year"');
    expect(holidayPage).toContain("399 ₪");
  });

  it("treats landing CTA clicks as product interest rather than completed checkout", () => {
    expect(holidayPage).toContain('eventType: "product_click"');
    expect(holidayPage).not.toContain('gaBeginCheckout("bundle_new_year")');
  });

  it("fires checkout tracking only after the payment form passes validation", () => {
    const validationIndex = growWallet.indexOf("if (termsPath && !termsAccepted)");
    const trackingIndex = growWallet.indexOf("gaBeginCheckout(product)");
    const paymentProcessIndex = growWallet.indexOf("createProcessMutation.mutateAsync");

    expect(validationIndex).toBeGreaterThan(-1);
    expect(trackingIndex).toBeGreaterThan(validationIndex);
    expect(paymentProcessIndex).toBeGreaterThan(trackingIndex);
    expect(growWallet).toContain("trackedCheckoutPrice");
  });
});
