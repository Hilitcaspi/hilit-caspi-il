import { and, gte, inArray, isNotNull, like, lt } from "drizzle-orm";
import { matchBoostRequests, matches, singles } from "../drizzle/schema";
import { israelLocalTimeUtc, israelZonedParts } from "./dashboardPeriods";
import { getDb } from "./db";

export const BOOST_SENT_MARKER = "[BOOST_SENT]";

export type BoostMonthlyStatsPeriod = {
  year: number;
  month: number;
  startsAt: number;
  endsAt: number;
};

export type BoostMonthlyStatRequest = {
  id?: number;
  matchId: number;
  singleId: number;
  // `source` intentionally is not used as an arrival channel. Its values describe
  // billing/entitlement (paid, plus_included, admin), not how the person arrived.
  source?: string | null;
  entryChannel?: string | null;
  status?: string | null;
  requestedAt?: number | Date | null;
  fulfilledAt?: number | Date | null;
};

export type BoostMonthlyStatMatch = {
  id: number;
  singleAId: number;
  singleBId: number;
  proposedAt?: number | Date | null;
  notes?: string | null;
  status?: string | null;
  approvedByA?: boolean | null;
  approvedByB?: boolean | null;
  tokenAUsedAt?: number | Date | null;
  tokenBUsedAt?: number | Date | null;
};

export type BoostMonthlyStatSingle = {
  id: number;
  gender?: "female" | "male" | string | null;
};

export type BoostMonthlyStats = {
  period: BoostMonthlyStatsPeriod;
  sent: number;
  initiators: {
    female: number;
    male: number;
    unknown: number;
  };
  outcomes: {
    bothApproved: number;
    rejectedAny: number;
    initiatorDeclined: number;
  };
  arrivalChannels: {
    email: number;
    personalArea: number;
    other: number;
    unknown: number;
  };
  attribution: {
    status: "entry_channel_recorded";
    note: string;
  };
};

function timestamp(value: number | Date | null | undefined): number {
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
}

function isInPeriod(value: number | Date | null | undefined, period: BoostMonthlyStatsPeriod): boolean {
  const valueAt = timestamp(value);
  return valueAt >= period.startsAt && valueAt < period.endsAt;
}

export function getIsraelCalendarMonthPeriod(now = Date.now()): BoostMonthlyStatsPeriod {
  const current = israelZonedParts(now);
  const nextMonth = new Date(Date.UTC(current.year, current.month, 1));
  const nextYear = nextMonth.getUTCFullYear();
  const nextMonthNumber = nextMonth.getUTCMonth() + 1;
  return {
    year: current.year,
    month: current.month,
    startsAt: israelLocalTimeUtc(current.year, current.month, 1),
    endsAt: israelLocalTimeUtc(nextYear, nextMonthNumber, 1),
  };
}

export function hasBoostSentProposalEvidence(match: BoostMonthlyStatMatch, period: BoostMonthlyStatsPeriod): boolean {
  return isInPeriod(match.proposedAt, period) && String(match.notes || "").includes(BOOST_SENT_MARKER);
}

function chooseInitiatingRequest(requests: BoostMonthlyStatRequest[], period: BoostMonthlyStatsPeriod) {
  return [...requests].sort((left, right) => {
    const leftWasFulfilledThisMonth = Number(isInPeriod(left.fulfilledAt, period));
    const rightWasFulfilledThisMonth = Number(isInPeriod(right.fulfilledAt, period));
    if (leftWasFulfilledThisMonth !== rightWasFulfilledThisMonth) return rightWasFulfilledThisMonth - leftWasFulfilledThisMonth;
    const leftDate = timestamp(left.fulfilledAt) || timestamp(left.requestedAt);
    const rightDate = timestamp(right.fulfilledAt) || timestamp(right.requestedAt);
    return rightDate - leftDate;
  })[0];
}

function didInitiatorDecline(match: BoostMonthlyStatMatch | undefined, request: BoostMonthlyStatRequest | undefined): boolean {
  if (!match || !request || match.status !== "rejected") return false;
  if (request.singleId === match.singleAId) return Boolean(match.tokenAUsedAt) && match.approvedByA === false;
  if (request.singleId === match.singleBId) return Boolean(match.tokenBUsedAt) && match.approvedByB === false;
  return false;
}

function arrivalChannel(entryChannel: string | null | undefined): "email" | "personalArea" | "other" | "unknown" {
  if (entryChannel === "email") return "email";
  if (entryChannel === "personal_area") return "personalArea";
  if (entryChannel === "other") return "other";
  return "unknown";
}

/**
 * Produces only aggregate, non-PII statistics. A sent Boost is one distinct
 * matchId with either a request fulfilled during the Israel calendar month or
 * a proposal timestamp in that month plus the immutable [BOOST_SENT] evidence.
 */
