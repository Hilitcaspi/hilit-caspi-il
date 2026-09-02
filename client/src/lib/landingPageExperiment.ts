export const EXPERIMENT_ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "meta_campaign_id",
  "meta_adset_id",
  "meta_ad_id",
  "meta_placement",
  "site_source_name",
] as const;

type ReadableStorage = Pick<Storage, "getItem">;

export function buildDatabaseJoinHref(
  currentSearch: string,
  sessionStore?: ReadableStorage | null,
  localStore?: ReadableStorage | null,
): string {
  const incoming = new URLSearchParams(currentSearch);
  const outgoing = new URLSearchParams({ source: "database" });

  for (const key of EXPERIMENT_ATTRIBUTION_KEYS) {
    const value = incoming.get(key) || sessionStore?.getItem(key) || localStore?.getItem(key);
    if (value) outgoing.set(key, value);
  }

  return `/join?${outgoing.toString()}`;
}
