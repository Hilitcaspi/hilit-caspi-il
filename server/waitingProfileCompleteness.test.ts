import { describe, expect, it } from "vitest";
import { getWaitingProfileCompleteness } from "../shared/waitingProfileCompleteness";

const COMPLETE_PROFILE = {
  age: 32,
  height: 168,
  photoUrl: "https://example.invalid/profile.jpg",
  dnaType: "anchor",
  about: "תיאור",
  partnerDescription: "תיאור התאמה",
  occupation: "עיסוק",
  religiosity: "traditional",
  education: "bachelor",
  city: "עיר",
  questionnaireCompletedAt: 1_700_000_000_000,
};

describe("getWaitingProfileCompleteness", () => {
  it("accepts a complete profile and does not treat false boolean answers as missing", () => {
    const result = getWaitingProfileCompleteness({
      ...COMPLETE_PROFILE,
      // These answers are valid even though they are false. The helper must not
      // use truthiness to infer missing profile data.
      acceptsKids: false,
      hasKids: false,
    });

    expect(result).toEqual({
      missingFields: [],
      questionnaireCompleted: true,
      isComplete: true,
    });
  });

  it("uses aboutMe when the legacy about field is empty", () => {
    const result = getWaitingProfileCompleteness({
      ...COMPLETE_PROFILE,
      about: "   ",
      aboutMe: "תיאור חלופי",
    });

    expect(result.isComplete).toBe(true);
    expect(result.missingFields).not.toContain("תיאור אישי");
  });

  it("reports invalid numeric values and an incomplete questionnaire explicitly", () => {
    const result = getWaitingProfileCompleteness({
      ...COMPLETE_PROFILE,
      age: 0,
      height: null,
      questionnaireCompletedAt: 0,
    });

    expect(result).toMatchObject({
      questionnaireCompleted: false,
      isComplete: false,
    });
    expect(result.missingFields).toEqual(
      expect.arrayContaining(["גיל", "גובה", "שאלון מדעי"]),
    );
  });

  it("reports missing education instead of marking a partial profile as complete", () => {
    expect(getWaitingProfileCompleteness({ ...COMPLETE_PROFILE, education: null }).missingFields).toEqual(["השכלה"]);
  });
});
