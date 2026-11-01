import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { lifecycleMessageKeys, singles } from "../drizzle/schema";
import { isPermanentlyBlockedEmail, sendEmail } from "./brevo";
import { getDb } from "./db";
import { normalizeEmail, normalizedEmailEquals } from "./emailNormalization";

const SITE_BASE = "https://hilitcaspi.com";
export const REGISTRATION_RESUME_LINK_COOLDOWN_MS = 10 * 60 * 1000;

export type RegistrationResumeProfile = {
  email: string | null;
  firstName: string | null;
  questionnaireToken: string | null;
  isPaid: boolean;
  isActive: boolean;
  isSeed: boolean;
  market: "il" | "us" | null;
};

export type RegistrationResumeLinkResult = { success: true };

export type RegistrationResumeLinkDeps = {
  /**
   * Must return at most two profiles, already constrained to the exact normalized
   * email, Israeli market, and non-seed profiles. The service verifies those
   * properties again so a test or future adapter cannot widen the audience.
   */
  loadProfiles: (
    normalizedEmail: string
  ) => Promise<RegistrationResumeProfile[]>;
  /**
   * Atomically checks the rolling cooldown and claims the current time bucket.
   * A false result is deliberately indistinguishable from an unknown address.
   */
  claim: (input: {
    messageKey: string;
    keyPrefix: string;
    now: number;
    cooldownMs: number;
  }) => Promise<boolean>;
  sendEmail: typeof sendEmail;
  isPermanentlyBlockedEmail: (email: string) => boolean;
  now: () => number;
};

function affectedRows(result: unknown): number {
  const value = result as
    | { affectedRows?: unknown; rowsAffected?: unknown }
    | Array<{ affectedRows?: unknown }>;
  if (Array.isArray(value)) return Number(value[0]?.affectedRows ?? 0);
  return Number(value?.affectedRows ?? value?.rowsAffected ?? 0);
}

function emailHash(email: string): string {
  return crypto.createHash("sha256").update(email).digest("hex");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStoredResumeToken(value: string | null): value is string {
  // Registration tokens are generated as 32 random bytes encoded as hex. Do not
  // turn a missing or malformed legacy value into a new bearer token here.
  return Boolean(value && /^[a-f0-9]{64}$/i.test(value));
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] as string
  );
}

function resumeDestination(
  profile: RegistrationResumeProfile,
  normalizedEmail: string
): string | null {
  const token = profile.questionnaireToken?.trim() ?? null;
  if (!isStoredResumeToken(token)) return null;

  if (!profile.isPaid && !profile.isActive) {
    // The Register page validates this bearer token and hydrates the saved draft
    // server-authoritatively; no draft fields are embedded in this message.
    return `${SITE_BASE}/join?resume=${encodeURIComponent(token)}`;
  }

  if (profile.isPaid && profile.isActive) {
    // Paid, active members resume in the existing personal-area flow rather than
    // returning to checkout.
    return `${SITE_BASE}/my-profile?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(token)}`;
  }

  // Inactive paid profiles and all other state combinations require manual help.
  return null;
}

export function buildRegistrationResumeLinkEmail(input: {
  firstName: string | null;
  url: string;
}): { subject: string; htmlContent: string; textContent: string } {
  const displayName = input.firstName?.trim() || "שלום";
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(input.url);

  return {
    subject: "הקישור להמשך ההרשמה שלך",
    htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:#191265;padding:32px;text-align:center"><h1 style="margin:0;color:#ffe27c;font-size:24px">הילית כספי</h1></div><div style="padding:32px;color:#191265;line-height:1.8"><p style="font-size:17px;font-weight:bold">שלום ${safeName},</p><p>ביקשת להמשיך מהמקום שבו עצרת. אפשר להשתמש בקישור האישי שלך כדי להמשיך.</p><p style="text-align:center;margin:30px 0"><a href="${safeUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:17px;font-weight:bold;padding:15px 30px;border-radius:12px;text-decoration:none">להמשך</a></p><p style="font-size:13px;color:#777">אם לא ביקשת את הקישור הזה, אפשר להתעלם מההודעה.</p><p style="font-weight:bold">באהבה,<br>הילית כספי</p></div></div></body></html>`,
    textContent: `שלום ${displayName},\n\nביקשת להמשיך מהמקום שבו עצרת.\n${input.url}\n\nאם לא ביקשת את הקישור הזה, אפשר להתעלם מההודעה.\n\nהילית כספי`,
  };
}

