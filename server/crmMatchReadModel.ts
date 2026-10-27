import { and, desc, eq, getTableColumns, inArray, isNotNull, or, sql } from "drizzle-orm";
import { matches, matchBoostRequests, singles, matchmakingAnswers, type Match, type Single } from "../drizzle/schema";
import { visibleMatchSql } from "./matchAvailabilityQueries";
import { unclaimedHighBoostReviewSql } from "./boostRegularReview";
import { loadMatchScoreInputs, presentMatchScore, type MatchScoreInputs } from "./pendingMatchScore";
import { matchScoringProfileColumns } from "./advancedMatchRanking";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import { parseMatchOutcomeNotes } from "./matchOutcome";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
const MARKER = "[BOOST_CANDIDATE]";
const { scoreBreakdown: _breakdown, autoExplanation: _explanation, ...indexColumns } = getTableColumns(matches);

/** Same inclusion policy as the full history endpoint; no row limit or deduplication. */
export function crmVisibleMatchesSql() {
  return or(visibleMatchSql(MARKER), unclaimedHighBoostReviewSql());
}

export const crmMatchIndexColumns = {
  ...indexColumns,
  isBoostSource: sql<boolean>`(BINARY ${matches.autoExplanation} LIKE '[BOOST]%' OR BINARY ${matches.notes} LIKE '[BOOST_SENT]%')`,
};

const profileFields = {
  Gender: "gender", City: "city", Age: "age", Dna: "dnaType", Occupation: "occupation",
  Phone: "phone", PhotoUrl: "photoUrl", Education: "education", HasKids: "hasKids",
  NumKids: "numKids", WantsKids: "wantsKids", Religiosity: "religiosity", About: "about",
  PartnerDesc: "partnerDescription", Height: "height", MinAge: "minAgePreference",
  MaxAge: "maxAgePreference", MaritalStatus: "maritalStatus", ShomerShabbat: "shomerShabbat",
  HasPets: "hasPets", PetType: "petType", LocationPref: "locationPreference", AcceptsPets: "acceptsPets",
  SmokingStatus: "smokingStatus", SubscriptionEnd: "subscriptionRenewsAt", Email: "email",
  IsActive: "isActive", IsCoachingClient: "isCoachingClient", IsNotBasic: "isNotBasic", UpdatedAt: "updatedAt",
} as const;
const headerFields = new Set(["Gender", "City", "Age", "Dna", "PhotoUrl", "IsActive", "IsCoachingClient", "IsNotBasic", "UpdatedAt"]);

/** Carry only the note markers used by delivery/exclusion policy in the index. */
export function compactLifecycleNotes(notes: string | null | undefined) {
  const text = String(notes || "");
  return ["[BOOST_CANDIDATE]", "[BOOST_SENT]", "נשלחה בעבר"].filter(marker => text.includes(marker)).join(" ") || null;
}

export function buildCrmMatchRow(record: Match, inputs: MatchScoreInputs, initiatorId: number | null, compact = false, boostSource?: boolean) {
  const a = inputs.people.get(record.singleAId);
  const b = inputs.people.get(record.singleBId);
  const score = presentMatchScore(record, a, b, inputs.answers.get(record.singleAId), inputs.answers.get(record.singleBId));
  const row: Record<string, any> = {
    ...record, ...score,
    boostInitiatorId: initiatorId,
    proposalSource: (boostSource ?? (String(record.autoExplanation || "").startsWith("[BOOST]") || String(record.notes || "").startsWith("[BOOST_SENT]"))) ? "boost" : "regular",
    outcomeFeedback: parseMatchOutcomeNotes(record.notes),
  };
  for (const [side, person] of [["A", a], ["B", b]] as const) {
    row[`single${side}Name`] = person ? `${person.firstName} ${person.lastName || ""}`.trim() : undefined;
    row[`single${side}QuestionnaireCompleted`] = !!person?.questionnaireCompletedAt;
    for (const [suffix, field] of Object.entries(profileFields)) {
      if (!compact || headerFields.has(suffix)) row[`single${side}${suffix}`] = person?.[field as keyof Single];
    }
  }
  if (compact) {
    row.notes = compactLifecycleNotes(record.notes);
    row.scoreBreakdown = null;
    row.autoExplanation = null;
    // Presence is needed for history/blocking; actual participant bearer tokens
    // and owner approval links need not be copied to every list row.
    for (const field of ["approvalTokenA", "approvalTokenB", "singleAToken", "singleBToken"] as const) row[field] = record[field] ? "present" : null;
    delete row.ownerApprovalToken;
    delete row.isBoostSource;
  }
  return row;
}

