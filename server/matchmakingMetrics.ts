const DAY_MS = 24 * 60 * 60 * 1000;

export type MatchmakingMetricSingle = {
  id: number;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  gender: "female" | "male";
  age: number;
  city: string;
  height?: number | null;
  occupation?: string | null;
  religiosity?: string | null;
  about?: string | null;
  partnerDescription?: string | null;
  photoUrl?: string | null;
  dnaType?: string | null;
  questionnaireCompletedAt?: number | null;
  createdAt: number | Date;
  isActive: boolean;
  isPaid: boolean;
  isSeed: boolean;
  subscriptionRenewsAt?: number | null;
};

export type MatchmakingMetricMatch = {
  id: number;
  singleAId: number;
  singleBId: number;
  status: string;
  proposedAt?: number | null;
  emailAOpenedAt?: number | null;
  emailBOpenedAt?: number | null;
  approvedByA: boolean;
  approvedByB: boolean;
  matchedAt?: number | null;
  contactRevealedAt?: number | null;
  returnedToPoolAt?: number | null;
  matchDetailStatus?: string | null;
};

export type MatchmakingMetricsRange = {
  from?: number;
  to?: number;
  now?: number;
};

function toTimestamp(value: number | Date | null | undefined): number {
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
}

function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  return Math.round(value * 10) / 10;
}

function isMeaningfulText(value: string | null | undefined, placeholders: string[]): boolean {
  const normalized = (value || "").trim();
  return normalized.length >= 8 && !placeholders.includes(normalized);
}

export function getMissingProfileFields(single: MatchmakingMetricSingle): string[] {
  const missing: string[] = [];
  if (!single.age || single.age < 18) missing.push("גיל");
  if (!single.city?.trim()) missing.push("עיר");
  if (!single.height || single.height < 120) missing.push("גובה");
  if (!single.photoUrl?.trim()) missing.push("תמונה");
  if (!single.dnaType) missing.push("DNA");
  if (!single.questionnaireCompletedAt) missing.push("שאלון מדעי");
  if (!single.occupation?.trim()) missing.push("תעסוקה");
  if (!single.religiosity) missing.push("דת");
  if (!isMeaningfulText(single.about, ["על עצמי"])) missing.push("על עצמי");
  if (!isMeaningfulText(single.partnerDescription, ["מחפש זוגיות", "מחפשת זוגיות"])) {
    missing.push(single.gender === "female" ? "מחפשת בבן זוג" : "מחפש בבת זוג");
  }
  return missing;
}

function ageBand(age: number): string {
  if (age < 30) return "עד 29";
  if (age < 40) return "30–39";
  if (age < 50) return "40–49";
  return "50+";
}

