import crypto from "crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { crmLeads, emailLog, singles } from "../drizzle/schema";
import { getDb } from "./db";
import { isPermanentlyBlockedEmail, sendEmailBatch } from "./brevo";
import {
  BOOST_NEWSLETTER_PREHEADER,
  BOOST_NEWSLETTER_SUBJECT,
  buildBoostEnrollmentNewsletter,
} from "./boostNewsletter";

export const BOOST_NEWSLETTER_CAMPAIGN_KEY = "boost_launch_2026_08_30";
export const BOOST_NEWSLETTER_DATE = "2026-08-30";

export const BOOST_NEWSLETTER_WAVES = [
  { key: "0700", emailIndex: 1, israelHour: 7, scheduledAt: Date.UTC(2026, 7, 30, 4, 0, 0) },
  { key: "0800", emailIndex: 2, israelHour: 8, scheduledAt: Date.UTC(2026, 7, 30, 5, 0, 0) },
  { key: "0900", emailIndex: 3, israelHour: 9, scheduledAt: Date.UTC(2026, 7, 30, 6, 0, 0) },
] as const;

export type BoostNewsletterWaveKey = (typeof BOOST_NEWSLETTER_WAVES)[number]["key"];

type AudienceMember = {
  singleId: number;
  email: string;
  firstName: string;
  leadId: number | null;
};

type ScheduleMeta = {
  taskUid: string;
  wave: BoostNewsletterWaveKey;
  state: "queued" | "sent" | "failed" | "suppressed";
  detail?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function scheduleMeta(meta: ScheduleMeta) {
  return JSON.stringify(meta);
}

function parseScheduleMeta(value: string | null): ScheduleMeta | null {
  try {
    const parsed = JSON.parse(value || "");
    if (!parsed?.taskUid || !parsed?.wave || !parsed?.state) return null;
    return parsed as ScheduleMeta;
  } catch {
    return null;
  }
}

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is unavailable");
  return secret;
}

export function createBoostNewsletterUnsubscribeToken(singleId: number, email: string) {
  const payload = `${singleId}:${normalizeEmail(email)}`;
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
  return `boost_${encoded}.${signature}`;
}

export function verifyBoostNewsletterUnsubscribeToken(token: string) {
  if (!token.startsWith("boost_")) return null;
  const [encoded, signature] = token.slice("boost_".length).split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  const decoded = Buffer.from(encoded, "base64url").toString("utf8");
  const separator = decoded.indexOf(":");
  const singleId = Number(decoded.slice(0, separator));
  const email = normalizeEmail(decoded.slice(separator + 1));
  if (!Number.isInteger(singleId) || singleId <= 0 || !email.includes("@")) return null;
  return { singleId, email };
}

function audienceHash(member: AudienceMember) {
  return crypto
    .createHash("sha256")
    .update(`${BOOST_NEWSLETTER_CAMPAIGN_KEY}:${normalizeEmail(member.email)}`)
    .digest("hex");
}

export function partitionBoostNewsletterAudience(members: AudienceMember[]) {
  const deduped = new Map<string, AudienceMember>();
  for (const member of members) {
    const email = normalizeEmail(member.email);
    if (!deduped.has(email)) deduped.set(email, { ...member, email });
  }
  const sorted = Array.from(deduped.values()).sort((a, b) => audienceHash(a).localeCompare(audienceHash(b)));
  const waves: Record<BoostNewsletterWaveKey, AudienceMember[]> = { "0700": [], "0800": [], "0900": [] };
  sorted.forEach((member, index) => {
    waves[BOOST_NEWSLETTER_WAVES[index % BOOST_NEWSLETTER_WAVES.length].key].push(member);
  });
  return waves;
}

