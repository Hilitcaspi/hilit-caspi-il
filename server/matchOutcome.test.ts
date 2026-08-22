import { describe, expect, it } from "vitest";
import {
  mapParticipantStatusToDetailStatus,
  parseMatchOutcomeNotes,
  setAdminOutcome,
  setParticipantFeedback,
  type MatchParticipantFeedback,
} from "./matchOutcome";

function feedback(status: MatchParticipantFeedback["status"], overrides: Partial<MatchParticipantFeedback> = {}): MatchParticipantFeedback {
  return {
    status,
    rating: 4,
    comment: "משוב בדיקה",
    testimonialText: null,
    publicityScope: "none",
    consentToFollowUp: true,
    consentConfirmed: false,
    consentTextVersion: null,
    consentAt: null,
    submittedAt: 1_700_000_000_000,
    source: "participant_portal",
    ...overrides,
  };
}

describe("match outcome storage", () => {
  it("preserves an existing free-text note when structured feedback is added", () => {
    const stored = setParticipantFeedback("שוחרר ידנית בעבר", "A", feedback("met"));
    const parsed = parseMatchOutcomeNotes(stored);

    expect(parsed.legacyNote).toBe("שוחרר ידנית בעבר");
    expect(parsed.participantA?.status).toBe("met");
    expect(parsed.participantB).toBeFalsy();
  });

  it("stores each participant report separately", () => {
    const afterA = setParticipantFeedback(null, "A", feedback("continuing"));
    const afterB = setParticipantFeedback(afterA, "B", feedback("relationship", {
      publicityScope: "first_name",
      consentConfirmed: true,
      consentAt: 1_700_000_010_000,
    }));
    const parsed = parseMatchOutcomeNotes(afterB);

    expect(parsed.participantA?.status).toBe("continuing");
    expect(parsed.participantB?.status).toBe("relationship");
    expect(parsed.participantB?.publicityScope).toBe("first_name");
  });

  it("keeps participant feedback when an admin verifies the result", () => {
    const participantStored = setParticipantFeedback(null, "A", feedback("relationship"));
    const verified = parseMatchOutcomeNotes(setAdminOutcome(participantStored, "אומת בשיחה", true));

    expect(verified.participantA?.status).toBe("relationship");
    expect(verified.adminNote).toBe("אומת בשיחה");
    expect(verified.adminVerifiedAt).toBeTypeOf("number");
  });

  it("does not mark a relationship as authoritative unless both sides report it", () => {
    expect(mapParticipantStatusToDetailStatus(feedback("relationship"), feedback("talking"))).toBe("talking");
    expect(mapParticipantStatusToDetailStatus(feedback("relationship"), feedback("relationship"))).toBe("together");
  });
});
