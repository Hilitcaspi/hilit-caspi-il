import { describe, expect, it } from "vitest";
import { isRegistrationResumeRequired, registrationSaveErrorForDisplay, shouldRetryRegistrationSave } from "../shared/registrationSaveErrors";
import { isExpectedCheckoutRejection } from "../shared/paymentFailureClassification";

describe("registration save recovery classification", () => {
  it("recognizes only the exact ownership recovery marker", () => {
    expect(isRegistrationResumeRequired(new Error("resume-required"))).toBe(true);
    expect(isRegistrationResumeRequired({ message: "resume-required", data: { code: "FORBIDDEN" } })).toBe(true);
    expect(isRegistrationResumeRequired(" resume-required ")).toBe(true);
    expect(isRegistrationResumeRequired("network failed before resume-required")).toBe(false);
    expect(isRegistrationResumeRequired(null)).toBe(false);
  });
  it("preserves the recovery marker without exposing a token", () => {
    expect(registrationSaveErrorForDisplay(new Error("resume-required"))).toBe("resume-required");
    expect(registrationSaveErrorForDisplay(null)).toContain("הפרטים נשארו בטופס");
  });
  it("does not blindly retry authorization or validation failures", () => {
    expect(shouldRetryRegistrationSave(new Error("resume-required"))).toBe(false);
    for (const code of ["FORBIDDEN", "BAD_REQUEST", "UNAUTHORIZED", "CONFLICT", "NOT_FOUND"]) {
      expect(shouldRetryRegistrationSave({ message: "invalid", data: { code } })).toBe(false);
    }
    expect(shouldRetryRegistrationSave(new Error("network timeout"))).toBe(true);
    expect(shouldRetryRegistrationSave({ data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(true);
  });
  it("does not label the expected continuation guard as a provider outage", () => {
    expect(isExpectedCheckoutRejection("resume-required")).toBe(true);
    expect(isExpectedCheckoutRejection("database query failed")).toBe(false);
    expect(isExpectedCheckoutRejection("network timeout")).toBe(false);
  });
});
