import { describe, expect, it } from "vitest";
import {
  calculateMatchmakingMetrics,
  getMissingProfileFields,
  type MatchmakingMetricMatch,
  type MatchmakingMetricSingle,
} from "./matchmakingMetrics";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 22, 12, 0, 0);

function makeSingle(overrides: Partial<MatchmakingMetricSingle> = {}): MatchmakingMetricSingle {
  return {
    id: 1,
    firstName: "נועה",
    lastName: "כהן",
    email: "noa@example.com",
    phone: "0500000000",
    gender: "female",
    age: 35,
    city: "תל אביב",
    height: 165,
    occupation: "מנהלת מוצר",
    religiosity: "secular",
    about: "אוהבת אנשים, טיולים ויצירה",
    partnerDescription: "מחפשת קשר רציני עם אדם טוב",
    photoUrl: "https://example.com/noa.jpg",
    dnaType: "anchor",
    questionnaireCompletedAt: NOW - 100 * DAY,
    createdAt: NOW - 100 * DAY,
    isActive: true,
    isPaid: true,
    isSeed: false,
    subscriptionRenewsAt: null,
    ...overrides,
  };
}

function makeMatch(overrides: Partial<MatchmakingMetricMatch> = {}): MatchmakingMetricMatch {
  return {
    id: 101,
    singleAId: 1,
    singleBId: 2,
    status: "matched",
    proposedAt: NOW - 80 * DAY,
    emailAOpenedAt: NOW - 79 * DAY,
    emailBOpenedAt: NOW - 79 * DAY,
    approvedByA: true,
    approvedByB: true,
    matchedAt: NOW - 78 * DAY,
    contactRevealedAt: NOW - 78 * DAY,
    returnedToPoolAt: null,
    matchDetailStatus: "together",
    ...overrides,
  };
}

describe("matchmaking metrics", () => {
  it("treats placeholder copy as missing profile content", () => {
    const missing = getMissingProfileFields(makeSingle({
      about: "על עצמי",
      partnerDescription: "מחפשת זוגיות",
    }));

    expect(missing).toContain("על עצמי");
    expect(missing).toContain("מחפשת בבן זוג");
  });

  it("calculates coverage, first-match timing and consistent pair funnel units", () => {
    const singles = [
      makeSingle({ id: 1, gender: "female", createdAt: NOW - 100 * DAY }),
      makeSingle({ id: 2, firstName: "יואב", gender: "male", createdAt: NOW - 100 * DAY }),
      makeSingle({ id: 3, firstName: "רוני", gender: "female", createdAt: NOW - 40 * DAY }),
    ];
    const matches = [makeMatch()];

    const result = calculateMatchmakingMetrics(singles, matches, { now: NOW, from: 0, to: NOW });

    expect(result.kpis.totalActive).toBe(3);
    expect(result.kpis.coverageRate).toBe(67);
    expect(result.kpis.medianDaysToFirstMatch).toBe(20);
    expect(result.matchCountDist).toEqual({ zero: 1, one: 2, two: 0, three_plus: 0 });
    expect(result.pairFunnel).toMatchObject({
      proposed: 1,
      opened: 1,
      oneApproved: 1,
      mutuallyApproved: 1,
      contactRevealed: 1,
      met: 1,
      continuing: 1,
      together: 1,
    });
    expect(result.sideFunnel).toEqual({ proposals: 2, opened: 2, approved: 2 });
  });

  it("calculates 30/60/90-day cohort coverage using each registration date", () => {
    const singles = [
      makeSingle({ id: 1, createdAt: NOW - 120 * DAY }),
      makeSingle({ id: 2, firstName: "יואב", gender: "male", createdAt: NOW - 120 * DAY }),
      makeSingle({ id: 3, firstName: "רוני", createdAt: NOW - 40 * DAY }),
    ];
    const matches = [
      makeMatch({ proposedAt: NOW - 100 * DAY }),
      makeMatch({ id: 102, singleAId: 3, singleBId: 2, proposedAt: NOW - 5 * DAY, approvedByA: false, approvedByB: false, status: "proposed", matchDetailStatus: null }),
    ];

    const result = calculateMatchmakingMetrics(singles, matches, { now: NOW });
    const cohort30 = result.cohortCoverage.find(item => item.days === 30);
    const cohort60 = result.cohortCoverage.find(item => item.days === 60);

    expect(cohort30).toEqual({ days: 30, eligible: 3, covered: 2, coverageRate: 67 });
    expect(cohort60).toEqual({ days: 60, eligible: 2, covered: 2, coverageRate: 100 });
  });

  it("counts waiting time from registration when no match was ever proposed", () => {
    const singles = [makeSingle({ id: 9, createdAt: NOW - 45 * DAY })];
    const result = calculateMatchmakingMetrics(singles, [], { now: NOW });

    expect(result.noMatchDuration).toEqual({ over14: 1, over30: 1 });
    expect(result.attentionList[0]).toMatchObject({ id: 9, daysWaiting: 45, neverReceivedMatch: true });
  });
});
