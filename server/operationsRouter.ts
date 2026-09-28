import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { crmTeamTasks, discountCodes, partnerSources, singles } from "../drizzle/schema";
import { getDb } from "./db";
import { router, teamProcedure } from "./_core/trpc";
import { buildPartnerTrackingUrl, canAssignTask, canEditTask } from "./operationsPolicy";
import { DATABASE_NOW_COUPON } from "../shared/databaseHolidayNow";
import { databaseNowDueAt, databaseNowSlaState, DATABASE_NOW_TASK_CREATED_BY } from "./databaseNowFulfillment";

const TASK_TYPES = ["match_review", "followup", "call", "feedback", "profile", "plus", "partner", "event", "other"] as const;
const TASK_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const PARTNER_TYPES = ["partner", "event", "organization", "referrer"] as const;

function isAdmin(ctx: any) {
  return Boolean(ctx.user?.role === "admin" || ctx.teamMember?.role === "admin");
}

function actor(ctx: any) {
  return {
    id: ctx.teamMember?.id as number | undefined,
    label: ctx.user?.email || ctx.teamMember?.email || "system",
  };
}

async function loadTeamMembers(db: any) {
  try {
    const [rows] = await db.execute(sql`SELECT id, name, email, role FROM team_members WHERE is_active = 1 ORDER BY name`);
    return rows as Array<{ id: number; name: string; email: string; role: string }>;
  } catch {
    return [];
  }
}

