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

function stableRank(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function selectBalancedSatisfactionSample<T extends { id: number; email: string | null; createdAt: number }>(
  candidates: T[],
  sampleSize: number,
  now: number,
): { selected: T[]; breakdown: Record<string, number> } {
  const buckets = new Map<string, T[]>([
    ["under_14_days", []], ["days_14_30", []], ["days_31_60", []], ["over_60_days", []],
  ]);
  for (const person of candidates) {
    const tenureDays = Math.max(0, (now - Number(person.createdAt || 0)) / 86_400_000);
    const key = tenureDays < 14 ? "under_14_days" : tenureDays < 31 ? "days_14_30" : tenureDays < 61 ? "days_31_60" : "over_60_days";
    buckets.get(key)!.push(person);
  }
  for (const group of Array.from(buckets.values())) group.sort((a, b) => stableRank(a.email || "").localeCompare(stableRank(b.email || "")));
  const target = Math.min(Math.max(0, sampleSize), candidates.length);
  const perBucket = Math.floor(target / 4);
  const selected: T[] = [];
  for (const group of Array.from(buckets.values())) selected.push(...group.slice(0, perBucket));
  if (selected.length < target) {
    const selectedIds = new Set(selected.map(person => person.id));
    const remainder = candidates.filter(person => !selectedIds.has(person.id))
      .sort((a, b) => stableRank(a.email || "").localeCompare(stableRank(b.email || "")));
    selected.push(...remainder.slice(0, target - selected.length));
  }
  const breakdown = Object.fromEntries(Array.from(buckets.entries()).map(([key, group]) => [key, selected.filter(person => group.some(member => member.id === person.id)).length]));
  return { selected, breakdown };
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
  const existingRows = await db.select({ singleId: testimonialRecords.singleId, surveyKind: testimonialRecords.surveyKind })
    .from(testimonialRecords).where(isNotNull(testimonialRecords.singleId));
  const existingSatisfactionIds = new Set(existingRows.filter(row => row.surveyKind === "satisfaction_survey").map(row => row.singleId));
  const historicalDraftIds = new Set(existingRows.filter(row => row.surveyKind === "positive_experience").map(row => row.singleId));
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
  });
  const { selected, breakdown } = selectBalancedSatisfactionSample(candidates, Math.max(10, options.sampleSize), now);
  let created = 0;
  if (options.execute) {
    for (const person of selected) {
      const didCreate = await createDraftRecord({
        requestKey: `representative_sample:2026-09:${person.id}`,
        surveyKind: "satisfaction_survey",
        touchpoint: "representative_sample",
        proofType: "internal",
        sourceType: "database",
        singleId: person.id,
        contactName: `${person.firstName} ${person.lastName || ""}`.trim(),
        contactEmail: normalizeTestimonialEmail(person.email || ""),
        contactPhone: person.phone,
        sourceSnapshot: {
          sampleCohort: "2026-09",
          profileComplete: Boolean(person.questionnaireCompletedAt),
          tenureDays: Math.floor(Math.max(0, (now - Number(person.createdAt || 0)) / 86_400_000)),
        },
      });
      if (didCreate) created += 1;
    }
  }
  return { eligible: selected.length, created, skippedExisting, skippedUnsubscribed, skippedInvalid, sent: 0, breakdown };
}
