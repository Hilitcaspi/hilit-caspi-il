import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  crmLeads,
  emailLog,
  matchBoostMemberships,
  matches,
  plusPilotMembers,
  profileUpdateRequests,
  selfServiceEvents,
  singles,
} from "../drizzle/schema";
import { router, teamProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { normalizeEmail } from "./emailNormalization";
import { applyEmailUnsubscribe } from "./emailUnsubscribe";
import { hashActor, recordSelfServiceEventSafely } from "./usageMetrics";

const actionSchema = z.enum(["close_profile", "activate_profile", "correct_email", "unsubscribe_marketing"]);
type ProfileAction = z.infer<typeof actionSchema>;

function requireTeamAdmin(ctx: { user?: { role?: string; email?: string | null } | null; teamMember?: { role?: string; email?: string | null } | null }) {
  const allowed = ctx.user?.role === "admin" || ctx.teamMember?.role === "admin";
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "הפעולה דורשת הרשאת מנהל/ת" });
}

function confirmationFor(action: ProfileAction) {
  switch (action) {
    case "close_profile": return "סגירת פרופיל";
    case "activate_profile": return "הפעלת פרופיל";
    case "correct_email": return "עדכון מייל";
    case "unsubscribe_marketing": return "הסרה מדיוור";
  }
}

function maskEmail(email: string | null | undefined) {
  if (!email || !email.includes("@")) return "לא קיים";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function buildProfileActionPreview(input: {
  singleId: number;
  action: ProfileAction;
  newEmail?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const [profile] = await db.select({
    id: singles.id,
    firstName: singles.firstName,
    lastName: singles.lastName,
    email: singles.email,
    phone: singles.phone,
    isActive: singles.isActive,
    isPaid: singles.isPaid,
    consentMatchmaking: singles.consentMatchmaking,
    consentDataSharing: singles.consentDataSharing,
    consentEmailMarketing: singles.consentEmailMarketing,
    updatedAt: singles.updatedAt,
  }).from(singles).where(eq(singles.id, input.singleId)).limit(1);
  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "הפרופיל לא נמצא" });

  const [activeMatchRows, plusRows, boostRows, pendingEmailRows] = await Promise.all([
    db.select({ id: matches.id, status: matches.status }).from(matches).where(and(
      or(eq(matches.singleAId, profile.id), eq(matches.singleBId, profile.id)),
      or(eq(matches.status, "proposed"), and(eq(matches.status, "matched"), isNull(matches.returnedToPoolAt))),
    )).limit(5),
    db.select({ status: plusPilotMembers.status, billingStatus: plusPilotMembers.billingStatus })
      .from(plusPilotMembers).where(eq(plusPilotMembers.singleId, profile.id)).limit(1),
    db.select({ status: matchBoostMemberships.status })
      .from(matchBoostMemberships).where(eq(matchBoostMemberships.singleId, profile.id)).limit(1),
    profile.email
      ? db.select({ id: emailLog.id }).from(emailLog).where(and(
          sql`LOWER(TRIM(${emailLog.recipientEmail})) = ${normalizeEmail(profile.email)}`,
          inArray(emailLog.status, ["pending", "processing"]),
        )).limit(1000)
      : Promise.resolve([]),
  ]);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const plannedChanges: string[] = [];
  const plus = plusRows[0] || null;
  const boost = boostRows[0] || null;

  if (input.action === "close_profile") {
    if (!profile.isActive) blockers.push("הפרופיל כבר לא פעיל");
    if (activeMatchRows.length > 0) blockers.push("יש התאמה פעילה; יש לשחרר אותה קודם במסך ההתאמות");
    if (plus && ["active", "pending", "past_due"].includes(plus.billingStatus)) {
      blockers.push("קיים מנוי PLUS פעיל או בתהליך; יש לטפל בחיוב בנפרד לפני הסגירה");
    }
    plannedChanges.push("הוצאת הפרופיל ממאגר ההתאמות", "כיבוי הסכמות מאגר ושיתוף", "עצירת דיוור שיווקי ממתין");
    if (boost?.status === "active") plannedChanges.push("הסרת הפרופיל ממאגר Boost");
  }

  if (input.action === "activate_profile") {
    if (profile.isActive) blockers.push("הפרופיל כבר פעיל");
    if (!profile.isPaid) blockers.push("לא נמצאה זכאות מאגר פעילה");
    if (activeMatchRows.length > 0) blockers.push("קיימת התאמה פעילה; יש לבדוק אותה לפני ההפעלה");
    if (!profile.consentMatchmaking || !profile.consentDataSharing) {
      warnings.push("הפרופיל יופעל, אך לא ייכנס להצעות עד לקבלת הסכמות מאגר ושיתוף");
    }
    plannedChanges.push("הפעלת הפרופיל בלבד; הסכמה שיווקית לא תופעל מחדש");
  }

  if (input.action === "correct_email") {
    const normalized = normalizeEmail(input.newEmail || "");
    if (!normalized || !normalized.includes("@")) blockers.push("כתובת המייל החדשה אינה תקינה");
    if (normalized && profile.email && normalized === normalizeEmail(profile.email)) blockers.push("זו כבר כתובת המייל הנוכחית");
    if (normalized) {
      const duplicate = await db.select({ id: singles.id }).from(singles)
        .where(and(sql`LOWER(TRIM(${singles.email})) = ${normalized}`, sql`${singles.id} <> ${profile.id}`))
        .limit(1);
      if (duplicate.length > 0) blockers.push("כתובת המייל כבר משויכת לפרופיל אחר");
    }
    plannedChanges.push("עדכון כתובת הכניסה בפרופיל", "עדכון לידי CRM המקושרים לפרופיל", "ביטול מיילים ממתינים לכתובת הישנה");
  }

  if (input.action === "unsubscribe_marketing") {
    if (!profile.email) blockers.push("אין כתובת מייל בפרופיל");
    if (!profile.consentEmailMarketing) warnings.push("הפרופיל כבר מסומן כמוסר מדיוור שיווקי");
    plannedChanges.push("כיבוי הסכמה שיווקית", "סימון לידים מקושרים כמוסרים", "ביטול מיילים שיווקיים ממתינים");
  }

  return {
    profile: {
      id: profile.id,
      name: `${profile.firstName} ${profile.lastName || ""}`.trim(),
      email: profile.email,
      emailMasked: maskEmail(profile.email),
      phone: profile.phone,
      isActive: profile.isActive,
      isPaid: profile.isPaid,
      consents: {
        matchmaking: profile.consentMatchmaking,
        dataSharing: profile.consentDataSharing,
        emailMarketing: profile.consentEmailMarketing,
      },
      updatedAt: profile.updatedAt,
    },
    action: input.action,
    confirmationPhrase: confirmationFor(input.action),
    blockers,
    warnings,
    plannedChanges,
    canApply: blockers.length === 0,
    activeMatches: activeMatchRows,
    plus,
    boost,
    pendingEmails: pendingEmailRows.length,
  };
}

