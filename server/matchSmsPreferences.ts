import { eq } from "drizzle-orm";
import { lifecycleMarketingSettings } from "../drizzle/schema";
import type { getDb } from "./db";

type AppDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type MatchSmsLinkPreference = { enabled: boolean; effectiveFrom: number | null };

const DISABLED: MatchSmsLinkPreference = { enabled: false, effectiveFrom: null };

/** Isolated settings rows; never change the existing lifecycle scheduler row. */
export function matchSmsLinkPreferenceKey(singleId: number): string {
  if (!Number.isSafeInteger(singleId) || singleId <= 0) {
    throw new Error("A positive profile ID is required for a match SMS preference");
  }
  return `match-sms-response-link:single:${singleId}`;
}

/** Explicit boolean opt-in AND a consent cutoff are required; malformed rows fail closed. */
export function parseMatchSmsLinkPreference(row?: { isEnabled?: unknown; launchedAt?: unknown }): MatchSmsLinkPreference {
  if (row?.isEnabled !== true || typeof row.launchedAt !== "number"
      || !Number.isSafeInteger(row.launchedAt) || row.launchedAt <= 0) return { ...DISABLED };
  return { enabled: true, effectiveFrom: row.launchedAt };
}

export async function getMatchSmsLinkPreference(db: AppDb, singleId?: number): Promise<MatchSmsLinkPreference> {
  if (!Number.isSafeInteger(singleId) || !singleId || singleId <= 0) return { ...DISABLED };
  try {
    const [row] = await db.select({
      isEnabled: lifecycleMarketingSettings.isEnabled,
      launchedAt: lifecycleMarketingSettings.launchedAt,
    }).from(lifecycleMarketingSettings)
      .where(eq(lifecycleMarketingSettings.name, matchSmsLinkPreferenceKey(singleId))).limit(1);
    return parseMatchSmsLinkPreference(row);
  } catch {
    // A missing/unavailable settings row must never enable bearer-token delivery
    // or interrupt the unchanged email-only SMS for other profiles.
    console.warn("[MatchSms] SMS link preference unavailable; using default message");
    return { ...DISABLED };
  }
}
