import { describe, expect, it } from "vitest";
import { buildPartnerTrackingUrl, canAssignTask, canEditTask } from "./operationsPolicy";

describe("operations permissions", () => {
  it("allows an administrator to edit and assign every task", () => {
    expect(canEditTask(true, undefined, 42)).toBe(true);
    expect(canAssignTask(true, undefined, 99)).toBe(true);
  });

  it("allows a team member to handle unassigned or own tasks only", () => {
    expect(canEditTask(false, 7, null)).toBe(true);
    expect(canEditTask(false, 7, 7)).toBe(true);
    expect(canEditTask(false, 7, 8)).toBe(false);
  });

  it("prevents a non-admin team member from assigning work to someone else", () => {
    expect(canAssignTask(false, 7, 7)).toBe(true);
    expect(canAssignTask(false, 7, null)).toBe(true);
    expect(canAssignTask(false, 7, 8)).toBe(false);
  });

  it("creates a deterministic, encoded attribution URL", () => {
    expect(buildPartnerTrackingUrl("event", "tel-aviv-01")).toBe(
      "https://hilitcaspi.com/dna-quiz?utm_source=event&utm_medium=referral&utm_campaign=tel-aviv-01",
    );
  });
});
