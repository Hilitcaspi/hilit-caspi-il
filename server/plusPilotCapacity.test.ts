import { describe, expect, it } from "vitest";
import {
  PLUS_PILOT_LIMIT_PER_GENDER,
  calculatePlusPilotCapacity,
  hasPlusPilotCapacity,
  isPlusPilotSlotReserved,
} from "./plusPilotCapacity";

describe("Plus pilot 20/20 capacity", () => {
  it("reserves slots only for invited and active members", () => {
    expect(isPlusPilotSlotReserved("invited")).toBe(true);
    expect(isPlusPilotSlotReserved("active")).toBe(true);
    expect(isPlusPilotSlotReserved("eligible")).toBe(false);
    expect(isPlusPilotSlotReserved("declined")).toBe(false);
  });

  it("enforces separate limits for 20 women and 20 men", () => {
    const rows = [
      ...Array.from({ length: 20 }, () => ({ status: "invited", gender: "female" })),
      ...Array.from({ length: 7 }, () => ({ status: "active", gender: "male" })),
      { status: "waitlist", gender: "female" },
    ];
    const capacity = calculatePlusPilotCapacity(rows);
    expect(capacity.female).toEqual({ reserved: 20, remaining: 0, limit: PLUS_PILOT_LIMIT_PER_GENDER });
    expect(capacity.male).toEqual({ reserved: 7, remaining: 13, limit: PLUS_PILOT_LIMIT_PER_GENDER });
    expect(hasPlusPilotCapacity(rows, "female")).toBe(false);
    expect(hasPlusPilotCapacity(rows, "male")).toBe(true);
    expect(hasPlusPilotCapacity(rows, null)).toBe(false);
  });
});
