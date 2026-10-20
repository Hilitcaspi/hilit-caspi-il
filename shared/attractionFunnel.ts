export const ATTRACTION_GUIDE_PATH = "/attraction";
export const ATTRACTION_CAMPAIGN = "podcast_attraction";

const destinations = {
  database: "/database",
  guide: "/guide",
  dna: "/dna-quiz",
  community: "/api/wa/site?mode=gi_t",
} as const;

export type AttractionDestination = keyof typeof destinations;

/** Internal touch only. The existing acquisition helper retains first touch separately. */
export function attractionHref(destination: AttractionDestination, placement: string): string {
  const path = destinations[destination];
  const params = new URLSearchParams({
    utm_source: "website",
    utm_medium: "onsite",
    utm_campaign: ATTRACTION_CAMPAIGN,
    utm_content: `${destination}_${placement}`,
  });
  return `${path}${path.includes("?") ? "&" : "?"}${params}`;
}

/** Public distribution links contain no buyer identity, tokens or inferred demographics. */
export function attractionEntryHref(source: "instagram" | "facebook" | "youtube" | "whatsapp", placement: string): string {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: source === "whatsapp" ? "community" : "organic_social",
    utm_campaign: ATTRACTION_CAMPAIGN,
    utm_content: placement,
  });
  return `https://hilitcaspi.com${ATTRACTION_GUIDE_PATH}?${params}`;
}
