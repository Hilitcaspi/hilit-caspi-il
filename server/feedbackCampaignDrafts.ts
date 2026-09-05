import crypto from "node:crypto";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { crmLeads, dnaQuizResults, matches, singles, testimonialEvents, testimonialRecords } from "../drizzle/schema";
import { getDb } from "./db";
import { isPermanentlyBlockedEmail } from "./brevo";
import { buildTestimonialDraft, normalizeTestimonialEmail } from "./testimonialService";

type DraftSummary = {
  eligible: number;
  created: number;
  skippedExisting: number;
  skippedUnsubscribed: number;
  skippedInvalid: number;
  sent: 0;
};

type SatisfactionSamplePerson = {
  id: number;
  email: string | null;
  createdAt: number;
  gender?: string | null;
  age?: number | null;
  city?: string | null;
  questionnaireCompletedAt?: number | null;
  sampleStage?: string;
};

function stableRank(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function classifySurveyRegion(city?: string | null): string {
  const value = String(city || "").trim();
  if (/תל אביב|רמת גן|גבעתיים|פתח תקווה|קריית אונו|חולון|בת ים|ראשון לציון|הרצליה|רמת השרון/.test(value)) return "center";
  if (/נתניה|כפר סבא|רעננה|הוד השרון|עמק חפר/.test(value)) return "sharon";
  if (/ירושלים|בית שמש|מודיעין|מעלה אדומים/.test(value)) return "jerusalem";
  if (/חיפה|קריות|עכו|נהריה|כרמיאל|טבריה|עפולה|נצרת|צפת/.test(value)) return "north";
  if (/באר שבע|אשדוד|אשקלון|שדרות|קריית גת|אילת/.test(value)) return "south";
  return "other";
}

export function classifySurveyAge(age?: number | null): string {
  const value = Number(age || 0);
  if (value > 0 && value < 30) return "under_30";
  if (value < 40) return "30_39";
  if (value < 50) return "40_49";
  if (value < 60) return "50_59";
  return "60_plus";
}

function buildCategoryTargets(values: string[], target: number, minimumPerGroup: number): Map<string, number> {
  const availability = new Map<string, number>();
  for (const value of values) availability.set(value, (availability.get(value) || 0) + 1);
  const quotas = new Map<string, number>();
  for (const [value, available] of Array.from(availability.entries())) quotas.set(value, Math.min(available, minimumPerGroup));
  while (Array.from(quotas.values()).reduce((sum, count) => sum + count, 0) < target) {
    const totalAvailable = Math.max(1, values.length);
    const candidate = Array.from(availability.keys())
      .filter(value => (quotas.get(value) || 0) < (availability.get(value) || 0))
      .sort((a, b) => {
        const deficitA = ((availability.get(a) || 0) / totalAvailable) * target - (quotas.get(a) || 0);
        const deficitB = ((availability.get(b) || 0) / totalAvailable) * target - (quotas.get(b) || 0);
        return deficitB - deficitA || a.localeCompare(b);
      })[0];
    if (!candidate) break;
    quotas.set(candidate, (quotas.get(candidate) || 0) + 1);
  }
  return quotas;
}

export function selectBalancedSatisfactionSample<T extends SatisfactionSamplePerson>(
  candidates: T[],
  sampleSize: number,
  now: number,
): { selected: T[]; breakdown: Record<string, number>; dimensions: Record<string, Record<string, number>> } {
  const buckets = new Map<string, T[]>([
    ["under_14_days", []], ["days_14_30", []], ["days_31_60", []], ["over_60_days", []],
  ]);
  for (const person of candidates) {
    const tenureDays = Math.max(0, (now - Number(person.createdAt || 0)) / 86_400_000);
    const key = tenureDays < 14 ? "under_14_days" : tenureDays < 31 ? "days_14_30" : tenureDays < 61 ? "days_31_60" : "over_60_days";
    buckets.get(key)!.push(person);
  }
  const target = Math.min(Math.max(0, sampleSize), candidates.length);
  const dimensions = {
    gender: (person: T) => String(person.gender || "unknown"),
    age: (person: T) => classifySurveyAge(person.age),
    region: (person: T) => classifySurveyRegion(person.city),
    stage: (person: T) => String(person.sampleStage || (person.questionnaireCompletedAt ? "profile_complete" : "profile_incomplete")),
  };
  const minimums = { gender: 4, age: 4, region: 4, stage: 5 };
  const targets = Object.fromEntries(Object.entries(dimensions).map(([dimension, classifier]) => [
    dimension,
    buildCategoryTargets(candidates.map(classifier), target, minimums[dimension as keyof typeof minimums]),
  ])) as Record<keyof typeof dimensions, Map<string, number>>;
  const selectedCounts = Object.fromEntries(Object.keys(dimensions).map(key => [key, new Map<string, number>()])) as Record<keyof typeof dimensions, Map<string, number>>;
  const selectedIds = new Set<number>();
  const selected: T[] = [];
  const bucketEntries = Array.from(buckets.entries());
  const tenureTargets = new Map(bucketEntries.map(([key], index) => [key, Math.floor(target / 4) + (index < target % 4 ? 1 : 0)]));
  const tenureCounts = new Map(bucketEntries.map(([key]) => [key, 0]));
  const tenureById = new Map<number, string>();
  for (const [key, group] of bucketEntries) for (const person of group) tenureById.set(person.id, key);
  const scorePerson = (item: T) => Object.entries(dimensions).reduce((sum, [dimension, classifier]) => {
    const key = classifier(item);
    const desired = targets[dimension as keyof typeof dimensions].get(key) || 0;
    const current = selectedCounts[dimension as keyof typeof dimensions].get(key) || 0;
    const weight = dimension === "stage" ? 3 : 1;
    return sum + (desired > current ? weight * (((desired - current) / Math.max(1, desired)) + (1 / Math.max(1, desired))) : 0);
  }, 0);
  const selectPerson = (person: T) => {
    selected.push(person);
    selectedIds.add(person.id);
    const tenure = tenureById.get(person.id);
    if (tenure) tenureCounts.set(tenure, (tenureCounts.get(tenure) || 0) + 1);
    for (const [dimension, classifier] of Object.entries(dimensions)) {
      const key = classifier(person);
      const counter = selectedCounts[dimension as keyof typeof dimensions];
      counter.set(key, (counter.get(key) || 0) + 1);
    }
  };

  const stageClassifier = dimensions.stage;
  const stageTargets = targets.stage;
  for (const [stage, desired] of Array.from(stageTargets.entries()).filter(([, count]) => count <= 5).sort((a, b) => a[1] - b[1])) {
    while ((selectedCounts.stage.get(stage) || 0) < desired) {
      const person = candidates
        .filter(item => !selectedIds.has(item.id) && stageClassifier(item) === stage)
        .filter(item => {
          const tenure = tenureById.get(item.id);
          return !tenure || (tenureCounts.get(tenure) || 0) < (tenureTargets.get(tenure) || 0);
        })
        .sort((a, b) => scorePerson(b) - scorePerson(a) || stableRank(a.email || "").localeCompare(stableRank(b.email || "")))[0];
      if (!person) break;
      selectPerson(person);
    }
  }

  let bucketCursor = 0;
  while (selected.length < target) {
    const [bucketKey, group] = bucketEntries[bucketCursor % bucketEntries.length];
    bucketCursor += 1;
    const tenureQuota = tenureTargets.get(bucketKey) || 0;
    const currentTenureCount = tenureCounts.get(bucketKey) || 0;
    if (currentTenureCount >= tenureQuota) {
      if (bucketCursor > target * 12) break;
      continue;
    }
    const available = group.filter(person => !selectedIds.has(person.id));
    if (!available.length) {
      if (bucketCursor > target * 12) break;
      continue;
    }
    const person = available.sort((a, b) => scorePerson(b) - scorePerson(a) || stableRank(a.email || "").localeCompare(stableRank(b.email || "")))[0];
    selectPerson(person);
  }
  if (selected.length < target) {
    const remainder = candidates.filter(person => !selectedIds.has(person.id)).sort((a, b) => stableRank(a.email || "").localeCompare(stableRank(b.email || "")));
    selected.push(...remainder.slice(0, target - selected.length));
  }
  const breakdown = Object.fromEntries(Array.from(buckets.entries()).map(([key, group]) => [key, selected.filter(person => group.some(member => member.id === person.id)).length]));
  const dimensionBreakdown = Object.fromEntries(Object.entries(dimensions).map(([dimension, classifier]) => {
    const counts: Record<string, number> = {};
    for (const person of selected) counts[classifier(person)] = (counts[classifier(person)] || 0) + 1;
    return [dimension, counts];
  }));
  return { selected, breakdown, dimensions: dimensionBreakdown };
}

async function blockedEmailSet(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db.select({ email: crmLeads.email }).from(crmLeads)
    .where(eq(crmLeads.emailUnsubscribed, true));
  return new Set(rows.map(row => normalizeTestimonialEmail(row.email)).filter(Boolean));
}

async function createDraftRecord(input: {
  requestKey: string;
  surveyKind: "positive_experience" | "satisfaction_survey";
  touchpoint: "historical_match" | "representative_sample";
  proofType: "success" | "internal";
  sourceType: "match" | "database";
  singleId: number;
  matchId?: number | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  sourceSnapshot: Record<string, unknown>;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Date.now();
  const draft = buildTestimonialDraft({
    firstName: input.contactName.trim().split(/\s+/)[0] || "שלום",
    sourceType: input.sourceType,
    surveyKind: input.surveyKind,
  });
  try {
    const result = await db.insert(testimonialRecords).values({
      publicToken: crypto.randomBytes(32).toString("hex"),
      requestKey: input.requestKey,
      surveyKind: input.surveyKind,
      touchpoint: input.touchpoint,
      deliveryChannel: "manual",
      status: "draft",
      proofType: input.proofType,
      sourceType: input.sourceType,
      singleId: input.singleId,
      matchId: input.matchId ?? null,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      sourceSnapshot: JSON.stringify(input.sourceSnapshot),
      draftSubject: draft.subject,
      draftBody: draft.body,
      rewardType: input.surveyKind === "positive_experience" ? "date_map" : "none",
      incentiveDisclosureRequired: input.surveyKind === "positive_experience",
      createdAt: now,
      updatedAt: now,
    });
    const recordId = Number((result as unknown as [{ insertId?: number }])[0]?.insertId ?? 0);
    await db.insert(testimonialEvents).values({
      recordId,
      eventType: "created",
      actorType: "system",
      actorRef: input.touchpoint,
      metadata: JSON.stringify({ draftOnly: true, sent: false }),
      createdAt: now,
    });
    return true;
  } catch {
    const [existing] = await db.select({ id: testimonialRecords.id }).from(testimonialRecords)
      .where(eq(testimonialRecords.requestKey, input.requestKey)).limit(1);
    if (existing) return false;
    throw new Error("Could not create feedback draft");
  }
}

export async function prepareHistoricalMatchDrafts(options: { execute: boolean }): Promise<DraftSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const matchRows = await db.select({
    id: matches.id,
    singleAId: matches.singleAId,
    singleBId: matches.singleBId,
    matchedAt: matches.matchedAt,
  }).from(matches).where(and(
    eq(matches.approvedByA, true),
    eq(matches.approvedByB, true),
    isNotNull(matches.matchedAt),
  )).orderBy(desc(matches.matchedAt));

  const latestBySingle = new Map<number, { matchId: number; matchedAt: number }>();
  for (const match of matchRows) {
    for (const singleId of [match.singleAId, match.singleBId]) {
      if (singleId > 0 && !latestBySingle.has(singleId)) {
        latestBySingle.set(singleId, { matchId: match.id, matchedAt: Number(match.matchedAt || 0) });
      }
    }
  }
  const ids = Array.from(latestBySingle.keys());
  const people = ids.length ? await db.select().from(singles).where(inArray(singles.id, ids)) : [];
  const unsubscribed = await blockedEmailSet();
  const existingRows = await db.select({ singleId: testimonialRecords.singleId }).from(testimonialRecords)
    .where(and(eq(testimonialRecords.sourceType, "match"), isNotNull(testimonialRecords.singleId)));
  const existingIds = new Set(existingRows.map(row => row.singleId).filter((value): value is number => Boolean(value)));
  const seenEmails = new Set<string>();
  let skippedExisting = 0;
  let skippedUnsubscribed = 0;
  let skippedInvalid = 0;
  const eligible = people.filter(person => {
    const email = normalizeTestimonialEmail(person.email || "");
    if (!email || person.isSeed || !person.isActive || seenEmails.has(email)) { skippedInvalid += 1; return false; }
    seenEmails.add(email);
    if (!person.consentEmailMarketing || unsubscribed.has(email) || isPermanentlyBlockedEmail(email)) { skippedUnsubscribed += 1; return false; }
    if (existingIds.has(person.id)) { skippedExisting += 1; return false; }
    return true;
  });
  let created = 0;
  if (options.execute) {
    for (const person of eligible) {
      const match = latestBySingle.get(person.id)!;
      const didCreate = await createDraftRecord({
        requestKey: `historical_match:person:${person.id}`,
        surveyKind: "positive_experience",
        touchpoint: "historical_match",
        proofType: "success",
        sourceType: "match",
        singleId: person.id,
        matchId: match.matchId,
        contactName: `${person.firstName} ${person.lastName || ""}`.trim(),
        contactEmail: normalizeTestimonialEmail(person.email || ""),
        contactPhone: person.phone,
        sourceSnapshot: { mutualApproval: true, matchedAt: match.matchedAt, historicalDraft: true },
      });
      if (didCreate) created += 1;
    }
  }
  return { eligible: eligible.length, created, skippedExisting, skippedUnsubscribed, skippedInvalid, sent: 0 };
}

export async function prepareSatisfactionSurveyDrafts(options: { execute: boolean; sampleSize: number }): Promise<DraftSummary & { breakdown: Record<string, number> }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const people = await db.select().from(singles).where(and(
    eq(singles.isActive, true),
    eq(singles.isSeed, false),
    eq(singles.consentEmailMarketing, true),
    isNotNull(singles.email),
  ));
  const unsubscribed = await blockedEmailSet();
  const existingRows = await db.select({ singleId: testimonialRecords.singleId, surveyKind: testimonialRecords.surveyKind, status: testimonialRecords.status })
    .from(testimonialRecords).where(isNotNull(testimonialRecords.singleId));
  const existingSatisfactionIds = new Set(existingRows.filter(row => row.surveyKind === "satisfaction_survey" && row.status !== "archived").map(row => row.singleId));
  const historicalDraftIds = new Set(existingRows.filter(row => row.surveyKind === "positive_experience").map(row => row.singleId));
  const matchRows = await db.select({ singleAId: matches.singleAId, singleBId: matches.singleBId, proposedAt: matches.proposedAt, approvedByA: matches.approvedByA, approvedByB: matches.approvedByB }).from(matches);
  const proposalSentIds = new Set<number>();
  const mutualIds = new Set<number>();
  for (const match of matchRows) {
    if (match.proposedAt) {
      proposalSentIds.add(match.singleAId);
      proposalSentIds.add(match.singleBId);
    }
    if (match.approvedByA && match.approvedByB) {
      mutualIds.add(match.singleAId);
      mutualIds.add(match.singleBId);
    }
  }
  const seenEmails = new Set<string>();
  let skippedExisting = 0;
  let skippedUnsubscribed = 0;
  let skippedInvalid = 0;
  const now = Date.now();
  const candidates = people.filter(person => {
    const email = normalizeTestimonialEmail(person.email || "");
    if (!email || seenEmails.has(email)) { skippedInvalid += 1; return false; }
    seenEmails.add(email);
    if (unsubscribed.has(email) || isPermanentlyBlockedEmail(email)) { skippedUnsubscribed += 1; return false; }
    if (existingSatisfactionIds.has(person.id) || historicalDraftIds.has(person.id)) { skippedExisting += 1; return false; }
    return true;
  }).map(person => ({
    ...person,
    sampleStage: !person.questionnaireCompletedAt
      ? "profile_incomplete"
      : mutualIds.has(person.id)
        ? "mutual_match_history"
        : proposalSentIds.has(person.id)
          ? "proposal_sent"
          : "no_match_sent",
  }));
  const { selected, breakdown, dimensions } = selectBalancedSatisfactionSample(candidates, Math.max(10, options.sampleSize), now);
  let created = 0;
  if (options.execute) {
    for (const person of selected) {
      const didCreate = await createDraftRecord({
        requestKey: `representative_sample:2026-09-v3:${person.id}`,
        surveyKind: "satisfaction_survey",
        touchpoint: "representative_sample",
        proofType: "internal",
        sourceType: "database",
        singleId: person.id,
        contactName: `${person.firstName} ${person.lastName || ""}`.trim(),
        contactEmail: normalizeTestimonialEmail(person.email || ""),
        contactPhone: person.phone,
        sourceSnapshot: {
          sampleCohort: "2026-09-v3",
          profileComplete: Boolean(person.questionnaireCompletedAt),
          tenureDays: Math.floor(Math.max(0, (now - Number(person.createdAt || 0)) / 86_400_000)),
          genderBucket: String(person.gender || "unknown"),
          ageBucket: classifySurveyAge(person.age),
          regionBucket: classifySurveyRegion(person.city),
          stageBucket: person.sampleStage,
          multidimensionalSample: true,
        },
      });
      if (didCreate) created += 1;
    }
  }
  return { eligible: selected.length, created, skippedExisting, skippedUnsubscribed, skippedInvalid, sent: 0, breakdown: { ...breakdown, ...Object.fromEntries(Object.entries(dimensions).flatMap(([dimension, values]) => Object.entries(values).map(([key, count]) => [`${dimension}:${key}`, count]))) } };
}

