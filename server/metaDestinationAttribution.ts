export type MetaAdUtmReference = { id: string; name: string; utmCampaigns?: string[] };
export type MetaDestinationUtmEvidence = {
  utmCampaigns: string[];
  attributionUtmCampaigns?: string[];
  adReferences: MetaAdUtmReference[];
};

/** Attribution uses complete evidence, never the capped/active-only display list. */
export function buildMetaDestinationUtmIndex(destinations: Record<string, MetaDestinationUtmEvidence>) {
  const campaignCandidates = new Map<string, Set<string>>();
  const adCandidates = new Map<string, Map<string, { campaignId: string; name: string }>>();
  for (const [campaignId, destination] of Object.entries(destinations)) {
    const allTags = new Set([...(destination.attributionUtmCampaigns ?? destination.utmCampaigns), ...destination.adReferences.flatMap(ad => ad.utmCampaigns ?? [])]);
    for (const tag of Array.from(allTags)) {
      const key = tag.trim().toLowerCase();
      if (!key) continue;
      const ids = campaignCandidates.get(key) ?? new Set<string>();
      ids.add(campaignId);
      campaignCandidates.set(key, ids);
    }
    for (const ad of destination.adReferences) {
      for (const tag of ad.utmCampaigns ?? []) {
        const key = tag.trim().toLowerCase();
        if (!key) continue;
        const ads = adCandidates.get(key) ?? new Map<string, { campaignId: string; name: string }>();
        ads.set(ad.id, { campaignId, name: ad.name });
        adCandidates.set(key, ads);
      }
    }
  }
  const uniqueUtmCampaigns = new Map<string, string>();
  const uniqueUtmAds = new Map<string, { campaignId: string; name: string }>();
  for (const [key, ids] of Array.from(campaignCandidates.entries())) {
    if (ids.size !== 1) continue;
    const campaignId = Array.from(ids)[0]!;
    uniqueUtmCampaigns.set(key, campaignId);
    const ads = adCandidates.get(key);
    if (ads?.size === 1) {
      const ad = Array.from(ads.values())[0]!;
      if (ad.campaignId === campaignId) uniqueUtmAds.set(key, ad);
    }
  }
  return { uniqueUtmCampaigns, uniqueUtmAds };
}
