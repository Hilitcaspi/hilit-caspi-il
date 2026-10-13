import { prepareAcquisitionSnapshot, type AcquisitionSnapshot } from "./acquisitionCapture";

/** Fields from an authenticated lead-details response, never a form name guess. */
export function metaAcquisitionSnapshot(lead: Record<string, unknown>, now = Date.now()): AcquisitionSnapshot | undefined {
  const parsedAt = typeof lead.created_time === "string" ? Date.parse(lead.created_time) : NaN;
  if (!Number.isFinite(parsedAt)) return undefined;
  const id = (value: unknown) => typeof value === "string" && /^\d+$/.test(value) ? value : undefined;
  const snapshot: AcquisitionSnapshot = {
    utmSource: "meta", utmMedium: "paid_social",
    metaCampaignId: id(lead.campaign_id), metaAdSetId: id(lead.adset_id), metaAdId: id(lead.ad_id),
    capturedAt: parsedAt,
  };
  // A timestamp alone does not establish a paid acquisition (organic form submissions exist).
  if (!snapshot.metaAdId && !snapshot.metaCampaignId) return undefined;
  return prepareAcquisitionSnapshot(snapshot, now) ? snapshot : undefined;
}

/** Extra attribution fields must never prevent the existing lead intake from working. */
export async function fetchMetaLeadDetails(url: string): Promise<Response> {
  const detailed = new URL(url);
  detailed.searchParams.set("fields", "id,created_time,field_data,ad_id,adset_id,campaign_id");
  try {
    const response = await fetch(detailed, { signal: AbortSignal.timeout(10_000) });
    if (response.ok) return response;
  } catch {
    // Attribution enrichment must not block the original lead intake.
  }
  return fetch(url, { signal: AbortSignal.timeout(10_000) });
}
