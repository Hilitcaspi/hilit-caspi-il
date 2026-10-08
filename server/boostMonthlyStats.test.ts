import { describe, expect, it } from "vitest";
import {
  calculateBoostMonthlyStats,
  getIsraelCalendarMonthPeriod,
} from "./boostMonthlyStats";

const SEPTEMBER_2026 = getIsraelCalendarMonthPeriod(Date.parse("2026-09-15T12:00:00Z"));

describe("Boost monthly statistics", () => {
  it("uses Israel calendar-month boundaries, including daylight-saving time", () => {
    expect(SEPTEMBER_2026).toEqual({
      year: 2026,
      month: 9,
      startsAt: Date.parse("2026-08-31T21:00:00.000Z"),
      endsAt: Date.parse("2026-09-30T21:00:00.000Z"),
    });

    const january = getIsraelCalendarMonthPeriod(Date.parse("2026-01-15T12:00:00Z"));
    expect(january.startsAt).toBe(Date.parse("2025-12-31T22:00:00.000Z"));
    expect(january.endsAt).toBe(Date.parse("2026-01-31T22:00:00.000Z"));
  });

  it("counts sent Boosts once per matchId and retains later rejected requests", () => {
    const result = calculateBoostMonthlyStats({
      period: SEPTEMBER_2026,
      requests: [
        { id: 1, matchId: 101, singleId: 1, source: "paid", entryChannel: "email", status: "approved", fulfilledAt: Date.parse("2026-09-05T10:00:00Z") },
        // A later lifecycle update must not turn one delivered match into two.
        { id: 2, matchId: 101, singleId: 1, source: "paid", status: "rejected", fulfilledAt: Date.parse("2026-09-05T10:00:00Z") },
        { id: 3, matchId: 102, singleId: 2, source: "plus_included", entryChannel: "personal_area", status: "approved", fulfilledAt: Date.parse("2026-09-09T10:00:00Z") },
      ],
      matches: [
        {
          id: 101,
          singleAId: 1,
          singleBId: 3,
          status: "rejected",
          approvedByA: false,
          approvedByB: false,
          tokenAUsedAt: Date.parse("2026-09-06T10:00:00Z"),
        },
        {
          id: 102,
          singleAId: 2,
          singleBId: 4,
          status: "matched",
          approvedByA: true,
          approvedByB: true,
        },
      ],
      singles: [
        { id: 1, gender: "female" },
        { id: 2, gender: "male" },
      ],
    });

    expect(result.sent).toBe(2);
    expect(result.initiators).toEqual({ female: 1, male: 1, unknown: 0 });
    expect(result.outcomes).toEqual({ bothApproved: 1, rejectedAny: 1, initiatorDeclined: 1 });
    expect(result.arrivalChannels).toEqual({ email: 1, personalArea: 1, other: 0, unknown: 0 });
  });

  it("uses a proposedAt row only with BOOST_SENT evidence and leaves unsupported channel attribution unknown", () => {
    const result = calculateBoostMonthlyStats({
      period: SEPTEMBER_2026,
      requests: [
        { id: 1, matchId: 201, singleId: 10, source: "paid", entryChannel: "other", status: "rejected", fulfilledAt: null },
        { id: 2, matchId: 202, singleId: 11, source: "plus_included", status: "queued", fulfilledAt: null },
      ],
      matches: [
        {
          id: 201,
          singleAId: 10,
          singleBId: 12,
          proposedAt: Date.parse("2026-09-12T10:00:00Z"),
          notes: "[BOOST_SENT] נשלחה כהצעת Boost אלגוריתמית",
          status: "rejected",
        },
        {
          id: 202,
          singleAId: 11,
          singleBId: 13,
          proposedAt: Date.parse("2026-09-13T10:00:00Z"),
          notes: "הצעת Boost ללא ראיית שליחה",
          status: "proposed",
        },
      ],
      singles: [{ id: 10, gender: "female" }, { id: 11, gender: "male" }],
    });

    expect(result.sent).toBe(1);
    expect(result.initiators).toEqual({ female: 1, male: 0, unknown: 0 });
    expect(result.outcomes).toEqual({ bothApproved: 0, rejectedAny: 0, initiatorDeclined: 0 });
    expect(result.arrivalChannels).toEqual({ email: 0, personalArea: 0, other: 1, unknown: 0 });
    expect(result.attribution.status).toBe("entry_channel_recorded");
  });

  it("keeps legacy and unrecognized entry channels unknown without inferring them from payment source", () => {
    const result = calculateBoostMonthlyStats({
      period: SEPTEMBER_2026,
      requests: [
        { id: 1, matchId: 301, singleId: 20, source: "paid", fulfilledAt: Date.parse("2026-09-18T10:00:00Z") },
        { id: 2, matchId: 302, singleId: 21, source: "plus_included", entryChannel: "unexpected", fulfilledAt: Date.parse("2026-09-19T10:00:00Z") },
      ],
      matches: [],
      singles: [{ id: 20, gender: "female" }, { id: 21, gender: "male" }],
    });

    expect(result.arrivalChannels).toEqual({ email: 0, personalArea: 0, other: 0, unknown: 2 });
  });
});
