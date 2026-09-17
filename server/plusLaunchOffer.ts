import crypto from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { productAccessTokens } from "../drizzle/schema";

export const PLUS_RELAUNCH_COHORT = "plus_relaunch_guide_bonus_2026_09";
export const PLUS_RELAUNCH_EMAIL_JOURNEY = "plus_relaunch_guide_bonus_email_2026_09";
export const PLUS_RELAUNCH_SMS_JOURNEY = "plus_relaunch_guide_bonus_sms_2026_09";
export const PLUS_RELAUNCH_GUIDE_VALUE_ILS = 149;
export const PLUS_RELAUNCH_BONUS_WINDOW_MS = 72 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function qualifiesForPlusRelaunchGuideBonus(
  pilotCohort: string | null | undefined,
  invitedAt: number | null | undefined,
  now = Date.now(),
) {
  const invitationTime = Number(invitedAt || 0);
  return pilotCohort === PLUS_RELAUNCH_COHORT
    && invitationTime > 0
    && now >= invitationTime
    && now <= invitationTime + PLUS_RELAUNCH_BONUS_WINDOW_MS;
}

export async function ensurePlusRelaunchGuideBonus(
  db: any,
  input: { email: string; name: string; paymentRef?: string | null; pilotCohort?: string | null; invitedAt?: number | null; now?: number },
) {
  const now = input.now ?? Date.now();
  if (!qualifiesForPlusRelaunchGuideBonus(input.pilotCohort, input.invitedAt, now)) return null;
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select().from(productAccessTokens)
    .where(and(
      sql`LOWER(TRIM(${productAccessTokens.email})) = ${email}`,
      eq(productAccessTokens.product, "guide_149"),
    ))
    .orderBy(desc(productAccessTokens.createdAt))
    .limit(1);
  if (existing && Number(existing.expiresAt || 0) > now) {
    return { url: `https://hilitcaspi.com/guide/view?token=${existing.token}`, granted: false };
  }
  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(productAccessTokens).values({
    token,
    email,
    name: input.name,
    product: "guide_149",
    paymentRef: input.paymentRef || null,
    expiresAt: now + ONE_YEAR_MS,
    accessCount: 0,
    createdAt: now,
  });
  return { url: `https://hilitcaspi.com/guide/view?token=${token}`, granted: true };
}
