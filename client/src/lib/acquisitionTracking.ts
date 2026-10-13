/**
 * Browser-only acquisition attribution.
 *
 * First touch is immutable once persisted. Last UTM is a separate, replace-only
 * snapshot so fields from separate visits are never combined.
 */
export type AcquisitionSnapshot = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  metaCampaignId?: string;
  metaAdSetId?: string;
  metaAdId?: string;
  capturedAt: number;
};

/** Last explicit tagged visit may retain legacy Grow attribution fields. */
export type LastUtmSnapshot = AcquisitionSnapshot & {
  metaPlacement?: string;
  siteSourceName?: string;
};

type SnapshotStorage = Pick<Storage, "getItem" | "setItem">;

type BrowserContext = {
  location: Pick<Location, "search" | "hostname"> & Partial<Pick<Location, "pathname">>;
  sessionStorage: SnapshotStorage;
  localStorage: SnapshotStorage;
};

export const acquisitionStorageKeys = {
  firstTouch: "acquisition_first_touch_v1",
  lastUtm: "acquisition_last_utm_v1",
} as const;

const FIELD_NAMES = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
  meta_campaign_id: "metaCampaignId",
  meta_adset_id: "metaAdSetId",
  meta_ad_id: "metaAdId",
} as const;

const SNAPSHOT_FIELDS = Object.values(FIELD_NAMES);
const LAST_UTM_ONLY_FIELDS = {
  meta_placement: "metaPlacement",
  site_source_name: "siteSourceName",
} as const;

function getBrowser(): BrowserContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window;
}

function getStorage(kind: "sessionStorage" | "localStorage"): SnapshotStorage | undefined {
  try {
    return getBrowser()?.[kind];
  } catch {
    // Some privacy modes throw while merely reading the storage property.
    return undefined;
  }
}

function getDocumentReferrer(): string {
  if (typeof document === "undefined") return "";
  try {
    return document.referrer || "";
  } catch {
    return "";
  }
}

function normalizeValue(value: string | null, maxLength = 200): string | undefined {
  const normalized = value?.trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, maxLength);
  return normalized || undefined;
}

function isSnapshot(value: unknown): value is AcquisitionSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot.capturedAt !== "number" || !Number.isFinite(snapshot.capturedAt) || snapshot.capturedAt <= 0) {
    return false;
  }
  return SNAPSHOT_FIELDS.every(field => snapshot[field] === undefined || typeof snapshot[field] === "string");
}

