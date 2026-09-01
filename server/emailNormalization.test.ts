import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./emailNormalization";

describe("email normalization", () => {
  it("normalizes surrounding whitespace and uppercase letters", () => {
    expect(normalizeEmail("  SigalAv727@GMAIL.com  ")).toBe("sigalav727@gmail.com");
  });

  it("keeps an already normalized address unchanged", () => {
    expect(normalizeEmail("sigalav727@gmail.com")).toBe("sigalav727@gmail.com");
  });
});
