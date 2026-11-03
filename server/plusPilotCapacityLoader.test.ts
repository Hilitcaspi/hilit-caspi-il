import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { plusCancellationRequests, plusPilotMembers } from "../drizzle/schema";
import { PLUS_SERVICE_CYCLE_MS as span } from "../shared/plusServiceCycle";
import { calculatePlusPilotCapacity, calculatePlusPilotCapacityBreakdown, isPlusPilotSlotReserved, type PlusPilotCancellationEvidence, type PlusPilotCapacityRow } from "./plusPilotCapacity";
import { attachPlusPilotCapacityEvidence, loadPlusPilotCapacityRows, plusPilotCapacityRequestSelection, plusPilotCapacitySelection } from "./plusPilotCapacityLoader";

const anchor = Date.parse("2026-09-01T10:00:00Z");
const now = anchor + span + 100;
const cancelled: PlusPilotCapacityRow = {
  id: 1, status: "active", gender: "male", billingStatus: "cancelled",
  activatedAt: anchor, billingCycleStartedAt: anchor, billingCycleEndsAt: anchor + span,
  cancelledAt: anchor + 1000, lastPaymentAt: anchor, endedAt: null,
};
const stop: PlusPilotCancellationEvidence = {
  id: 1, plusMemberId: 1, requestedAt: anchor + 1000,
  providerStoppedAt: anchor + 2000, providerStoppedBy: "authenticated-staff@example.test", resolvedAt: null,
};

function fakeSelectDb(rows: PlusPilotCapacityRow[], requests: PlusPilotCancellationEvidence[]) {
  const projections: unknown[] = [];
  const db = {
    select: vi.fn((selection: unknown) => {
      projections.push(selection);
      return {
        from: (table: unknown) => {
          if (table === plusPilotMembers) return { innerJoin: vi.fn().mockResolvedValue(rows) };
          if (table === plusCancellationRequests) return Promise.resolve(requests);
          throw new Error("unexpected SELECT");
        },
      };
    }),
    insert: vi.fn(() => { throw new Error("unexpected INSERT"); }),
    update: vi.fn(() => { throw new Error("unexpected UPDATE"); }),
    delete: vi.fn(() => { throw new Error("unexpected DELETE"); }),
    transaction: vi.fn(() => { throw new Error("unexpected transaction"); }),
  };
  return { db, projections };
}

describe("shared read-only Plus capacity loader", () => {
  it("selects all row and authenticated cancellation evidence fields without writes", async () => {
    const rows = [cancelled];
    const requests = [stop];
    const before = JSON.stringify({ rows, requests });
    const { db, projections } = fakeSelectDb(rows, requests);
    const result = await loadPlusPilotCapacityRows(db);
    expect(projections).toEqual([plusPilotCapacitySelection, plusPilotCapacityRequestSelection]);
    expect(Object.keys(projections[0] as object)).toEqual(["id", "status", "billingStatus", "activatedAt", "billingCycleStartedAt", "billingCycleEndsAt", "cancelledAt", "endedAt", "lastPaymentAt", "gender"]);
    expect(Object.keys(projections[1] as object)).toEqual(["id", "plusMemberId", "requestedAt", "resolvedAt", "providerStoppedAt", "providerStoppedBy"]);
    expect(isPlusPilotSlotReserved(result[0], now)).toBe(false);
    for (const method of [db.insert, db.update, db.delete, db.transaction]) expect(method).not.toHaveBeenCalled();
    expect(JSON.stringify({ rows, requests })).toBe(before);
    expect(result[0]).not.toBe(cancelled);
  });

  it("overview snapshot reuse produces identical decisions without rereading members", async () => {
    const { db } = fakeSelectDb([cancelled], [stop]);
    const direct = await loadPlusPilotCapacityRows(db);
    db.select.mockClear();
    const snapshot = await loadPlusPilotCapacityRows(db, { rows: [{ pilot: cancelled, single: { gender: "male" } }], requests: [stop] });
    expect(db.select).not.toHaveBeenCalled();
    expect(snapshot).toEqual(direct);
    expect(calculatePlusPilotCapacity(snapshot, now)).toEqual(calculatePlusPilotCapacity(direct, now));
  });

  it("a newer unconfirmed request supersedes older confirmed evidence regardless of input order", () => {
    const newer = { ...stop, id: 2, requestedAt: anchor + 3000, providerStoppedAt: null, providerStoppedBy: null };
    for (const requests of [[stop, newer], [newer, stop]]) {
      const [row] = attachPlusPilotCapacityEvidence([cancelled], requests);
      expect(row.latestCancellationRequest).toEqual(newer);
      expect(isPlusPilotSlotReserved(row, now)).toBe(true);
    }
  });

  it("never falls back to an older confirmation when newest evidence is resolved, future, or malformed", () => {
    for (const newer of [
      { ...stop, id: 2, requestedAt: anchor + 3000, resolvedAt: anchor + 4000 },
      { ...stop, id: 2, requestedAt: now + 1 },
      { ...stop, id: 2, requestedAt: NaN },
    ]) {
      const [row] = attachPlusPilotCapacityEvidence([cancelled], [stop, newer]);
      expect(isPlusPilotSlotReserved(row, now)).toBe(true);
    }
    const [row] = attachPlusPilotCapacityEvidence([cancelled], [stop, { ...stop, id: 2, providerStoppedAt: null }]);
    expect(isPlusPilotSlotReserved(row, now)).toBe(true);
  });

  it("does not borrow another member's evidence or mutate frozen source records", () => {
    const rows = Object.freeze([Object.freeze({ ...cancelled })]);
    const requests = Object.freeze([Object.freeze({ ...stop, plusMemberId: 99 })]);
    const before = JSON.stringify({ rows, requests });
    const result = attachPlusPilotCapacityEvidence(rows, requests);
    expect(isPlusPilotSlotReserved(result[0], now)).toBe(true);
    expect(JSON.stringify({ rows, requests })).toBe(before);
  });

  it("synthetic 30 male cohort: 20 renewing + 10 cancelled, nine expired confirmed => 21 reserved", async () => {
    const rows: PlusPilotCapacityRow[] = [
      ...Array.from({ length: 20 }, (_, index) => ({ ...cancelled, id: index + 1, billingStatus: "active", cancelledAt: null })),
      ...Array.from({ length: 10 }, (_, index) => ({ ...cancelled, id: index + 21 })),
      ...Array.from({ length: 30 }, (_, index) => ({ ...cancelled, id: index + 31, gender: "female", billingStatus: "active", cancelledAt: null })),
      { id: 61, status: "invited", gender: "male" },
      { id: 62, status: "churned", gender: "male" },
    ];
    const requests = Array.from({ length: 10 }, (_, index) => ({ ...stop, id: index + 1, plusMemberId: index + 21, providerStoppedAt: index === 9 ? null : stop.providerStoppedAt }));
    const { db } = fakeSelectDb(rows, requests);
    const checkoutRows = await loadPlusPilotCapacityRows(db);
    const activationRows = await loadPlusPilotCapacityRows(db);
    const overviewRows = await loadPlusPilotCapacityRows(db, { rows: rows.map(row => ({ pilot: row, single: { gender: row.gender } })), requests });
    const capacity = calculatePlusPilotCapacity(checkoutRows, now);
    expect(calculatePlusPilotCapacity(activationRows, now)).toEqual(capacity);
    expect(calculatePlusPilotCapacity(overviewRows, now)).toEqual(capacity);
    const breakdown = calculatePlusPilotCapacityBreakdown(overviewRows, now);
    expect({ capacity, breakdown }).toMatchInlineSnapshot(`
      {
        "breakdown": {
          "female": {
            "active": 30,
            "invited": 0,
          },
          "male": {
            "active": 21,
            "invited": 1,
          },
        },
        "capacity": {
          "female": {
            "limit": 30,
            "remaining": 0,
            "reserved": 30,
          },
          "male": {
            "limit": 30,
            "remaining": 9,
            "reserved": 21,
          },
        },
      }
    `);
  });
});

