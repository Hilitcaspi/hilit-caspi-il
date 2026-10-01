import { describe, expect, it } from "vitest";
import { blocksNewMatch, canSuggestNewMatch, matchPairKey } from "./unmatchedQueue";

const person = { id: 10, photoUrl: "https://example.test/a.jpg", email: "a@example.test" };
const other = { id: 20, photoUrl: "https://example.test/b.jpg", email: "b@example.test" };

// These tests protect the action as well as the queue counts: a recommendation
// should not be offered if the direct-send endpoint would refuse it.
describe("matchmaking waiting queue", () => {
  it("recognizes proposed matches even if the provider never accepted delivery", () => {
    expect(blocksNewMatch({ status: "proposed", returnedToPoolAt: null, matchDetailStatus: null })).toBe(true);
    expect(blocksNewMatch({ status: "matched", returnedToPoolAt: null, matchDetailStatus: "dating" })).toBe(true);
    expect(blocksNewMatch({ status: "matched", returnedToPoolAt: 123, matchDetailStatus: "dating" })).toBe(false);
    expect(blocksNewMatch({ status: "matched", returnedToPoolAt: null, matchDetailStatus: "ended" })).toBe(false);
    expect(blocksNewMatch({ status: "expired", returnedToPoolAt: null, matchDetailStatus: null })).toBe(false);
  });

  it("never suggests a pair whose proposal was already sent, in either orientation", () => {
    expect(matchPairKey(10, 20)).toBe(matchPairKey(20, 10));
    expect(canSuggestNewMatch(person, other, new Set(), new Set([matchPairKey(20, 10)]))).toBe(false);
    expect(canSuggestNewMatch(person, other, new Set(), new Set())).toBe(true);
  });

  it("excludes either party if they have a current match proposal", () => {
    expect(canSuggestNewMatch(person, other, new Set([person.id]), new Set())).toBe(false);
    expect(canSuggestNewMatch(person, other, new Set([other.id]), new Set())).toBe(false);
  });

  it("requires a photo and email for each recipient of a new proposal", () => {
    expect(canSuggestNewMatch({ ...person, photoUrl: null }, other, new Set(), new Set())).toBe(false);
    expect(canSuggestNewMatch(person, { ...other, photoUrl: " " }, new Set(), new Set())).toBe(false);
    expect(canSuggestNewMatch(person, { ...other, email: null }, new Set(), new Set())).toBe(false);
    expect(canSuggestNewMatch(person, { ...person }, new Set(), new Set())).toBe(false);
  });
});