export const FEEDBACK_CAMPAIGN_AUDIENCES = ["successful_matches", "dna_completers"] as const;
export type FeedbackCampaignAudience = typeof FEEDBACK_CAMPAIGN_AUDIENCES[number];

type FeedbackCampaignExclusion =
  | "existing_request"
  | "unsubscribed"
  | "inactive_or_no_consent"
  | "invalid_or_blocked"
  | "duplicate_contact"
  | "higher_priority_audience";

export type FeedbackCampaignAudienceSummary = {
  audience: FeedbackCampaignAudience;
  label: string;
  sourceTotal: number;
  uniqueContacts: number;
  eligible: number;
  preparedDrafts: number;
  approvedForContact: number;
  scheduledForSend: number;
  exclusions: Record<FeedbackCampaignExclusion, number>;
  sampleSubject: string;
  sampleBody: string;
  sent: number;
};

type CampaignProfile = {
  isActive: boolean;
  consentEmailMarketing: boolean;
};

type CampaignCandidate = {
  audience: FeedbackCampaignAudience;
  requestKey: string;
  sourceType: "match" | "dna";
  touchpoint: "historical_match" | "dna_result";
  proofType: "success" | "product";
  singleId: number | null;
  crmLeadId: number | null;
  matchId: number | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  sourceSnapshot: Record<string, unknown>;
};