export function calculateBoostMonthlyStats(input: {
  period: BoostMonthlyStatsPeriod;
  requests: BoostMonthlyStatRequest[];
  matches: BoostMonthlyStatMatch[];
  singles: BoostMonthlyStatSingle[];
}): BoostMonthlyStats {
  const fulfilledMatchIds = new Set(
    input.requests
      .filter(request => isInPeriod(request.fulfilledAt, input.period))
      .map(request => Number(request.matchId))
      .filter(Boolean),
  );
  const proposalMatchIds = new Set(
    input.matches
      .filter(match => hasBoostSentProposalEvidence(match, input.period))
      .map(match => Number(match.id))
      .filter(Boolean),
  );
  const sentMatchIds = new Set(Array.from(fulfilledMatchIds).concat(Array.from(proposalMatchIds)));
  const requestsByMatchId = new Map<number, BoostMonthlyStatRequest[]>();
  const matchesById = new Map<number, BoostMonthlyStatMatch>();
  const genderBySingleId = new Map<number, string | null | undefined>();

  for (const request of input.requests) {
    const matchId = Number(request.matchId);
    if (!matchId) continue;
    const current = requestsByMatchId.get(matchId) || [];
    current.push(request);
    requestsByMatchId.set(matchId, current);
  }
  for (const match of input.matches) matchesById.set(Number(match.id), match);
  for (const single of input.singles) genderBySingleId.set(Number(single.id), single.gender);

  const initiators = { female: 0, male: 0, unknown: 0 };
  const outcomes = { bothApproved: 0, rejectedAny: 0, initiatorDeclined: 0 };
  // Historical records predate entryChannel and remain unknown. In particular,
  // match_boost_requests.source is an entitlement source and must never be
  // reinterpreted as email or personal-area acquisition.
  const arrivalChannels = { email: 0, personalArea: 0, other: 0, unknown: 0 };

  for (const matchId of Array.from(sentMatchIds)) {
    const match = matchesById.get(matchId);
    const request = chooseInitiatingRequest(requestsByMatchId.get(matchId) || [], input.period);
    const gender = request ? genderBySingleId.get(Number(request.singleId)) : undefined;
    if (gender === "female") initiators.female++;
    else if (gender === "male") initiators.male++;
    else initiators.unknown++;

    if (match?.approvedByA && match.approvedByB) outcomes.bothApproved++;
    if (match?.status === "rejected" && ((Boolean(match.tokenAUsedAt) && match.approvedByA === false) || (Boolean(match.tokenBUsedAt) && match.approvedByB === false))) {
      outcomes.rejectedAny++;
    }
    if (didInitiatorDecline(match, request)) outcomes.initiatorDeclined++;

    arrivalChannels[arrivalChannel(request?.entryChannel)]++;
  }

  return {
    period: input.period,
    sent: sentMatchIds.size,
    initiators,
    outcomes,
    arrivalChannels,
    attribution: {
      status: "entry_channel_recorded",
      note: "לשליחות קודמות ללא תיעוד מקור יוצג ״לא ידוע״. מקור מייל מבוסס על תגיות בקישור, ולא מהווה הוכחה שהמייל לבדו גרם לשליחה.",
    },
  };
}

const requestColumns = {
  id: matchBoostRequests.id,
  matchId: matchBoostRequests.matchId,
  singleId: matchBoostRequests.singleId,
  source: matchBoostRequests.source,
  entryChannel: matchBoostRequests.entryChannel,
  status: matchBoostRequests.status,
  requestedAt: matchBoostRequests.requestedAt,
  fulfilledAt: matchBoostRequests.fulfilledAt,
};

const matchColumns = {
  id: matches.id,
  singleAId: matches.singleAId,
  singleBId: matches.singleBId,
  proposedAt: matches.proposedAt,
  notes: matches.notes,
  status: matches.status,
  approvedByA: matches.approvedByA,
  approvedByB: matches.approvedByB,
  tokenAUsedAt: matches.tokenAUsedAt,
  tokenBUsedAt: matches.tokenBUsedAt,
};

function uniqueById<T extends { id: number }>(rows: T[]): T[] {
  return Array.from(new Map(rows.map(row => [row.id, row])).values());
}

/**
 * Loads the current Israel calendar month's aggregate Boost stats. This function
 * performs SELECTs only; it does not dispatch, message, match, or write data.
 */
export async function loadBoostMonthlyStats(options: { now?: number } = {}): Promise<BoostMonthlyStats> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const period = getIsraelCalendarMonthPeriod(options.now);
  // Rejected requests are intentionally not excluded: a fulfilled Boost remains
  // sent even when a participant later declines it.
  const [fulfilledRequests, markedProposals] = await Promise.all([
    db.select(requestColumns).from(matchBoostRequests).where(and(
      isNotNull(matchBoostRequests.fulfilledAt),
      gte(matchBoostRequests.fulfilledAt, period.startsAt),
      lt(matchBoostRequests.fulfilledAt, period.endsAt),
    )),
    db.select(matchColumns).from(matches).where(and(
      gte(matches.proposedAt, period.startsAt),
      lt(matches.proposedAt, period.endsAt),
      like(matches.notes, `%${BOOST_SENT_MARKER}%`),
    )),
  ]);

  const fulfilledMatchIds = Array.from(new Set(fulfilledRequests.map(row => Number(row.matchId)).filter(Boolean)));
  const markedMatchIds = Array.from(new Set(markedProposals.map(row => Number(row.id)).filter(Boolean)));
  const [matchesForFulfilledRequests, requestsForMarkedProposals] = await Promise.all([
    fulfilledMatchIds.length > 0
      ? db.select(matchColumns).from(matches).where(inArray(matches.id, fulfilledMatchIds))
      : Promise.resolve([]),
    markedMatchIds.length > 0
      ? db.select(requestColumns).from(matchBoostRequests).where(inArray(matchBoostRequests.matchId, markedMatchIds))
      : Promise.resolve([]),
  ]);

  const requestRows = uniqueById([...fulfilledRequests, ...requestsForMarkedProposals]);
  const matchRows = uniqueById([...markedProposals, ...matchesForFulfilledRequests]);
  const initiatorIds = Array.from(new Set(requestRows.map(row => Number(row.singleId)).filter(Boolean)));
  const singleRows = initiatorIds.length > 0
    ? await db.select({ id: singles.id, gender: singles.gender }).from(singles).where(inArray(singles.id, initiatorIds))
    : [];

  return calculateBoostMonthlyStats({
    period,
    requests: requestRows,
    matches: matchRows,
    singles: singleRows,
  });
}
