import { describe, expect, it } from "vitest";
import { normalizeFreeAccessToken, validateFreeAccessTokenState } from "./freeAccessTokenPolicy";

describe("free access token policy", () => {
  it("normalizes pasted invite tokens regardless of case and surrounding whitespace", () => {
    expect(normalizeFreeAccessToken("  AB12CD34  ")).toBe("ab12cd34");
  });

  it("accepts an unused, unexpired token for the same normalized email", () => {
    expect(validateFreeAccessTokenState({
      usedAt: null,
      expiresAt: 2_000,
      boundEmail: " Member@Example.com ",
    }, "member@example.com", 1_000)).toEqual({ valid: true });
  });

  it("rejects a missing token", () => {
    expect(validateFreeAccessTokenState(null, "member@example.com", 1_000)).toEqual({
      valid: false,
      reason: "not_found",
    });
  });

  it("rejects a token that was already used", () => {
    expect(validateFreeAccessTokenState({
      usedAt: 900,
      expiresAt: 2_000,
      boundEmail: "member@example.com",
    }, "member@example.com", 1_000)).toEqual({
      valid: false,
      reason: "already_used",
    });
  });

  it("allows a token already redeemed by the same email only during final registration", () => {
    expect(validateFreeAccessTokenState({
      usedAt: 900,
      usedByEmail: "member@example.com",
      expiresAt: 2_000,
      boundEmail: "member@example.com",
    }, " Member@Example.com ", 1_000, true)).toEqual({ valid: true });
  });

  it("rejects an expired token", () => {
    expect(validateFreeAccessTokenState({
      usedAt: null,
      expiresAt: 999,
      boundEmail: "member@example.com",
    }, "member@example.com", 1_000)).toEqual({
      valid: false,
      reason: "expired",
    });
  });

  it("rejects a token bound to another email", () => {
    expect(validateFreeAccessTokenState({
      usedAt: null,
      expiresAt: 2_000,
      boundEmail: "other@example.com",
    }, "member@example.com", 1_000)).toEqual({
      valid: false,
      reason: "email_mismatch",
    });
  });
});
