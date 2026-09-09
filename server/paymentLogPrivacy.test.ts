import { describe, expect, it } from "vitest";
import { getSafeEmailDomain, sanitizePaymentLogDetail } from "./paymentLogPrivacy";

describe("payment log privacy", () => {
  it("keeps only a safe email domain", () => {
    expect(getSafeEmailDomain(" Person.Name+tag@Example.COM ")).toBe("example.com");
    expect(getSafeEmailDomain("not-an-email")).toBe("unknown");
  });

  it("removes contact details and long payment tokens from operational detail", () => {
    const sanitized = sanitizePaymentLogDetail(
      "user@example.com 050-1234567 auth=abcdef0123456789abcdef0123456789%MzQzNTQ3Mzk",
    );

    expect(sanitized).toContain("[email]");
    expect(sanitized).toContain("[phone]");
    expect(sanitized).toContain("[token]");
    expect(sanitized).not.toContain("user@example.com");
    expect(sanitized).not.toContain("050-1234567");
  });
});