async function loadEligibleAudience(): Promise<AudienceMember[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [rows] = await db.execute(sql`
    SELECT
      s.id AS single_id,
      s.email AS email,
      s.firstName AS first_name,
      (
        SELECT MIN(cl.id)
        FROM crm_leads cl
        WHERE LOWER(TRIM(cl.email)) = LOWER(TRIM(s.email))
          AND COALESCE(cl.emailUnsubscribed, 0) = 0
      ) AS lead_id
    FROM singles s
    WHERE COALESCE(s.isActive, 0) = 1
      AND COALESCE(s.isPaid, 0) = 1
      AND COALESCE(s.isSeed, 0) = 0
      AND COALESCE(s.market, 'il') = 'il'
      AND COALESCE(s.consentEmailMarketing, 0) = 1
      AND s.email IS NOT NULL
      AND TRIM(s.email) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM crm_leads blocked
        WHERE LOWER(TRIM(blocked.email)) = LOWER(TRIM(s.email))
          AND COALESCE(blocked.emailUnsubscribed, 0) = 1
      )
      AND NOT EXISTS (
        SELECT 1 FROM match_boost_memberships mbm
        WHERE mbm.single_id = s.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM match_boost_pilot_interests mbi
        WHERE LOWER(TRIM(mbi.email)) = LOWER(TRIM(s.email))
          AND mbi.status = 'declined'
      )
  `) as any;

  return (rows || [])
    .map((row: any) => ({
      singleId: Number(row.single_id),
      email: normalizeEmail(String(row.email || "")),
      firstName: String(row.first_name || "").trim(),
      leadId: row.lead_id ? Number(row.lead_id) : null,
    }))
    .filter((row: AudienceMember) => row.singleId > 0 && row.email.includes("@") && !isPermanentlyBlockedEmail(row.email));
}

function waveByKey(waveKey: BoostNewsletterWaveKey) {
  const wave = BOOST_NEWSLETTER_WAVES.find((item) => item.key === waveKey);
  if (!wave) throw new Error(`Unknown Boost newsletter wave: ${waveKey}`);
  return wave;
}

