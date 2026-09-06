import { describe, expect, it } from "vitest";
import {
  buildFeedbackCampaignRequestKey,
  classifyFeedbackCampaignContact,
  excludeExistingRequestsFromFixedSample,
  selectBalancedSatisfactionSample,
  selectEngagedDnaSample,
  summarizeCompletedDnaJourney,
} from "./feedbackCampaignDrafts";

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

  it("uses separate key namespaces for match members, success follow-ups and DNA results", () => {
    expect(buildFeedbackCampaignRequestKey("successful_matches", 42)).toContain(":single-42");
    expect(buildFeedbackCampaignRequestKey("match_success_followup", 42)).toContain(":single-42");
    expect(buildFeedbackCampaignRequestKey("dna_completers", 42)).toContain(":result-42");
    expect(buildFeedbackCampaignRequestKey("successful_matches", 42))
      .not.toBe(buildFeedbackCampaignRequestKey("dna_completers", 42));
    expect(buildFeedbackCampaignRequestKey("successful_matches", 42))
      .not.toBe(buildFeedbackCampaignRequestKey("match_success_followup", 42));
  });

  it("requires every email in a DNA journey to be sent and at least one to be opened", () => {
    const complete = Array.from({ length: 6 }, (_, index) => ({
      journeyKey: "women_first_step_v2",
      emailIndex: index + 1,
      status: "sent",
      sentAt: NOW + index,
      openedAt: index === 2 ? NOW + index : null,
      openCount: index === 2 ? 2 : 0,
    }));
    expect(summarizeCompletedDnaJourney(complete)).toEqual({ completed: true, opened: true, openCount: 2 });
    expect(summarizeCompletedDnaJourney(complete.slice(0, 5)).completed).toBe(false);
    expect(summarizeCompletedDnaJourney(complete.map(row => ({ ...row, openedAt: null, openCount: 0 })))).toEqual({ completed: true, opened: false, openCount: 0 });
  });

  it("selects an engaged DNA sample of 100 with 75 women and 25 men", () => {
    const candidates = [
      ...Array.from({ length: 90 }, (_, index) => ({ contactEmail: `w${index}@example.com`, gender: "female" as const, openCount: index + 1, completedAt: NOW - index })),
      ...Array.from({ length: 40 }, (_, index) => ({ contactEmail: `m${index}@example.com`, gender: "male" as const, openCount: index + 1, completedAt: NOW - index })),
    ];
    const selected = selectEngagedDnaSample(candidates, 100);
    expect(selected).toHaveLength(100);
    expect(selected.filter(candidate => candidate.gender === "female")).toHaveLength(75);
    expect(selected.filter(candidate => candidate.gender === "male")).toHaveLength(25);
    expect(selected.some(candidate => candidate.contactEmail === "w89@example.com")).toBe(true);
  });

  it("does not replenish a fixed DNA sample with new contacts after its drafts were prepared", () => {
    const selected = Array.from({ length: 100 }, (_, index) => ({ requestKey: `dna-${index}`, email: `person${index}@example.com` }));
    const result = excludeExistingRequestsFromFixedSample(selected, new Set(selected.map(candidate => candidate.requestKey)));
    expect(result.eligible).toHaveLength(0);
    expect(result.existingCount).toBe(100);
  });
});
