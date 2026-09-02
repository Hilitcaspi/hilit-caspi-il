import crypto from "node:crypto";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { crmLeads, matches, singles, testimonialEvents, testimonialRecords } from "../drizzle/schema";
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
