import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPlusCheckoutReference, verifyPlusCheckoutReference } from "./plusCheckoutReference";

const originalSecret = process.env.JWT_SECRET;

describe("Plus checkout reference", () => {
  beforeEach(() => { process.env.JWT_SECRET = "synthetic-test-secret-for-plus-reference"; });
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it("binds the reference to the normalized email without exposing the email", () => {
    const now = Date.UTC(2026, 8, 3, 10, 0, 0);
    const reference = createPlusCheckoutReference("Public.Member@example.com", now);
    expect(reference).not.toContain("Public.Member");
    expect(reference).not.toContain("example.com");
    expect(verifyPlusCheckoutReference(reference, "public.member@example.com", now + 60_000)).toBe(true);
  });

  it("rejects a mismatched email, tampering and expired references", () => {
    const now = Date.UTC(2026, 8, 3, 10, 0, 0);
    const reference = createPlusCheckoutReference("member@example.com", now);
    expect(verifyPlusCheckoutReference(reference, "other@example.com", now + 60_000)).toBe(false);
    expect(verifyPlusCheckoutReference(`${reference}x`, "member@example.com", now + 60_000)).toBe(false);
    expect(verifyPlusCheckoutReference(reference, "member@example.com", now + 3 * 60 * 60 * 1000)).toBe(false);
  });
});
