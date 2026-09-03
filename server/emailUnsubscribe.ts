import crypto from "crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { crmLeads, emailLog, singles } from "../drizzle/schema";
import { getDb } from "./db";
import { normalizeEmail } from "./emailNormalization";

const TOKEN_PREFIX = "unsubscribe_v1_";
const DEFAULT_SITE_BASE = "https://hilitcaspi.com";

type SignedUnsubscribePayload = {
  email: string;
  leadId?: number;
  singleId?: number;
};

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is unavailable");
  return secret;
}

export function createSignedUnsubscribeToken(input: SignedUnsubscribePayload): string {
  const payload: SignedUnsubscribePayload = {
    email: normalizeEmail(input.email),
    ...(input.leadId ? { leadId: input.leadId } : {}),
    ...(input.singleId ? { singleId: input.singleId } : {}),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
  return `${TOKEN_PREFIX}${encoded}.${signature}`;
}

export function verifySignedUnsubscribeToken(token: string): SignedUnsubscribePayload | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const [encoded, signature] = token.slice(TOKEN_PREFIX.length).split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedUnsubscribePayload;
    const email = normalizeEmail(parsed.email || "");
    if (!email.includes("@")) return null;
    return {
      email,
      ...(Number.isInteger(parsed.leadId) && Number(parsed.leadId) > 0 ? { leadId: Number(parsed.leadId) } : {}),
      ...(Number.isInteger(parsed.singleId) && Number(parsed.singleId) > 0 ? { singleId: Number(parsed.singleId) } : {}),
    };
  } catch {
    return null;
  }
}

export function parseLegacyLeadUnsubscribeToken(token: string): SignedUnsubscribePayload | null {
  if (!token || token.startsWith(TOKEN_PREFIX) || token.startsWith("boost_")) return null;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    const leadId = Number(decoded.slice(0, separator));
    const email = normalizeEmail(decoded.slice(separator + 1));
    if (!Number.isInteger(leadId) || leadId <= 0 || !email.includes("@")) return null;
    return { leadId, email };
  } catch {
    return null;
  }
}

export function buildSignedUnsubscribeUrl(input: SignedUnsubscribePayload & { baseUrl?: string }): string {
  const baseUrl = (input.baseUrl || DEFAULT_SITE_BASE).replace(/\/$/, "");
  const token = createSignedUnsubscribeToken(input);
  return `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function isEmailMarketingSuppressed(email: string): Promise<{
  suppressed: boolean;
  reason: "invalid" | "crm_unsubscribed" | "inactive_profile" | "marketing_consent" | null;
}> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) return { suppressed: true, reason: "invalid" };
  const db = await getDb();
  if (!db) return { suppressed: true, reason: "invalid" };

  const [blockedLead] = await db.select({ id: crmLeads.id })
    .from(crmLeads)
    .where(and(
      sql`LOWER(TRIM(${crmLeads.email})) = ${normalized}`,
      eq(crmLeads.emailUnsubscribed, true),
    ))
    .limit(1);
  if (blockedLead) return { suppressed: true, reason: "crm_unsubscribed" };

  const [profile] = await db.select({
    isActive: singles.isActive,
    consentEmailMarketing: singles.consentEmailMarketing,
  })
    .from(singles)
    .where(sql`LOWER(TRIM(${singles.email})) = ${normalized}`)
    .limit(1);
  if (profile && !profile.isActive) return { suppressed: true, reason: "inactive_profile" };
  if (profile && !profile.consentEmailMarketing) return { suppressed: true, reason: "marketing_consent" };
  return { suppressed: false, reason: null };
}

export async function applyEmailUnsubscribe(input: {
  email: string;
  leadId?: number;
  singleId?: number;
  source: "signed_token" | "legacy_token" | "legacy_email" | "boost_token" | "brevo_webhook";
}): Promise<boolean> {
  const normalized = normalizeEmail(input.email);
  if (!normalized || !normalized.includes("@")) return false;
  const db = await getDb();
  if (!db) return false;
  const now = Date.now();

  const leadIdentity = input.leadId
    ? or(eq(crmLeads.id, input.leadId), sql`LOWER(TRIM(${crmLeads.email})) = ${normalized}`)
    : sql`LOWER(TRIM(${crmLeads.email})) = ${normalized}`;
  await db.update(crmLeads)
    .set({
      emailUnsubscribed: true,
      emailUnsubscribedAt: now,
      updatedAt: now,
      notes: sql`CASE WHEN ${crmLeads.emailUnsubscribed} = 1 THEN ${crmLeads.notes} ELSE CONCAT(COALESCE(${crmLeads.notes}, ''), ${`\n[הסרה מדיוור: ${input.source}]`}) END`,
    })
    .where(leadIdentity);

  const singleIdentity = input.singleId
    ? or(eq(singles.id, input.singleId), sql`LOWER(TRIM(${singles.email})) = ${normalized}`)
    : sql`LOWER(TRIM(${singles.email})) = ${normalized}`;
  await db.update(singles)
    .set({ consentEmailMarketing: false, updatedAt: now })
    .where(singleIdentity);

  await db.update(emailLog)
    .set({ status: "cancelled", sentAt: now, errorMessage: `suppressed:${input.source}` })
    .where(and(
      sql`LOWER(TRIM(${emailLog.recipientEmail})) = ${normalized}`,
      inArray(emailLog.status, ["pending", "processing"]),
    ));

  return true;
}
