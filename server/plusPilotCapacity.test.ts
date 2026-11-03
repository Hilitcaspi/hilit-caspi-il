import { describe, expect, it } from "vitest";
import { PLUS_SERVICE_CYCLE_MS as span } from "../shared/plusServiceCycle";
import {
  PLUS_PILOT_LIMIT_PER_GENDER,
  calculatePlusPilotCapacity,
  calculatePlusPilotCapacityBreakdown,
  hasPlusPilotCapacity,
  isPlusPilotSlotReserved,
  type PlusPilotCapacityRow,
} from "./plusPilotCapacity";

const anchor = Date.parse("2026-09-01T10:00:00Z");
const day = 24 * 60 * 60 * 1000;
const now = anchor + span + day;
const confirmed: PlusPilotCapacityRow = {
  id: 1, status: "active", gender: "male", billingStatus: "cancelled",
  activatedAt: anchor, billingCycleStartedAt: anchor, billingCycleEndsAt: anchor + span,
  cancelledAt: anchor + day, endedAt: null, lastPaymentAt: anchor,
  latestCancellationRequest: {
    id: 10, plusMemberId: 1, requestedAt: anchor + day,
    providerStoppedAt: anchor + 2 * day, providerStoppedBy: "authenticated-staff@example.test", resolvedAt: null,
  },
};

function reserved(row: PlusPilotCapacityRow, at = now) { return isPlusPilotSlotReserved(row, at); }

