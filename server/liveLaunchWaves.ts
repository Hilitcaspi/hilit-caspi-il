import crypto from "node:crypto";
import { liveLaunchRecipientHash, type LiveLaunchMember } from "./liveLaunchCampaign";

export const LIVE_LAUNCH_PHASES = ["email19", "sms19", "email20", "sms20", "email21", "sms21"] as const;
export type LiveLaunchPhase = typeof LIVE_LAUNCH_PHASES[number];
export const LIVE_LAUNCH_PHASE_TIMES: Record<LiveLaunchPhase, string> = {
  email19: "2026-10-08T19:00:00+03:00", sms19: "2026-10-08T19:00:00+03:00",
  email20: "2026-10-08T20:00:00+03:00", sms20: "2026-10-08T20:00:00+03:00",
  email21: "2026-10-08T21:00:00+03:00", sms21: "2026-10-08T21:00:00+03:00",
};
export type LiveLaunchWavePlan = {
  version: 2; createdAt: number; approved: boolean; approvedAt: number | null; expiresAt: number;
  phases: Record<LiveLaunchPhase, {
    startsAt: number; expiresAt: number;
    email: { cold: number; database: 0; plus: number }; smsTotal: number;
    recipientHashes: string[]; smsComboHashes: string[];
  }>;
};

/** Randomized reproducible cohorts; the returned manifest contains hashes, never identities. */
export function buildLiveLaunchWavePlan(members: LiveLaunchMember[], seed: string, now = Date.now()): LiveLaunchWavePlan {
  if (!seed || seed.length < 16) throw new Error("A private random assignment seed is required");
  const ranks = new Map<string, string>();
  const rank = (member: LiveLaunchMember) => {
    const key = liveLaunchRecipientHash(member);
    if (!ranks.has(key)) ranks.set(key, crypto.createHmac("sha256", seed).update(key).digest("hex"));
    return ranks.get(key)!;
  };
  const cold = members.filter(member => member.segment === "cold").sort((a, b) => rank(a).localeCompare(rank(b)));
  const plus = members.filter(member => member.segment === "plus");
  const hot = cold.filter(member => member.phone && member.smsIntent && !member.smsPreviouslySent)
    .sort((a, b) => a.smsIntentPriority - b.smsIntentPriority || rank(a).localeCompare(rank(b))).slice(0, 200);
  const hotHashes = new Set(hot.map(liveLaunchRecipientHash));
  const groups: LiveLaunchMember[][] = [[], [], []];
  const hotGroups: LiveLaunchMember[][] = [[], [], []];
  cold.filter(member => !hotHashes.has(liveLaunchRecipientHash(member)))
    .forEach((member, index) => groups[index % 3].push(member));
  hot.forEach((member, index) => hotGroups[index % 3].push(member));
  const make = (phase: LiveLaunchPhase, audience: LiveLaunchMember[], combo: string[] = []) => ({
    startsAt: Date.parse(LIVE_LAUNCH_PHASE_TIMES[phase]),
    expiresAt: Date.parse(LIVE_LAUNCH_PHASE_TIMES[phase]) + 30 * 60 * 1000 - 1,
    email: {
      cold: phase.startsWith("sms") ? 0 : audience.filter(member => member.segment === "cold").length,
      database: 0 as const,
      plus: phase.startsWith("sms") ? 0 : audience.filter(member => member.segment === "plus").length,
    },
    smsTotal: phase.startsWith("sms") ? audience.length : 0,
    recipientHashes: audience.map(liveLaunchRecipientHash), smsComboHashes: combo,
  });
  return {
    version: 2, createdAt: now, approved: false, approvedAt: null,
    expiresAt: Date.parse("2026-10-08T21:30:00+03:00"),
    phases: {
      email19: make("email19", [...groups[0], ...hotGroups[0], ...plus], hotGroups[0].map(liveLaunchRecipientHash)),
      sms19: make("sms19", hotGroups[0]),
      email20: make("email20", [...groups[1], ...hotGroups[1]], hotGroups[1].map(liveLaunchRecipientHash)),
      sms20: make("sms20", hotGroups[1]),
      email21: make("email21", [...groups[2], ...hotGroups[2]], hotGroups[2].map(liveLaunchRecipientHash)),
      sms21: make("sms21", hotGroups[2]),
    },
  };
}

/** A firing outside an exact bounded slot must be a no-op, never a catch-up blast. */
export function liveLaunchPhaseAt(now: number): "email19" | "email20" | "email21" | null {
  for (const phase of ["email19", "email20", "email21"] as const) {
    const startsAt = Date.parse(LIVE_LAUNCH_PHASE_TIMES[phase]);
    if (now >= startsAt && now < startsAt + 30 * 60 * 1000) return phase;
  }
  return null;
}