type AudiencePlan = {
  summary: FeedbackCampaignAudienceSummary;
  candidates: CampaignCandidate[];
  candidateEmails: Set<string>;
};

const CAMPAIGN_VERSION = "2026-09-v1";
const CAMPAIGN_REQUEST_PREFIX: Record<FeedbackCampaignAudience, string> = {
  successful_matches: `campaign:successful-matches:${CAMPAIGN_VERSION}:`,
  dna_completers: `campaign:dna-completers:${CAMPAIGN_VERSION}:`,
};

export function buildFeedbackCampaignRequestKey(audience: FeedbackCampaignAudience, subjectId: number): string {
  const subjectType = audience === "successful_matches" ? "single" : "result";
  return `${CAMPAIGN_REQUEST_PREFIX[audience]}${subjectType}-${subjectId}`;
}

function emptyExclusions(): Record<FeedbackCampaignExclusion, number> {
  return {
    existing_request: 0,
    unsubscribed: 0,
    inactive_or_no_consent: 0,
    invalid_or_blocked: 0,
    duplicate_contact: 0,
    higher_priority_audience: 0,
  };
}

export function classifyFeedbackCampaignContact(input: {
  email: string;
  isSeed?: boolean;
  unsubscribed?: boolean;
  profiles?: CampaignProfile[];
  existingRequest?: boolean;
  duplicateContact?: boolean;
  higherPriorityAudience?: boolean;
}): FeedbackCampaignExclusion | null {
  const email = normalizeTestimonialEmail(input.email || "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.isSeed || isPermanentlyBlockedEmail(email)) return "invalid_or_blocked";
  if (input.duplicateContact) return "duplicate_contact";
  if (input.higherPriorityAudience) return "higher_priority_audience";
  if (input.unsubscribed) return "unsubscribed";
  if (input.profiles?.some(profile => !profile.isActive || !profile.consentEmailMarketing)) return "inactive_or_no_consent";
  if (input.existingRequest) return "existing_request";
  return null;
}

function campaignCopy(audience: FeedbackCampaignAudience) {
  return buildTestimonialDraft({
    firstName: "שם פרטי",
    sourceType: audience === "successful_matches" ? "match" : "dna",
    surveyKind: "positive_experience",
  });
}

async function buildFeedbackCampaignAudiencePlans(): Promise<Record<FeedbackCampaignAudience, AudiencePlan>> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [matchRows, singleRows, dnaRows, leadRows, testimonialRows] = await Promise.all([
    db.select({
      id: matches.id,
      singleAId: matches.singleAId,
      singleBId: matches.singleBId,
      approvedByA: matches.approvedByA,
      approvedByB: matches.approvedByB,
      matchedAt: matches.matchedAt,
    }).from(matches).orderBy(desc(matches.matchedAt)),
    db.select().from(singles),
    db.select().from(dnaQuizResults).orderBy(desc(dnaQuizResults.createdAt)),
    db.select().from(crmLeads),
    db.select({
      contactEmail: testimonialRecords.contactEmail,
      requestKey: testimonialRecords.requestKey,
      surveyKind: testimonialRecords.surveyKind,
      status: testimonialRecords.status,
      scheduledAt: testimonialRecords.scheduledAt,
      requestSentAt: testimonialRecords.requestSentAt,
    }).from(testimonialRecords),
  ]);

  const singlesById = new Map(singleRows.map(person => [person.id, person]));
  const profilesByEmail = new Map<string, CampaignProfile[]>();
  for (const person of singleRows) {
    const email = normalizeTestimonialEmail(person.email || "");
    if (!email) continue;
    const profiles = profilesByEmail.get(email) || [];
    profiles.push({ isActive: Boolean(person.isActive), consentEmailMarketing: Boolean(person.consentEmailMarketing) });
    profilesByEmail.set(email, profiles);
  }
  const leadsBySession = new Map(leadRows.filter(lead => lead.quizSessionId).map(lead => [lead.quizSessionId!, lead]));
  const unsubscribedEmails = new Set(leadRows.filter(lead => lead.emailUnsubscribed).map(lead => normalizeTestimonialEmail(lead.email)).filter(Boolean));
  const existingPositiveEmails = new Set(testimonialRows
    .filter(row => row.surveyKind === "positive_experience")
    .map(row => normalizeTestimonialEmail(row.contactEmail))
    .filter(Boolean));
  const campaignState = (audience: FeedbackCampaignAudience) => {
    const rows = testimonialRows.filter(row => row.requestKey?.startsWith(CAMPAIGN_REQUEST_PREFIX[audience]));
    return {
      preparedDrafts: rows.filter(row => row.status === "draft").length,
      approvedForContact: rows.filter(row => row.status === "approved_to_contact" && !row.scheduledAt && !row.requestSentAt).length,
      scheduledForSend: rows.filter(row => row.status === "approved_to_contact" && Boolean(row.scheduledAt) && !row.requestSentAt).length,
      sent: rows.filter(row => Boolean(row.requestSentAt)).length,
    };
  };

  const successfulExclusions = emptyExclusions();
  const mutualMatches = matchRows.filter(match => match.approvedByA && match.approvedByB && match.matchedAt);
  const latestMatchBySingle = new Map<number, { matchId: number; matchedAt: number }>();
  for (const match of mutualMatches) {
    for (const singleId of [match.singleAId, match.singleBId]) {
      if (singleId > 0 && !latestMatchBySingle.has(singleId)) {
        latestMatchBySingle.set(singleId, { matchId: match.id, matchedAt: Number(match.matchedAt || 0) });
      }
    }
  }
  const successfulCandidates: CampaignCandidate[] = [];
  const successfulEmails = new Set<string>();
  const seenSuccessfulEmails = new Set<string>();
  for (const [singleId, match] of Array.from(latestMatchBySingle.entries())) {
    const person = singlesById.get(singleId);
    const email = normalizeTestimonialEmail(person?.email || "");
    const exclusion = classifyFeedbackCampaignContact({
      email,
      isSeed: Boolean(person?.isSeed),
      unsubscribed: unsubscribedEmails.has(email),
      profiles: profilesByEmail.get(email),
      existingRequest: existingPositiveEmails.has(email),
      duplicateContact: Boolean(email && seenSuccessfulEmails.has(email)),
    });
    if (email) seenSuccessfulEmails.add(email);
    if (exclusion) {
      successfulExclusions[exclusion] += 1;
      continue;
    }
    successfulEmails.add(email);
    successfulCandidates.push({
      audience: "successful_matches",
      requestKey: buildFeedbackCampaignRequestKey("successful_matches", singleId),
      sourceType: "match",
      touchpoint: "historical_match",
      proofType: "success",
      singleId,
      crmLeadId: null,
      matchId: match.matchId,
      contactName: `${person?.firstName || ""} ${person?.lastName || ""}`.trim() || "שלום",
      contactEmail: email,
      contactPhone: person?.phone || null,
      sourceSnapshot: {
        campaignAudience: "successful_matches",
        campaignVersion: CAMPAIGN_VERSION,
        mutualApproval: true,
        matchedAt: match.matchedAt,
        draftOnly: true,
      },
    });
  }
  const successfulCopy = campaignCopy("successful_matches");
  const successfulState = campaignState("successful_matches");
  const successfulPlan: AudiencePlan = {
    candidates: successfulCandidates,
    candidateEmails: successfulEmails,
    summary: {
      audience: "successful_matches",
      label: "התאמות שבהן שני הצדדים אמרו כן",
      sourceTotal: mutualMatches.length,
      uniqueContacts: latestMatchBySingle.size,
      eligible: successfulCandidates.length,
      ...successfulState,
      exclusions: successfulExclusions,
      sampleSubject: successfulCopy.subject,
      sampleBody: successfulCopy.body,
    },
  };

  const dnaExclusions = emptyExclusions();
  const dnaCandidates: CampaignCandidate[] = [];
  const dnaEmails = new Set<string>();
  const seenDnaEmails = new Set<string>();
  for (const result of dnaRows) {
    const lead = leadsBySession.get(result.sessionId);
    const linkedSingle = result.singleId ? singlesById.get(result.singleId) : undefined;
    const email = normalizeTestimonialEmail(lead?.email || linkedSingle?.email || "");
    const exclusion = classifyFeedbackCampaignContact({
      email,
      isSeed: Boolean(linkedSingle?.isSeed),
      unsubscribed: unsubscribedEmails.has(email),
      profiles: profilesByEmail.get(email),
      existingRequest: existingPositiveEmails.has(email),
      duplicateContact: Boolean(email && seenDnaEmails.has(email)),
      higherPriorityAudience: successfulEmails.has(email),
    });
    if (email) seenDnaEmails.add(email);
    if (exclusion) {
      dnaExclusions[exclusion] += 1;
      continue;
    }
    dnaEmails.add(email);
    const singleId = linkedSingle?.id || lead?.singleId || null;
    dnaCandidates.push({
      audience: "dna_completers",
      requestKey: buildFeedbackCampaignRequestKey("dna_completers", result.id),
      sourceType: "dna",
      touchpoint: "dna_result",
      proofType: "product",
      singleId,
      crmLeadId: lead?.id || null,
      matchId: null,
      contactName: lead?.name || `${linkedSingle?.firstName || ""} ${linkedSingle?.lastName || ""}`.trim() || "שלום",
      contactEmail: email,
      contactPhone: lead?.phone || linkedSingle?.phone || null,
      sourceSnapshot: {
        campaignAudience: "dna_completers",
        campaignVersion: CAMPAIGN_VERSION,
        dnaResultId: result.id,
        completedAt: result.createdAt,
        captureConsentRequired: Boolean(lead),
        draftOnly: true,
      },
    });
  }
  const dnaCopy = campaignCopy("dna_completers");
  const dnaState = campaignState("dna_completers");
  const dnaPlan: AudiencePlan = {
    candidates: dnaCandidates,
    candidateEmails: dnaEmails,
    summary: {
      audience: "dna_completers",
      label: "מסיימי שאלון ה־DNA",
      sourceTotal: dnaRows.length,
      uniqueContacts: seenDnaEmails.size,
      eligible: dnaCandidates.length,
      ...dnaState,
      exclusions: dnaExclusions,
      sampleSubject: dnaCopy.subject,
      sampleBody: dnaCopy.body,
    },
  };

  return { successful_matches: successfulPlan, dna_completers: dnaPlan };
}

