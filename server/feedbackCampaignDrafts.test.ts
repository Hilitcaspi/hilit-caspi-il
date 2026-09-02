import { describe, expect, it } from "vitest";
import { selectBalancedSatisfactionSample } from "./feedbackCampaignDrafts";

const DAY = 86_400_000;
const NOW = 1_788_300_000_000;

describe("feedback campaign drafts", () => {
  const people = [
    { id: 1, email: "a@example.com", createdAt: NOW - 2 * DAY },
    { id: 2, email: "b@example.com", createdAt: NOW - 7 * DAY },
    { id: 3, email: "c@example.com", createdAt: NOW - 18 * DAY },
    { id: 4, email: "d@example.com", createdAt: NOW - 25 * DAY },
    { id: 5, email: "e@example.com", createdAt: NOW - 40 * DAY },
    { id: 6, email: "f@example.com", createdAt: NOW - 55 * DAY },
    { id: 7, email: "g@example.com", createdAt: NOW - 80 * DAY },
    { id: 8, email: "h@example.com", createdAt: NOW - 180 * DAY },
  ];

  it("selects an even sample across four tenure groups", () => {
    const result = selectBalancedSatisfactionSample(people, 8, NOW);
    expect(result.selected).toHaveLength(8);
    expect(result.breakdown).toEqual({
      under_14_days: 2,
      days_14_30: 2,
      days_31_60: 2,
      over_60_days: 2,
    });
  });

  it("is deterministic and never exceeds the available population", () => {
    const first = selectBalancedSatisfactionSample(people, 50, NOW);
    const second = selectBalancedSatisfactionSample(people, 50, NOW);
    expect(first.selected.map(person => person.id)).toEqual(second.selected.map(person => person.id));
    expect(first.selected).toHaveLength(people.length);
  });
});
