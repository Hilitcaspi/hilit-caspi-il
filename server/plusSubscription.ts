import { and, eq, or } from "drizzle-orm";
import { crmTeamTasks, matchBoostRequests, matches, plusPilotMembers } from "../drizzle/schema";
import { getDb } from "./db";
import { wasMatchProposalSent, type MatchDeliveryEvidence } from "../shared/matchDelivery";
import { resolvePlusServiceCycle, type PlusServiceMember } from "../shared/plusServiceCycle";
import { getPlusWednesdayCycleTarget } from "../shared/plusWednesdayOffer";
import { getLivePostPlusCycleTarget } from "../shared/livePostOffer";

const DAY_MS = 24 * 60 * 60 * 1000;

export const plusDeliveryEvidenceSelection = {
  status: matches.status, ownerApprovedAt: matches.ownerApprovedAt,
  approvalTokenA: matches.approvalTokenA, approvalTokenB: matches.approvalTokenB,
  singleAToken: matches.singleAToken, singleBToken: matches.singleBToken,
  emailAOpenedAt: matches.emailAOpenedAt, emailBOpenedAt: matches.emailBOpenedAt,
  tokenAUsedAt: matches.tokenAUsedAt, tokenBUsedAt: matches.tokenBUsedAt,
  approvedByA: matches.approvedByA, approvedByB: matches.approvedByB,
  emailRetriedAt: matches.emailRetriedAt, waSentAt: matches.waSentAt, notes: matches.notes,
};

export type PlusCycleMember = {
  singleId: number;
  monthlyMatchTarget?: number | null;
  billingCycleStartedAt?: number | null;
  billingCycleEndsAt?: number | null;
  activatedAt?: number | null;
};

export type PlusCycleMatch = MatchDeliveryEvidence & {
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
        return belongsToMember && wasMatchProposalSent(match) && match.proposalSource !== "boost" && proposedAt >= cycleStart && proposedAt < cycleEnd;
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

export function calculatePlusServiceProgress(member: PlusCycleMember & PlusServiceMember & { pilotCohort?: string | null }, memberMatches: PlusCycleMatch[], now = Date.now()) {
  const window = resolvePlusServiceCycle(member, now);
  // Each dated cohort preserves its own first-cycle-only third manual proposal.
  const wednesdayTarget = getPlusWednesdayCycleTarget(member.pilotCohort, window.cycleIndex, member.monthlyMatchTarget);
  const target = getLivePostPlusCycleTarget(member.pilotCohort, window.cycleIndex, wednesdayTarget);
  const progress = calculatePlusCycleProgress({ ...member, monthlyMatchTarget: target, billingCycleStartedAt: window.cycleStart, billingCycleEndsAt: window.cycleEnd }, memberMatches, now);
  const continuingCancellation = member.billingStatus === "cancelled" && Boolean(member.cancelledAt) && now < window.cycleEnd;
  const needsMatches = member.status === "active" && (member.billingStatus === "active" || continuingCancellation)
    && !member.endedAt && window.valid && window.cycleStart <= now && progress.remaining > 0;
  return { ...progress, cycleStart: window.cycleStart, cycleEnd: window.cycleEnd, kind: window.kind, autoRenew: window.autoRenew, cycleIndex: window.cycleIndex, needsMatches };
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
    ...plusDeliveryEvidenceSelection,
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
    const progress = calculatePlusServiceProgress(member, countableMatches, now);
    if (!progress.needsMatches || !shouldCreatePlusCommitmentTask(progress)) {
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
      description: `נשלחו ${progress.delivered} מתוך ${progress.target} הצעות. נותרו ${progress.daysRemaining} ימים עד סוף מחזור השירות בן 30 הימים. אין בכך אישור חיוב אצל הספק.`,
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
