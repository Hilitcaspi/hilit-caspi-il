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

describe("explicit height-only admin override", () => {
  it("keeps the match blocked without explicit approval", () => {
    const result = computeFullScoreForAdminSend(male, female, [], [], false);
    expect(result.breakdown.total).toBe(0);
    expect(result.heightOverrideApplied).toBe(false);
  });

  it("allows a one-off match when height is the only blocker", () => {
    const result = computeFullScoreForAdminSend(male, female, [], [], true);
    expect(result.breakdown.total).toBeGreaterThan(0);
    expect(result.heightOverrideApplied).toBe(true);
    expect(result.warnings.join(" ")).toContain("גובה");
  });

  it("does not override a non-height blocker that appears before height", () => {
    const result = computeFullScoreForAdminSend(
      { ...male, religiosity: "orthodox" },
      female,
      [],
      [],
      true,
    );
    expect(result.breakdown.total).toBe(0);
    expect(result.heightOverrideApplied).toBe(false);
  });

  it("does not hide another blocker that appears after the height check", () => {
    const result = computeFullScoreForAdminSend(
      { ...male, wantsKids: "no" },
      { ...female, wantsKids: "yes" },
      [],
      [],
      true,
    );
    expect(result.breakdown.total).toBe(0);
    expect(result.heightOverrideApplied).toBe(false);
    expect(result.breakdown.details.join(" ")).toContain("ילדים");
  });
});
