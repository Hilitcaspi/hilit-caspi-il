import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/SingleSessionSales.tsx"), "utf8");

describe("single-session recovery coupon", () => {
  it("accepts LOVE10 and pre-fills it in both payment widgets", () => {
    expect(page).toContain('requestedCoupon === "LOVE10"');
    expect(page).toContain('prefillCoupon={recoveryCoupon}');
    expect(page.match(/prefillCoupon=\{recoveryCoupon\}/g)).toHaveLength(2);
    expect(page).toContain("עשרה אחוזי הנחה");
  });
});
