/**
 * Browser-only acquisition attribution.
 *
 * First touch is immutable once persisted. Last UTM is a separate, replace-only
 * snapshot so fields from separate visits are never combined.
 */
import {
  acquisitionStorageKeys,
  lastUtmOnlyFields,
  marketingAttributionFields,
  marketingUtmParams,
  sanitizeMarketingAttributionSnapshot,
  sanitizeMarketingAttributionValue,
  selectMarketingAttributionSnapshot,
  type AcquisitionSnapshot,
  type LastUtmSnapshot,
  type MarketingUtmParams,
} from "@shared/marketingAttributionStorage";

export { acquisitionStorageKeys };
export type { AcquisitionSnapshot, LastUtmSnapshot };

type SnapshotStorage = Pick<Storage, "getItem" | "setItem">;

type BrowserContext = {
  location: Pick<Location, "search" | "hostname"> &
    Partial<Pick<Location, "pathname">>;
  sessionStorage: SnapshotStorage;
  localStorage: SnapshotStorage;
};

// A changed SPA path is internal navigation, not a new acquisition visit.
// Weak keys avoid retaining browser contexts and keep browserless use safe.
const entryPaths = new WeakMap<
  BrowserContext,
  { path: string | undefined; navigated: boolean }
>();
const SNAPSHOT_FIELDS = Object.values(marketingAttributionFields);

function getBrowser(): BrowserContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window;
}

