export type BoostEntryChannel = "email" | "personal_area" | "other" | "unknown";
export type BoostEmailCampaign = "boost_opportunity" | "boost_approval_link";
const BOOST_SITE_ORIGIN = "https://hilitcaspi.com";
const BOOST_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** Attribution is the tagged entry used for this action, not proof of causation. */
export function boostEntryChannelFromSearch(search: string): BoostEntryChannel {
  const params = new URLSearchParams(search);
  const source = (params.get("utm_source") || "").trim().toLowerCase();
  const medium = (params.get("utm_medium") || "").trim().toLowerCase();
  if (["email", "brevo", "newsletter"].includes(source) || ["email", "newsletter"].includes(medium)) return "email";
  if (source || medium) return "other";
  return "personal_area";
}

/** Use the same tagged destination in HTML and plain-text email. No identity in UTM. */
export function withBoostEmailTracking(destination: string, campaign: BoostEmailCampaign): string {
  const url = new URL(destination, BOOST_SITE_ORIGIN);
  if (url.origin !== BOOST_SITE_ORIGIN || url.pathname !== "/my-profile") {
    throw new Error("Invalid Boost email destination");
  }
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "lifecycle");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", campaign === "boost_opportunity" ? "view_offer" : "approve_boost");
  // A prior caller's term must not attach an email/token/name to analytics tags.
  url.searchParams.delete("utm_term");
  return url.toString();
}

/** Keep only UTM when the landing page forwards an authenticated personal link. */
export function preserveBoostTracking(destination: string, entrySearch: string): string {
  const url = new URL(destination, BOOST_SITE_ORIGIN);
  if (url.origin !== BOOST_SITE_ORIGIN || url.pathname !== "/my-profile") {
    throw new Error("Invalid Boost personal-area destination");
  }
  const entry = new URLSearchParams(entrySearch);
  for (const key of BOOST_UTM_KEYS) {
    const value = entry.get(key)?.trim();
    if (value) url.searchParams.set(key, value.slice(0, 200));
  }
  return destination.startsWith("/") ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}