function newestFirst(a: Match, b: Match) {
  const time = (m: Match) => m.proposedAt ? Number(m.proposedAt) : (m.createdAt instanceof Date ? m.createdAt.getTime() : Number(m.createdAt) || 0);
  return time(b) - time(a);
}

async function boostInitiators(db: Db, matchId?: number) {
  const rows = await db.select({ matchId: matchBoostRequests.matchId, singleId: matchBoostRequests.singleId })
    .from(matchBoostRequests).where(and(isNotNull(matchBoostRequests.fulfilledAt), matchId === undefined ? undefined : eq(matchBoostRequests.matchId, matchId)))
    .orderBy(desc(matchBoostRequests.fulfilledAt));
  const map = new Map<number, number>();
  for (const row of rows) if (row.matchId !== null && !map.has(row.matchId)) map.set(row.matchId, row.singleId);
  return map;
}

async function loadIndexInputs(db: Db, ids: number[]): Promise<MatchScoreInputs> {
  if (!ids.length) return { people: new Map(), answers: new Map() };
  const [people, rows] = await Promise.all([
    db.select({ ...matchScoringProfileColumns, firstName: singles.firstName, lastName: singles.lastName,
      photoUrl: singles.photoUrl, isActive: singles.isActive, isCoachingClient: singles.isCoachingClient,
      isNotBasic: singles.isNotBasic, updatedAt: singles.updatedAt, questionnaireCompletedAt: singles.questionnaireCompletedAt,
    }).from(singles).where(inArray(singles.id, ids)),
    db.select({ singleId: matchmakingAnswers.singleId, answersJson: matchmakingAnswers.answersJson })
      .from(matchmakingAnswers).where(inArray(matchmakingAnswers.singleId, ids)),
  ]);
  const answers = new Map<number, MatchAnswer[]>();
  for (const row of rows) {
    const parsed = row.answersJson ? (typeof row.answersJson === "string" ? JSON.parse(row.answersJson) : row.answersJson) : [];
    if (!Array.isArray(parsed)) throw new Error("Invalid questionnaire answer data");
    answers.set(row.singleId, parsed as MatchAnswer[]);
  }
  // Only the mechanically verified scoring fields and displayed headers are
  // accessed for compact rows. Full detail still uses loadMatchScoreInputs.
  return { people: new Map(people.map(person => [person.id, person as Single])), answers };
}

/** Request-local inputs, never a stale global score cache. */
export async function getCrmMatchIndex(db: Db) {
  const [raw, initiators] = await Promise.all([
    db.select(crmMatchIndexColumns).from(matches).where(crmVisibleMatchesSql()).orderBy(desc(matches.createdAt), desc(matches.score), desc(matches.id)),
    boostInitiators(db),
  ]);
  const rows = raw.map(row => ({ ...row, scoreBreakdown: null, autoExplanation: null } as Match & { isBoostSource: boolean })).sort(newestFirst);
  const ids = Array.from(new Set(rows.flatMap(row => [row.singleAId, row.singleBId])));
  const inputs = await loadIndexInputs(db, ids);
  return rows.map(row => buildCrmMatchRow(row, inputs, initiators.get(row.id) ?? null, true, !!row.isBoostSource));
}

/** Full, current detail for exactly one authorized-visible record. Read-only. */
export async function getCrmMatchDetails(db: Db, matchId: number) {
  const [record] = await db.select().from(matches).where(and(eq(matches.id, matchId), crmVisibleMatchesSql())).limit(1);
  if (!record) return null;
  const [inputs, initiators] = await Promise.all([
    loadMatchScoreInputs(db, [record.singleAId, record.singleBId]), boostInitiators(db, matchId),
  ]);
  return buildCrmMatchRow(record, inputs, initiators.get(matchId) ?? null);
}
