import { describe, expect, it } from "vitest";
import { computeFullScoreForAdminSend } from "./compatibility";

const male = {
  id: 1,
  firstName: "A",
  gender: "male",
  seekingGender: "female",
  age: 40,
  city: "תל אביב",
  height: 175,
  religiosity: "secular",
  hasKids: false,
  wantsKids: "open",
  locationPreference: "anywhere",
  smokingStatus: "no",
  smokingPreference: "doesnt_matter",
} as any;

const female = {
  id: 2,
  firstName: "B",
  gender: "female",
  seekingGender: "male",
  age: 38,
  city: "תל אביב",
  height: 178,
  religiosity: "secular",
  hasKids: false,
  wantsKids: "open",
  locationPreference: "anywhere",
  smokingStatus: "no",
  smokingPreference: "doesnt_matter",
} as any;

describe("explicit admin criteria override", () => {
  it("keeps the match blocked without explicit approval", () => {
    const result = computeFullScoreForAdminSend(male, female, [], [], false);
    expect(result.breakdown.total).toBe(0);
    expect(result.criteriaOverrideApplied).toBe(false);
  });

  it("allows a one-off match when height is a blocker", () => {
    const result = computeFullScoreForAdminSend(male, female, [], [], true);
    expect(result.breakdown.total).toBeGreaterThan(0);
    expect(result.criteriaOverrideApplied).toBe(true);
    expect(result.warnings.join(" ")).toContain("גובה");
  });

  it("allows a confirmed age or other preference override", () => {
    const result = computeFullScoreForAdminSend(
      { ...male, maxAgePreference: 35 },
      { ...female, height: 170 },
      [],
      [],
      true,
    );
    expect(result.breakdown.total).toBeGreaterThan(0);
    expect(result.criteriaOverrideApplied).toBe(true);
    expect(result.warnings.join(" ")).toContain("גיל");
  });

  it("can retain multiple manual preference warnings without weakening normal scoring", () => {
    const result = computeFullScoreForAdminSend(
      { ...male, wantsKids: "no" },
      { ...female, wantsKids: "yes" },
      [],
      [],
      true,
    );
    expect(result.breakdown.total).toBeGreaterThan(0);
    expect(result.criteriaOverrideApplied).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("never overrides an incompatible requested gender", () => {
    const result = computeFullScoreForAdminSend(
      { ...male, seekingGender: "male" },
      female,
      [],
      [],
      true,
    );
    expect(result.breakdown.total).toBe(0);
    expect(result.criteriaOverrideApplied).toBe(false);
  });
});
