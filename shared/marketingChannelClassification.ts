/** Bounded labels only: raw source/campaign/product strings never leave this panel. */
export const MARKETING_CHANNELS = [
  { key: "google_organic", label: "Google · אורגני" },
  { key: "google_paid", label: "Google · ממומן" },
  { key: "youtube_organic", label: "YouTube · אורגני" },
  { key: "youtube_paid", label: "YouTube · ממומן" },
  { key: "google_unclassified", label: "Google · לא מסווג" },
  { key: "youtube_unclassified", label: "YouTube · לא מסווג" },
  { key: "other", label: "ערוצים אחרים" },
  { key: "unknown", label: "מקור לא ידוע" },
] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number]["key"];
export const MARKETING_PRODUCT_GROUPS = [
  { key: "database", label: "מאגר וחבילות" },
  { key: "meetings", label: "פגישות" },
  { key: "plus", label: "Plus" },
  { key: "boost", label: "Boost" },
  { key: "other", label: "מוצרים נוספים" },
  { key: "all", label: "כל המוצרים" },
] as const;
export type MarketingProductGroup =
  (typeof MARKETING_PRODUCT_GROUPS)[number]["key"];
const normalized = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
function platform(value: unknown): "google" | "youtube" | null {
  const raw = normalized(value);
  if (raw === "google" || raw === "youtube") return raw;
  try {
    const host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
    // Anchored host allowlists prevent lookalikes, Gmail and Google-owned apps becoming Search.
    if (
      /^(?:[a-z0-9-]+\.)*google\.(?:com|co\.il|co\.uk|de|fr|ca|com\.au|co\.in)$/.test(
        host
      )
    )
      return "google";
    if (/^(?:[a-z0-9-]+\.)*youtube\.com$/.test(host) || host === "youtu.be")
      return "youtube";
  } catch {
    /* no host evidence */
  }
  return null;
}
const PAID_MEDIUMS = new Set([
  "paid",
  "cpc",
  "ppc",
  "paid_search",
  "paid_video",
  "paid_social",
  "social_paid",
  "display",
  "cpm",
  "cpv",
  "paidsearch",
]);
const ORGANIC_MEDIUMS = new Set([
  "organic",
  "organic_search",
  "organic_video",
  "seo",
]);
export function classifyMarketingChannel(touch: {
  source?: unknown;
  medium?: unknown;
  referrer?: unknown;
}): MarketingChannel {
  const source = normalized(touch.source);
  const provider =
    platform(source) ||
    (!source || ["referral", "direct", "unknown", "(direct)"].includes(source)
      ? platform(touch.referrer)
      : null);
  if (provider) {
    const medium = normalized(touch.medium).replace(/[\s-]+/g, "_");
    if (PAID_MEDIUMS.has(medium)) return `${provider}_paid`;
    if (ORGANIC_MEDIUMS.has(medium)) return `${provider}_organic`;
    // A hostname/referral alone cannot rule out paid traffic. Campaign names are not proof.
    return `${provider}_unclassified`;
  }
  if (
    !source ||
    [
      "direct",
      "unknown",
      "(direct)",
      "none",
      "dna_quiz",
      "database",
      "paid_database",
      "paid_plus",
      "paid_guide",
    ].includes(source)
  )
    return "unknown";
  return "other";
}
const PRODUCTS: Record<
  string,
  { group: Exclude<MarketingProductGroup, "all">; label: string }
> = {
  database: { group: "database", label: "מאגר רגיל" },
  bundle_november: { group: "database", label: "חבילת נובמבר" },
  bundle_tubav: { group: "database", label: "חבילת ט״ו באב" },
  bundle_new_year: { group: "database", label: "חבילת שנה חדשה" },
  session: { group: "meetings", label: "פגישה אישית" },
  plus: { group: "plus", label: "Plus · סוג חיוב לא מסווג" },
  database_plus: { group: "plus", label: "Database Plus · סוג חיוב לא מסווג" },
  match_boost: { group: "boost", label: "Match Boost" },
  boost: { group: "boost", label: "Boost" },
  guide: { group: "other", label: "מדריך" },
  course: { group: "other", label: "קורס" },
  coaching: { group: "other", label: "ליווי" },
  coaching_mas: { group: "other", label: "ליווי MAS" },
  live_october: { group: "other", label: "לייב אוקטובר" },
};
export function marketingProduct(product: unknown) {
  const key = normalized(product);
  return PRODUCTS[key]
    ? { key, ...PRODUCTS[key] }
    : { key: "unknown", group: "other" as const, label: "מוצר לא מזוהה" };
}
