import { describe, expect, it } from "vitest";
import { calculateAgeFromBirthDate, normalizeIsraeliPhone, parseOptionalIntegerInRange } from "../shared/profileValidation";

describe("profile birth-date validation", () => {
  const today = new Date(2026, 7, 24);

  it("calculates an adult age from a complete ISO birth date", () => {
    expect(calculateAgeFromBirthDate("1988-08-24", today)).toBe(38);
    expect(calculateAgeFromBirthDate("1988-08-25", today)).toBe(37);
  });

  it("rejects partial, impossible, future and underage dates", () => {
    expect(calculateAgeFromBirthDate("1988-08", today)).toBeNull();
    expect(calculateAgeFromBirthDate("1988-02-31", today)).toBeNull();
    expect(calculateAgeFromBirthDate("2020-01-01", today)).toBeNull();
    expect(calculateAgeFromBirthDate("2030-01-01", today)).toBeNull();
  });

  it("keeps optional numeric preferences only inside their accepted range", () => {
    expect(parseOptionalIntegerInRange("45", 18, 120)).toBe(45);
    expect(parseOptionalIntegerInRange("", 18, 120)).toBeUndefined();
    expect(parseOptionalIntegerInRange("abc", 18, 120)).toBeUndefined();
    expect(parseOptionalIntegerInRange("12", 18, 120)).toBeUndefined();
  });

  it("normalizes valid Israeli mobile and landline formats for Grow", () => {
    expect(normalizeIsraeliPhone("050-123 4567")).toBe("0501234567");
    expect(normalizeIsraeliPhone("+972 50 123 4567")).toBe("0501234567");
    expect(normalizeIsraeliPhone("00972-2-1234567")).toBe("021234567");
  });

  it("rejects missing digits and unknown characters instead of guessing", () => {
    expect(normalizeIsraeliPhone("x501234567")).toBeNull();
    expect(normalizeIsraeliPhone("050123456")).toBeNull();
    expect(normalizeIsraeliPhone("05012345678")).toBeNull();
  });
});
