import { describe, expect, it } from "vitest";
import { serializeMatchOutcomeNotes, type MatchOutcomeRecord, type MatchParticipantFeedback } from "./matchOutcome";
import { extractApprovedTestimonialSeeds, hydrateApprovedTestimonials } from "./publicTestimonials";

const approvedFeedback = (overrides: Partial<MatchParticipantFeedback> = {}): MatchParticipantFeedback => ({
  status: "relationship",
  testimonialText: "הכרנו דרך המאגר ואנחנו ממשיכים יחד.",
  publicityScope: "first_name",
  consentToFollowUp: true,
  consentConfirmed: true,
  consentTextVersion: "2026-08-22-v1",
  consentAt: 1_700_000_000_000,
  submittedAt: 1_700_000_000_000,
  source: "participant_portal",
  ...overrides,
});

const candidate = (record: MatchOutcomeRecord) => ({
  matchId: 42,
  singleAId: 10,
  singleBId: 20,
  notes: serializeMatchOutcomeNotes(record),
});

describe("approved public testimonials", () => {
  it("requires both explicit consent and team verification", () => {
    const unverified = extractApprovedTestimonialSeeds(candidate({
      version: 1,
      participantA: approvedFeedback(),
      adminVerifiedAt: null,
      updatedAt: 1_700_000_000_000,
    }));
    const noConsent = extractApprovedTestimonialSeeds(candidate({
      version: 1,
      participantA: approvedFeedback({ consentConfirmed: false }),
      adminVerifiedAt: 1_700_000_100_000,
      updatedAt: 1_700_000_100_000,
    }));

    expect(unverified).toEqual([]);
    expect(noConsent).toEqual([]);
  });

  it("publishes only positive continuing or relationship outcomes", () => {
    const ended = extractApprovedTestimonialSeeds(candidate({
      version: 1,
      participantA: approvedFeedback({ status: "ended" }),
      adminVerifiedAt: 1_700_000_100_000,
      updatedAt: 1_700_000_100_000,
    }));
    const approved = extractApprovedTestimonialSeeds(candidate({
      version: 1,
      participantA: approvedFeedback(),
      adminVerifiedAt: 1_700_000_100_000,
      updatedAt: 1_700_000_100_000,
    }));

    expect(ended).toEqual([]);
    expect(approved).toHaveLength(1);
  });

  it("honors anonymous, first-name, full-name and photo scopes", () => {
    const people = new Map([[10, { id: 10, firstName: "נועה", lastName: "כהן", photoUrl: "/photo.jpg" }]]);
    const baseSeed = {
      id: "42-A",
      personId: 10,
      text: "טקסט מאושר",
      submittedAt: 1_700_000_000_000,
    };

    expect(hydrateApprovedTestimonials([{ ...baseSeed, publicityScope: "anonymous" }], people)[0]).toMatchObject({ displayName: "חבר/ת המאגר", photoUrl: null });
    expect(hydrateApprovedTestimonials([{ ...baseSeed, publicityScope: "first_name" }], people)[0]).toMatchObject({ displayName: "נועה", photoUrl: null });
    expect(hydrateApprovedTestimonials([{ ...baseSeed, publicityScope: "full_name" }], people)[0]).toMatchObject({ displayName: "נועה כהן", photoUrl: null });
    expect(hydrateApprovedTestimonials([{ ...baseSeed, publicityScope: "photo" }], people)[0]).toMatchObject({ displayName: "נועה כהן", photoUrl: "/photo.jpg" });
  });
});
