import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { singles } from "../drizzle/schema";

// First deployment that started collecting these choices in the Israeli registration form.
// Earlier IL registration payloads omitted both fields; false is not evidence of a refusal.
export const IL_SERVICE_CHOICES_STARTED_AT = Date.parse("2026-10-08T07:16:00Z");

export function hasRegularMatchingAccess(profile: {
  isActive?: boolean | null; isPaid?: boolean | null; isSeed?: boolean | null;
  consentMatchmaking?: boolean | null; consentDataSharing?: boolean | null;
  market?: string | null; createdAt?: number | null; questionnaireCompletedAt?: number | null;
  subscriptionCancelledAt?: number | null;
}) {
  if (!profile.isActive || !profile.isPaid || profile.isSeed) return false;
  if (profile.consentMatchmaking && profile.consentDataSharing) return true;
  return (profile.market === "il" || profile.market == null)
    && Number(profile.createdAt || 0) > 0
    && Number(profile.createdAt) < IL_SERVICE_CHOICES_STARTED_AT
    && Boolean(profile.questionnaireCompletedAt)
    && !profile.subscriptionCancelledAt;
}

/** Preserve explicit choices on newer/US registrations; never infer consent from Boost. */
export function regularMatchingAccessSql() {
  return and(
    eq(singles.isActive, true), eq(singles.isPaid, true), eq(singles.isSeed, false),
    or(
      and(eq(singles.consentMatchmaking, true), eq(singles.consentDataSharing, true)),
      and(
        or(eq(singles.market, "il"), isNull(singles.market)),
        sql`${singles.createdAt} > 0`, lt(singles.createdAt, IL_SERVICE_CHOICES_STARTED_AT),
        sql`${singles.questionnaireCompletedAt} IS NOT NULL`, isNull(singles.subscriptionCancelledAt),
      ),
    ),
  );
}
