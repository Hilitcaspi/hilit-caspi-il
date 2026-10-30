import { describe, expect, it } from "vitest";
import { resolveRegistrationDraftOwnership } from "./registrationDraftOwnership";

const DRAFT_TOKEN = "a".repeat(64);
const DNA_SESSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const profile = {
  id: 42,
  email: "draft@example.test",
  questionnaireToken: DRAFT_TOKEN,
};

describe("registration draft ownership", () => {
  it("accepts only the matching stored 64-hex draft token", () => {
    expect(resolveRegistrationDraftOwnership({
      existingProfile: profile,
      normalizedEmail: "draft@example.test",
      draftToken: DRAFT_TOKEN,
      hasVerifiedFreeToken: false,
    })).toEqual({ authorized: true, proof: "draft_token" });

    expect(resolveRegistrationDraftOwnership({
      existingProfile: profile,
      normalizedEmail: "draft@example.test",
      draftToken: "b".repeat(64),
      hasVerifiedFreeToken: false,
    })).toEqual({ authorized: false, proof: null });
  });

  it("requires a verified free-token proof and matching stored email", () => {
    expect(resolveRegistrationDraftOwnership({
      existingProfile: profile,
      normalizedEmail: "DRAFT@EXAMPLE.TEST",
      hasVerifiedFreeToken: true,
    })).toEqual({ authorized: true, proof: "free_token" });

    expect(resolveRegistrationDraftOwnership({
      existingProfile: profile,
      normalizedEmail: "other@example.test",
      hasVerifiedFreeToken: true,
    })).toEqual({ authorized: false, proof: null });
  });

  it("requires a UUID DNA session already linked to the same profile and email", () => {
    expect(resolveRegistrationDraftOwnership({
      existingProfile: profile,
      normalizedEmail: "draft@example.test",
      hasVerifiedFreeToken: false,
      dnaSessionId: DNA_SESSION_ID,
      verifiedDnaSession: { sessionId: DNA_SESSION_ID, singleId: 42 },
    })).toEqual({ authorized: true, proof: "dna_session" });

    expect(resolveRegistrationDraftOwnership({
      existingProfile: profile,
      normalizedEmail: "draft@example.test",
      hasVerifiedFreeToken: false,
      dnaSessionId: DNA_SESSION_ID,
      verifiedDnaSession: { sessionId: DNA_SESSION_ID, singleId: 77 },
    })).toEqual({ authorized: false, proof: null });
  });

  it("never treats email alone as ownership", () => {
    expect(resolveRegistrationDraftOwnership({
      existingProfile: profile,
      normalizedEmail: "draft@example.test",
      hasVerifiedFreeToken: false,
    })).toEqual({ authorized: false, proof: null });
  });
});
