export const LIVE_LAUNCH_CAMPAIGN = "live_oct2026";
const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"] as const;

/** Preserve only campaign metadata, never member emails, tokens, or coupon overrides. */
export function liveDatabaseOfferHref(search: string): string {
  const current = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const key of TRACKING_KEYS) {
    const value = current.get(key);
    if (value) kept.set(key, value.slice(0, 500));
  }
  return `/live/database${kept.size ? `?${kept.toString()}` : ""}`;
}

/** First-party SMS aliases with fixed destinations: cannot act as an open redirect. */
export function liveSmsAliasTarget(path: string, search = ""): string | null {
  const content = path === "/ld" ? "cold_database" : path === "/ll" ? "member_live" : path === "/lp" ? "plus_live" : null;
  if (!content) return null;
  const target = path === "/ld" ? "/live/database" : "/live";
  const hour = new URLSearchParams(search).get("h");
  const waveContent = path === "/ld" && ["19", "20", "21"].includes(hour || "") ? `${content}_${hour}00` : content;
  const query = new URLSearchParams({ utm_source: "sms", utm_medium: "sms", utm_campaign: LIVE_LAUNCH_CAMPAIGN, utm_content: waveContent });
  return `${target}?${query.toString()}`;
}
