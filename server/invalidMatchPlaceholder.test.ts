import { describe, expect, it } from "vitest";
import { isInvalidMatchPlaceholder } from "./invalidMatchPlaceholder";

const row = {
  status: "pending",
  score: 0,
  proposedAt: null,
  ownerApprovedAt: null,
  notes: null,
};

describe("unsent zero-score matching placeholders", () => {
  it("recognizes an unsent failed-filter placeholder", () => {
    expect(isInvalidMatchPlaceholder(row)).toBe(true);
  });

  it("never reuses a sent, owner-approved, annotated, rejected or nonzero match", () => {
    expect(isInvalidMatchPlaceholder({ ...row, proposedAt: Date.now() })).toBe(false);
    expect(isInvalidMatchPlaceholder({ ...row, ownerApprovedAt: Date.now() })).toBe(false);
    expect(isInvalidMatchPlaceholder({ ...row, notes: "reviewed" })).toBe(false);
    expect(isInvalidMatchPlaceholder({ ...row, status: "rejected" })).toBe(false);
    expect(isInvalidMatchPlaceholder({ ...row, score: 55 })).toBe(false);
  });
});