export async function previewFeedbackCampaignAudiences(): Promise<FeedbackCampaignAudienceSummary[]> {
  const plans = await buildFeedbackCampaignAudiencePlans();
  return FEEDBACK_CAMPAIGN_AUDIENCES.map(audience => plans[audience].summary);
}

export async function prepareFeedbackCampaignAudienceDrafts(audience: FeedbackCampaignAudience): Promise<{
  audience: FeedbackCampaignAudience;
  created: number;
  remainingEligible: number;
  preparedDrafts: number;
  sent: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const plans = await buildFeedbackCampaignAudiencePlans();
  const candidates = plans[audience].candidates;
  let created = 0;
  const chunkSize = 200;
  for (let index = 0; index < candidates.length; index += chunkSize) {
    const chunk = candidates.slice(index, index + chunkSize);
    const now = Date.now();
    try {
      await db.insert(testimonialRecords).values(chunk.map(candidate => {
        const draft = buildTestimonialDraft({ firstName: candidate.contactName, sourceType: candidate.sourceType, surveyKind: "positive_experience" });
        return {
          publicToken: crypto.randomBytes(32).toString("hex"),
          requestKey: candidate.requestKey,
          surveyKind: "positive_experience" as const,
          touchpoint: candidate.touchpoint,
          deliveryChannel: "email" as const,
          status: "draft" as const,
          proofType: candidate.proofType,
          sourceType: candidate.sourceType,
          singleId: candidate.singleId,
          crmLeadId: candidate.crmLeadId,
          matchId: candidate.matchId,
          contactName: candidate.contactName,
          contactEmail: candidate.contactEmail,
          contactPhone: candidate.contactPhone,
          sourceSnapshot: JSON.stringify(candidate.sourceSnapshot),
          draftSubject: draft.subject,
          draftBody: draft.body,
          scheduledAt: null,
          requestSentAt: null,
          rewardType: "date_map" as const,
          incentiveDisclosureRequired: true,
          createdAt: now,
          updatedAt: now,
        };
      }));
    } catch {
      throw new Error(`Could not prepare ${audience} feedback drafts`);
    }
    const stored = await db.select({ id: testimonialRecords.id }).from(testimonialRecords)
      .where(inArray(testimonialRecords.requestKey, chunk.map(candidate => candidate.requestKey)));
    if (stored.length) {
      await db.insert(testimonialEvents).values(stored.map(record => ({
        recordId: record.id,
        eventType: "created" as const,
        actorType: "system" as const,
        actorRef: `campaign:${audience}`,
        metadata: JSON.stringify({ draftOnly: true, sent: false, campaignVersion: CAMPAIGN_VERSION }),
        createdAt: now,
      })));
    }
    created += stored.length;
  }
  const after = await previewFeedbackCampaignAudiences();
  const summary = after.find(item => item.audience === audience)!;
  return { audience, created, remainingEligible: summary.eligible, preparedDrafts: summary.preparedDrafts, sent: summary.sent };
}
