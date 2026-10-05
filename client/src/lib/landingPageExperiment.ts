export const EXPERIMENT_ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "coupon",
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

/** The LIVE gift is automatic; a validated checkout test may explicitly override it. */
export function buildLiveDatabaseJoinHref(
  currentSearch: string,
  sessionStore?: ReadableStorage | null,
  localStore?: ReadableStorage | null,
  appliedTestCode?: "TEST1",
): string {
  const params = new URLSearchParams(currentSearch);
  params.set("coupon", appliedTestCode === "TEST1" ? "TEST1" : "LIVE");
  if (!params.has("utm_source")) params.set("utm_source", "site");
  if (!params.has("utm_medium")) params.set("utm_medium", "live_page");
  if (!params.has("utm_campaign")) params.set("utm_campaign", "live_october_2026");
  return buildDatabaseJoinHref(params.toString(), sessionStore, localStore);
}
