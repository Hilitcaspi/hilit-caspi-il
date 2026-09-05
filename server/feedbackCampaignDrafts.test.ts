import { describe, expect, it } from "vitest";
import { buildFeedbackCampaignRequestKey, classifyFeedbackCampaignContact, selectBalancedSatisfactionSample } from "./feedbackCampaignDrafts";

const DAY = 86_400_000;
const NOW = 1_788_300_000_000;

describe("feedback campaign drafts", () => {
  const people = [
    { id: 1, email: "a@example.com", createdAt: NOW - 2 * DAY, gender: "female", age: 27, city: "תל אביב", sampleStage: "profile_incomplete" },
    { id: 2, email: "b@example.com", createdAt: NOW - 7 * DAY, gender: "male", age: 34, city: "חיפה", sampleStage: "proposal_sent" },
    { id: 3, email: "c@example.com", createdAt: NOW - 18 * DAY, gender: "female", age: 43, city: "ירושלים", sampleStage: "proposal_sent" },
    { id: 4, email: "d@example.com", createdAt: NOW - 25 * DAY, gender: "male", age: 55, city: "באר שבע", sampleStage: "profile_incomplete" },
    { id: 5, email: "e@example.com", createdAt: NOW - 40 * DAY, gender: "female", age: 62, city: "נתניה", sampleStage: "proposal_sent" },
    { id: 6, email: "f@example.com", createdAt: NOW - 55 * DAY, gender: "male", age: 38, city: "אשדוד", sampleStage: "no_match_sent" },
    { id: 7, email: "g@example.com", createdAt: NOW - 80 * DAY, gender: "female", age: 47, city: "עפולה", sampleStage: "mutual_match_history" },
    { id: 8, email: "h@example.com", createdAt: NOW - 180 * DAY, gender: "male", age: 58, city: "רעננה", sampleStage: "proposal_sent" },
  ];

  it("selects an even sample across four tenure groups", () => {
    const result = selectBalancedSatisfactionSample(people, 8, NOW);
    expect(result.selected).toHaveLength(8);
    expect(result.dimensions.gender).toEqual({ female: 4, male: 4 });
    expect(Object.keys(result.dimensions.region)).toHaveLength(5);
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

  it("keeps only valid, active and consented contacts without an existing request", () => {
    expect(classifyFeedbackCampaignContact({
      email: "member@example.com",
      profiles: [{ isActive: true, consentEmailMarketing: true }],
    })).toBeNull();
    expect(classifyFeedbackCampaignContact({ email: "not-an-email" })).toBe("invalid_or_blocked");
    expect(classifyFeedbackCampaignContact({ email: "member@example.com", unsubscribed: true })).toBe("unsubscribed");
    expect(classifyFeedbackCampaignContact({
      email: "member@example.com",
      profiles: [{ isActive: false, consentEmailMarketing: true }],
    })).toBe("inactive_or_no_consent");
    expect(classifyFeedbackCampaignContact({
      email: "member@example.com",
      profiles: [{ isActive: true, consentEmailMarketing: false }],
    })).toBe("inactive_or_no_consent");
    expect(classifyFeedbackCampaignContact({ email: "member@example.com", existingRequest: true })).toBe("existing_request");
  });

  it("deduplicates within an audience and gives successful matches priority over DNA", () => {
    expect(classifyFeedbackCampaignContact({
      email: "member@example.com",
      duplicateContact: true,
      unsubscribed: true,
    })).toBe("duplicate_contact");
    expect(classifyFeedbackCampaignContact({
      email: "member@example.com",
      higherPriorityAudience: true,
      existingRequest: true,
    })).toBe("higher_priority_audience");
  });

  it("uses separate key namespaces for match members and DNA results", () => {
    expect(buildFeedbackCampaignRequestKey("successful_matches", 42)).toContain(":single-42");
    expect(buildFeedbackCampaignRequestKey("dna_completers", 42)).toContain(":result-42");
    expect(buildFeedbackCampaignRequestKey("successful_matches", 42))
      .not.toBe(buildFeedbackCampaignRequestKey("dna_completers", 42));
  });
});
