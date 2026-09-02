import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNotNull, isNull, like, or } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { z } from "zod";
import {
  testimonialEvents,
  testimonialMedia,
  testimonialRecords,
  testimonialUsage,
  feedbackAutomationSettings,
  matches,
  singles,
} from "../drizzle/schema";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import { getTestimonialDb } from "./testimonialDb";
import { storageGetSignedUrl } from "./storage";
import { parseMatchOutcomeNotes } from "./matchOutcome";
import { isEligibleMatchCandidate, matchCandidateProofType, matchCandidateReason } from "./testimonialCandidates";
import { isPermanentlyBlockedEmail } from "./brevo";
import { prepareHistoricalMatchDrafts, prepareSatisfactionSurveyDrafts } from "./feedbackCampaignDrafts";
import {
  buildTestimonialDraft,
  consentAllowsChannel,
  deriveSubmissionStatus,
  mediaConsentAllows,
  normalizeTestimonialEmail,
  publicDisplayName,
  publicQuestionsForSource,
  resolveFeedbackRewardGrant,
  TESTIMONIAL_CHANNELS,
  TESTIMONIAL_CONSENT_VERSION,
  TESTIMONIAL_IDENTITY_SCOPES,
  TESTIMONIAL_PROOF_TYPES,
  TESTIMONIAL_REWARD_TYPES,
  TESTIMONIAL_SOURCE_TYPES,
  TESTIMONIAL_STATUSES,
  TESTIMONIAL_SURVEY_KINDS,
  TESTIMONIAL_TOUCHPOINTS,
} from "./testimonialService";

const proofTypeSchema = z.enum(TESTIMONIAL_PROOF_TYPES);
const sourceTypeSchema = z.enum(TESTIMONIAL_SOURCE_TYPES);
const statusSchema = z.enum(TESTIMONIAL_STATUSES);
const identityScopeSchema = z.enum(TESTIMONIAL_IDENTITY_SCOPES);
const channelSchema = z.enum(TESTIMONIAL_CHANNELS);
const surveyKindSchema = z.enum(TESTIMONIAL_SURVEY_KINDS);
const touchpointSchema = z.enum(TESTIMONIAL_TOUCHPOINTS);
const rewardTypeSchema = z.enum(TESTIMONIAL_REWARD_TYPES);

async function requireDb() {
  const db = await getTestimonialDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "מסד הנתונים אינו זמין" });
  return db;
}

function actorFromContext(ctx: { user?: { email?: string | null; name?: string | null } | null; teamMember?: { email?: string | null; name?: string | null } | null }) {
  return ctx.teamMember?.email || ctx.user?.email || ctx.teamMember?.name || ctx.user?.name || "team";
}

function safeMetadata(value: Record<string, unknown> | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}

async function appendEvent(input: {
  db: Awaited<ReturnType<typeof requireDb>>;
  recordId: number;
  eventType: typeof testimonialEvents.$inferInsert.eventType;
  actorType: typeof testimonialEvents.$inferInsert.actorType;
  actorRef?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await input.db.insert(testimonialEvents).values({
    recordId: input.recordId,
    eventType: input.eventType,
    actorType: input.actorType,
    actorRef: input.actorRef || null,
    metadata: safeMetadata(input.metadata),
    createdAt: Date.now(),
  });
}

async function getRecordById(id: number) {
  const db = await requireDb();
  const [record] = await db.select().from(testimonialRecords).where(eq(testimonialRecords.id, id)).limit(1);
  if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "רשומת המשוב לא נמצאה" });
  return { db, record };
}

async function getRecordByToken(token: string) {
  const db = await requireDb();
  const [record] = await db.select().from(testimonialRecords).where(eq(testimonialRecords.publicToken, token)).limit(1);
  if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "הקישור אינו תקין או אינו פעיל" });
  if (record.status === "archived") throw new TRPCError({ code: "NOT_FOUND", message: "הקישור אינו פעיל" });
  return { db, record };
}

const submissionSchema = z.object({
  token: z.string().length(64),
  rating: z.number().int().min(1).max(5).optional(),
  npsScore: z.number().int().min(0).max(10).optional(),
  feedbackText: z.string().trim().min(2).max(5000),
  secondaryText: z.string().trim().max(5000).optional(),
  improvementText: z.string().trim().max(3000).optional(),
  testimonialText: z.string().trim().max(5000).optional(),
  identityScope: identityScopeSchema.default("anonymous"),
  consentText: z.boolean().default(false),
  consentPhoto: z.boolean().default(false),
  consentVideo: z.boolean().default(false),
  allowedChannels: z.array(channelSchema).max(TESTIMONIAL_CHANNELS.length).default([]),
  allowSpellingEdits: z.boolean().default(false),
  allowMaterialEdits: z.boolean().default(false),
}).superRefine((value, ctx) => {
  const anyConsent = value.consentText || value.consentPhoto || value.consentVideo;
  if (anyConsent && value.allowedChannels.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["allowedChannels"], message: "יש לבחור לפחות ערוץ שימוש אחד" });
  }
  if (value.consentText && !(value.testimonialText || "").trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["testimonialText"], message: "יש לכתוב את הטקסט שמותר לפרסום" });
  }
  if (value.identityScope === "full_name_photo" && !value.consentPhoto) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["consentPhoto"], message: "פרסום עם תמונה דורש אישור מפורש לתמונה" });
  }
});

