import { describe, expect, it } from "vitest";
import { isEligibleMatchCandidate, matchCandidateProofType, matchCandidateReason } from "./testimonialCandidates";

function outcome(overrides: Record<string, unknown> = {}) {
  return { version: 1 as const, updatedAt: Date.now(), ...overrides };
}

describe("testimonial match candidates", () => {
  it("accepts participant-reported progress without upgrading it to relationship success", () => {
    const feedback = { status: "date_scheduled", publicityScope: "none", consentToFollowUp: true, consentConfirmed: false, submittedAt: Date.now(), source: "participant_portal" } as any;
    expect(isEligibleMatchCandidate({ outcome: outcome(), feedback })).toBe(true);
    expect(matchCandidateProofType({ feedback })).toBe("progress");
    expect(matchCandidateReason({ feedback })).toContain("דייט");
  });

  it("classifies an explicit relationship as success", () => {
    const feedback = { status: "relationship" } as any;
    expect(isEligibleMatchCandidate({ outcome: outcome(), feedback })).toBe(true);
    expect(matchCandidateProofType({ feedback })).toBe("success");
  });

  it("requires team verification when eligibility comes only from an admin detail status", () => {
    expect(isEligibleMatchCandidate({ detailStatus: "together", outcome: outcome() })).toBe(false);
    expect(isEligibleMatchCandidate({ detailStatus: "together", outcome: outcome({ adminVerifiedAt: Date.now() }) })).toBe(true);
  });

  it("does not create a candidate from ended or unreported matches", () => {
    const feedback = { status: "ended" } as any;
    expect(isEligibleMatchCandidate({ detailStatus: "ended", outcome: outcome(), feedback })).toBe(false);
  });
});
