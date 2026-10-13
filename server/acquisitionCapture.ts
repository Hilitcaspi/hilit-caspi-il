import { createHmac } from "node:crypto";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

export const acquisitionInputSchema = z.object({
  utmSource: z.string().max(100).optional(), utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(200).optional(), utmContent: z.string().max(200).optional(), utmTerm: z.string().max(200).optional(),
  metaCampaignId: z.string().max(100).optional(), metaAdSetId: z.string().max(100).optional(), metaAdId: z.string().max(100).optional(),
  capturedAt: z.number().finite().positive(),
});
export type AcquisitionSnapshot = z.infer<typeof acquisitionInputSchema>;
export function acquisitionActorKey(email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("acquisition_identity_unavailable");
  return createHmac("sha256", secret).update(`israel-acquisition:v1:${email.trim().toLowerCase()}`).digest("hex");
}
const safeTag = (value?: string) => {
  if (!value || /@|https?:|www\.|(?:token|session|transaction|process)[=:]|\b\d{7,}\b/i.test(value)) return null;
  return value.trim().replace(/[\r\n]/g, " ").slice(0, 200) || null;
};
/** A new return visit must never be represented as the first discovery of an old lead. */
export function prepareAcquisitionSnapshot(input: AcquisitionSnapshot | undefined, now: number, existingCreatedAt?: number | null) {
  const parsed = acquisitionInputSchema.safeParse(input);
  if (!parsed.success || parsed.data.capturedAt > now + 60_000 || parsed.data.capturedAt < now - 365 * 86400000) return null;
  if (existingCreatedAt != null && existingCreatedAt < parsed.data.capturedAt) return null;
  const value = parsed.data;
  return {
    utmSource: safeTag(value.utmSource), utmMedium: safeTag(value.utmMedium),
    utmCampaign: safeTag(value.utmCampaign), utmContent: safeTag(value.utmContent), utmTerm: safeTag(value.utmTerm),
    metaCampaignId: /^\d+$/.test(value.metaCampaignId || "") ? value.metaCampaignId! : null,
    metaAdSetId: /^\d+$/.test(value.metaAdSetId || "") ? value.metaAdSetId! : null,
    metaAdId: /^\d+$/.test(value.metaAdId || "") ? value.metaAdId! : null,
    capturedAt: Math.min(value.capturedAt, now),
  };
}
/** INSERT IGNORE on actor_key is an atomic write-once snapshot. No historical backfill. */
export async function recordAcquisitionSafely(email: string, input: AcquisitionSnapshot | undefined, existingCreatedAt?: number | null) {
  if (process.env.NODE_ENV !== "production" || !input) return;
  try {
    const db = await getDb();
    if (!db) return;
    const normalized = email.trim().toLowerCase();
    const [rows] = await db.execute(sql`SELECT MIN(first_at) AS firstAt FROM (
      SELECT createdAt AS first_at FROM crm_leads WHERE LOWER(TRIM(email)) = ${normalized}
      UNION ALL SELECT UNIX_TIMESTAMP(createdAt) * 1000 FROM leads WHERE LOWER(TRIM(email)) = ${normalized}
      UNION ALL SELECT createdAt FROM singles WHERE LOWER(TRIM(email)) = ${normalized}
      UNION ALL SELECT MIN(paid_at) FROM completed_payments WHERE LOWER(TRIM(email)) = ${normalized}
    ) AS known_contacts`) as any;
    const knownAt = rows?.[0]?.firstAt == null ? existingCreatedAt : Math.min(Number(rows[0].firstAt), existingCreatedAt ?? Infinity);
    const snapshot = prepareAcquisitionSnapshot(input, Date.now(), knownAt);
    if (!snapshot) return;
    await db.execute(sql`INSERT IGNORE INTO acquisition_first_touches
      (actor_key, utm_source, utm_medium, utm_campaign, utm_content, utm_term, meta_campaign_id, meta_adset_id, meta_ad_id, captured_at, recorded_at)
      VALUES (${acquisitionActorKey(email)}, ${snapshot.utmSource}, ${snapshot.utmMedium}, ${snapshot.utmCampaign}, ${snapshot.utmContent}, ${snapshot.utmTerm}, ${snapshot.metaCampaignId}, ${snapshot.metaAdSetId}, ${snapshot.metaAdId}, ${snapshot.capturedAt}, ${Date.now()})`);
  } catch { console.warn("[AcquisitionCapture] Snapshot unavailable; original source not inferred"); }
}
