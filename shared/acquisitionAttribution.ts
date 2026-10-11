/** Acquisition and checkout are separate lenses. Never overwrite a captured
 * acquisition bundle with the checkout's UTM. Checkout UTM remains stored in
 * payment_leads and completed_payments. This does not reconstruct history. */
export type AcquisitionBundle = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  metaCampaignId?: string | null;
  metaAdSetId?: string | null;
  metaAdId?: string | null;
};

const KEYS = ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "metaCampaignId", "metaAdSetId", "metaAdId"] as const;

export function captureAcquisitionIfMissing(existing: AcquisitionBundle, incoming: AcquisitionBundle): Partial<AcquisitionBundle> {
  // A generic registration category is not an acquisition UTM. Treat the
  // captured bundle atomically to avoid fabricating source/campaign combinations.
  if (KEYS.some(key => typeof existing[key] === "string" && existing[key]!.trim())) return {};
  const captured: Partial<AcquisitionBundle> = {};
  for (const key of KEYS) {
    const value = incoming[key];
    if (typeof value === "string" && value.trim()) captured[key] = value.trim();
  }
  return captured;
}
