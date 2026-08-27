import { and, eq, or } from "drizzle-orm";
import { crmTeamTasks, matchBoostRequests, matches, plusPilotMembers } from "../drizzle/schema";
import { getDb } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PlusCycleMember = {
  singleId: number;
  monthlyMatchTarget?: number | null;
  billingCycleStartedAt?: number | null;
  billingCycleEndsAt?: number | null;
  activatedAt?: number | null;
};

export type PlusCycleMatch = {
  id: number;
  singleAId: number;
  singleBId: number;
  proposedAt?: number | null;
  proposalSource?: string | null;
};

export function addOneBillingMonth(start: number) {
  const date = new Date(start);
  const targetMonth = date.getUTCMonth() + 1;
  const originalDay = date.getUTCDate();
  const result = new Date(Date.UTC(
    date.getUTCFullYear(),
    targetMonth,
    1,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result.getTime();
}

export function calculatePlusCycleProgress(
  member: PlusCycleMember,
  memberMatches: PlusCycleMatch[],
  now = Date.now(),
) {
  const cycleStart = Number(member.billingCycleStartedAt || member.activatedAt || now);
  const cycleEnd = Number(member.billingCycleEndsAt || addOneBillingMonth(cycleStart));
  const target = Math.max(1, Number(member.monthlyMatchTarget || 2));
  const uniqueProposalIds = new Set(
    memberMatches
      .filter(match => {
        const proposedAt = Number(match.proposedAt || 0);
        const belongsToMember = match.singleAId === member.singleId || match.singleBId === member.singleId;
        return belongsToMember && match.proposalSource !== "boost" && proposedAt >= cycleStart && proposedAt < cycleEnd;
      })
      .map(match => match.id),
  );
  const delivered = uniqueProposalIds.size;
  const remaining = Math.max(0, target - delivered);
  const daysRemaining = Math.max(0, Math.ceil((cycleEnd - now) / DAY_MS));
  const progressPercent = Math.min(100, Math.round(delivered / target * 100));
  const state = delivered >= target
    ? "green"
    : daysRemaining <= 7
      ? "red"
      : delivered > 0
        ? "yellow"
        : "neutral";

  return {
    cycleStart,
    cycleEnd,
    target,
    delivered,
    remaining,
    daysRemaining,
    progressPercent,
    state,
  } as const;
}

export function shouldCreatePlusCommitmentTask(progress: ReturnType<typeof calculatePlusCycleProgress>) {
  return progress.state === "red" && progress.remaining > 0;
}

export async function runPlusCommitmentMonitor(now = Date.now()) {
  const db = await getDb();
  if (!db) return { evaluated: 0, created: 0, skipped: 0 };

  const members = await db.select().from(plusPilotMembers).where(and(
    eq(plusPilotMembers.status, "active"),
    eq(plusPilotMembers.billingStatus, "active"),
  ));
  if (members.length === 0) return { evaluated: 0, created: 0, skipped: 0 };

  const matchRows = await db.select({
    id: matches.id,
    singleAId: matches.singleAId,
    singleBId: matches.singleBId,
    proposedAt: matches.proposedAt,
  }).from(matches);
  const boostRows = await db.select({ matchId: matchBoostRequests.matchId }).from(matchBoostRequests);
  const boostMatchIds = new Set(boostRows.map(row => Number(row.matchId || 0)).filter(Boolean));
  const countableMatches = matchRows.map(match => ({
    ...match,
    proposalSource: boostMatchIds.has(match.id) ? "boost" : "manual",
  }));

  let created = 0;
  let skipped = 0;
  for (const member of members) {
    const progress = calculatePlusCycleProgress(member, countableMatches, now);
    if (!shouldCreatePlusCommitmentTask(progress)) {
      skipped++;
      continue;
    }

    const [existing] = await db.select({ id: crmTeamTasks.id }).from(crmTeamTasks).where(and(
      eq(crmTeamTasks.singleId, member.singleId),
      eq(crmTeamTasks.taskType, "plus"),
      or(eq(crmTeamTasks.status, "todo"), eq(crmTeamTasks.status, "in_progress")),
    )).limit(1);
    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(crmTeamTasks).values({
      singleId: member.singleId,
      taskType: "plus",
      title: `Plus: חסרות ${progress.remaining} הצעות במחזור הנוכחי`,
      description: `נשלחו ${progress.delivered}/${progress.target} הצעות. נותרו ${progress.daysRemaining} ימים עד סוף מחזור החיוב.`,
      priority: progress.daysRemaining <= 3 ? "urgent" : "high",
      status: "todo",
      dueAt: progress.cycleEnd,
      createdBy: "plus_commitment_monitor",
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  return { evaluated: members.length, created, skipped };
}