describe("Plus capacity caller source contracts", () => {
  const checkout = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const admin = readFileSync(resolve(process.cwd(), "server/plusPilotRouter.ts"), "utf8");
  const loader = readFileSync(resolve(process.cwd(), "server/plusPilotCapacityLoader.ts"), "utf8");
  const capacity = readFileSync(resolve(process.cwd(), "server/plusPilotCapacity.ts"), "utf8");

  it("all three operations share the loader and pass the same captured operation clock", () => {
    expect(checkout).toContain("const capacityRows = await loadPlusPilotCapacityRows(db);");
    expect(checkout).toContain("hasPlusPilotCapacity(capacityRows, existingSingle.gender, now)");
    expect(admin).toContain("loadPlusPilotCapacityRows(db, { rows, requests: cancellationEvidence.requests })");
    expect(admin).toContain("calculatePlusPilotCapacity(capacityRows, overviewNow)");
    expect(admin).toContain("calculatePlusPilotCapacityBreakdown(capacityRows, overviewNow)");
    expect(admin).toContain("const capacityRows = await loadPlusPilotCapacityRows(db);");
    expect(admin).toContain("isPlusPilotSlotReserved(capacityMember, now)");
    expect(admin).toContain("hasPlusPilotCapacity(capacityRows, member.single.gender, now)");
    expect(checkout).not.toContain("db.select({ status: plusPilotMembers.status, gender: singles.gender })");
  });

  it("admin activation tests the exact loaded row while retaining invitation and verified payment policy", () => {
    expect(admin).toContain("capacityRows.find(row => row.id === member.pilot.id)");
    expect(admin).toContain('input.status === "invited"\n          ? isPlusPilotSlotReserved(member.pilot.status)');
    expect(admin).toContain("if (!alreadyReservesSlot && !hasPlusPilotCapacity");
    expect(admin).not.toContain("reservingSlot && !isPlusPilotSlotReserved(member.pilot.status)");
    expect(admin).toContain('member.pilot.billingStatus !== "active" || !hasConfirmedProductionPlusPayment(paymentEvents)');
    expect(checkout).toContain('priorPlusMember?.status === "active" && priorPlusMember.billingStatus === "active"');
    expect(checkout).toContain('existingIntent?.status === "paid_pending_profile" || existingIntent?.status === "active"');
    expect(checkout).toContain("return await withCheckoutReservation({");
    expect(checkout).toContain("requirePlusDatabaseCheckout(normalizedEmail, input.personalToken)");
  });

  it("capacity code has no row-write/provider access or early target-met departure dependency", () => {
    for (const source of [capacity, loader]) {
      expect(source).not.toMatch(/\.(insert|update|delete|transaction)\s*\(/);
      expect(source).not.toMatch(/fetch\s*\(|getPlusServiceDeparture\s*\(/);
    }
  });
});
