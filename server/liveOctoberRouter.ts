import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { liveOctoberQuestions, liveOctoberTickets } from "../drizzle/schema";
import { ticketJoinUrl } from "./liveZoomDelivery";
import { liveQuestionTicket } from "./liveQuestionAccess";
import {
  LIVE_OCTOBER_SLUG, ensurePlusLiveTicket, existingLiveTicket,
  getVerifiedLiveMember, isLiveCheckoutOpen, liveTicketByReceipt, submitLiveQuestion,
} from "./liveOctober";

const memberInput = z.object({ email: z.string().email().max(320), token: z.string().min(16).max(200) });
const receiptInput = z.object({ trackingToken: z.string().regex(/^[a-f0-9]{64}$/) });

export const liveOctoberRouter = router({
  salesStatus: publicProcedure.query(() => ({
    open: isLiveCheckoutOpen("live_october", undefined),
    databaseGiftOpen: isLiveCheckoutOpen("database", "LIVE"),
  })),
  eligibility: publicProcedure.input(memberInput).query(async ({ input }) => {
    const member = await getVerifiedLiveMember(input.email, input.token);
    if (!member) return { eligible: false, plus: false, ticket: null };
    const ticket = member.plus
      ? await ensurePlusLiveTicket(input.email, input.token)
      : await existingLiveTicket(input.email);
    return {
      eligible: true, plus: member.plus,
      ticket: ticket ? { code: ticket.voucherCode, source: ticket.source, joinUrl: ticketJoinUrl(ticket) } : null,
    };
  }),

  getReceipt: publicProcedure.input(receiptInput).query(async ({ input }) => {
    const ticket = await liveTicketByReceipt(input.trackingToken);
    return ticket ? {
      code: ticket.voucherCode, source: ticket.source,
      name: ticket.name, issuedAt: ticket.issuedAt, joinUrl: ticketJoinUrl(ticket),
    } : null;
  }),

  questionAccess: publicProcedure.input(z.object({ questionToken: z.string().max(80) })).query(async ({ input }) => {
    const ticket = await liveQuestionTicket(input.questionToken);
    if (!ticket) return null;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [count] = await db.select({ total: sql<number>`count(*)` }).from(liveOctoberQuestions)
      .where(eq(liveOctoberQuestions.ticketId, ticket.id));
    return { remaining: Math.max(0, 3 - Number(count?.total ?? 0)) };
  }),

  askQuestion: publicProcedure.input(z.object({
    email: z.string().email().optional(),
    token: z.string().min(16).max(200).optional(),
    trackingToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    questionToken: z.string().max(80).optional(),
    question: z.string().trim().min(8).max(1500),
  })).mutation(async ({ input }) => {
    let ticket = null;
    if (input.questionToken) ticket = await liveQuestionTicket(input.questionToken);
    else if (input.email && input.token) {
      const member = await getVerifiedLiveMember(input.email, input.token);
      if (member?.plus) ticket = await ensurePlusLiveTicket(input.email, input.token);
      else if (member) ticket = await existingLiveTicket(input.email);
    }
    if (!input.questionToken && !ticket && input.trackingToken) ticket = await liveTicketByReceipt(input.trackingToken);
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
      sql`${liveOctoberTickets.voucherCode} not like 'TEST-%'`,
    ));
    const [testCount] = await db.select({ total: sql<number>`count(*)` }).from(liveOctoberTickets)
      .where(and(eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG), sql`${liveOctoberTickets.voucherCode} like 'TEST-%'`));
    const [questionTotal] = await db.select({ total: sql<number>`count(*)` })
      .from(liveOctoberQuestions)
      .innerJoin(liveOctoberTickets, eq(liveOctoberQuestions.ticketId, liveOctoberTickets.id))
      .where(and(eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG), sql`${liveOctoberTickets.voucherCode} not like 'TEST-%'`));
    const tickets = await db.select({
      id: liveOctoberTickets.id, name: liveOctoberTickets.name,
      email: liveOctoberTickets.email, source: liveOctoberTickets.source,
      voucherCode: liveOctoberTickets.voucherCode, amountAgorot: liveOctoberTickets.amountAgorot,
      issuedAt: liveOctoberTickets.issuedAt, zoomDeliveryState: liveOctoberTickets.zoomDeliveryState,
      zoomAttemptCount: liveOctoberTickets.zoomAttemptCount, zoomLastError: liveOctoberTickets.zoomLastError,
      zoomEmailSentAt: liveOctoberTickets.zoomEmailSentAt,
    }).from(liveOctoberTickets).where(and(
      eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG),
      sql`${liveOctoberTickets.revokedAt} is null`,
      sql`${liveOctoberTickets.voucherCode} not like 'TEST-%'`,
    )).orderBy(desc(liveOctoberTickets.issuedAt)).limit(300);
    const questions = await db.select({
      id: liveOctoberQuestions.id, name: liveOctoberTickets.name,
      email: liveOctoberTickets.email, body: liveOctoberQuestions.body,
      createdAt: liveOctoberQuestions.createdAt,
    }).from(liveOctoberQuestions)
      .innerJoin(liveOctoberTickets, eq(liveOctoberQuestions.ticketId, liveOctoberTickets.id))
      .where(and(eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG), sql`${liveOctoberTickets.voucherCode} not like 'TEST-%'`))
      .orderBy(desc(liveOctoberQuestions.createdAt)).limit(300);
    return {
      totals: {
        total: Number(totals?.total || 0), database: Number(totals?.database || 0),
        plus: Number(totals?.plus || 0), friends: Number(totals?.friends || 0),
        standalone: Number(totals?.standalone || 0), questions: Number(questionTotal?.total || 0),
        test: Number(testCount?.total || 0),
      },
      tickets, questions,
    };
  }),
});