export const operationsRouter = router({
  teamMembers: teamProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return loadTeamMembers(db);
  }),

  listTasks: teamProcedure
    .input(z.object({ status: z.enum(TASK_STATUSES).optional(), mineOnly: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const current = actor(ctx);
      const conditions: any[] = [];
      if (input?.status) conditions.push(eq(crmTeamTasks.status, input.status));
      if (!isAdmin(ctx) || input?.mineOnly) {
        if (current.id) conditions.push(or(isNull(crmTeamTasks.assignedTeamMemberId), eq(crmTeamTasks.assignedTeamMemberId, current.id)));
        else conditions.push(isNull(crmTeamTasks.assignedTeamMemberId));
      }
      const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
      const query = db.select({
        task: crmTeamTasks,
        single: { id: singles.id, firstName: singles.firstName, lastName: singles.lastName, email: singles.email, phone: singles.phone },
      }).from(crmTeamTasks).leftJoin(singles, eq(crmTeamTasks.singleId, singles.id));
      return where
        ? query.where(where).orderBy(desc(crmTeamTasks.priority), desc(crmTeamTasks.dueAt), desc(crmTeamTasks.createdAt))
        : query.orderBy(desc(crmTeamTasks.priority), desc(crmTeamTasks.dueAt), desc(crmTeamTasks.createdAt));
    }),

  nowSlaDashboard: teamProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { rows: [], summary: { total: 0, awaitingProfile: 0, active: 0, dueSoon: 0, overdue: 0, fulfilled: 0 }, coupon: null, generatedAt: Date.now() };

    const [rawRows] = await db.execute(sql`
      WITH now_buyers AS (
        SELECT
          LOWER(TRIM(email)) AS email_key,
          MIN(email) AS email,
          MIN(paid_at) AS paid_at,
          COUNT(*) AS payment_count,
          MAX(utm_source) AS utm_source,
          MAX(utm_campaign) AS utm_campaign
        FROM completed_payments
        WHERE product = 'database'
          AND UPPER(TRIM(COALESCE(coupon_code, ''))) = ${DATABASE_NOW_COUPON}
        GROUP BY LOWER(TRIM(email))
      ), ranked_singles AS (
        SELECT
          id,
          email,
          firstName,
          lastName,
          phone,
          isActive,
          isPaid,
          questionnaireCompletedAt,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(email))
            ORDER BY isPaid DESC, id DESC
          ) AS row_rank
        FROM singles
      ), ranked_now_tasks AS (
        SELECT
          id,
          single_id,
          status,
          priority,
          due_at,
          assigned_team_member_id,
          ROW_NUMBER() OVER (
            PARTITION BY single_id
            ORDER BY id DESC
          ) AS row_rank
        FROM crm_team_tasks
        WHERE created_by = ${DATABASE_NOW_TASK_CREATED_BY}
          AND status <> 'cancelled'
      )
      SELECT
        nb.email,
        nb.paid_at,
        nb.payment_count,
        nb.utm_source,
        nb.utm_campaign,
        s.id AS single_id,
        s.firstName AS first_name,
        s.lastName AS last_name,
        s.phone,
        s.isActive AS is_active,
        s.isPaid AS is_paid,
        s.questionnaireCompletedAt AS questionnaire_completed_at,
        t.id AS task_id,
        t.status AS task_status,
        t.priority AS task_priority,
        t.due_at AS task_due_at,
        t.assigned_team_member_id,
        tm.name AS assigned_team_member_name,
        (
          SELECT MIN(COALESCE(mde.acceptedAt, mde.attemptedAt))
          FROM match_delivery_events mde
          WHERE mde.singleId = s.id
            AND mde.status = 'accepted'
            AND s.questionnaireCompletedAt IS NOT NULL
            AND COALESCE(mde.acceptedAt, mde.attemptedAt) >= GREATEST(nb.paid_at, s.questionnaireCompletedAt)
        ) AS first_match_sent_at
      FROM now_buyers nb
      LEFT JOIN ranked_singles s ON LOWER(TRIM(s.email)) = nb.email_key AND s.row_rank = 1
      LEFT JOIN ranked_now_tasks t ON t.single_id = s.id AND t.row_rank = 1
      LEFT JOIN team_members tm ON tm.id = t.assigned_team_member_id
      ORDER BY nb.paid_at DESC
    `) as any;

    const now = Date.now();
    const rows = (rawRows || []).map((row: any) => {
      const paidAt = Number(row.paid_at || 0);
      const questionnaireCompletedAt = row.questionnaire_completed_at ? Number(row.questionnaire_completed_at) : null;
      const eligibleAt = questionnaireCompletedAt ? Math.max(paidAt, questionnaireCompletedAt) : null;
      const dueAt = row.task_due_at ? Number(row.task_due_at) : eligibleAt ? databaseNowDueAt(eligibleAt) : null;
      const firstMatchSentAt = row.first_match_sent_at ? Number(row.first_match_sent_at) : null;
      const state = databaseNowSlaState({ eligibleAt, dueAt, firstMatchSentAt }, now);
      return {
        email: String(row.email || ""),
        paidAt,
        paymentCount: Number(row.payment_count || 1),
        utmSource: row.utm_source ? String(row.utm_source) : null,
        utmCampaign: row.utm_campaign ? String(row.utm_campaign) : null,
        singleId: row.single_id ? Number(row.single_id) : null,
        firstName: row.first_name ? String(row.first_name) : null,
        lastName: row.last_name ? String(row.last_name) : null,
        phone: row.phone ? String(row.phone) : null,
        isActive: Boolean(row.is_active),
        isPaid: Boolean(row.is_paid),
        questionnaireCompletedAt,
        eligibleAt,
        dueAt,
        firstMatchSentAt,
        remainingMs: dueAt ? dueAt - now : null,
        state,
        task: row.task_id ? {
          id: Number(row.task_id),
          status: String(row.task_status),
          priority: String(row.task_priority),
          assignedTeamMemberId: row.assigned_team_member_id ? Number(row.assigned_team_member_id) : null,
          assignedTeamMemberName: row.assigned_team_member_name ? String(row.assigned_team_member_name) : null,
        } : null,
      };
    }).sort((a: any, b: any) => {
      const rank: Record<string, number> = { overdue: 0, due_soon: 1, active: 2, awaiting_profile: 3, fulfilled: 4 };
      return rank[a.state] - rank[b.state] || (a.dueAt || Number.MAX_SAFE_INTEGER) - (b.dueAt || Number.MAX_SAFE_INTEGER);
    });

    const [coupon] = await db.select({
      code: discountCodes.code,
      fixedPrice: discountCodes.fixedPrice,
      isActive: discountCodes.isActive,
      expiresAt: discountCodes.expiresAt,
      maxUses: discountCodes.maxUses,
      usedCount: discountCodes.usedCount,
    }).from(discountCodes).where(eq(discountCodes.code, DATABASE_NOW_COUPON)).limit(1);

    return {
      rows,
      summary: {
        total: rows.length,
        awaitingProfile: rows.filter((row: any) => row.state === "awaiting_profile").length,
        active: rows.filter((row: any) => row.state === "active").length,
        dueSoon: rows.filter((row: any) => row.state === "due_soon").length,
        overdue: rows.filter((row: any) => row.state === "overdue").length,
        fulfilled: rows.filter((row: any) => row.state === "fulfilled").length,
      },
      coupon: coupon || null,
      generatedAt: now,
    };
  }),

  createTask: teamProcedure
    .input(z.object({
      singleId: z.number().int().positive().optional(),
      matchId: z.number().int().positive().optional(),
      crmLeadId: z.number().int().positive().optional(),
      assignedTeamMemberId: z.number().int().positive().optional(),
      taskType: z.enum(TASK_TYPES),
      title: z.string().min(2).max(255),
      description: z.string().max(3000).optional(),
      priority: z.enum(PRIORITIES).default("normal"),
      dueAt: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const current = actor(ctx);
      if (!canAssignTask(isAdmin(ctx), current.id, input.assignedTeamMemberId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ניתן להקצות משימה רק לעצמך" });
      }
      const now = Date.now();
      await db.insert(crmTeamTasks).values({ ...input, createdBy: current.label, createdAt: now, updatedAt: now });
      return { success: true };
    }),

  updateTask: teamProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(TASK_STATUSES).optional(),
      assignedTeamMemberId: z.number().int().positive().nullable().optional(),
      priority: z.enum(PRIORITIES).optional(),
      dueAt: z.number().nullable().optional(),
      title: z.string().min(2).max(255).optional(),
      description: z.string().max(3000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [task] = await db.select().from(crmTeamTasks).where(eq(crmTeamTasks.id, input.id)).limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      const current = actor(ctx);
      if (!canEditTask(isAdmin(ctx), current.id, task.assignedTeamMemberId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "המשימה מוקצית לחבר/ת צוות אחר/ת" });
      }
      if (!canAssignTask(isAdmin(ctx), current.id, input.assignedTeamMemberId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ניתן להקצות משימה רק לעצמך" });
      }
      const { id, ...changes } = input;
      await db.update(crmTeamTasks).set({
        ...changes,
        completedAt: changes.status === "done" ? Date.now() : changes.status ? null : undefined,
        updatedAt: Date.now(),
      }).where(eq(crmTeamTasks.id, id));
      return { success: true };
    }),

  partnerOverview: teamProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { rows: [], totals: { leads: 0, purchases: 0, revenue: 0 } };
    const sources = await db.select().from(partnerSources).orderBy(desc(partnerSources.createdAt));
    const rows = await Promise.all(sources.map(async source => {
      const [metricsRows] = await db.execute(sql`
        SELECT
          (SELECT COUNT(DISTINCT cl.id)
             FROM crm_leads cl
            WHERE LOWER(COALESCE(cl.utmCampaign, '')) = LOWER(${source.code})
               OR LOWER(COALESCE(cl.utmSource, '')) = LOWER(${source.code})) AS leads,
          (SELECT COUNT(DISTINCT pl.id)
             FROM payment_leads pl
            WHERE EXISTS (
              SELECT 1 FROM crm_leads cl
               WHERE LOWER(cl.email) = LOWER(pl.email)
                 AND (LOWER(COALESCE(cl.utmCampaign, '')) = LOWER(${source.code})
                   OR LOWER(COALESCE(cl.utmSource, '')) = LOWER(${source.code}))
            )) AS purchases,
          (SELECT COALESCE(SUM(CAST(COALESCE(pl.sum, 0) AS DECIMAL(12,2))), 0)
             FROM payment_leads pl
            WHERE EXISTS (
              SELECT 1 FROM crm_leads cl
               WHERE LOWER(cl.email) = LOWER(pl.email)
                 AND (LOWER(COALESCE(cl.utmCampaign, '')) = LOWER(${source.code})
                   OR LOWER(COALESCE(cl.utmSource, '')) = LOWER(${source.code}))
            )) AS revenue
      `) as any;
      const metrics = (metricsRows as any[])[0] || {};
      return {
        source,
        leads: Number(metrics.leads || 0),
        purchases: Number(metrics.purchases || 0),
        revenue: Number(metrics.revenue || 0),
        trackingUrl: buildPartnerTrackingUrl(source.type, source.code),
      };
    }));
    return {
      rows,
      totals: {
        leads: rows.reduce((sum, row) => sum + row.leads, 0),
        purchases: rows.reduce((sum, row) => sum + row.purchases, 0),
        revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
      },
      canManage: isAdmin(ctx),
    };
  }),

  createPartnerSource: teamProcedure
    .input(z.object({
      name: z.string().min(2).max(200),
      type: z.enum(PARTNER_TYPES),
      code: z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/),
      contactName: z.string().max(150).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().max(30).optional(),
      commissionType: z.enum(["none", "fixed", "percentage"]).default("none"),
      commissionValue: z.number().int().min(0).default(0),
      eventDate: z.number().optional(),
      notes: z.string().max(3000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx)) throw new TRPCError({ code: "FORBIDDEN", message: "ניהול שותפים זמין למנהל/ת בלבד" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.insert(partnerSources).values({ ...input, code: input.code.toLowerCase(), createdAt: now, updatedAt: now });
      return { success: true };
    }),

  updatePartnerStatus: teamProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "inactive"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx)) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(partnerSources).set({ status: input.status, updatedAt: Date.now() }).where(eq(partnerSources.id, input.id));
      return { success: true };
    }),
});