function readSnapshot(storage: SnapshotStorage, key: string): AcquisitionSnapshot | undefined {
  try {
    const raw = storage.getItem(key);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Write one complete JSON snapshot per store; never write attribution fields individually. */
function persistSnapshot(storage: SnapshotStorage, key: string, snapshot: AcquisitionSnapshot): void {
  try {
    storage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Privacy settings and quota errors must not block forms or checkout.
  }
}

function readPersistedSnapshot(key: string, prefer: "earliest" | "latest" = "earliest"): AcquisitionSnapshot | undefined {
  const sessionStorage = getStorage("sessionStorage");
  const localStorage = getStorage("localStorage");
  const session = sessionStorage ? readSnapshot(sessionStorage, key) : undefined;
  const local = localStorage ? readSnapshot(localStorage, key) : undefined;
  if (!session) return local;
  if (!local) return session;
  if (prefer === "latest") {
    return session.capturedAt >= local.capturedAt ? { ...session } : { ...local };
  }
  // If a browser restores an older session, retain the earliest identifiable visit.
  return session.capturedAt <= local.capturedAt ? { ...session } : { ...local };
}

function persistToSessionAndLocal(key: string, snapshot: AcquisitionSnapshot): void {
  const sessionStorage = getStorage("sessionStorage");
  const localStorage = getStorage("localStorage");
  if (sessionStorage) persistSnapshot(sessionStorage, key, snapshot);
  if (localStorage) persistSnapshot(localStorage, key, snapshot);
}

function snapshotFromSearch(search: string, capturedAt: number): AcquisitionSnapshot | undefined {
  const params = new URLSearchParams(search);
  const snapshot: Partial<AcquisitionSnapshot> = {};
  for (const [queryField, snapshotField] of Object.entries(FIELD_NAMES)) {
    const value = normalizeValue(params.get(queryField), snapshotField === "utmSource" || snapshotField === "utmMedium" ? 100 : 200);
    if (value) snapshot[snapshotField] = value;
  }
  return Object.keys(snapshot).length > 0 ? { ...snapshot, capturedAt } : undefined;
}

function lastUtmSnapshotFromSearch(search: string, capturedAt: number): LastUtmSnapshot | undefined {
  const core = snapshotFromSearch(search, capturedAt);
  const params = new URLSearchParams(search);
  const extras: Partial<LastUtmSnapshot> = {};
  for (const [queryField, snapshotField] of Object.entries(LAST_UTM_ONLY_FIELDS)) {
    const value = normalizeValue(params.get(queryField));
    if (value) extras[snapshotField] = value;
  }
  return core || Object.keys(extras).length > 0 ? { ...core, ...extras, capturedAt } : undefined;
}

function sameAttribution(left: AcquisitionSnapshot | undefined, right: AcquisitionSnapshot): boolean {
  return Boolean(left) && [...SNAPSHOT_FIELDS, ...Object.values(LAST_UTM_ONLY_FIELDS)].every(field => (left as any)?.[field] === (right as any)[field]);
}

function siteHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isNonIsraeliPage(): boolean {
  const location = getBrowser()?.location;
  return !!location && (siteHostname(location.hostname) === "matchbyhilit.com" || location.pathname === "/en" || !!location.pathname?.startsWith("/en/"));
}

function snapshotFromExternalReferrer(referrer: string, currentHostname: string, capturedAt: number): AcquisitionSnapshot | undefined {
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (!hostname || siteHostname(hostname) === siteHostname(currentHostname)) return undefined;
    // Keep only the hostname. Never retain a referrer path, query string, or inferred channel.
    return { utmSource: hostname.slice(0, 100), utmMedium: "referral", capturedAt };
  } catch {
    return undefined;
  }
}

/**
 * Capture the current visit. Explicit URL tags refresh last UTM, while the
 * first identifiable touch is written only once. An untagged/direct visit is
 * intentionally left unknown rather than guessed as a marketing channel.
 */
export function captureAcquisition(now = Date.now()): void {
  const browser = getBrowser();
  if (!browser || isNonIsraeliPage()) return;

  const taggedVisit = snapshotFromSearch(browser.location.search, now);
  const lastTaggedVisit = lastUtmSnapshotFromSearch(browser.location.search, now);
  if (lastTaggedVisit && !sameAttribution(readPersistedSnapshot(acquisitionStorageKeys.lastUtm, "latest"), lastTaggedVisit)) {
    persistToSessionAndLocal(acquisitionStorageKeys.lastUtm, lastTaggedVisit);
  }

  if (readPersistedSnapshot(acquisitionStorageKeys.firstTouch)) return;

  const firstIdentifiable = taggedVisit ?? snapshotFromExternalReferrer(
    getDocumentReferrer(),
    browser.location.hostname,
    now,
  );
  if (firstIdentifiable) {
    persistToSessionAndLocal(acquisitionStorageKeys.firstTouch, firstIdentifiable);
  }
}

/** Returns the immutable first identifiable browser touch for supported API inputs. */
export function getFirstTouchAcquisition(): AcquisitionSnapshot | undefined {
  if (isNonIsraeliPage()) return undefined;
  captureAcquisition();
  return readPersistedSnapshot(acquisitionStorageKeys.firstTouch);
}

/** Returns the independent most-recent explicit UTM/meta-tagged visit. */
export function getLastUtmAcquisition(): LastUtmSnapshot | undefined {
  if (isNonIsraeliPage()) return undefined;
  captureAcquisition();
  return readPersistedSnapshot(acquisitionStorageKeys.lastUtm, "latest") as LastUtmSnapshot | undefined;
}
