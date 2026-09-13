import { describe, expect, it } from "vitest";
import { orientParticipantsToStoredMatch } from "./matchParticipantOrientation";

const yossi = { id: 11, firstName: "יוסי" };
const adi = { id: 22, firstName: "עדי" };
const storedMatch = { singleAId: yossi.id, singleBId: adi.id };

describe("orientParticipantsToStoredMatch", () => {
  it("keeps participants unchanged when the selection matches stored A/B", () => {
    expect(orientParticipantsToStoredMatch(yossi, adi, storedMatch)).toEqual({
      singleA: yossi,
      singleB: adi,
      selectionWasReversed: false,
    });
  });

  it("reverses the selected order so token A goes to stored A and shows stored B", () => {
    const oriented = orientParticipantsToStoredMatch(adi, yossi, storedMatch);

    expect(oriented.selectionWasReversed).toBe(true);
    expect(oriented.singleA.firstName).toBe("יוסי");
    expect(oriented.singleB.firstName).toBe("עדי");
    expect({ recipient: oriented.singleA.firstName, partner: oriented.singleB.firstName }).toEqual({
      recipient: "יוסי",
      partner: "עדי",
    });
    expect({ recipient: oriented.singleB.firstName, partner: oriented.singleA.firstName }).toEqual({
      recipient: "עדי",
      partner: "יוסי",
    });
  });

  it("rejects a pair that does not belong to the stored match", () => {
    expect(() => orientParticipantsToStoredMatch(yossi, { id: 33, firstName: "אחר" }, storedMatch))
      .toThrow("Selected participants do not match the stored match orientation");
  });
});
