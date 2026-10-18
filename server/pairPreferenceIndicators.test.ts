import { describe, expect, it } from "vitest";
import {
  getPairPreferenceIndicators,
  type PairPreferenceProfile,
} from "../shared/pairPreferenceIndicators";
import { CITY_DB, haversineKm } from "../shared/cities";

const completeCandidate = (): PairPreferenceProfile => ({
  age: 30,
  gender: "female",
  city: "Haifa",
  height: 165,
  religiosity: "traditional",
  education: "master",
  hasKids: false,
  wantsKids: "open",
  hasPets: false,
  smokingStatus: "no",
  seekingGender: "male",
});

const completeSeeker = (): PairPreferenceProfile => ({
  age: 34,
  gender: "male",
  city: "חיפה",
  height: 180,
  religiosity: "secular",
  hasKids: false,
  wantsKids: "yes",
  minAgePreference: 25,
  maxAgePreference: 35,
  minHeightPreference: 160,
  maxHeightPreference: 180,
  seekingGender: "female",
  locationPreference: "close",
  religiosityPreference: "traditional,secular",
  openToPartnerWithKids: "yes",
  acceptsKids: true,
  acceptsPets: true,
  smokingPreference: "no_smokers",
});

describe("getPairPreferenceIndicators", () => {
  it("checks candidate facts against seeker preferences, not in the reverse direction", () => {
    const candidate = { ...completeCandidate(), gender: "male", seekingGender: "female" };
    const seeker = { ...completeSeeker(), gender: "female", seekingGender: "female" };

    const result = getPairPreferenceIndicators(candidate, seeker);

    // The candidate's own request is satisfied by the seeker, but that is not
    // what this one-directional display helper evaluates.
    expect(result.gender.state).toBe("not_met");
    expect(result.gender.reason).toContain("העדפה");
  });

  it("supports explicitly documented same-sex and any-gender preferences without inference", () => {
    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), gender: "female" },
      { ...completeSeeker(), gender: "female", seekingGender: "female" },
    ).gender.state).toBe("met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), gender: "male" },
      { ...completeSeeker(), seekingGender: "any" },
    ).gender.state).toBe("met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), gender: "male" },
      { ...completeSeeker(), seekingGender: null },
    ).gender.state).toBe("unknown");
  });

  it("uses exact inclusive age and height ranges, including valid one-sided ranges", () => {
    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), age: 18, height: 100 },
      { ...completeSeeker(), minAgePreference: 18, maxAgePreference: 120, minHeightPreference: 100, maxHeightPreference: 250 },
    )).toMatchObject({ age: { state: "met" }, height: { state: "met" } });

    const oneSided = getPairPreferenceIndicators(
      { ...completeCandidate(), age: 40, height: 200 },
      { ...completeSeeker(), minAgePreference: 40, maxAgePreference: null, minHeightPreference: null, maxHeightPreference: 200 },
    );
    expect(oneSided.age.state).toBe("met");
    expect(oneSided.height.state).toBe("met");

    const outsideWithoutTolerance = getPairPreferenceIndicators(
      { ...completeCandidate(), age: 39, height: 159 },
      { ...completeSeeker(), minAgePreference: 40, maxAgePreference: null, minHeightPreference: 160, maxHeightPreference: null },
    );
    expect(outsideWithoutTolerance.age.state).toBe("not_met");
    expect(outsideWithoutTolerance.height.state).toBe("not_met");
    expect(outsideWithoutTolerance.age.reason).toContain("מ-40");
  });

  it("makes invalid, reversed, non-integer, and out-of-bound age/height data unknown", () => {
    const invalidRange = getPairPreferenceIndicators(
      { ...completeCandidate(), age: 30, height: 165 },
      { ...completeSeeker(), minAgePreference: 50, maxAgePreference: 40, minHeightPreference: 251, maxHeightPreference: 250 },
    );
    expect(invalidRange.age.state).toBe("unknown");
    expect(invalidRange.height.state).toBe("unknown");

    const invalidFacts = getPairPreferenceIndicators(
      { ...completeCandidate(), age: 17, height: 165.5 },
      completeSeeker(),
    );
    expect(invalidFacts.age.state).toBe("unknown");
    expect(invalidFacts.height.state).toBe("unknown");
  });

  it("treats explicit false values as documented for kids and pets", () => {
    const noKidsOrPets = getPairPreferenceIndicators(
      { ...completeCandidate(), hasKids: false, hasPets: false },
      { ...completeSeeker(), openToPartnerWithKids: undefined, acceptsKids: false, acceptsPets: false },
    );
    expect(noKidsOrPets.hasKids.state).toBe("met");
    expect(noKidsOrPets.pets.state).toBe("met");

    const childrenAndPetsRejected = getPairPreferenceIndicators(
      { ...completeCandidate(), hasKids: true, hasPets: true },
      { ...completeSeeker(), openToPartnerWithKids: "no", acceptsKids: false, acceptsPets: false },
    );
    expect(childrenAndPetsRejected.hasKids.state).toBe("not_met");
    expect(childrenAndPetsRejected.pets.state).toBe("not_met");
  });

  it("keeps contradictory or age-dependent existing-children preferences unknown", () => {
    const contradictory = getPairPreferenceIndicators(
      { ...completeCandidate(), hasKids: true },
      { ...completeSeeker(), openToPartnerWithKids: "yes", acceptsKids: false },
    );
    expect(contradictory.hasKids.state).toBe("unknown");

    const dependsOnAge = getPairPreferenceIndicators(
      { ...completeCandidate(), hasKids: true },
      { ...completeSeeker(), openToPartnerWithKids: "depends_on_age", acceptsKids: undefined },
    );
    expect(dependsOnAge.hasKids.state).toBe("unknown");

    const noCandidateKids = getPairPreferenceIndicators(
      { ...completeCandidate(), hasKids: false },
      { ...completeSeeker(), openToPartnerWithKids: "depends_on_age", acceptsKids: undefined },
    );
    expect(noCandidateKids.hasKids.state).toBe("met");
  });

  it("requires both documented future-children preferences and lets open remain compatible", () => {
    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), wantsKids: "yes" },
      { ...completeSeeker(), wantsKids: "no" },
    ).wantsKids.state).toBe("not_met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), wantsKids: "open" },
      { ...completeSeeker(), wantsKids: "no" },
    ).wantsKids.state).toBe("met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), wantsKids: null },
      { ...completeSeeker(), wantsKids: "open" },
    ).wantsKids.state).toBe("unknown");
  });

  it("uses only exact valid religiosity enum values and the documented comma-separated preference", () => {
    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), religiosity: "traditional" },
      { ...completeSeeker(), religiosityPreference: "secular, traditional" },
    ).religiosity.state).toBe("met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), religiosity: "traditional" },
      { ...completeSeeker(), religiosityPreference: "secular" },
    ).religiosity.state).toBe("not_met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), religiosity: "traditional" },
      { ...completeSeeker(), religiosityPreference: "traditional," },
    ).religiosity.state).toBe("unknown");
  });

  it("keeps education unknown because the schema has no education preference", () => {
    const result = getPairPreferenceIndicators(completeCandidate(), completeSeeker());
    expect(result.education).toEqual({
      state: "unknown",
      reason: expect.stringContaining("אין בסכמה העדפת השכלה"),
    });
  });

  it("uses recognized city aliases, a 30 km close threshold, and no city names in reasons", () => {
    const close = getPairPreferenceIndicators(
      { ...completeCandidate(), city: "Tel Aviv-Jaffa" },
      { ...completeSeeker(), city: "גבעתיים", locationPreference: "close" },
    );
    expect(close.location.state).toBe("met");
    expect(close.location.reason).toContain("ק״מ");
    expect(close.location.reason).toContain("30");
    expect(close.location.reason).not.toContain("תל אביב");
    expect(close.location.reason).not.toContain("גבעתיים");

    const far = getPairPreferenceIndicators(
      { ...completeCandidate(), city: "אילת" },
      { ...completeSeeker(), city: "חיפה", locationPreference: "close" },
    );
    expect(far.location.state).toBe("not_met");
    expect(far.location.reason).toContain("ק״מ");

    const anywhere = getPairPreferenceIndicators(
      { ...completeCandidate(), city: "Haifa" },
      { ...completeSeeker(), city: null, locationPreference: "anywhere" },
    );
    expect(anywhere.location.state).toBe("met");
  });

  it("compares the unrounded distance against the close threshold for every known city pair", () => {
    for (const [cityA, a] of Object.entries(CITY_DB)) {
      for (const [cityB, b] of Object.entries(CITY_DB)) {
        const distance = haversineKm(a.lat, a.lng, b.lat, b.lng);
        const result = getPairPreferenceIndicators({ city: cityA }, { city: cityB, locationPreference: "close" });
        expect(result.location.state).toBe(distance <= 30 ? "met" : "not_met");
      }
    }
  });

  it("keeps unknown or missing cities unknown rather than applying location defaults", () => {
    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), city: "Unknownville" },
      { ...completeSeeker(), locationPreference: "anywhere" },
    ).location.state).toBe("unknown");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), city: "Haifa" },
      { ...completeSeeker(), city: null, locationPreference: "close" },
    ).location.state).toBe("unknown");
  });

  it("maps all documented smoking preference levels without defaults", () => {
    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), smokingStatus: "occasionally" },
      { ...completeSeeker(), smokingPreference: "no_smokers" },
    ).smoking.state).toBe("not_met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), smokingStatus: "occasionally" },
      { ...completeSeeker(), smokingPreference: "occasionally_ok" },
    ).smoking.state).toBe("met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), smokingStatus: "yes" },
      { ...completeSeeker(), smokingPreference: "doesnt_matter" },
    ).smoking.state).toBe("met");

    expect(getPairPreferenceIndicators(
      { ...completeCandidate(), smokingStatus: null },
      { ...completeSeeker(), smokingPreference: "doesnt_matter" },
    ).smoking.state).toBe("unknown");
  });

  it("accepts null and undefined profiles, remains pure, and never exposes incidental PII in reasons", () => {
    const unknown = getPairPreferenceIndicators(null, undefined);
    expect(Object.values(unknown).every(value => value.state === "unknown")).toBe(true);

    const candidate = Object.freeze({
      ...completeCandidate(),
      firstName: "שם-בדיקה",
      id: 42,
      email: ["private", "example.com"].join("@"),
      phone: "0".repeat(10),
    });
    const seeker = Object.freeze(completeSeeker());
    const beforeCandidate = { ...candidate };
    const beforeSeeker = { ...seeker };

    const first = getPairPreferenceIndicators(candidate, seeker);
    const second = getPairPreferenceIndicators(candidate, seeker);

    expect(candidate).toEqual(beforeCandidate);
    expect(seeker).toEqual(beforeSeeker);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    for (const value of Object.values(first)) {
      expect(value.reason).not.toContain("שם-בדיקה");
      expect(value.reason).not.toContain(candidate.email);
      expect(value.reason).not.toContain(candidate.phone);
      expect(value.reason).not.toContain("42");
    }
  });
});
