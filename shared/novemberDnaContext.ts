import { isNovemberBundleOfferActive } from "./novemberBundleOffer";

/** Browser-session key only; it contains campaign metadata, never quiz answers or contact details. */
export const NOVEMBER_DNA_CONTEXT_STORAGE_KEY = "november_dna_context_v1";
export const NOVEMBER_DNA_RESULT_PATH = "/november-love";

export type NovemberDnaAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

export type NovemberDnaContext = {
  offer: "november";
  capturedAt: number;
  attribution: NovemberDnaAttribution;
};

export type NovemberDnaContextResolution = {
  context: NovemberDnaContext | null;
  shouldClear: boolean;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type AttributionInput = Partial<NovemberDnaAttribution> & Record<string, unknown>;
type ContextInput = {
  search: string;
  /** Injectable so campaign boundaries are deterministic in tests. */
  now?: number;
  /** A previously persisted context may fill absent source tags on a reload. */
  persisted?: unknown;
  /** Current acquisition snapshot, used only for the known UTM fields below. */
  fallbackAttribution?: AttributionInput;
};

const MAX_UTM_VALUE_LENGTH = 120;

function cleanAttributionValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, MAX_UTM_VALUE_LENGTH);
  if (!clean) return undefined;

  // Do not reflect obvious identifiers, URLs, or arbitrary query fragments into a result URL.
  if (
    clean.includes("@")
    || /(?:https?:\/\/|www\.)/i.test(clean)
    || /\+?\d[\d ()-]{6,}\d/.test(clean)
    || /[?&#=]/.test(clean)
  ) {
    return undefined;
  }
  return clean;
}

function valueFrom(input: AttributionInput | undefined, camel: keyof NovemberDnaAttribution, snake: string): string | undefined {
  if (!input) return undefined;
  return cleanAttributionValue(input[camel] ?? input[snake]);
}

/**
 * Keeps only explicit, non-identifying UTM metadata. It deliberately ignores
 * arbitrary query fields such as redirect, next, coupon, email and tokens.
 */
export function sanitizeNovemberDnaAttribution(input: AttributionInput | undefined): NovemberDnaAttribution {
  return {
    ...(valueFrom(input, "utmSource", "utm_source") ? { utmSource: valueFrom(input, "utmSource", "utm_source") } : {}),
    ...(valueFrom(input, "utmMedium", "utm_medium") ? { utmMedium: valueFrom(input, "utmMedium", "utm_medium") } : {}),
    ...(valueFrom(input, "utmCampaign", "utm_campaign") ? { utmCampaign: valueFrom(input, "utmCampaign", "utm_campaign") } : {}),
    ...(valueFrom(input, "utmContent", "utm_content") ? { utmContent: valueFrom(input, "utmContent", "utm_content") } : {}),
  };
}

function attributionFromSearch(search: string): NovemberDnaAttribution {
  const params = new URLSearchParams(search);
  return sanitizeNovemberDnaAttribution({
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    utm_content: params.get("utm_content") ?? undefined,
  });
}

function mergeAttribution(...sources: Array<NovemberDnaAttribution | undefined>): NovemberDnaAttribution {
  const merged: NovemberDnaAttribution = {};
  for (const source of sources) {
    if (!source) continue;
    for (const key of ["utmSource", "utmMedium", "utmCampaign", "utmContent"] as const) {
      if (merged[key] === undefined && source[key] !== undefined) merged[key] = source[key];
    }
  }
  return merged;
}

/** Parses a stored value defensively and invalidates it as soon as the offer closes. */
export function parseNovemberDnaContext(value: unknown, now = Date.now()): NovemberDnaContext | null {
  if (!value || typeof value !== "object" || !isNovemberBundleOfferActive(now)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.offer !== "november" || typeof candidate.capturedAt !== "number" || !Number.isFinite(candidate.capturedAt)) {
    return null;
  }

  return {
    offer: "november",
    capturedAt: candidate.capturedAt,
    attribution: sanitizeNovemberDnaAttribution(
      candidate.attribution && typeof candidate.attribution === "object"
        ? candidate.attribution as AttributionInput
        : undefined,
    ),
  };
}

/** Safely reads the non-PII browser-session campaign context. */
export function readNovemberDnaContext(storage: Pick<Storage, "getItem">, now = Date.now()): NovemberDnaContext | null {
  try {
    const raw = storage.getItem(NOVEMBER_DNA_CONTEXT_STORAGE_KEY);
    return raw ? parseNovemberDnaContext(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

/** Persists only an active, validated context; storage failures are non-blocking. */
export function writeNovemberDnaContext(storage: Pick<Storage, "setItem">, context: NovemberDnaContext, now = Date.now()): void {
  const safeContext = parseNovemberDnaContext(context, now);
  if (!safeContext) return;
  try {
    storage.setItem(NOVEMBER_DNA_CONTEXT_STORAGE_KEY, JSON.stringify(safeContext));
  } catch {
    // Browser privacy settings must never prevent the free quiz from working.
  }
}

export function clearNovemberDnaContext(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(NOVEMBER_DNA_CONTEXT_STORAGE_KEY);
  } catch {
    // Browser privacy settings must never prevent the free quiz from working.
  }
}

/**
 * Resolves a November context only from the single allowlisted offer value.
 * Any explicit different offer, or an untagged new DNA start, clears a prior
 * context instead of letting a campaign price or gift leak into another flow.
 */
export function resolveNovemberDnaContext({
  search,
  now = Date.now(),
  persisted,
  fallbackAttribution,
}: ContextInput): NovemberDnaContextResolution {
  const params = new URLSearchParams(search);
  const offers = params.getAll("offer").map(value => value.trim().toLowerCase());
  const explicitNovemberOffer = offers.length === 1 && offers[0] === "november";

  if (!explicitNovemberOffer || !isNovemberBundleOfferActive(now)) {
    return { context: null, shouldClear: true };
  }

  const stored = parseNovemberDnaContext(persisted, now);
  return {
    context: {
      offer: "november",
      capturedAt: now,
      attribution: mergeAttribution(
        attributionFromSearch(search),
        sanitizeNovemberDnaAttribution(fallbackAttribution),
        stored?.attribution,
      ),
    },
    shouldClear: false,
  };
}

/**
 * Creates the only November result destination. There is no caller-controlled
 * destination, product, price, coupon or entitlement query parameter.
 */
export function buildNovemberDnaResultHref(context: NovemberDnaContext | null | undefined, now = Date.now()): string | null {
  const safeContext = parseNovemberDnaContext(context, now);
  if (!safeContext) return null;

  const url = new URL(NOVEMBER_DNA_RESULT_PATH, "https://hilitcaspi.com");
  const attribution = safeContext.attribution;
  if (attribution.utmSource) url.searchParams.set("utm_source", attribution.utmSource);
  if (attribution.utmMedium) url.searchParams.set("utm_medium", attribution.utmMedium);
  if (attribution.utmCampaign) url.searchParams.set("utm_campaign", attribution.utmCampaign);
  if (attribution.utmContent) {
    url.searchParams.set("utm_content", attribution.utmContent);
    // Preserve the original creative/content label and add a dedicated result placement.
    url.searchParams.set("dna_placement", "dna_results");
  } else {
    url.searchParams.set("utm_content", "dna_results");
  }
  url.hash = "payment";
  return `${url.pathname}${url.search}${url.hash}`;
}