export const controlCenterRouter = router({
  overview: teamProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [[profileCounts], [matchCounts], [pendingUpdates], [pendingEmails], [boostCounts], [plusCounts]] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) total, SUM(CASE WHEN isActive=1 THEN 1 ELSE 0 END) active, SUM(CASE WHEN isActive=0 THEN 1 ELSE 0 END) inactive FROM singles WHERE isPaid=1 AND isSeed=0`) as any,
      db.execute(sql`SELECT COUNT(*) total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending, SUM(CASE WHEN status='proposed' THEN 1 ELSE 0 END) proposed, SUM(CASE WHEN status='matched' AND returnedToPoolAt IS NULL THEN 1 ELSE 0 END) active FROM matches`) as any,
      db.execute(sql`SELECT COUNT(*) pending FROM profile_update_requests WHERE status='pending'`) as any,
      db.execute(sql`SELECT COUNT(*) pending FROM email_log WHERE status IN ('pending','processing')`) as any,
      db.execute(sql`SELECT SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) active FROM match_boost_memberships`) as any,
      db.execute(sql`SELECT SUM(CASE WHEN status='active' AND billing_status='active' THEN 1 ELSE 0 END) active FROM plus_pilot_members`) as any,
    ]);
    return {
      profiles: {
        total: Number(profileCounts?.[0]?.total || 0),
        active: Number(profileCounts?.[0]?.active || 0),
        inactive: Number(profileCounts?.[0]?.inactive || 0),
      },
      matches: {
        total: Number(matchCounts?.[0]?.total || 0),
        pending: Number(matchCounts?.[0]?.pending || 0),
        proposed: Number(matchCounts?.[0]?.proposed || 0),
        active: Number(matchCounts?.[0]?.active || 0),
      },
      pendingProfileUpdates: Number(pendingUpdates?.[0]?.pending || 0),
      pendingEmails: Number(pendingEmails?.[0]?.pending || 0),
      activeBoostMembers: Number(boostCounts?.[0]?.active || 0),
      activePlusMembers: Number(plusCounts?.[0]?.active || 0),
    };
  }),

  searchProfiles: teamProcedure
    .input(z.object({ query: z.string().trim().min(2).max(120), limit: z.number().int().min(1).max(30).default(12) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const normalized = normalizeEmail(input.query);
      const token = `%${input.query.trim()}%`;
      return db.select({
        id: singles.id,
        firstName: singles.firstName,
        lastName: singles.lastName,
        email: singles.email,
        phone: singles.phone,
        gender: singles.gender,
        age: singles.age,
        city: singles.city,
        isActive: singles.isActive,
        isPaid: singles.isPaid,
        consentMatchmaking: singles.consentMatchmaking,
        consentDataSharing: singles.consentDataSharing,
        consentEmailMarketing: singles.consentEmailMarketing,
        updatedAt: singles.updatedAt,
      }).from(singles).where(or(
        like(singles.firstName, token),
        like(singles.lastName, token),
        like(singles.phone, token),
        sql`LOWER(TRIM(${singles.email})) LIKE ${`%${normalized}%`}`,
      )).orderBy(desc(singles.updatedAt)).limit(input.limit);
    }),

  profileActionPreview: teamProcedure
    .input(z.object({ singleId: z.number().int().positive(), action: actionSchema, newEmail: z.string().email().max(320).optional() }))
    .query(async ({ input }) => buildProfileActionPreview(input)),

  applyProfileAction: teamProcedure
    .input(z.object({
      singleId: z.number().int().positive(),
      action: actionSchema,
      newEmail: z.string().email().max(320).optional(),
      expectedUpdatedAt: z.number().optional(),
      confirmation: z.string().max(80),
      idempotencyKey: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireTeamAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const eventKey = `profile:${input.idempotencyKey}`;
      const [existingEvent] = await db.select({ id: selfServiceEvents.id })
        .from(selfServiceEvents)
        .where(eq(selfServiceEvents.eventKey, eventKey))
        .limit(1);
      if (existingEvent) return { success: true, appliedAt: null, duplicate: true as const };
      const preview = await buildProfileActionPreview(input);
      if (!preview.canApply) throw new TRPCError({ code: "PRECONDITION_FAILED", message: preview.blockers.join(" · ") });
      if (input.confirmation.trim() !== preview.confirmationPhrase) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `יש להקליד: ${preview.confirmationPhrase}` });
      }
      if (input.expectedUpdatedAt !== undefined && Number(preview.profile.updatedAt || 0) !== input.expectedUpdatedAt) {
        throw new TRPCError({ code: "CONFLICT", message: "הפרופיל השתנה מאז הבדיקה. יש לבצע בדיקה מחדש." });
      }
      const now = Date.now();

      if (input.action === "unsubscribe_marketing") {
        if (!preview.profile.email) throw new TRPCError({ code: "BAD_REQUEST", message: "אין מייל בפרופיל" });
        await applyEmailUnsubscribe({ email: preview.profile.email, singleId: input.singleId, source: "legacy_email" });
      } else {
        await db.transaction(async tx => {
          if (input.action === "close_profile") {
            await tx.update(singles).set({
              isActive: false,
              consentMatchmaking: false,
              consentDataSharing: false,
              consentEmailMarketing: false,
              updatedAt: now,
            }).where(eq(singles.id, input.singleId));
            await tx.update(matchBoostMemberships).set({ status: "removed", optedOutAt: now, updatedAt: now })
              .where(eq(matchBoostMemberships.singleId, input.singleId));
            await tx.update(crmLeads).set({ emailUnsubscribed: true, emailUnsubscribedAt: now, updatedAt: now })
              .where(eq(crmLeads.singleId, input.singleId));
            if (preview.profile.email) {
              await tx.update(emailLog).set({ status: "cancelled", sentAt: now, errorMessage: "suppressed:control_center_profile_close" })
                .where(and(
                  sql`LOWER(TRIM(${emailLog.recipientEmail})) = ${normalizeEmail(preview.profile.email)}`,
                  inArray(emailLog.status, ["pending", "processing"]),
                ));
            }
          }
          if (input.action === "activate_profile") {
            await tx.update(singles).set({ isActive: true, updatedAt: now }).where(eq(singles.id, input.singleId));
          }
          if (input.action === "correct_email") {
            const nextEmail = normalizeEmail(input.newEmail || "");
            const previousEmail = normalizeEmail(preview.profile.email || "");
            await tx.update(singles).set({ email: nextEmail, updatedAt: now }).where(eq(singles.id, input.singleId));
            await tx.update(crmLeads).set({ email: nextEmail, updatedAt: now }).where(eq(crmLeads.singleId, input.singleId));
            if (previousEmail) {
              await tx.update(emailLog).set({ status: "cancelled", sentAt: now, errorMessage: "suppressed:control_center_email_change" })
                .where(and(
                  sql`LOWER(TRIM(${emailLog.recipientEmail})) = ${previousEmail}`,
                  inArray(emailLog.status, ["pending", "processing"]),
                ));
            }
          }
        });
      }

      await recordSelfServiceEventSafely(db, {
        eventKey,
        actionKey: input.action === "close_profile"
          ? "profile.close"
          : input.action === "activate_profile"
            ? "profile.activate"
            : input.action === "correct_email"
              ? "profile.correct_email"
              : "profile.unsubscribe_marketing",
        category: "database",
        channel: "self_service",
        outcome: "completed",
        actorHash: hashActor(ctx),
        occurredAt: now,
        metadata: { mode: input.action },
      });
      return { success: true, appliedAt: now, duplicate: false as const };
    }),
});

export { actionSchema as profileActionSchema, confirmationFor as profileActionConfirmation };
