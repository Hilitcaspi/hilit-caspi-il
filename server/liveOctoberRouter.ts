import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { liveOctoberQuestions, liveOctoberTickets } from "../drizzle/schema";
import {
  LIVE_OCTOBER_SLUG, LIVE_OCTOBER_SALES_OPEN, ensurePlusLiveTicket, existingLiveTicket,
  getVerifiedLiveMember, liveTicketByReceipt, submitLiveQuestion,
} from "./liveOctober";

const memberInput = z.object({ email: z.string().email().max(320), token: z.string().min(16).max(200) });
const receiptInput = z.object({ trackingToken: z.string().regex(/^[a-f0-9]{64}$/) });

export const liveOctoberRouter = router({
  salesStatus: publicProcedure.query(() => ({ open: LIVE_OCTOBER_SALES_OPEN })),
  eligibility: publicProcedure.input(memberInput).query(async ({ input }) => {
    const member = await getVerifiedLiveMember(input.email, input.token);
    if (!member) return { eligible: false, plus: false, ticket: null };
    const ticket = member.plus
      ? await ensurePlusLiveTicket(input.email, input.token)
      : await existingLiveTicket(input.email);
    return {
      eligible: true, plus: member.plus,
      ticket: ticket ? { code: ticket.voucherCode, source: ticket.source } : null,
    };
  }),

  getReceipt: publicProcedure.input(receiptInput).query(async ({ input }) => {
    const ticket = await liveTicketByReceipt(input.trackingToken);
    return ticket ? {
      code: ticket.voucherCode, source: ticket.source,
      name: ticket.name, issuedAt: ticket.issuedAt,
    } : null;
  }),

  askQuestion: publicProcedure.input(z.object({
    email: z.string().email().optional(),
    token: z.string().min(16).max(200).optional(),
    trackingToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    question: z.string().trim().min(8).max(1500),
  })).mutation(async ({ input }) => {
    let ticket = null;
    if (input.email && input.token) {
      const member = await getVerifiedLiveMember(input.email, input.token);
      if (member?.plus) ticket = await ensurePlusLiveTicket(input.email, input.token);
      else if (member) ticket = await existingLiveTicket(input.email);
    }
    if (!ticket && input.trackingToken) ticket = await liveTicketByReceipt(input.trackingToken);
    if (!ticket) throw new TRPCError({ code: "FORBIDDEN", message: "אפשר לשלוח שאלה רק לאחר הרשמה מאומתת ללייב" });
    try {
      return await submitLiveQuestion(ticket.id, input.question);
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "לא ניתן לשמור את השאלה" });
    }
  }),

  adminOverview: teamProcedure.query(async ({ ctx }) => {
    if (!ctx.user && !ctx.teamMember) throw new TRPCError({ code: "FORBIDDEN" });
    if (ctx.user && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [totals] = await db.select({
      total: sql<number>`count(*)`,
      database: sql<number>`sum(case when ${liveOctoberTickets.source} = 'database_live' then 1 else 0 end)`,
      plus: sql<number>`sum(case when ${liveOctoberTickets.source} = 'plus' then 1 else 0 end)`,
      friends: sql<number>`sum(case when ${liveOctoberTickets.source} = 'friends' then 1 else 0 end)`,
      standalone: sql<number>`sum(case when ${liveOctoberTickets.source} = 'standalone' then 1 else 0 end)`,
    }).from(liveOctoberTickets).where(and(
      eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG),
      sql`${liveOctoberTickets.revokedAt} is null`,
    ));
    const [questionTotal] = await db.select({ total: sql<number>`count(*)` })
      .from(liveOctoberQuestions)
      .innerJoin(liveOctoberTickets, eq(liveOctoberQuestions.ticketId, liveOctoberTickets.id))
      .where(eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG));
    const tickets = await db.select({
      id: liveOctoberTickets.id, name: liveOctoberTickets.name,
      email: liveOctoberTickets.email, source: liveOctoberTickets.source,
      voucherCode: liveOctoberTickets.voucherCode, amountAgorot: liveOctoberTickets.amountAgorot,
      issuedAt: liveOctoberTickets.issuedAt,
    }).from(liveOctoberTickets).where(and(
      eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG),
      sql`${liveOctoberTickets.revokedAt} is null`,
    )).orderBy(desc(liveOctoberTickets.issuedAt)).limit(300);
    const questions = await db.select({
      id: liveOctoberQuestions.id, name: liveOctoberTickets.name,
      email: liveOctoberTickets.email, body: liveOctoberQuestions.body,
      createdAt: liveOctoberQuestions.createdAt,
    }).from(liveOctoberQuestions)
      .innerJoin(liveOctoberTickets, eq(liveOctoberQuestions.ticketId, liveOctoberTickets.id))
      .where(eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG))
      .orderBy(desc(liveOctoberQuestions.createdAt)).limit(300);
    return {
      totals: {
        total: Number(totals?.total || 0), database: Number(totals?.database || 0),
        plus: Number(totals?.plus || 0), friends: Number(totals?.friends || 0),
        standalone: Number(totals?.standalone || 0), questions: Number(questionTotal?.total || 0),
      },
      tickets, questions,
    };
  }),
});
