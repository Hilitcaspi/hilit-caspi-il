import { describe, expect, it } from "vitest";
import { isOperationalJourneyEmail } from "./automation";

describe("automation marketing suppression boundary", () => {
  it("preserves only the first access email for paid product and database journeys", () => {
    expect(isOperationalJourneyEmail("women_guide", 1)).toBe(true);
    expect(isOperationalJourneyEmail("men_course", 1)).toBe(true);
    expect(isOperationalJourneyEmail("women_matchmaking_welcome", 1)).toBe(true);
    expect(isOperationalJourneyEmail("women_guide", 2)).toBe(false);
  });

  it("treats lead nurture, abandoned cart and feedback-like follow-ups as marketing", () => {
    expect(isOperationalJourneyEmail("women_first_step", 1)).toBe(false);
    expect(isOperationalJourneyEmail("meta_lead_dna", 1)).toBe(false);
    expect(isOperationalJourneyEmail("abandoned_database", 1)).toBe(false);
  });
});
