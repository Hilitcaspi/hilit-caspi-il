/**
 * The filter defaults intentionally stay conservative: only explicit, validated
 * profile preferences are used, and no preference is inferred from identity.
 */
const MIN_AGE = 18;
const MAX_AGE = 120;
const AGE_ADJUSTMENT = 2;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 250;

export type AdvancedMatchFilterProfile = {
  minAgePreference?: number | null;
  maxAgePreference?: number | null;
  minHeightPreference?: number | null;
  seekingGender?: string | null;
};

export type AdvancedMatchFilterDefaults = {
  gender: string;
  minAge: string;
  maxAge: string;
  minHeight: string;
};

function isValidInteger(value: number | null | undefined, min: number, max: number): value is number {
  return value !== null && value !== undefined && Number.isInteger(value) && value >= min && value <= max;
}

/** Derives UI defaults without mutating the supplied profile. */
export function getAdvancedMatchFilterDefaults(
  profile: AdvancedMatchFilterProfile,
): AdvancedMatchFilterDefaults {
  const minAgeValid = isValidInteger(profile.minAgePreference, MIN_AGE, MAX_AGE);
  const maxAgeValid = isValidInteger(profile.maxAgePreference, MIN_AGE, MAX_AGE);
  const ageBoundsReversed =
    minAgeValid && maxAgeValid && profile.minAgePreference! > profile.maxAgePreference!;

  return {
    gender:
      profile.seekingGender === "male" || profile.seekingGender === "female"
        ? profile.seekingGender
        : "",
    minAge: minAgeValid && !ageBoundsReversed
      ? String(Math.max(MIN_AGE, profile.minAgePreference! - AGE_ADJUSTMENT))
      : "",
    maxAge: maxAgeValid && !ageBoundsReversed
      ? String(Math.min(MAX_AGE, profile.maxAgePreference! + AGE_ADJUSTMENT))
      : "",
    minHeight: isValidInteger(profile.minHeightPreference, MIN_HEIGHT, MAX_HEIGHT)
      ? String(profile.minHeightPreference)
      : "",
  };
}