function getStorage(
  kind: "sessionStorage" | "localStorage"
): SnapshotStorage | undefined {
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

function readSnapshot(
  storage: SnapshotStorage,
  key: string
): LastUtmSnapshot | undefined {
  try {
    const raw = storage.getItem(key);
    if (!raw) return undefined;
    return sanitizeMarketingAttributionSnapshot(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/** Write one complete JSON snapshot per store; never write attribution fields individually. */
function persistSnapshot(
  storage: SnapshotStorage,
  key: string,
  snapshot: AcquisitionSnapshot
): void {
  try {
    storage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Privacy settings and quota errors must not block forms or checkout.
  }
}

function readPersistedSnapshot(
  key: string,
  prefer: "earliest" | "latest" = "earliest"
): LastUtmSnapshot | undefined {
  const sessionStorage = getStorage("sessionStorage");
  const localStorage = getStorage("localStorage");
  const session = sessionStorage
    ? readSnapshot(sessionStorage, key)
    : undefined;
  const local = localStorage ? readSnapshot(localStorage, key) : undefined;
  return selectMarketingAttributionSnapshot(session, local, prefer);
}

function persistToSessionAndLocal(
  key: string,
  snapshot: AcquisitionSnapshot
): void {
  const sessionStorage = getStorage("sessionStorage");
  const localStorage = getStorage("localStorage");
  if (sessionStorage) persistSnapshot(sessionStorage, key, snapshot);
  if (localStorage) persistSnapshot(localStorage, key, snapshot);
}

function snapshotFromSearch(
  search: string,
  capturedAt: number
): AcquisitionSnapshot | undefined {
  const params = new URLSearchParams(search);
  const snapshot: Partial<AcquisitionSnapshot> = {};
  for (const [queryField, snapshotField] of Object.entries(
    marketingAttributionFields
  )) {
    const value = sanitizeMarketingAttributionValue(
      params.get(queryField),
      snapshotField
    );
    if (value) snapshot[snapshotField] = value;
  }
  return Object.keys(snapshot).length > 0
    ? { ...snapshot, capturedAt }
    : undefined;
}

function lastUtmSnapshotFromSearch(
  search: string,
  capturedAt: number
): LastUtmSnapshot | undefined {
  const core = snapshotFromSearch(search, capturedAt);
  const params = new URLSearchParams(search);
  const extras: Partial<LastUtmSnapshot> = {};
  for (const [queryField, snapshotField] of Object.entries(lastUtmOnlyFields)) {
    const value = sanitizeMarketingAttributionValue(
      params.get(queryField),
      snapshotField
    );
    if (value) extras[snapshotField] = value;
  }
  return core || Object.keys(extras).length > 0
    ? { ...core, ...extras, capturedAt }
    : undefined;
}

function sameAttribution(
  left: LastUtmSnapshot | undefined,
  right: LastUtmSnapshot
): boolean {
  return (
    Boolean(left) &&
    [...SNAPSHOT_FIELDS, ...Object.values(lastUtmOnlyFields)].every(
      field => left?.[field] === right[field]
    )
  );
}

function siteHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isNonIsraeliPage(): boolean {
  const location = getBrowser()?.location;
  return (
    !!location &&
    (siteHostname(location.hostname) === "matchbyhilit.com" ||
      location.pathname === "/en" ||
      !!location.pathname?.startsWith("/en/"))
  );
}

function isInternalReferrer(
  referrer: string,
  currentHostname: string
): boolean {
  try {
    return (
      siteHostname(new URL(referrer).hostname) === siteHostname(currentHostname)
    );
  } catch {
    return false;
  }
}

function isOnsiteTag(snapshot: LastUtmSnapshot | undefined): boolean {
  return (
    /^(?:site|site_upsell|onsite|internal)$/i.test(snapshot?.utmSource ?? "") ||
    /^(?:onsite|internal)$/i.test(snapshot?.utmMedium ?? "")
  );
}

function snapshotFromExternalReferrer(
  referrer: string,
  currentHostname: string,
  capturedAt: number
): AcquisitionSnapshot | undefined {
  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();
    if (
      !/^https?:$/.test(url.protocol) ||
      !hostname ||
      isInternalReferrer(referrer, currentHostname)
    )
      return undefined;
    // Keep only the hostname. Never retain a referrer path, query string, or inferred channel.
    const source = sanitizeMarketingAttributionValue(hostname, "utmSource");
    return source
      ? { utmSource: source, utmMedium: "referral", capturedAt }
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Capture an identifiable entry visit. Direct/untagged and demonstrably internal
 * navigation preserve both existing lenses; explicit external entry tags replace
 * last UTM as one bundle. First touch is never reconstructed from legacy keys.
 */
export function captureAcquisition(now = Date.now()): void {
  const browser = getBrowser();
  if (!browser || isNonIsraeliPage() || !Number.isFinite(now) || now <= 0)
    return;

  if (!entryPaths.has(browser))
    entryPaths.set(browser, {
      path: browser.location.pathname,
      navigated: false,
    });
  const entry = entryPaths.get(browser)!;
  if (entry.path !== browser.location.pathname) entry.navigated = true;
  const referrer = getDocumentReferrer();
  const lastTaggedVisit = lastUtmSnapshotFromSearch(
    browser.location.search,
    now
  );
  if (
    entry.navigated ||
    isInternalReferrer(referrer, browser.location.hostname) ||
    isOnsiteTag(lastTaggedVisit)
  )
    return;

  if (
    lastTaggedVisit &&
    !sameAttribution(
      readPersistedSnapshot(acquisitionStorageKeys.lastUtm, "latest"),
      lastTaggedVisit
    )
  ) {
    persistToSessionAndLocal(acquisitionStorageKeys.lastUtm, lastTaggedVisit);
  }

  if (readPersistedSnapshot(acquisitionStorageKeys.firstTouch)) return;

  const firstIdentifiable =
    snapshotFromSearch(browser.location.search, now) ??
    snapshotFromExternalReferrer(referrer, browser.location.hostname, now);
  if (firstIdentifiable)
    persistToSessionAndLocal(
      acquisitionStorageKeys.firstTouch,
      firstIdentifiable
    );
}

/** Returns the immutable first identifiable browser touch for supported API inputs. */
export function getFirstTouchAcquisition(): AcquisitionSnapshot | undefined {
  if (isNonIsraeliPage()) return undefined;
  captureAcquisition();
  const stored = readPersistedSnapshot(acquisitionStorageKeys.firstTouch);
  if (!stored) return undefined;
  const first: AcquisitionSnapshot = { capturedAt: stored.capturedAt };
  for (const field of SNAPSHOT_FIELDS) {
    if (stored[field]) first[field] = stored[field];
  }
  return first;
}

/** Returns the independent most-recent explicit UTM/meta-tagged visit. */
export function getLastUtmAcquisition(): LastUtmSnapshot | undefined {
  if (isNonIsraeliPage()) return undefined;
  captureAcquisition();
  return readPersistedSnapshot(acquisitionStorageKeys.lastUtm, "latest");
}

/**
 * Shared typed event getter. Reuses checkout's last-UTM snapshot, never a field
 * fallback to first touch or old individual keys. Legacy keys have neither an
 * atomic bundle nor reliable per-field visit timestamps, even when a global
 * utm_captured_at exists: leaving them unknown is safer than inventing history.
 * English/US pages read only their current explicit URL tags, without accessing
 * Israeli snapshots or upgrading their legacy values to verified attribution.
 */
export function getMarketingUtmParams(): MarketingUtmParams {
  const browser = getBrowser();
  if (!browser) return {};
  if (isNonIsraeliPage())
    return marketingUtmParams(
      snapshotFromSearch(browser.location.search, Date.now())
    );
  // A storage-denied browser may still use the current coherent tagged bundle
  // for this event only. No in-memory or click-ID persistence is introduced.
  const stored = getLastUtmAcquisition();
  if (stored) return marketingUtmParams(stored);
  if (
    entryPaths.get(browser)?.navigated ||
    isInternalReferrer(getDocumentReferrer(), browser.location.hostname)
  )
    return {};
  const current = lastUtmSnapshotFromSearch(
    browser.location.search,
    Date.now()
  );
  return isOnsiteTag(current) ? {} : marketingUtmParams(current);
}
