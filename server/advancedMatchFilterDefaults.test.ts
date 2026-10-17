import { describe, expect, it } from "vitest";
import { getAdvancedMatchFilterDefaults } from "../shared/advancedMatchFilterDefaults";

const MIN_AGE = 18;
const MAX_AGE = 120;
const AGE_ADJUSTMENT = 2;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 250;

const empty = { gender: "", minAge: "", maxAge: "", minHeight: "" };

describe("getAdvancedMatchFilterDefaults", () => {
  it("handles partial profiles without inventing missing preferences", () => {
    expect(getAdvancedMatchFilterDefaults({})).toEqual(empty);
    expect(
      getAdvancedMatchFilterDefaults({ minAgePreference: 30, minHeightPreference: 170 }),
    ).toEqual({ gender: "", minAge: String(30 - AGE_ADJUSTMENT), maxAge: "", minHeight: "170" });
  });

  it("uses only explicit valid male/female seeking gender values", () => {
    expect(getAdvancedMatchFilterDefaults({ seekingGender: "male" })).toMatchObject({ gender: "male" });
    expect(getAdvancedMatchFilterDefaults({ seekingGender: "female" })).toMatchObject({ gender: "female" });
    expect(getAdvancedMatchFilterDefaults({ seekingGender: "any" })).toMatchObject({ gender: "" });
    expect(getAdvancedMatchFilterDefaults({ seekingGender: "other" })).toMatchObject({ gender: "" });
    expect(getAdvancedMatchFilterDefaults({ seekingGender: null })).toMatchObject({ gender: "" });
  });

  it("adjusts valid age bounds by two and clamps at documented limits", () => {
    expect(getAdvancedMatchFilterDefaults({ minAgePreference: MIN_AGE, maxAgePreference: MAX_AGE })).toEqual({
      gender: "",
      minAge: String(MIN_AGE),
      maxAge: String(MAX_AGE),
      minHeight: "",
    });
    expect(getAdvancedMatchFilterDefaults({ minAgePreference: 30, maxAgePreference: 40 })).toMatchObject({
      minAge: String(30 - AGE_ADJUSTMENT),
      maxAge: String(40 + AGE_ADJUSTMENT),
    });
  });

  it("rejects invalid age values and clears both bounds when valid bounds are reversed", () => {
    for (const value of [0, NaN, 17, 121, 30.5, null, undefined]) {
      expect(getAdvancedMatchFilterDefaults({ minAgePreference: value as number | null | undefined }).minAge).toBe("");
      expect(getAdvancedMatchFilterDefaults({ maxAgePreference: value as number | null | undefined }).maxAge).toBe("");
    }
    expect(getAdvancedMatchFilterDefaults({ minAgePreference: 50, maxAgePreference: 40 })).toMatchObject({
      minAge: "",
      maxAge: "",
    });
  });

  it("keeps only a valid integer minimum height, without expansion or max-height", () => {
    expect(getAdvancedMatchFilterDefaults({ minHeightPreference: MIN_HEIGHT })).toMatchObject({ minHeight: "100" });
    expect(getAdvancedMatchFilterDefaults({ minHeightPreference: MAX_HEIGHT })).toMatchObject({ minHeight: "250" });
    for (const value of [0, NaN, 99, 251, 170.5, null, undefined]) {
      expect(getAdvancedMatchFilterDefaults({ minHeightPreference: value as number | null | undefined }).minHeight).toBe("");
    }
    expect(getAdvancedMatchFilterDefaults({ minHeightPreference: 170 })).not.toHaveProperty("maxHeight");
  });

  it("does not mutate the input profile", () => {
    const profile = { minAgePreference: 30, maxAgePreference: 40, minHeightPreference: 170, seekingGender: "female" };
    const before = { ...profile };
    expect(getAdvancedMatchFilterDefaults(profile)).toEqual({
      gender: "female",
      minAge: "28",
      maxAge: "42",
      minHeight: "170",
    });
    expect(profile).toEqual(before);
  });
});
