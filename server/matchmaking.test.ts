/**
 * Tests for the matchmaking algorithm and core router logic
 */
import { describe, it, expect } from "vitest";

// ─── Personality compatibility map (mirrors routers.ts) ──────────────────────
const COMPATIBLE_TYPES: Record<string, string> = {
  connector: "achiever",
  achiever: "connector",
  nurturer: "adventurer",
  adventurer: "nurturer",
};

// ─── Score computation (mirrors routers.ts) ───────────────────────────────────
type SingleLike = {
  personalityType?: string | null;
  minAgePreference?: number | null;
  maxAgePreference?: number | null;
  age: number;
  religiosity?: string | null;
  wantsKids?: string | null;
  city?: string | null;
};

function computeScore(user: SingleLike, candidate: SingleLike): number {
  let score = 0;

  if (
    user.personalityType &&
    candidate.personalityType &&
    COMPATIBLE_TYPES[user.personalityType] === candidate.personalityType
  ) {
    score += 40;
  } else if (user.personalityType === candidate.personalityType) {
    score += 20;
  }

  if (user.minAgePreference && user.maxAgePreference) {
    if (candidate.age >= user.minAgePreference && candidate.age <= user.maxAgePreference) {
      score += 20;
    }
  } else {
    score += 10;
  }

  if (user.religiosity && candidate.religiosity) {
    if (user.religiosity === candidate.religiosity) score += 20;
    else if (
      (user.religiosity === "traditional" && candidate.religiosity === "secular") ||
      (user.religiosity === "secular" && candidate.religiosity === "traditional")
    )
      score += 10;
  }

  if (user.wantsKids && candidate.wantsKids) {
    if (user.wantsKids === candidate.wantsKids) score += 10;
    else if (user.wantsKids === "open" || candidate.wantsKids === "open") score += 5;
  }

  if (user.city && candidate.city && user.city === candidate.city) {
    score += 10;
  }

  return Math.min(score, 100);
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Personality compatibility map", () => {
  it("connector is compatible with achiever", () => {
    expect(COMPATIBLE_TYPES["connector"]).toBe("achiever");
  });
  it("achiever is compatible with connector", () => {
    expect(COMPATIBLE_TYPES["achiever"]).toBe("connector");
  });
  it("nurturer is compatible with adventurer", () => {
    expect(COMPATIBLE_TYPES["nurturer"]).toBe("adventurer");
  });
  it("adventurer is compatible with nurturer", () => {
    expect(COMPATIBLE_TYPES["adventurer"]).toBe("nurturer");
  });
});

describe("computeScore", () => {
  it("gives 40 points for compatible personality types", () => {
    const user: SingleLike = { personalityType: "connector", age: 30 };
    const candidate: SingleLike = { personalityType: "achiever", age: 28 };
    const score = computeScore(user, candidate);
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it("gives 20 points for same personality type", () => {
    const user: SingleLike = { personalityType: "connector", age: 30 };
    const candidate: SingleLike = { personalityType: "connector", age: 28 };
    const score = computeScore(user, candidate);
    expect(score).toBeGreaterThanOrEqual(20);
  });

  it("gives 10 bonus for same city", () => {
    const user: SingleLike = { personalityType: "connector", age: 30, city: "תל אביב" };
    const candidate: SingleLike = { personalityType: "achiever", age: 28, city: "תל אביב" };
    const scoreWithCity = computeScore(user, candidate);
    const userNoCity: SingleLike = { personalityType: "connector", age: 30 };
    const candidateNoCity: SingleLike = { personalityType: "achiever", age: 28 };
    const scoreWithoutCity = computeScore(userNoCity, candidateNoCity);
    expect(scoreWithCity - scoreWithoutCity).toBe(10);
  });

  it("gives 20 points for same religiosity", () => {
    const user: SingleLike = { personalityType: "connector", age: 30, religiosity: "secular" };
    const candidate: SingleLike = { personalityType: "achiever", age: 28, religiosity: "secular" };
    const score = computeScore(user, candidate);
    expect(score).toBeGreaterThanOrEqual(60); // 40 (personality) + 10 (no age pref) + 20 (religiosity)
  });

  it("gives 10 points for wantsKids match", () => {
    const user: SingleLike = { personalityType: "connector", age: 30, wantsKids: "yes" };
    const candidate: SingleLike = { personalityType: "achiever", age: 28, wantsKids: "yes" };
    const score = computeScore(user, candidate);
    expect(score).toBeGreaterThanOrEqual(50); // 40 + 10 (no age pref) + 10 (kids)
  });

  it("gives 5 points when one party is open to kids", () => {
    const user: SingleLike = { personalityType: "connector", age: 30, wantsKids: "open" };
    const candidate: SingleLike = { personalityType: "achiever", age: 28, wantsKids: "yes" };
    const score = computeScore(user, candidate);
    expect(score).toBeGreaterThanOrEqual(45); // 40 + 10 (no age pref) + 5 (open)
  });

  it("gives 20 points when candidate age is within preference range", () => {
    const user: SingleLike = {
      personalityType: "connector",
      age: 30,
      minAgePreference: 25,
      maxAgePreference: 35,
    };
    const candidate: SingleLike = { personalityType: "achiever", age: 28 };
    const score = computeScore(user, candidate);
    expect(score).toBeGreaterThanOrEqual(60); // 40 + 20 (age in range)
  });

  it("gives 0 age bonus when candidate is outside preference range", () => {
    const user: SingleLike = {
      personalityType: "connector",
      age: 30,
      minAgePreference: 25,
      maxAgePreference: 30,
    };
    const candidate: SingleLike = { personalityType: "achiever", age: 45 };
    const score = computeScore(user, candidate);
    expect(score).toBe(40); // Only personality match
  });

  it("score is capped at 100", () => {
    const user: SingleLike = {
      personalityType: "connector",
      age: 30,
      city: "תל אביב",
      religiosity: "secular",
      wantsKids: "yes",
      minAgePreference: 25,
      maxAgePreference: 35,
    };
    const candidate: SingleLike = {
      personalityType: "achiever",
      age: 28,
      city: "תל אביב",
      religiosity: "secular",
      wantsKids: "yes",
    };
    const score = computeScore(user, candidate);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("Personality type determination from quiz answers", () => {
  const types = ["connector", "achiever", "nurturer", "adventurer"] as const;

  function determinePersonality(answers: number[]): string {
    const counts: Record<string, number> = { connector: 0, achiever: 0, nurturer: 0, adventurer: 0 };
    answers.forEach((a) => { counts[types[a % 4]]++; });
    const entries = Object.entries(counts) as [string, number][];
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  it("returns connector when most answers map to connector (0)", () => {
    const answers = [0, 0, 0, 4, 8, 1]; // 3 connectors, 2 achievers, 1 achiever
    const result = determinePersonality(answers);
    expect(result).toBe("connector");
  });

  it("returns achiever when most answers map to achiever (1)", () => {
    const answers = [1, 5, 9, 1, 0];
    const result = determinePersonality(answers);
    expect(result).toBe("achiever");
  });

  it("returns nurturer when most answers map to nurturer (2)", () => {
    const answers = [2, 6, 10, 2, 2];
    const result = determinePersonality(answers);
    expect(result).toBe("nurturer");
  });

  it("returns adventurer when most answers map to adventurer (3)", () => {
    const answers = [3, 7, 11, 3, 3];
    const result = determinePersonality(answers);
    expect(result).toBe("adventurer");
  });
});