export const testimonialRouter = router({
  team: router({
    stats: teamProcedure.query(async () => {
      const db = await requireDb();
      const rows = await db.select({
        status: testimonialRecords.status,
        proofType: testimonialRecords.proofType,
        sourceType: testimonialRecords.sourceType,
        surveyKind: testimonialRecords.surveyKind,
        touchpoint: testimonialRecords.touchpoint,
        rewardType: testimonialRecords.rewardType,
        requestSentAt: testimonialRecords.requestSentAt,
        rewardGrantedAt: testimonialRecords.rewardGrantedAt,
        consentText: testimonialRecords.consentText,
        consentPhoto: testimonialRecords.consentPhoto,
        consentVideo: testimonialRecords.consentVideo,
      }).from(testimonialRecords);
      const byStatus = Object.fromEntries(TESTIMONIAL_STATUSES.map(status => [status, 0])) as Record<string, number>;
      const byProofType = Object.fromEntries(TESTIMONIAL_PROOF_TYPES.map(type => [type, 0])) as Record<string, number>;
      const bySourceType = Object.fromEntries(TESTIMONIAL_SOURCE_TYPES.map(type => [type, 0])) as Record<string, number>;
      const bySurveyKind = Object.fromEntries(TESTIMONIAL_SURVEY_KINDS.map(type => [type, 0])) as Record<string, number>;
      const byTouchpoint = Object.fromEntries(TESTIMONIAL_TOUCHPOINTS.map(type => [type, 0])) as Record<string, number>;
      for (const row of rows) {
        byStatus[row.status] += 1;
        byProofType[row.proofType] += 1;
        bySourceType[row.sourceType] += 1;
        bySurveyKind[row.surveyKind] += 1;
        byTouchpoint[row.touchpoint] += 1;
      }
      return {
        total: rows.length,
        byStatus,
        byProofType,
        bySourceType,
        bySurveyKind,
        byTouchpoint,
        requestsSent: rows.filter(row => Boolean(row.requestSentAt)).length,
        rewardsGranted: rows.filter(row => row.rewardType !== "none" && Boolean(row.rewardGrantedAt)).length,
        withTextConsent: rows.filter(row => row.consentText).length,
        withPhotoConsent: rows.filter(row => row.consentPhoto).length,
        withVideoConsent: rows.filter(row => row.consentVideo).length,
      };
    }),

    list: teamProcedure.input(z.object({
      status: statusSchema.optional(),
      proofType: proofTypeSchema.optional(),
      sourceType: sourceTypeSchema.optional(),
      surveyKind: surveyKindSchema.optional(),
      touchpoint: touchpointSchema.optional(),
      search: z.string().trim().max(150).optional(),
      limit: z.number().int().min(1).max(250).default(100),
    }).optional()).query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.status) conditions.push(eq(testimonialRecords.status, input.status));
      if (input?.proofType) conditions.push(eq(testimonialRecords.proofType, input.proofType));
      if (input?.sourceType) conditions.push(eq(testimonialRecords.sourceType, input.sourceType));
      if (input?.surveyKind) conditions.push(eq(testimonialRecords.surveyKind, input.surveyKind));
      if (input?.touchpoint) conditions.push(eq(testimonialRecords.touchpoint, input.touchpoint));
      if (input?.search) {
        const search = `%${input.search}%`;
        conditions.push(or(
          like(testimonialRecords.contactName, search),
          like(testimonialRecords.contactEmail, search),
          like(testimonialRecords.testimonialTextApproved, search),
          like(testimonialRecords.feedbackText, search),
        )!);
      }
      const rows = await db.select().from(testimonialRecords)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(testimonialRecords.updatedAt))
        .limit(input?.limit ?? 100);
      const recordIds = rows.map(row => row.id);
      const mediaRows = recordIds.length
        ? await db.select().from(testimonialMedia).where(inArray(testimonialMedia.recordId, recordIds))
        : [];
      const usageRows = recordIds.length
        ? await db.select().from(testimonialUsage).where(inArray(testimonialUsage.recordId, recordIds))
        : [];
      return rows.map(record => ({
        ...record,
        media: mediaRows.filter(media => media.recordId === record.id),
        usage: usageRows.filter(usage => usage.recordId === record.id),
        publicFormPath: `/testimonial/feedback?token=${record.publicToken}`,
      }));
    }),

    automationOverview: teamProcedure.query(async () => {
      const db = await requireDb();
      const [settings] = await db.select().from(feedbackAutomationSettings)
        .where(eq(feedbackAutomationSettings.settingName, "default"))
        .limit(1);
      const rows = await db.select({
        status: testimonialRecords.status,
        scheduledAt: testimonialRecords.scheduledAt,
        requestSentAt: testimonialRecords.requestSentAt,
        deliveryChannel: testimonialRecords.deliveryChannel,
        touchpoint: testimonialRecords.touchpoint,
      }).from(testimonialRecords);
      return {
        settings: settings ?? null,
        queued: rows.filter(row => row.deliveryChannel === "email" && row.status === "approved_to_contact" && !row.requestSentAt).length,
        scheduled: rows.filter(row => Boolean(row.scheduledAt) && !row.requestSentAt).length,
        sent: rows.filter(row => Boolean(row.requestSentAt)).length,
        byTouchpoint: Object.fromEntries(TESTIMONIAL_TOUCHPOINTS.map(touchpoint => [touchpoint, rows.filter(row => row.touchpoint === touchpoint).length])),
      };
    }),

    satisfactionSamplePreview: teamProcedure.input(z.object({
      sampleSize: z.number().int().min(10).max(250).default(60),
    }).optional()).query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        id: singles.id,
        email: singles.email,
        createdAt: singles.createdAt,
      }).from(singles).where(and(
        eq(singles.isActive, true),
        eq(singles.isSeed, false),
        eq(singles.consentEmailMarketing, true),
        isNotNull(singles.email),
      ));
      const now = Date.now();
      const seen = new Set<string>();
      const eligible = rows.filter(row => {
        const email = normalizeTestimonialEmail(row.email || "");
        if (!email || seen.has(email) || isPermanentlyBlockedEmail(email)) return false;
        seen.add(email);
        return true;
      });
      const buckets = [
        { key: "under_14_days", label: "עד שבועיים", min: 0, max: 14 },
        { key: "days_14_30", label: "שבועיים עד חודש", min: 14, max: 31 },
        { key: "days_31_60", label: "חודש עד חודשיים", min: 31, max: 61 },
        { key: "over_60_days", label: "מעל חודשיים", min: 61, max: Number.POSITIVE_INFINITY },
      ];
      const requested = Math.min(input?.sampleSize ?? 60, eligible.length);
      const basePerBucket = Math.floor(requested / buckets.length);
      let remaining = requested;
      const breakdown = buckets.map((bucket, index) => {
        const available = eligible.filter(row => {
          const created = Number(row.createdAt || 0);
          const tenureDays = Math.max(0, (now - created) / 86_400_000);
          return tenureDays >= bucket.min && tenureDays < bucket.max;
        }).length;
        const suggested = index === buckets.length - 1 ? Math.min(available, remaining) : Math.min(available, basePerBucket);
        remaining -= suggested;
        return { key: bucket.key, label: bucket.label, available, suggested };
      });
      return { eligible: eligible.length, requested, breakdown, createsNothing: true };
    }),

    prepareHistoricalDrafts: teamProcedure.mutation(async () => {
      return prepareHistoricalMatchDrafts({ execute: true });
    }),

    prepareSatisfactionDrafts: teamProcedure.input(z.object({
      sampleSize: z.number().int().min(10).max(250).default(60),
    })).mutation(async ({ input }) => {
      return prepareSatisfactionSurveyDrafts({ execute: true, sampleSize: input.sampleSize });
    }),

    getById: teamProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const { db, record } = await getRecordById(input.id);
      const [media, usage, events] = await Promise.all([
        db.select().from(testimonialMedia).where(eq(testimonialMedia.recordId, input.id)).orderBy(desc(testimonialMedia.createdAt)),
        db.select().from(testimonialUsage).where(eq(testimonialUsage.recordId, input.id)).orderBy(desc(testimonialUsage.createdAt)),
        db.select().from(testimonialEvents).where(eq(testimonialEvents.recordId, input.id)).orderBy(desc(testimonialEvents.createdAt)),
      ]);
      return { record, media, usage, events, publicFormPath: `/testimonial/feedback?token=${record.publicToken}` };
    }),

    createDraft: teamProcedure.input(z.object({
      proofType: proofTypeSchema,
      sourceType: sourceTypeSchema,
      surveyKind: surveyKindSchema.default("positive_experience"),
      touchpoint: touchpointSchema.default("manual"),
      deliveryChannel: z.enum(["email", "onsite", "manual"]).default("manual"),
      rewardType: rewardTypeSchema.default("none"),
      requestKey: z.string().trim().max(191).optional(),
      contactName: z.string().trim().min(2).max(150),
      contactEmail: z.string().trim().email().max(320),
      contactPhone: z.string().trim().max(30).optional(),
      singleId: z.number().int().positive().optional(),
      crmLeadId: z.number().int().positive().optional(),
      matchId: z.number().int().positive().optional(),
      sourceSnapshot: z.record(z.string(), z.unknown()).optional(),
      draftSubject: z.string().trim().max(500).optional(),
      draftBody: z.string().trim().max(5000).optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = Date.now();
      const draft = buildTestimonialDraft({ firstName: input.contactName, sourceType: input.sourceType, surveyKind: input.surveyKind });
      const result = await db.insert(testimonialRecords).values({
        publicToken: crypto.randomBytes(32).toString("hex"),
        requestKey: input.requestKey || null,
        surveyKind: input.surveyKind,
        touchpoint: input.touchpoint,
        deliveryChannel: input.deliveryChannel,
        status: "draft",
        proofType: input.proofType,
        sourceType: input.sourceType,
        singleId: input.singleId || null,
        crmLeadId: input.crmLeadId || null,
        matchId: input.matchId || null,
        contactName: input.contactName,
        contactEmail: normalizeTestimonialEmail(input.contactEmail),
        contactPhone: input.contactPhone || null,
        sourceSnapshot: input.sourceSnapshot ? JSON.stringify(input.sourceSnapshot) : null,
        draftSubject: input.draftSubject || draft.subject,
        draftBody: input.draftBody || draft.body,
        rewardType: input.surveyKind === "positive_experience" ? input.rewardType : "none",
        incentiveDisclosureRequired: input.surveyKind === "positive_experience" && input.rewardType !== "none",
        createdAt: now,
        updatedAt: now,
      });
      const recordId = Number((result[0] as { insertId?: number }).insertId);
      await appendEvent({ db, recordId, eventType: "created", actorType: "team", actorRef: actorFromContext(ctx) });
      return { id: recordId, status: "draft" as const };
    }),

    syncMatchCandidates: teamProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      const singleA = alias(singles, "testimonial_single_a");
      const singleB = alias(singles, "testimonial_single_b");
      const rows = await db.select({
        matchId: matches.id,
        detailStatus: matches.matchDetailStatus,
        notes: matches.notes,
        singleAId: matches.singleAId,
        singleAFirstName: singleA.firstName,
        singleALastName: singleA.lastName,
        singleAEmail: singleA.email,
        singleAPhone: singleA.phone,
        singleAIsSeed: singleA.isSeed,
        singleAEmailConsent: singleA.consentEmailMarketing,
        singleBId: matches.singleBId,
        singleBFirstName: singleB.firstName,
        singleBLastName: singleB.lastName,
        singleBEmail: singleB.email,
        singleBPhone: singleB.phone,
        singleBIsSeed: singleB.isSeed,
        singleBEmailConsent: singleB.consentEmailMarketing,
      }).from(matches)
        .leftJoin(singleA, eq(matches.singleAId, singleA.id))
        .leftJoin(singleB, eq(matches.singleBId, singleB.id))
        .where(or(
          inArray(matches.matchDetailStatus, ["dating", "met", "together"]),
          like(matches.notes, '%"status":"date_scheduled"%'),
          like(matches.notes, '%"status":"met"%'),
          like(matches.notes, '%"status":"continuing"%'),
          like(matches.notes, '%"status":"relationship"%'),
        ));

      const existing = await db.select({ matchId: testimonialRecords.matchId, singleId: testimonialRecords.singleId })
        .from(testimonialRecords)
        .where(eq(testimonialRecords.sourceType, "match"));
      const existingKeys = new Set(existing.filter(row => row.matchId && row.singleId).map(row => `${row.matchId}:${row.singleId}`));

      const candidates: Array<{
        matchId: number;
        singleId: number;
        name: string;
        email: string;
        phone: string | null;
        consentEmailMarketing: boolean;
        feedback: ReturnType<typeof parseMatchOutcomeNotes>["participantA"];
        detailStatus: string | null;
        outcome: ReturnType<typeof parseMatchOutcomeNotes>;
      }> = [];

      for (const row of rows) {
        const outcome = parseMatchOutcomeNotes(row.notes);
        const sides = [
          { singleId: row.singleAId, firstName: row.singleAFirstName, lastName: row.singleALastName, email: row.singleAEmail, phone: row.singleAPhone, isSeed: row.singleAIsSeed, consentEmailMarketing: row.singleAEmailConsent, feedback: outcome.participantA },
          { singleId: row.singleBId, firstName: row.singleBFirstName, lastName: row.singleBLastName, email: row.singleBEmail, phone: row.singleBPhone, isSeed: row.singleBIsSeed, consentEmailMarketing: row.singleBEmailConsent, feedback: outcome.participantB },
        ];
        for (const side of sides) {
          if (!side.singleId || !side.email || side.isSeed) continue;
          if (!isEligibleMatchCandidate({ detailStatus: row.detailStatus, outcome, feedback: side.feedback })) continue;
          candidates.push({
            matchId: row.matchId,
            singleId: side.singleId,
            name: [side.firstName, side.lastName].filter(Boolean).join(" ").trim() || "חבר/ת מאגר",
            email: side.email,
            phone: side.phone || null,
            consentEmailMarketing: Boolean(side.consentEmailMarketing),
            feedback: side.feedback,
            detailStatus: row.detailStatus,
            outcome,
          });
        }
      }

      let created = 0;
      let skippedExisting = 0;
      for (const candidate of candidates) {
        const key = `${candidate.matchId}:${candidate.singleId}`;
        if (existingKeys.has(key)) { skippedExisting += 1; continue; }
        const draft = buildTestimonialDraft({ firstName: candidate.name, sourceType: "match" });
        const now = Date.now();
        const proofType = matchCandidateProofType({ detailStatus: candidate.detailStatus, feedback: candidate.feedback });
        const result = await db.insert(testimonialRecords).values({
          publicToken: crypto.randomBytes(32).toString("hex"),
          requestKey: `match-outcome:${candidate.matchId}:${candidate.singleId}`,
          surveyKind: "positive_experience",
          touchpoint: "manual",
          deliveryChannel: "manual",
          status: "candidate",
          proofType,
          sourceType: "match",
          singleId: candidate.singleId,
          matchId: candidate.matchId,
          contactName: candidate.name,
          contactEmail: normalizeTestimonialEmail(candidate.email),
          contactPhone: candidate.phone,
          sourceSnapshot: JSON.stringify({
            candidateReason: matchCandidateReason({ detailStatus: candidate.detailStatus, feedback: candidate.feedback }),
            matchDetailStatus: candidate.detailStatus,
            participantStatus: candidate.feedback?.status || null,
            teamVerifiedOutcome: Boolean(candidate.outcome.adminVerifiedAt),
            consentEmailMarketing: candidate.consentEmailMarketing,
          }),
          draftSubject: draft.subject,
          draftBody: draft.body,
          rewardType: "date_map",
          incentiveDisclosureRequired: true,
          createdAt: now,
          updatedAt: now,
        });
        const recordId = Number((result[0] as { insertId?: number }).insertId);
        await appendEvent({ db, recordId, eventType: "candidate_generated", actorType: "team", actorRef: actorFromContext(ctx), metadata: { source: "existing_match_outcome" } });
        existingKeys.add(key);
        created += 1;
      }
      return { eligible: candidates.length, created, skippedExisting, sent: 0 };
    }),

    update: teamProcedure.input(z.object({
      id: z.number().int().positive(),
      proofType: proofTypeSchema.optional(),
      sourceType: sourceTypeSchema.optional(),
      draftSubject: z.string().trim().max(500).nullable().optional(),
      draftBody: z.string().trim().max(5000).nullable().optional(),
      testimonialTextApproved: z.string().trim().max(5000).nullable().optional(),
      identityScope: identityScopeSchema.optional(),
    })).mutation(async ({ input }) => {
      const { db } = await getRecordById(input.id);
      const { id, ...fields } = input;
      await db.update(testimonialRecords).set({ ...fields, updatedAt: Date.now() }).where(eq(testimonialRecords.id, id));
      return { success: true };
    }),

    approveContact: teamProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const { db, record } = await getRecordById(input.id);
      if (!["draft", "candidate"].includes(record.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "הרשומה אינה ממתינה לאישור פנייה" });
      const now = Date.now();
      await db.update(testimonialRecords).set({
        status: "approved_to_contact",
        requestApprovedAt: now,
        requestApprovedBy: actorFromContext(ctx),
        updatedAt: now,
      }).where(eq(testimonialRecords.id, input.id));
      await appendEvent({ db, recordId: input.id, eventType: "contact_approved", actorType: "team", actorRef: actorFromContext(ctx) });
      return { success: true, note: "הפנייה אושרה אך לא נשלחה" };
    }),

    markSent: teamProcedure.input(z.object({ id: z.number().int().positive(), channel: z.enum(["email", "whatsapp", "phone", "personal_area"]) })).mutation(async ({ input, ctx }) => {
      const { db, record } = await getRecordById(input.id);
      if (record.status !== "approved_to_contact") throw new TRPCError({ code: "BAD_REQUEST", message: "יש לאשר את הפנייה לפני סימון שליחה" });
      const now = Date.now();
      await db.update(testimonialRecords).set({ status: "sent", requestSentAt: now, updatedAt: now }).where(eq(testimonialRecords.id, input.id));
      await appendEvent({ db, recordId: input.id, eventType: "request_marked_sent", actorType: "team", actorRef: actorFromContext(ctx), metadata: { channel: input.channel } });
      return { success: true };
    }),

    verify: teamProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const { db, record } = await getRecordById(input.id);
      if (!["submitted", "awaiting_consent", "awaiting_verification"].includes(record.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "אין משוב שממתין לאימות" });
      }
      const now = Date.now();
      await db.update(testimonialRecords).set({ teamVerifiedAt: now, teamVerifiedBy: actorFromContext(ctx), status: "awaiting_verification", updatedAt: now }).where(eq(testimonialRecords.id, input.id));
      await appendEvent({ db, recordId: input.id, eventType: "team_verified", actorType: "team", actorRef: actorFromContext(ctx) });
      return { success: true };
    }),

    approve: teamProcedure.input(z.object({ id: z.number().int().positive(), approvedText: z.string().trim().max(5000).optional() })).mutation(async ({ input, ctx }) => {
      const { db, record } = await getRecordById(input.id);
      const approvedText = (input.approvedText || record.testimonialTextApproved || record.testimonialTextOriginal || "").trim();
      const hasAnyChannel = TESTIMONIAL_CHANNELS.some(channel => consentAllowsChannel(record, channel));
      const hasAnyAssetConsent = record.consentText || record.consentPhoto || record.consentVideo;
      if (!record.teamVerifiedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "נדרש אימות צוות לפני אישור" });
      if (!record.consentConfirmedAt || !hasAnyChannel || !hasAnyAssetConsent) throw new TRPCError({ code: "BAD_REQUEST", message: "אין הצהרת שימוש מלאה ופעילה" });
      if (record.consentText && !approvedText) throw new TRPCError({ code: "BAD_REQUEST", message: "חסר טקסט מאושר" });
      const now = Date.now();
      await db.update(testimonialRecords).set({
        testimonialTextApproved: approvedText || null,
        status: "approved",
        teamApprovedAt: now,
        teamApprovedBy: actorFromContext(ctx),
        updatedAt: now,
      }).where(eq(testimonialRecords.id, input.id));
      await appendEvent({ db, recordId: input.id, eventType: "approved", actorType: "team", actorRef: actorFromContext(ctx) });
      return { success: true };
    }),

    recordUsage: teamProcedure.input(z.object({
      id: z.number().int().positive(),
      channel: channelSchema,
      mediaId: z.number().int().positive().optional(),
      format: z.string().trim().max(100).optional(),
      placement: z.string().trim().max(255).optional(),
      campaignName: z.string().trim().max(255).optional(),
      publicUrl: z.string().url().max(2000).optional(),
    })).mutation(async ({ input, ctx }) => {
      const { db, record } = await getRecordById(input.id);
      if (!["approved", "published"].includes(record.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "העדות אינה מאושרת לפרסום" });
      if (!consentAllowsChannel(record, input.channel)) throw new TRPCError({ code: "FORBIDDEN", message: "הערוץ אינו כלול בהצהרת השימוש" });
      if (input.mediaId) {
        const [media] = await db.select().from(testimonialMedia).where(and(eq(testimonialMedia.id, input.mediaId), eq(testimonialMedia.recordId, input.id))).limit(1);
        if (!media || media.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "המדיה אינה מאושרת" });
        if (!mediaConsentAllows(record, media.mediaType)) throw new TRPCError({ code: "FORBIDDEN", message: "סוג המדיה אינו כלול בהצהרת השימוש" });
      }
      const now = Date.now();
      const result = await db.insert(testimonialUsage).values({
        recordId: input.id,
        mediaId: input.mediaId || null,
        channel: input.channel,
        format: input.format || null,
        placement: input.placement || null,
        campaignName: input.campaignName || null,
        publicUrl: input.publicUrl || null,
        approvedCopySnapshot: record.testimonialTextApproved,
        publishedAt: now,
        createdBy: actorFromContext(ctx),
        createdAt: now,
      });
      await db.update(testimonialRecords).set({ status: "published", publishedAt: record.publishedAt || now, updatedAt: now }).where(eq(testimonialRecords.id, input.id));
      await appendEvent({ db, recordId: input.id, eventType: "published", actorType: "team", actorRef: actorFromContext(ctx), metadata: { channel: input.channel } });
      return { id: Number((result[0] as { insertId?: number }).insertId) };
    }),

    removeUsage: teamProcedure.input(z.object({ id: z.number().int().positive(), usageId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const { db } = await getRecordById(input.id);
      const now = Date.now();
      await db.update(testimonialUsage).set({ removedAt: now }).where(and(eq(testimonialUsage.id, input.usageId), eq(testimonialUsage.recordId, input.id)));
      const active = await db.select({ id: testimonialUsage.id }).from(testimonialUsage).where(and(eq(testimonialUsage.recordId, input.id), isNull(testimonialUsage.removedAt))).limit(1);
      if (active.length === 0) await db.update(testimonialRecords).set({ status: "approved", updatedAt: now }).where(eq(testimonialRecords.id, input.id));
      await appendEvent({ db, recordId: input.id, eventType: "usage_removed", actorType: "team", actorRef: actorFromContext(ctx) });
      return { success: true };
    }),

    revoke: teamProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().trim().max(1000).optional() })).mutation(async ({ input, ctx }) => {
      const { db } = await getRecordById(input.id);
      const now = Date.now();
      await db.update(testimonialRecords).set({
        status: "revoked",
        consentRevokedAt: now,
        consentText: false,
        consentPhoto: false,
        consentVideo: false,
        allowWebsite: false,
        allowOrganicSocial: false,
        allowEmail: false,
        allowPaidAds: false,
        allowPr: false,
        updatedAt: now,
      }).where(eq(testimonialRecords.id, input.id));
      await db.update(testimonialMedia).set({ status: "revoked", updatedAt: now }).where(eq(testimonialMedia.recordId, input.id));
      await appendEvent({ db, recordId: input.id, eventType: "consent_revoked", actorType: "team", actorRef: actorFromContext(ctx), metadata: { reasonProvided: Boolean(input.reason) } });
      return { success: true };
    }),

    mediaUrl: teamProcedure.input(z.object({ id: z.number().int().positive(), mediaId: z.number().int().positive() })).mutation(async ({ input }) => {
      const { db } = await getRecordById(input.id);
      const [media] = await db.select().from(testimonialMedia)
        .where(and(eq(testimonialMedia.id, input.mediaId), eq(testimonialMedia.recordId, input.id)))
        .limit(1);
      if (!media || media.status === "revoked") throw new TRPCError({ code: "NOT_FOUND", message: "הקובץ אינו זמין" });
      return { url: await storageGetSignedUrl(media.storageKey), mediaType: media.mediaType, fileName: media.originalFileName };
    }),

    reviewMedia: teamProcedure.input(z.object({
      id: z.number().int().positive(),
      mediaId: z.number().int().positive(),
      decision: z.enum(["approved", "rejected"]),
      reason: z.string().trim().max(1000).optional(),
    })).mutation(async ({ input, ctx }) => {
      const { db } = await getRecordById(input.id);
      const [media] = await db.select().from(testimonialMedia)
        .where(and(eq(testimonialMedia.id, input.mediaId), eq(testimonialMedia.recordId, input.id)))
        .limit(1);
      if (!media || media.status === "revoked") throw new TRPCError({ code: "NOT_FOUND", message: "הקובץ אינו זמין" });
      const now = Date.now();
      await db.update(testimonialMedia).set(input.decision === "approved" ? {
        status: "approved",
        approvedAt: now,
        approvedBy: actorFromContext(ctx),
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        updatedAt: now,
      } : {
        status: "rejected",
        rejectedAt: now,
        rejectedBy: actorFromContext(ctx),
        rejectionReason: input.reason || "לא אושר לשימוש",
        approvedAt: null,
        approvedBy: null,
        updatedAt: now,
      }).where(eq(testimonialMedia.id, input.mediaId));
      await appendEvent({ db, recordId: input.id, eventType: "consent_updated", actorType: "team", actorRef: actorFromContext(ctx), metadata: { mediaId: input.mediaId, decision: input.decision } });
      return { success: true };
    }),

    archive: teamProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const { db } = await getRecordById(input.id);
      const now = Date.now();
      await db.update(testimonialRecords).set({ status: "archived", archivedAt: now, updatedAt: now }).where(eq(testimonialRecords.id, input.id));
      await appendEvent({ db, recordId: input.id, eventType: "archived", actorType: "team", actorRef: actorFromContext(ctx) });
      return { success: true };
    }),
  }),

  public: router({
    form: publicProcedure.input(z.object({ token: z.string().length(64) })).query(async ({ input }) => {
      const { db, record } = await getRecordByToken(input.token);
      const media = await db.select({
        id: testimonialMedia.id,
        mediaType: testimonialMedia.mediaType,
        originalFileName: testimonialMedia.originalFileName,
        byteSize: testimonialMedia.byteSize,
        status: testimonialMedia.status,
      }).from(testimonialMedia).where(eq(testimonialMedia.recordId, record.id));
      return {
        displayName: publicDisplayName(record.contactName),
        sourceType: record.sourceType,
        proofType: record.proofType,
        surveyKind: record.surveyKind,
        touchpoint: record.touchpoint,
        status: record.status,
        questions: publicQuestionsForSource(record.sourceType, record.surveyKind),
        canSubmit: !["submitted", "approved", "published", "revoked", "archived"].includes(record.status),
        consentVersion: TESTIMONIAL_CONSENT_VERSION,
        rewardType: record.rewardType,
        rewardGranted: Boolean(record.rewardGrantedAt),
        rewardPath: record.rewardGrantedAt && record.rewardType === "date_map" ? `/testimonial/reward?token=${record.publicToken}` : null,
        hasActiveConsent: Boolean(record.consentConfirmedAt && !record.consentRevokedAt && (record.consentText || record.consentPhoto || record.consentVideo)),
        media: media.filter(item => item.status !== "revoked"),
      };
    }),

    trackOpen: publicProcedure.input(z.object({ token: z.string().length(64) })).mutation(async ({ input }) => {
      const { db, record } = await getRecordByToken(input.token);
      await appendEvent({ db, recordId: record.id, eventType: "form_opened", actorType: "customer" });
      return { success: true };
    }),

    submit: publicProcedure.input(submissionSchema).mutation(async ({ input }) => {
      const { db, record } = await getRecordByToken(input.token);
      if (["approved", "published", "revoked", "archived"].includes(record.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "לא ניתן לעדכן את הטופס במצב הנוכחי" });
      const isSatisfactionSurvey = record.surveyKind === "satisfaction_survey";
      const allowedChannels = isSatisfactionSurvey ? [] : Array.from(new Set(input.allowedChannels));
      const anyConsent = isSatisfactionSurvey ? false : input.consentText || input.consentPhoto || input.consentVideo;
      const now = Date.now();
      const status = isSatisfactionSurvey ? "submitted" : deriveSubmissionStatus({
        testimonialText: input.testimonialText,
        consentText: isSatisfactionSurvey ? false : input.consentText,
        consentPhoto: isSatisfactionSurvey ? false : input.consentPhoto,
        consentVideo: isSatisfactionSurvey ? false : input.consentVideo,
        allowedChannels,
      });
      const rewardGrantedAt = resolveFeedbackRewardGrant({
        surveyKind: record.surveyKind,
        rewardType: record.rewardType,
        existingGrantedAt: record.rewardGrantedAt,
        now,
      });
      await db.update(testimonialRecords).set({
        rating: input.rating ?? null,
        npsScore: input.npsScore ?? null,
        feedbackText: input.feedbackText,
        structuredAnswers: input.secondaryText ? JSON.stringify({ secondaryText: input.secondaryText }) : null,
        improvementText: input.improvementText || null,
        testimonialTextOriginal: isSatisfactionSurvey ? null : input.testimonialText || null,
        identityScope: input.identityScope,
        consentText: isSatisfactionSurvey ? false : input.consentText,
        consentPhoto: isSatisfactionSurvey ? false : input.consentPhoto,
        consentVideo: isSatisfactionSurvey ? false : input.consentVideo,
        allowWebsite: allowedChannels.includes("website"),
        allowOrganicSocial: allowedChannels.includes("organic_social"),
        allowEmail: allowedChannels.includes("email"),
        allowPaidAds: allowedChannels.includes("paid_ads"),
        allowPr: allowedChannels.includes("pr"),
        allowSpellingEdits: input.allowSpellingEdits,
        allowMaterialEdits: input.allowMaterialEdits,
        consentVersion: anyConsent ? TESTIMONIAL_CONSENT_VERSION : null,
        consentConfirmedAt: anyConsent ? now : null,
        consentRevokedAt: null,
        rewardGrantedAt,
        status,
        lastResponseAt: now,
        updatedAt: now,
      }).where(eq(testimonialRecords.id, record.id));
      await appendEvent({ db, recordId: record.id, eventType: "feedback_submitted", actorType: "customer", metadata: { hasTestimonialText: Boolean(input.testimonialText), status } });
      if (anyConsent) await appendEvent({ db, recordId: record.id, eventType: "consent_granted", actorType: "customer", metadata: { consentVersion: TESTIMONIAL_CONSENT_VERSION, channels: allowedChannels } });
      return {
        success: true,
        status,
        rewardPath: rewardGrantedAt && record.rewardType === "date_map" ? `/testimonial/reward?token=${record.publicToken}` : null,
      };
    }),

    reward: publicProcedure.input(z.object({ token: z.string().length(64) })).mutation(async ({ input }) => {
      const { db, record } = await getRecordByToken(input.token);
      if (!record.rewardGrantedAt || record.rewardType !== "date_map") {
        throw new TRPCError({ code: "FORBIDDEN", message: "המתנה עדיין אינה זמינה" });
      }
      if (!record.rewardViewedAt) {
        const now = Date.now();
        await db.update(testimonialRecords).set({ rewardViewedAt: now, updatedAt: now }).where(eq(testimonialRecords.id, record.id));
      }
      return { rewardType: "date_map" as const, grantedAt: record.rewardGrantedAt };
    }),

    revoke: publicProcedure.input(z.object({ token: z.string().length(64) })).mutation(async ({ input }) => {
      const { db, record } = await getRecordByToken(input.token);
      const now = Date.now();
      await db.update(testimonialRecords).set({
        status: "revoked",
        consentRevokedAt: now,
        consentText: false,
        consentPhoto: false,
        consentVideo: false,
        allowWebsite: false,
        allowOrganicSocial: false,
        allowEmail: false,
        allowPaidAds: false,
        allowPr: false,
        updatedAt: now,
      }).where(eq(testimonialRecords.id, record.id));
      await db.update(testimonialMedia).set({ status: "revoked", updatedAt: now }).where(eq(testimonialMedia.recordId, record.id));
      await appendEvent({ db, recordId: record.id, eventType: "consent_revoked", actorType: "customer" });
      return { success: true };
    }),
  }),
});
