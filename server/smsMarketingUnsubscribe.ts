import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { normalizeIsraeliMobile } from "./vibrate";

const TOKEN_PREFIX = "sms_unsubscribe_v1_";
const CANONICAL_SITE_BASE = "https://hilitcaspi.com";
const MAX_TOKEN_LENGTH = 512;
const SHA256_BASE64URL_LENGTH = 43;

type SignedSmsUnsubscribePayload = {
  phone: string;
};

function signingSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is unavailable");
  return secret;
}

function normalizedPhone(value: unknown): string | null {
  return typeof value === "string" ? normalizeIsraeliMobile(value) : null;
}

function canonicalSiteBase(baseUrl?: string): string {
  if (baseUrl === undefined) return CANONICAL_SITE_BASE;

  try {
    const parsed = new URL(baseUrl);
    if (
      parsed.origin !== CANONICAL_SITE_BASE
      || parsed.protocol !== "https:"
      || parsed.username
      || parsed.password
      || parsed.pathname !== "/"
      || parsed.search
      || parsed.hash
    ) {
      throw new Error("invalid");
    }
    return CANONICAL_SITE_BASE;
  } catch {
    throw new Error("SMS unsubscribe URL must use the canonical site base");
  }
}

function sign(encodedPayload: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(encodedPayload).digest("base64url");
}

export function createSignedSmsUnsubscribeToken(input: { phone: string }): string {
  const phone = normalizedPhone(input?.phone);
  if (!phone) throw new Error("A valid Israeli mobile phone is required");

  const encodedPayload = Buffer.from(JSON.stringify({ phone } satisfies SignedSmsUnsubscribePayload), "utf8")
    .toString("base64url");
  return `${TOKEN_PREFIX}${encodedPayload}.${sign(encodedPayload)}`;
}

/**
 * Creates a public unsubscribe URL whose token is bound only to a normalized
 * Israeli mobile number. The optional base URL is intentionally constrained to
 * the production canonical origin, so campaign input cannot redirect contacts.
 */
export function buildSignedSmsUnsubscribeUrl(input: { phone: string; baseUrl?: string }): string {
  const baseUrl = canonicalSiteBase(input?.baseUrl);
  const token = createSignedSmsUnsubscribeToken({ phone: input?.phone });
  return `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Validates the exact canonical, one-field SMS token payload. This does not
 * accept email or caller-supplied phone data from the public unsubscribe route.
 */
export function verifySignedSmsUnsubscribeToken(token: unknown): SignedSmsUnsubscribePayload | null {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH || !token.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  const signedValue = token.slice(TOKEN_PREFIX.length);
  const separator = signedValue.indexOf(".");
  if (separator <= 0 || separator !== signedValue.lastIndexOf(".")) return null;

  const encodedPayload = signedValue.slice(0, separator);
  const signature = signedValue.slice(separator + 1);
  if (
    !/^[A-Za-z0-9_-]+$/.test(encodedPayload)
    || !new RegExp(`^[A-Za-z0-9_-]{${SHA256_BASE64URL_LENGTH}}$`).test(signature)
  ) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const suppliedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (
    suppliedBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decodedPayload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    // Require the canonical base64url form emitted by the signer.
    if (Buffer.from(decodedPayload, "utf8").toString("base64url") !== encodedPayload) return null;

    const parsed: unknown = JSON.parse(decodedPayload);
    if (
      !parsed
      || typeof parsed !== "object"
      || Array.isArray(parsed)
      || Object.getPrototypeOf(parsed) !== Object.prototype
      || Object.keys(parsed).length !== 1
      || Object.keys(parsed)[0] !== "phone"
      || typeof (parsed as { phone?: unknown }).phone !== "string"
      // This also rejects duplicate JSON keys and noncanonical whitespace.
      || JSON.stringify(parsed) !== decodedPayload
    ) {
      return null;
    }

    const phone = normalizedPhone((parsed as { phone: string }).phone);
    if (!phone || phone !== (parsed as { phone: string }).phone) return null;
    return { phone };
  } catch {
    return null;
  }
}

/**
 * Records one SMS marketing opt-out and suppresses only unsent SMS recovery
 * records for that exact normalized phone. It intentionally never changes
 * emails, profiles, subscriptions, or operational/service SMS state.
 */
export async function applySmsMarketingUnsubscribe(input: { phone: string }): Promise<boolean> {
  const phone = normalizedPhone(input?.phone);
  if (!phone) return false;

  const db = await getDb();
  if (!db) return false;

  const now = Date.now();
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        INSERT INTO sms_optouts (phone, source, created_at, updated_at)
        VALUES (${phone}, 'signed_sms_token', ${now}, ${now})
        ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)
      `);
      await tx.execute(sql`
        UPDATE purchase_recovery_recipients
        SET sms_state = 'skipped',
            sms_consent = false,
            updated_at = ${now}
        WHERE phone = ${phone}
          AND sms_state IN ('draft', 'held', 'queued')
      `);
    });
    return true;
  } catch {
    console.error("[SMS unsubscribe] Failed to persist SMS marketing opt-out");
    return false;
  }
}