export async function prepareBoostNewsletterCampaign(taskUids: Record<BoostNewsletterWaveKey, string>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db
    .select({ id: emailLog.id })
    .from(emailLog)
    .where(eq(emailLog.journeyKey, BOOST_NEWSLETTER_CAMPAIGN_KEY))
    .limit(1);
  if (existing.length > 0) throw new Error("Boost newsletter campaign is already queued");

  const audience = await loadEligibleAudience();
  const groups = partitionBoostNewsletterAudience(audience);
  const counts: Record<BoostNewsletterWaveKey, number> = { "0700": 0, "0800": 0, "0900": 0 };

  for (const wave of BOOST_NEWSLETTER_WAVES) {
    const taskUid = taskUids[wave.key]?.trim();
    if (!taskUid) throw new Error(`Missing task UID for wave ${wave.key}`);
    const members = groups[wave.key];
    const rows = members.map((member) => {
      const utmContent = `wave_${wave.key}`;
      const enrollmentUrl = `https://hilitcaspi.com/match-boost?utm_source=brevo&utm_medium=email&utm_campaign=${BOOST_NEWSLETTER_CAMPAIGN_KEY}&utm_content=${utmContent}`;
      const unsubscribeToken = createBoostNewsletterUnsubscribeToken(member.singleId, member.email);
      const unsubscribeUrl = `https://hilitcaspi.com/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
      const email = buildBoostEnrollmentNewsletter({
        firstName: member.firstName,
        enrollmentUrl,
        unsubscribeUrl,
      });
      return {
        leadId: member.leadId,
        recipientEmail: member.email,
        recipientName: member.firstName,
        journeyKey: BOOST_NEWSLETTER_CAMPAIGN_KEY,
        emailIndex: wave.emailIndex,
        subject: email.subject,
        htmlBody: email.htmlContent,
        textBody: email.textContent,
        scheduledAt: wave.scheduledAt,
        sentAt: null,
        status: "processing" as const,
        errorMessage: scheduleMeta({ taskUid, wave: wave.key, state: "queued" }),
        createdAt: Date.now(),
      };
    });
    for (let offset = 0; offset < rows.length; offset += 25) {
      await db.insert(emailLog).values(rows.slice(offset, offset + 25));
    }
    counts[wave.key] = rows.length;
  }

  return { total: audience.length, counts, subject: BOOST_NEWSLETTER_SUBJECT, preheader: BOOST_NEWSLETTER_PREHEADER };
}

function deterministicBatchUuid(waveKey: BoostNewsletterWaveKey, batchNumber: number) {
  const hex = crypto
    .createHash("sha256")
    .update(`${BOOST_NEWSLETTER_CAMPAIGN_KEY}:${waveKey}:${batchNumber}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export async function processBoostNewsletterWave(input: {
  waveKey: BoostNewsletterWaveKey;
  cronTaskUid: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const wave = waveByKey(input.waveKey);
  const queued = await db
    .select()
    .from(emailLog)
    .where(and(
      eq(emailLog.journeyKey, BOOST_NEWSLETTER_CAMPAIGN_KEY),
      eq(emailLog.emailIndex, wave.emailIndex),
      eq(emailLog.status, "processing"),
      isNull(emailLog.sentAt),
    ));

  if (queued.length === 0) return { wave: input.waveKey, sent: 0, suppressed: 0, complete: true };
  const metadata = queued.map((row) => parseScheduleMeta(row.errorMessage));
  if (metadata.some((meta) => !meta || meta.taskUid !== input.cronTaskUid || meta.wave !== input.waveKey)) {
    throw new Error("Heartbeat task UID does not match the queued Boost newsletter wave");
  }

  const eligible = new Set((await loadEligibleAudience()).map((member) => normalizeEmail(member.email)));
  const suppressed = queued.filter((row) => !eligible.has(normalizeEmail(row.recipientEmail)));
  for (let offset = 0; offset < suppressed.length; offset += 200) {
    const chunk = suppressed.slice(offset, offset + 200);
    await db.update(emailLog)
      .set({
        status: "cancelled",
        sentAt: Date.now(),
        errorMessage: scheduleMeta({ taskUid: input.cronTaskUid, wave: input.waveKey, state: "suppressed" }),
      })
      .where(inArray(emailLog.id, chunk.map((row) => row.id)));
  }

  const deliverable = queued
    .filter((row) => eligible.has(normalizeEmail(row.recipientEmail)))
    .sort((a, b) => a.id - b.id);
  let sent = 0;
  for (let offset = 0; offset < deliverable.length; offset += 1000) {
    const batch = deliverable.slice(offset, offset + 1000);
    const batchNumber = Math.floor(offset / 1000) + 1;
    const result = await sendEmailBatch({
      subject: BOOST_NEWSLETTER_SUBJECT,
      textContent: batch[0]?.textBody || "",
      versions: batch.map((row) => ({
        to: [{ email: row.recipientEmail, name: row.recipientName || undefined }],
        htmlContent: row.htmlBody,
      })),
      idempotencyKey: deterministicBatchUuid(input.waveKey, batchNumber),
    });
    if (!result.success) {
      await db.update(emailLog)
        .set({
          errorMessage: scheduleMeta({
            taskUid: input.cronTaskUid,
            wave: input.waveKey,
            state: "failed",
            detail: String(result.error || "Brevo batch failed").slice(0, 500),
          }),
        })
        .where(inArray(emailLog.id, batch.map((row) => row.id)));
      throw new Error(result.error || "Brevo batch failed");
    }
    const sentAt = Date.now();
    await db.update(emailLog)
      .set({
        status: "sent",
        sentAt,
        errorMessage: scheduleMeta({ taskUid: input.cronTaskUid, wave: input.waveKey, state: "sent" }),
      })
      .where(inArray(emailLog.id, batch.map((row) => row.id)));
    sent += batch.length;
  }

  return { wave: input.waveKey, sent, suppressed: suppressed.length, complete: true };
}

export async function unsubscribeBoostNewsletterMember(singleId: number, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = normalizeEmail(email);
  const profile = await db
    .select({ id: singles.id, email: singles.email })
    .from(singles)
    .where(eq(singles.id, singleId))
    .limit(1);
  if (!profile[0]?.email || normalizeEmail(profile[0].email) !== normalized) return false;

  const now = Date.now();
  await db.update(singles).set({ consentEmailMarketing: false, updatedAt: now }).where(eq(singles.id, singleId));
  await db.update(crmLeads)
    .set({ emailUnsubscribed: true, emailUnsubscribedAt: now, updatedAt: now })
    .where(sql`LOWER(TRIM(${crmLeads.email})) = ${normalized}`);
  return true;
}