const defaultDeps: RegistrationResumeLinkDeps = {
  async loadProfiles(normalizedEmail) {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        email: singles.email,
        firstName: singles.firstName,
        questionnaireToken: singles.questionnaireToken,
        isPaid: singles.isPaid,
        isActive: singles.isActive,
        isSeed: singles.isSeed,
        market: singles.market,
      })
      .from(singles)
      .where(
        and(
          normalizedEmailEquals(singles.email, normalizedEmail),
          eq(singles.market, "il"),
          eq(singles.isSeed, false)
        )
      )
      .limit(2);
  },

  async claim(input) {
    const db = await getDb();
    if (!db) return false;

    try {
      // Serialize every request for this address on one stable, hashed key,
      // including requests on opposite sides of a ten-minute bucket boundary.
      // If this pre-existing table is unavailable, fail closed (do not send an
      // unclaimable link) rather than creating a migration or risking duplicates.
      return await db.transaction(async (tx: any) => {
        const lockKey = `${input.keyPrefix}lock`;
        await tx.execute(sql`INSERT IGNORE INTO lifecycle_message_keys (message_key, created_at) VALUES (${lockKey}, 0)`);
        const [lock] = await tx
          .select({ claimedAt: lifecycleMessageKeys.createdAt })
          .from(lifecycleMessageKeys)
          .where(eq(lifecycleMessageKeys.messageKey, lockKey))
          .limit(1).for("update");
        if (!lock || Number(lock.claimedAt) > input.now - input.cooldownMs) return false;

        const inserted = await tx.execute(sql`
          INSERT IGNORE INTO lifecycle_message_keys (message_key, created_at)
          VALUES (${input.messageKey}, ${input.now})
        `);
        if (affectedRows(inserted) !== 1) return false;
        await tx.update(lifecycleMessageKeys).set({ createdAt: input.now })
          .where(eq(lifecycleMessageKeys.messageKey, lockKey));
        return true;
      });
    } catch {
      return false;
    }
  },

  sendEmail: (message) => sendEmail(message),
  isPermanentlyBlockedEmail: (email) => isPermanentlyBlockedEmail(email),
  now: () => Date.now(),
};

/**
 * Sends a registration-resume link only when called by a future explicit user
 * click. The response intentionally stays identical for unknown, ambiguous,
 * ineligible, throttled, blocked, and provider-failure cases.
 */
export async function requestRegistrationResumeLink(
  input: { email: string },
  overrides: Partial<RegistrationResumeLinkDeps> = {}
): Promise<RegistrationResumeLinkResult> {
  const deps: RegistrationResumeLinkDeps = { ...defaultDeps, ...overrides };
  const genericResult = { success: true } as const;
  const normalizedEmail = normalizeEmail(input.email || "");

  try {
    if (!isValidEmail(normalizedEmail)) return genericResult;

    const profiles = await deps.loadProfiles(normalizedEmail);
    if (profiles.length !== 1) return genericResult;

    const profile = profiles[0];
    // Defensive checks mirror the database filter. Never use a caller-provided
    // destination, origin, or phone number.
    if (
      normalizeEmail(profile.email || "") !== normalizedEmail ||
      profile.market !== "il" ||
      profile.isSeed
    )
      return genericResult;

    const destination = resumeDestination(profile, normalizedEmail);
    if (!destination || deps.isPermanentlyBlockedEmail(normalizedEmail))
      return genericResult;

    const now = deps.now();
    const hash = emailHash(normalizedEmail);
    const bucket = Math.floor(now / REGISTRATION_RESUME_LINK_COOLDOWN_MS);
    const keyPrefix = `registration-resume:v1:${hash}:`;
    const claimed = await deps.claim({
      messageKey: `${keyPrefix}${bucket}`,
      keyPrefix,
      now,
      cooldownMs: REGISTRATION_RESUME_LINK_COOLDOWN_MS,
    });
    if (!claimed) return genericResult;

    const message = buildRegistrationResumeLinkEmail({
      firstName: profile.firstName,
      url: destination,
    });
    const delivery = await deps.sendEmail({
      // Use the verified normalized profile address only. Do not supply stored
      // names to the provider as recipient metadata.
      to: { email: normalizedEmail },
      ...message,
    });

    // A provider failure or transactional block may be ambiguous after hand-off.
    // The atomic claim is intentionally never released and this function never
    // retries automatically, so concurrent/repeated clicks cannot duplicate mail.
    if (!delivery.success || delivery.messageId === "blocked")
      return genericResult;
    return genericResult;
  } catch {
    // Keeping provider/database errors generic prevents account enumeration.
    return genericResult;
  }
}