describe("Plus active-service 30/30 capacity", () => {
  it("keeps legacy status-only behavior and invitation policy unchanged", () => {
    expect(isPlusPilotSlotReserved("active")).toBe(true);
    for (const status of ["invited", "eligible", "declined", "churned", "waitlist", "", null, undefined]) {
      expect(isPlusPilotSlotReserved(status)).toBe(false);
    }
    expect(reserved({ status: "active", gender: "male" })).toBe(true);
    expect(reserved({ ...confirmed, latestCancellationRequest: undefined })).toBe(true);
    expect(reserved({ ...confirmed, status: "churned" })).toBe(false);
    expect(reserved({ ...confirmed, status: "invited" })).toBe(false);
  });

  it("releases only an expired cancelled slot with relevant recorded staff confirmation", () => {
    expect(reserved(confirmed)).toBe(false);
    expect(reserved({ ...confirmed, activatedAt: null })).toBe(false);
    expect(reserved({ ...confirmed, billingCycleEndsAt: null })).toBe(false);
    expect(reserved({ ...confirmed, latestCancellationRequest: { ...confirmed.latestCancellationRequest!, requestedAt: anchor + day + 1 } })).toBe(false);
    expect(reserved({ ...confirmed, billingCycleStartedAt: anchor - 1, lastPaymentAt: anchor - 1 })).toBe(false);
  });

  it("holds remaining service time, even if proposal target has already been met", () => {
    const targetMet = { ...confirmed, remaining: 0, delivered: 3, target: 3 };
    expect(reserved(targetMet, anchor + 3 * day)).toBe(true);
    // A later cancellation freezes the later service cycle, not the first billing cycle.
    const later = { ...confirmed, cancelledAt: anchor + span + day, latestCancellationRequest: {
      ...confirmed.latestCancellationRequest!, requestedAt: anchor + span + day, providerStoppedAt: anchor + span + 2 * day,
    } };
    expect(reserved(later, anchor + span + 3 * day)).toBe(true);
    expect(reserved(later, anchor + 2 * span)).toBe(false);
    // A recorded prepaid window outlasting the computed service end stays protected.
    expect(reserved({ ...confirmed, billingCycleEndsAt: anchor + 2 * span })).toBe(true);
  });

  it.each(["active", "past_due", "pending", "not_configured", "ended", null, undefined])("always holds active billing %s even with stale service dates", billingStatus => {
    expect(reserved({ ...confirmed, billingStatus })).toBe(true);
  });

  it("does not equate cancelled status, local resolution, or an anonymous stop to provider proof", () => {
    expect(reserved({ ...confirmed, latestCancellationRequest: null })).toBe(true);
    for (const evidence of [
      { providerStoppedAt: null }, { providerStoppedBy: null }, { providerStoppedBy: "  " },
      { plusMemberId: 99 }, { resolvedAt: anchor + 2 * day },
      { requestedAt: anchor }, { providerStoppedAt: anchor + day - 1 },
    ]) {
      expect(reserved({ ...confirmed, latestCancellationRequest: { ...confirmed.latestCancellationRequest!, ...evidence } })).toBe(true);
    }
  });

  it.each([null, undefined, 0, -1, NaN, Infinity, "not-a-date", "123", false, 1.5])("holds missing/malformed required dates: %s", bad => {
    for (const field of ["cancelledAt", "lastPaymentAt"]) {
      expect(reserved({ ...confirmed, [field]: bad } as PlusPilotCapacityRow)).toBe(true);
    }
    for (const field of ["requestedAt", "providerStoppedAt"]) {
      expect(reserved({ ...confirmed, latestCancellationRequest: { ...confirmed.latestCancellationRequest!, [field]: bad } } as PlusPilotCapacityRow)).toBe(true);
    }
    expect(reserved({ ...confirmed, activatedAt: bad, billingCycleStartedAt: null } as PlusPilotCapacityRow)).toBe(true);
  });

  it("holds future or inconsistent cancellation, anchor, cycle and confirmation dates", () => {
    for (const field of ["activatedAt", "billingCycleStartedAt", "billingCycleEndsAt", "cancelledAt", "lastPaymentAt"]) {
      expect(reserved({ ...confirmed, [field]: now + 1 })).toBe(true);
    }
    for (const field of ["requestedAt", "providerStoppedAt"]) {
      expect(reserved({ ...confirmed, latestCancellationRequest: { ...confirmed.latestCancellationRequest!, [field]: now + 1 } })).toBe(true);
    }
    for (const overrides of [
      { activatedAt: null, billingCycleStartedAt: null }, { activatedAt: anchor + 3 * day },
      { billingCycleStartedAt: anchor + 3 * day },
      { billingCycleEndsAt: anchor }, { endedAt: anchor + 2 * day },
      { activatedAt: NaN }, { billingCycleStartedAt: 0 }, { billingCycleEndsAt: NaN },
    ]) expect(reserved({ ...confirmed, ...overrides })).toBe(true);
    expect(reserved(confirmed, NaN)).toBe(true);
  });

  it("keeps any payment or reactivation after provider-stop confirmation reserved", () => {
    expect(reserved({ ...confirmed, lastPaymentAt: confirmed.latestCancellationRequest!.providerStoppedAt! + 1 })).toBe(true);
    expect(reserved({ ...confirmed, activatedAt: confirmed.latestCancellationRequest!.providerStoppedAt! + 1 })).toBe(true);
    expect(reserved({ ...confirmed, billingStatus: "active", cancelledAt: null })).toBe(true);
  });

  it("releases exactly at the frozen cycle-end boundary using one caller-provided time", () => {
    expect(reserved(confirmed, anchor + span - 1)).toBe(true);
    expect(reserved(confirmed, anchor + span)).toBe(false);
    expect(reserved(confirmed, anchor + span + 1)).toBe(false);
    expect(calculatePlusPilotCapacity([confirmed], anchor + span - 1).male.reserved).toBe(1);
    expect(calculatePlusPilotCapacityBreakdown([confirmed], anchor + span).male.active).toBe(0);
  });

  it("enforces separate limits for 30 women and 30 men and clamps over-capacity", () => {
    const rows = [
      ...Array.from({ length: 30 }, () => ({ status: "invited", gender: "female" })),
      ...Array.from({ length: 30 }, () => ({ status: "active", gender: "female" })),
      ...Array.from({ length: 7 }, () => ({ status: "active", gender: "male" })),
      { status: "waitlist", gender: "female" },
    ];
    const capacity = calculatePlusPilotCapacity(rows, now);
    expect(capacity.female).toEqual({ reserved: 30, remaining: 0, limit: PLUS_PILOT_LIMIT_PER_GENDER });
    expect(capacity.male).toEqual({ reserved: 7, remaining: 23, limit: PLUS_PILOT_LIMIT_PER_GENDER });
    expect(hasPlusPilotCapacity(rows, "female", now)).toBe(false);
    expect(hasPlusPilotCapacity(rows, "male", now)).toBe(true);
    expect(hasPlusPilotCapacity(rows, null, now)).toBe(false);
    expect(hasPlusPilotCapacity(rows, "unknown", now)).toBe(false);
    expect(calculatePlusPilotCapacity([...rows, { status: "active", gender: "female" }], now).female.remaining).toBe(0);
  });

  it("is deterministic and never writes or mutates even frozen input rows", () => {
    const row = Object.freeze({ ...confirmed, latestCancellationRequest: Object.freeze({ ...confirmed.latestCancellationRequest! }) });
    const rows = Object.freeze([row]);
    const before = JSON.stringify(rows);
    const result = calculatePlusPilotCapacity(rows, now);
    expect(calculatePlusPilotCapacity(rows, now)).toEqual(result);
    calculatePlusPilotCapacityBreakdown(rows, now);
    hasPlusPilotCapacity(rows, "male", now);
    expect(JSON.stringify(rows)).toBe(before);
  });
});
