import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { crmTeamTasks, partnerSources, singles } from "../drizzle/schema";
import { getDb } from "./db";
import { router, teamProcedure } from "./_core/trpc";
import { buildPartnerTrackingUrl, canAssignTask, canEditTask } from "./operationsPolicy";

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