export function calculateMatchmakingMetrics(
  singles: MatchmakingMetricSingle[],
  matches: MatchmakingMetricMatch[],
  range: MatchmakingMetricsRange = {},
) {
  const now = range.now ?? Date.now();
  const from = range.from ?? 0;
  const to = range.to ?? now;
  const paidSingles = singles.filter(single => single.isPaid && !single.isSeed);
  const activeSingles = paidSingles.filter(single => single.isActive);
  const activeIds = new Set(activeSingles.map(single => single.id));
  const cohortMatches = matches.filter(match => {
    const proposedAt = toTimestamp(match.proposedAt);
    return proposedAt >= from && proposedAt <= to;
  });

  const proposedMatches = matches.filter(match => toTimestamp(match.proposedAt) > 0);
  const matchesBySingle = new Map<number, MatchmakingMetricMatch[]>();
  const addMatch = (singleId: number, match: MatchmakingMetricMatch) => {
    if (!singleId) return;
    const current = matchesBySingle.get(singleId) || [];
    current.push(match);
    matchesBySingle.set(singleId, current);
  };
  for (const match of proposedMatches) {
    addMatch(match.singleAId, match);
    addMatch(match.singleBId, match);
  }

  const firstMatchAt = new Map<number, number>();
  const lastMatchAt = new Map<number, number>();
  for (const [singleId, memberMatches] of Array.from(matchesBySingle.entries())) {
    const dates = memberMatches
      .map((match: MatchmakingMetricMatch) => toTimestamp(match.proposedAt))
      .filter(Boolean)
      .sort((a: number, b: number) => a - b);
    if (dates.length > 0) {
      firstMatchAt.set(singleId, dates[0]);
      lastMatchAt.set(singleId, dates[dates.length - 1]);
    }
  }

  const matchCountDist = { zero: 0, one: 0, two: 0, three_plus: 0 };
  const daysToFirstMatch: number[] = [];
  let noMatch14 = 0;
  let noMatch30 = 0;
  for (const single of activeSingles) {
    const memberMatches = matchesBySingle.get(single.id) || [];
    const count = memberMatches.length;
    if (count === 0) matchCountDist.zero++;
    else if (count === 1) matchCountDist.one++;
    else if (count === 2) matchCountDist.two++;
    else matchCountDist.three_plus++;

    const joinedAt = toTimestamp(single.createdAt);
    const first = firstMatchAt.get(single.id);
    if (joinedAt > 0 && first && first >= joinedAt) {
      daysToFirstMatch.push((first - joinedAt) / DAY_MS);
    }
    const reference = lastMatchAt.get(single.id) || joinedAt;
    if (reference > 0 && now - reference >= 14 * DAY_MS) noMatch14++;
    if (reference > 0 && now - reference >= 30 * DAY_MS) noMatch30++;
  }

  const cohortCoverage = [30, 60, 90].map(days => {
    const eligible = activeSingles.filter(single => {
      const joinedAt = toTimestamp(single.createdAt);
      return joinedAt > 0 && joinedAt <= now - days * DAY_MS;
    });
    const covered = eligible.filter(single => {
      const joinedAt = toTimestamp(single.createdAt);
      const first = firstMatchAt.get(single.id);
      return Boolean(first && first <= joinedAt + days * DAY_MS);
    }).length;
    return {
      days,
      eligible: eligible.length,
      covered,
      coverageRate: percentage(covered, eligible.length),
    };
  });

  const fullProfiles = activeSingles.filter(single => getMissingProfileFields(single).length === 0).length;
  const quality = {
    complete: fullProfiles,
    completeRate: percentage(fullProfiles, activeSingles.length),
    scientific: activeSingles.filter(single => Boolean(single.questionnaireCompletedAt)).length,
    scientificRate: percentage(activeSingles.filter(single => Boolean(single.questionnaireCompletedAt)).length, activeSingles.length),
    dna: activeSingles.filter(single => Boolean(single.dnaType)).length,
    dnaRate: percentage(activeSingles.filter(single => Boolean(single.dnaType)).length, activeSingles.length),
    photo: activeSingles.filter(single => Boolean(single.photoUrl?.trim())).length,
    photoRate: percentage(activeSingles.filter(single => Boolean(single.photoUrl?.trim())).length, activeSingles.length),
  };

  const male = activeSingles.filter(single => single.gender === "male").length;
  const female = activeSingles.filter(single => single.gender === "female").length;

  const pairFunnel = {
    proposed: cohortMatches.length,
    opened: cohortMatches.filter(match => Boolean(match.emailAOpenedAt || match.emailBOpenedAt)).length,
    oneApproved: cohortMatches.filter(match => match.approvedByA || match.approvedByB).length,
    mutuallyApproved: cohortMatches.filter(match => match.approvedByA && match.approvedByB).length,
    contactRevealed: cohortMatches.filter(match => Boolean(match.contactRevealedAt)).length,
    met: cohortMatches.filter(match => ["met", "dating", "together"].includes(match.matchDetailStatus || "")).length,
    continuing: cohortMatches.filter(match => ["dating", "together"].includes(match.matchDetailStatus || "")).length,
    together: cohortMatches.filter(match => match.matchDetailStatus === "together").length,
  };

  const sideFunnel = {
    proposals: cohortMatches.length * 2,
    opened: cohortMatches.reduce((sum, match) => sum + Number(Boolean(match.emailAOpenedAt)) + Number(Boolean(match.emailBOpenedAt)), 0),
    approved: cohortMatches.reduce((sum, match) => sum + Number(match.approvedByA) + Number(match.approvedByB), 0),
  };

  const segmentMap = new Map<string, { segment: string; label: string; active: number; over30: number; covered: number }>();
  const addSegment = (segment: string, label: string, single: MatchmakingMetricSingle) => {
    const key = `${segment}:${label}`;
    const current = segmentMap.get(key) || { segment, label, active: 0, over30: 0, covered: 0 };
    current.active++;
    const joinedAt = toTimestamp(single.createdAt);
    const last = lastMatchAt.get(single.id) || joinedAt;
    if (last > 0 && now - last >= 30 * DAY_MS) current.over30++;
    if ((matchesBySingle.get(single.id) || []).length > 0) current.covered++;
    segmentMap.set(key, current);
  };

  for (const single of activeSingles) {
    addSegment("מגדר", single.gender === "female" ? "נשים" : "גברים", single);
    addSegment("גיל", ageBand(single.age), single);
    if (single.religiosity) {
      const labels: Record<string, string> = {
        secular: "חילוני/ת",
        traditional: "מסורתי/ת",
        religious: "דתי/ה",
        orthodox: "חרדי/ת",
        datlash: "דתל״ש/ית",
      };
      addSegment("דת", labels[single.religiosity] || single.religiosity, single);
    }
  }

  const supplyGaps = Array.from(segmentMap.values())
    .filter(segment => segment.active >= 5)
    .map(segment => ({
      ...segment,
      coverageRate: percentage(segment.covered, segment.active),
      waitingRate: percentage(segment.over30, segment.active),
    }))
    .sort((a, b) => b.waitingRate - a.waitingRate || b.over30 - a.over30)
    .slice(0, 10);

  const attentionList = activeSingles
    .map(single => {
      const memberMatches = matchesBySingle.get(single.id) || [];
      const joinedAt = toTimestamp(single.createdAt);
      const last = lastMatchAt.get(single.id) || 0;
      const reference = last || joinedAt;
      return {
        id: single.id,
        name: `${single.firstName} ${single.lastName || ""}`.trim(),
        email: single.email || "",
        phone: single.phone || "",
        gender: single.gender,
        age: single.age,
        city: single.city,
        createdAt: joinedAt,
        matchCount: memberMatches.length,
        daysWaiting: reference > 0 ? Math.max(0, Math.floor((now - reference) / DAY_MS)) : 0,
        neverReceivedMatch: memberMatches.length === 0,
        missingFields: getMissingProfileFields(single),
      };
    })
    .filter(single => single.daysWaiting >= 14)
    .sort((a, b) => b.daysWaiting - a.daysWaiting || a.matchCount - b.matchCount)
    .slice(0, 30);

  const newSignups = paidSingles.filter(single => {
    const createdAt = toTimestamp(single.createdAt);
    return createdAt >= from && createdAt <= to;
  }).length;
  const coveredMembers = activeSingles.filter(single => (matchesBySingle.get(single.id) || []).length > 0).length;
  const activeMatchedNow = matches.filter(match => match.status === "matched" && !match.returnedToPoolAt).length;

  const dailySignups: { date: string; count: number }[] = [];
  const dailyMatches: { date: string; sent: number; mutuallyApproved: number }[] = [];
  for (let index = 29; index >= 0; index--) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - index);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const start = dayStart.getTime();
    const end = dayEnd.getTime();
    const label = `${dayStart.getDate()}/${dayStart.getMonth() + 1}`;
    dailySignups.push({
      date: label,
      count: paidSingles.filter(single => {
        const createdAt = toTimestamp(single.createdAt);
        return createdAt >= start && createdAt < end;
      }).length,
    });
    dailyMatches.push({
      date: label,
      sent: proposedMatches.filter(match => {
        const proposedAt = toTimestamp(match.proposedAt);
        return proposedAt >= start && proposedAt < end;
      }).length,
      mutuallyApproved: matches.filter(match => {
        const matchedAt = toTimestamp(match.matchedAt);
        return matchedAt >= start && matchedAt < end;
      }).length,
    });
  }

  const day7f = now + 7 * DAY_MS;
  const day14f = now + 14 * DAY_MS;
  const day30f = now + 30 * DAY_MS;
  const renewals = {
    in7: activeSingles.filter(single => single.subscriptionRenewsAt && single.subscriptionRenewsAt > now && single.subscriptionRenewsAt <= day7f).length,
    in14: activeSingles.filter(single => single.subscriptionRenewsAt && single.subscriptionRenewsAt > now && single.subscriptionRenewsAt <= day14f).length,
    in30: activeSingles.filter(single => single.subscriptionRenewsAt && single.subscriptionRenewsAt > now && single.subscriptionRenewsAt <= day30f).length,
    expired: activeSingles.filter(single => single.subscriptionRenewsAt && single.subscriptionRenewsAt < now).length,
  };

  return {
    kpis: {
      totalActive: activeSingles.length,
      newSignups,
      matchesSent: cohortMatches.length,
      matchesSucceeded: pairFunnel.mutuallyApproved,
      successRate: percentage(pairFunnel.mutuallyApproved, pairFunnel.proposed),
      activeMatchedNow,
      coverageRate: percentage(coveredMembers, activeSingles.length),
      medianDaysToFirstMatch: median(daysToFirstMatch),
      profileCompletenessRate: quality.completeRate,
    },
    balance: {
      male,
      female,
      maleRate: percentage(male, activeSingles.length),
      femaleRate: percentage(female, activeSingles.length),
      absoluteGap: Math.abs(male - female),
    },
    quality,
    pairFunnel,
    sideFunnel,
    cohortCoverage,
    matchCountDist,
    noMatchDuration: { over14: noMatch14, over30: noMatch30 },
    supplyGaps,
    attentionList,
    renewals,
    dailySignups,
    dailyMatches,
    meta: {
      activeIds: activeIds.size,
      rangeFrom: from,
      rangeTo: to,
      calculatedAt: now,
      definitionsVersion: "2026-08-v1",
    },
  };
}
