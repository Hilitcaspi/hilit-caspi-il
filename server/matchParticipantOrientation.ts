export type MatchParticipant = { id: number };

export type StoredMatchOrientation = {
  singleAId: number;
  singleBId: number;
};

export function orientParticipantsToStoredMatch<T extends MatchParticipant>(
  selectedA: T,
  selectedB: T,
  storedMatch: StoredMatchOrientation,
): { singleA: T; singleB: T; selectionWasReversed: boolean } {
  if (selectedA.id === storedMatch.singleAId && selectedB.id === storedMatch.singleBId) {
    return { singleA: selectedA, singleB: selectedB, selectionWasReversed: false };
  }

  if (selectedA.id === storedMatch.singleBId && selectedB.id === storedMatch.singleAId) {
    return { singleA: selectedB, singleB: selectedA, selectionWasReversed: true };
  }

  throw new Error("Selected participants do not match the stored match orientation");
}
