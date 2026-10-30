import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  hasCompleteCheckoutPrefill,
  isValidCheckoutFullName,
  normalizeCheckoutFullName,
} from "../shared/checkoutIdentity";

const wallet = readFileSync(resolve(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");

describe("GrowWallet customer identity safeguards", () => {
  it("requires a real two-part Unicode full name even when whitespace is nonstandard", () => {
    expect(normalizeCheckoutFullName("  דנה\u00a0\u200bכהן  ")).toBe("דנה כהן");
    expect(isValidCheckoutFullName("דנה כהן")).toBe(true);
    expect(isValidCheckoutFullName("Ana María")).toBe(true);
    expect(isValidCheckoutFullName("דנה")).toBe(false);
    expect(isValidCheckoutFullName("   ")).toBe(false);
  });

  it("does not classify a partial name or missing phone as a safe hidden prefill", () => {
    expect(hasCompleteCheckoutPrefill(
      { fullName: "דנה", email: "dana@example.test", phone: "0500000000" },
      "0500000000",
    )).toBe(false);
    expect(hasCompleteCheckoutPrefill(
      { fullName: "דנה כהן", email: "dana@example.test", phone: "" },
      null,
    )).toBe(false);
    expect(hasCompleteCheckoutPrefill(
      { fullName: "דנה כהן", email: "dana@example.test", phone: "0500000000" },
      "0500000000",
    )).toBe(true);
  });

  it("keeps malformed saved identity editable and validates it before an attempt nonce can be created", () => {
    expect(wallet).toContain("const hasAllDetails = hasCompleteCheckoutPrefill(");
    expect(wallet).toContain("!isValidCheckoutFullName(fullName)");
    expect(wallet.indexOf("if (!isValidCheckoutFullName(fullName))"))
      .toBeLessThan(wallet.indexOf("const storageKey = checkoutAttemptStorageKey"));
    expect(wallet).toContain("identityTouchedRef.current.name = true");
    expect(wallet).toContain("identityTouchedRef.current.phone = true");
  });

  it("forwards only the separate registration resume proof for database continuation", () => {
    expect(wallet).toContain("registrationResumeToken?: string");
    expect(wallet).toContain("registrationResumeToken:\n            product === \"database\" ? registrationResumeToken : undefined");
    expect(wallet).toContain("personalToken,");
    expect(wallet).toContain("checkoutAttemptId: attempt.attemptId");
  });
});
