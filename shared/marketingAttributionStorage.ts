/**
 * Atomic browser attribution contract. Tags describe links, not verified ad
 * clicks. No click IDs, personal data or arbitrary URL fields are accepted.
 */
export const marketingAttributionFields = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
  meta_campaign_id: "metaCampaignId",
  meta_adset_id: "metaAdSetId",
  meta_ad_id: "metaAdId",
} as const;

export const lastUtmOnlyFields = {
  meta_placement: "metaPlacement",
  site_source_name: "siteSourceName",
} as const;

export type MarketingAttributionField =
  | (typeof marketingAttributionFields)[keyof typeof marketingAttributionFields]
  | (typeof lastUtmOnlyFields)[keyof typeof lastUtmOnlyFields];
export type AcquisitionSnapshot = Partial<
  Record<
    (typeof marketingAttributionFields)[keyof typeof marketingAttributionFields],
    string
  >
> & { capturedAt: number };
export type LastUtmSnapshot = AcquisitionSnapshot & {
  metaPlacement?: string;
  siteSourceName?: string;
};
export type MarketingUtmParams = Pick<
  AcquisitionSnapshot,
  "utmSource" | "utmMedium" | "utmCampaign" | "utmContent" | "utmTerm"
>;

export const acquisitionStorageKeys = {
  firstTouch: "acquisition_first_touch_v1",
  lastUtm: "acquisition_last_utm_v1",
} as const;

const ALL_FIELDS: MarketingAttributionField[] = [
  ...Object.values(marketingAttributionFields),
  ...Object.values(lastUtmOnlyFields),
];
const UTM_FIELDS = [
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
] as const;
const ID_FIELDS = new Set<MarketingAttributionField>([
  "metaCampaignId",
  "metaAdSetId",
  "metaAdId",
]);
const SENSITIVE_ASSIGNMENT =
  /(?:email|e-mail|phone|mobile|name|token|session|transaction|process|password|answer|question|gender|religion|orientation|marital[_ -]?status|dna[_ -]?(?:result|score)|דוא[״"']?ל|טלפון|תשובה|שם)\s*:/i;
const SAFE_TAG_CHARACTERS = new RegExp(
  "^[\\p{L}\\p{M}\\p{N} _.,+\\-:()[\\]!'\"’״׳/&]+$",
  "u"
);
const SAFE_PATH_SEGMENT = new RegExp("^[\\p{L}\\p{M}\\p{N}_.-]+$", "u");
const URL_VALUE = new RegExp(
  "https?:|www\\.|\\/\\/|^[/.]|[\\p{L}\\p{N}-]+\\.[a-z]{2,}(?:\\/|:)",
  "iu"
);

function containsPhone(value: string): boolean {
  const candidates = value.match(/\+?\d[\d\s().-]{5,}\d/g) ?? [];
  return candidates.some(candidate => {
    const digits = candidate.replace(/\D/g, "");
    // Campaign date suffixes are common; do not reject legitimate YYYYMMDD tags.
    if (
      /^(?:19|20)\d{2}[. -]?(?:0[1-9]|1[0-2])[. -]?(?:0[1-9]|[12]\d|3[01])$/.test(
        candidate
      )
    )
      return false;
    return digits.length >= 7;
  });
}

/** Structural allowlist, not a campaign-name catalogue: preserve ordinary names. */
export function sanitizeMarketingAttributionValue(
  value: unknown,
  field: MarketingAttributionField
): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().normalize("NFC");
  const maxLength =
    field === "utmSource" || field === "utmMedium" || ID_FIELDS.has(field)
      ? 100
      : 200;
  if (
    !clean ||
    clean.length > maxLength ||
    /[\u0000-\u001f\u007f-\u009f]/.test(value)
  )
    return undefined;
  // Dedicated ad IDs may be numeric. Do not mistake them for telephone numbers.
  if (ID_FIELDS.has(field))
    return /^[a-z0-9_-]+$/i.test(clean) ? clean : undefined;
  if (!SAFE_TAG_CHARACTERS.test(clean)) return undefined;
  if (
    URL_VALUE.test(clean) ||
    SENSITIVE_ASSIGNMENT.test(clean) ||
    containsPhone(clean)
  )
    return undefined;
  return clean;
}

/** Whitelist one snapshot in isolation; never merge fields from different stores. */
export function sanitizeMarketingAttributionSnapshot(
  value: unknown
): LastUtmSnapshot | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const input = value as Record<string, unknown>;
  if (
    typeof input.capturedAt !== "number" ||
    !Number.isFinite(input.capturedAt) ||
    input.capturedAt <= 0
  )
    return undefined;
  const output: LastUtmSnapshot = { capturedAt: input.capturedAt };
  for (const field of ALL_FIELDS) {
    const safe = sanitizeMarketingAttributionValue(input[field], field);
    if (safe) output[field] = safe;
  }
  // Retain the timestamp even if all tags were unsafe: an established first
  // touch must not be replaced by a later visit simply because it was redacted.
  return output;
}

export function selectMarketingAttributionSnapshot(
  session: unknown,
  local: unknown,
  prefer: "earliest" | "latest"
): LastUtmSnapshot | undefined {
  const left = sanitizeMarketingAttributionSnapshot(session);
  const right = sanitizeMarketingAttributionSnapshot(local);
  if (!left) return right;
  if (!right) return left;
  return prefer === "latest"
    ? left.capturedAt >= right.capturedAt
      ? left
      : right
    : left.capturedAt <= right.capturedAt
      ? left
      : right;
}

export function marketingUtmParams(snapshot: unknown): MarketingUtmParams {
  const input =
    snapshot && typeof snapshot === "object"
      ? (snapshot as Record<string, unknown>)
      : {};
  const output: MarketingUtmParams = {};
  for (const field of UTM_FIELDS) {
    const safe = sanitizeMarketingAttributionValue(input[field], field);
    if (safe) output[field] = safe;
  }
  return output;
}

/** Analytics paths are route labels only, never query strings or personal tokens. */
export function sanitizeMarketingPagePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  let path: string;
  try {
    path =
      value.startsWith("/") && !value.startsWith("//")
        ? value.split(/[?#]/)[0]
        : new URL(value).pathname;
    path = decodeURIComponent(path);
  } catch {
    return undefined;
  }
  if (!path.startsWith("/") || /[\u0000-\u001f\u007f-\u009f]/.test(path))
    return undefined;
  const segments = path.split("/");
  return (
    segments
      .map((segment, index) => {
        if (!segment) return "";
        if (
          segment.length > 40 ||
          !SAFE_PATH_SEGMENT.test(segment) ||
          containsPhone(segment) ||
          /^(?:[a-f0-9]{16,}|[a-f0-9-]{36})$/i.test(segment)
        )
          return ":id";
        // These routes may carry personal answers, IDs or access tokens in a path.
        if (
          index > 1 &&
          /^(?:profile|personal|account|match|matches|resume|reset|unsubscribe|quiz|dna|dna-quiz|questionnaire)$/i.test(
            segments[1]
          )
        )
          return ":id";
        return segment;
      })
      .join("/")
      .slice(0, 200) || "/"
  );
}
