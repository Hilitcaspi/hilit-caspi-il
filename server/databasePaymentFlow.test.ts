import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const registerSource = readFileSync(resolve(process.cwd(), "client/src/pages/Register.tsx"), "utf8");

describe("database pre-payment flow", () => {
  it("does not show the redundant expectations and live-statistics card before payment", () => {
    expect(registerSource).not.toContain("DatabaseExpectations");
    expect(registerSource).not.toContain("מה חשוב לדעת לפני שמצטרפים");
  });

  it("keeps database price, coupon, terms and Grow checkout intact", () => {
    expect(registerSource).toContain("₪299");
    expect(registerSource).toContain('product="database"');
    expect(registerSource).toContain('termsPath="/terms/database"');
    expect(registerSource).toContain("handleCouponApply");
  });
});
