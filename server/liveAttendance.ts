import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { liveOctoberTickets, plusPilotMembers } from "../drizzle/schema";
import { getDb } from "./db";
import { LIVE_OCTOBER_SLUG } from "./liveOctober";
import { liveQuestionTicket } from "./liveQuestionAccess";

const denied = () => new TRPCError({ code: "FORBIDDEN", message: "אישור ההגעה אינו זמין לקישור הזה" });

/** Recheck every mutable ticket/member condition in the UPDATE to avoid a revoked-ticket race. */
function confirmedPlusTicketWhere(ticketId: number, now: number) {
  return and(
    eq(liveOctoberTickets.id, ticketId),
    eq(liveOctoberTickets.eventSlug, LIVE_OCTOBER_SLUG),
    eq(liveOctoberTickets.source, "plus"),
    sql`${liveOctoberTickets.revokedAt} is null`,
    sql`${liveOctoberTickets.voucherCode} not like 'TEST-%'`,
    sql`exists (
      select 1 from ${plusPilotMembers}
      where ${plusPilotMembers.singleId} = ${liveOctoberTickets.singleId}
        and (
          (${plusPilotMembers.status} = 'active' and ${plusPilotMembers.billingStatus} = 'active')
          or (${plusPilotMembers.status} in ('churned', 'active') and ${plusPilotMembers.billingStatus} = 'cancelled'
              and ${plusPilotMembers.billingCycleEndsAt} > ${now})
        )
    )`,
  );
}

export async function readLiveQuestionAccess(questionToken: string) {
  const ticket = await liveQuestionTicket(questionToken);
  if (!ticket) return null;
  const isPlus = ticket.source === "plus";
  return {
    ticket,
    isPlus,
    attendanceConfirmedAt: isPlus ? ticket.attendanceConfirmedAt ?? null : null,
  };
}

/** RSVP is planning only: this performs no email or Zoom operation. */
export async function confirmLiveAttendance(questionToken: string, attending: boolean, now = Date.now()) {
  const access = await readLiveQuestionAccess(questionToken);
  if (!access?.isPlus) throw denied();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const where = confirmedPlusTicketWhere(access.ticket.id, now);
  await db.update(liveOctoberTickets).set({
    // Repeated confirmation preserves the first timestamp; cancellation deliberately clears it.
    attendanceConfirmedAt: attending ? sql`coalesce(${liveOctoberTickets.attendanceConfirmedAt}, ${now})` : null,
  }).where(where);
  const [ticket] = await db.select({ attendanceConfirmedAt: liveOctoberTickets.attendanceConfirmedAt })
    .from(liveOctoberTickets).where(where).limit(1);
  if (!ticket) throw denied();
  return { attending: ticket.attendanceConfirmedAt !== null, attendanceConfirmedAt: ticket.attendanceConfirmedAt };
}
