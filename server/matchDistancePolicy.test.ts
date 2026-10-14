import { describe, expect, it } from "vitest";
import type { Single } from "../drizzle/schema";
import {
  CITY_DB,
  areSameOrNearbyIsraeliCities,
  normalizeIsraeliCityName,
  scoreLocation,
} from "../shared/cities";
import { computeFullScore, computeFullScoreAdmin } from "./compatibility";

function person(
  gender: "male" | "female",
  city: string | null | undefined,
  locationPreference: "close" | "anywhere",
): Single {
  return {
    gender,
    city,
    locationPreference,
    age: 42,
    seekingGender: gender === "male" ? "female" : "male",
    dnaType: "anchor",
    religiosity: "secular",
    hasKids: false,
  } as Single;
}

const preferencePairs: ReadonlyArray<readonly ["close" | "anywhere", "close" | "anywhere"]> = [
  ["close", "close"],
  ["close", "anywhere"],
  ["anywhere", "close"],
  ["anywhere", "anywhere"],
];

describe("city distance policy", () => {
  it("keeps every recognized nearby city pair at 100 without demographic penalties", () => {
    for (const cityA of Object.keys(CITY_DB)) for (const cityB of Object.keys(CITY_DB)) {
      if (!areSameOrNearbyIsraeliCities(cityA, cityB)) continue;
      for (const [prefA, prefB] of preferencePairs) {
        expect(scoreLocation(cityA, cityB, prefA, prefB).score).toBe(100);
        expect(computeFullScoreAdmin(person("male", cityA, prefA), person("female", cityB, prefB), [], []).cityIntelligence).toBe(100);
      }
    }
  });
  it("normalizes supported English and Hebrew aliases before scoring geography", () => {
    expect(normalizeIsraeliCityName(" Haifa ")).toBe("חיפה");
    expect(normalizeIsraeliCityName("חִיפָה")).toBe("חיפה");
    expect(normalizeIsraeliCityName("קרית אתא")).toBe("קריית אתא");
    expect(normalizeIsraeliCityName("Tel Aviv-Jaffa")).toBe("תל אביב-יפו");
  });

  it.each(preferencePairs)("gives a same-city Haifa pair 100 for %s/%s", (aPreference, bPreference) => {
    const location = scoreLocation("Haifa", "חיפה", aPreference, bPreference);
    const strict = computeFullScore(
      person("male", "Haifa", aPreference),
      person("female", "חיפה", bPreference),
      [],
      [],
    );
    const admin = computeFullScoreAdmin(
      person("male", "Haifa", aPreference),
      person("female", "חיפה", bPreference),
      [],
      [],
    );

    expect(location.score).toBe(100);
    expect(location.distanceKm).toBe(
      aPreference === "anywhere" && bPreference === "anywhere" ? null : 0,
    );
    expect(strict.practical).toBe(93);
    expect(strict.cityIntelligence).toBe(100);
    expect(admin.practical).toBe(strict.practical);
    expect(admin.cityIntelligence).toBe(strict.cityIntelligence);
    expect(admin.warnings).toEqual([]);
  });

  it("gives nearby recognized cities the existing top distance tier despite close/anywhere preferences", () => {
    const location = scoreLocation("Tel Aviv", "גבעתיים", "close", "anywhere");
    const strict = computeFullScore(
      person("male", "Tel Aviv", "close"),
      person("female", "גבעתיים", "anywhere"),
      [],
      [],
    );

    expect(areSameOrNearbyIsraeliCities("Tel Aviv", "גבעתיים")).toBe(true);
    expect(location.score).toBe(100);
    expect(strict.total).toBeGreaterThan(0);
    expect(strict.practical).toBe(93);
    expect(strict.cityIntelligence).toBe(100);
  });

  it("preserves the long-distance close hard filter while keeping two open people eligible", () => {
    const closeAndOpen = computeFullScore(
      person("male", "תל אביב", "close"),
      person("female", "חיפה", "anywhere"),
      [],
      [],
    );
    const closeAndOpenAdmin = computeFullScoreAdmin(
      person("male", "תל אביב", "close"),
      person("female", "חיפה", "anywhere"),
      [],
      [],
    );
    const bothOpen = computeFullScore(
      person("male", "תל אביב", "anywhere"),
      person("female", "חיפה", "anywhere"),
      [],
      [],
    );

    expect(closeAndOpen.total).toBe(0);
    expect(closeAndOpenAdmin.warnings).toContainEqual(expect.stringContaining("מחפש קרוב"));
    expect(bothOpen.total).toBeGreaterThan(0);
    expect(bothOpen.practical).toBe(93);
  });

  it("keeps missing and unknown locations neutral rather than inventing a 100", () => {
    const unknown = scoreLocation("Unknownville", "Unknownville", "anywhere", "anywhere");
    const missing = scoreLocation(null, "חיפה", "close", "anywhere");
    const unknownPair = computeFullScore(
      person("male", "Unknownville", "close"),
      person("female", "Unknownville", "anywhere"),
      [],
      [],
    );

    expect(unknown).toMatchObject({ score: 55, distanceKm: null });
    expect(missing).toMatchObject({ score: 55, distanceKm: null });
    expect(areSameOrNearbyIsraeliCities("Unknownville", "Unknownville")).toBe(false);
    expect(unknownPair.practical).toBe(59);
    expect(unknownPair.cityIntelligence).toBe(65);
  });
});
