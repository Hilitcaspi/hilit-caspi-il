export interface CheckoutAttemptIdentity {
  product: string;
  email: string;
  boostMatchId?: number;
}

export interface CheckoutStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CheckoutOwnerLease {
  readonly attemptId: string;
  readonly ownerId: string;
  readonly leaseId: number;
}

const ATTEMPT_STORAGE_PREFIX = "grow-checkout-attempt:v1";
const COMPLETED_ATTEMPT_STORAGE_PREFIX = "grow-checkout-completed:v1";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let currentCheckoutOwner: CheckoutOwnerLease | null = null;
let nextLeaseId = 1;
const terminalAttemptIds = new Set<string>();

export function normalizeCheckoutEmail(email: string): string {
  return email.trim().toLowerCase();
}

function opaqueKeyPart(value: string): string {
  // This deterministic hash namespaces browser storage without exposing an
  // email in the key. It is not a security credential.
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * The session value is only an opaque UUID. The key separates checkout intent
 * by product, normalized email, and (when applicable) Boost without storing
 * readable personal data or a payment/provider credential.
 */
export function checkoutAttemptStorageKey({ product, email, boostMatchId }: CheckoutAttemptIdentity): string {
  const boostPart = boostMatchId === undefined ? "" : `:boost-${boostMatchId}`;
  return `${ATTEMPT_STORAGE_PREFIX}:${encodeURIComponent(product)}:${opaqueKeyPart(normalizeCheckoutEmail(email))}${boostPart}`;
}

function completedAttemptStorageKey(attemptId: string): string {
  return `${COMPLETED_ATTEMPT_STORAGE_PREFIX}:${attemptId}`;
}

function sessionStorageOrNull(): CheckoutStorage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function createCheckoutAttemptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();

  // Modern checkout browsers have Web Crypto. This fallback stays UUID-shaped
  // when storage is restricted; the ID is an idempotency label, not a secret.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateCheckoutAttemptId(
  identity: CheckoutAttemptIdentity,
  storage: CheckoutStorage | null = sessionStorageOrNull(),
  createId: () => string = createCheckoutAttemptId,
): string {
  const key = checkoutAttemptStorageKey(identity);
  try {
    const existing = storage?.getItem(key);
    if (existing && UUID_V4.test(existing)) return existing;
    const attemptId = createId();
    if (!UUID_V4.test(attemptId)) throw new Error("Checkout attempt ID must be a UUID v4");
    storage?.setItem(key, attemptId);
    return attemptId;
  } catch {
    // Strict privacy mode may deny storage. The component ref still preserves
    // this one page's attempt; no personal/payment data is retained here.
    return createId();
  }
}

/** The terminal marker stores only a literal marker under an opaque UUID key. */
export function isCheckoutAttemptCompleted(
  attemptId: string,
  storage: CheckoutStorage | null = sessionStorageOrNull(),
): boolean {
  if (terminalAttemptIds.has(attemptId)) return true;
  try {
    return storage?.getItem(completedAttemptStorageKey(attemptId)) === "1";
  } catch {
    return false;
  }
}

function markCheckoutAttemptCompleted(
  attemptId: string,
  storage: CheckoutStorage | null = sessionStorageOrNull(),
): void {
  terminalAttemptIds.add(attemptId);
  try {
    storage?.setItem(completedAttemptStorageKey(attemptId), "1");
  } catch {
    // The in-memory marker still protects the live page from duplicate events.
  }
}

/**
 * Grow has one mutable SDK callback configuration per page. Claiming is sync,
 * so two click handlers cannot both become owner before their first await.
 */
export function acquireCheckoutOwner(
  attemptId: string,
  ownerId: string,
  storage: CheckoutStorage | null = sessionStorageOrNull(),
): CheckoutOwnerLease | null {
  if (currentCheckoutOwner || isCheckoutAttemptCompleted(attemptId, storage)) return null;
  const lease: CheckoutOwnerLease = Object.freeze({ attemptId, ownerId, leaseId: nextLeaseId++ });
  currentCheckoutOwner = lease;
  return lease;
}

export function isCheckoutOwner(lease: CheckoutOwnerLease | null | undefined): boolean {
  return Boolean(lease && currentCheckoutOwner?.leaseId === lease.leaseId);
}

export function releaseCheckoutOwner(lease: CheckoutOwnerLease | null | undefined): boolean {
  if (!isCheckoutOwner(lease)) return false;
  currentCheckoutOwner = null;
  return true;
}

/** Marks success before release, so stale callbacks and other widgets cannot reopen it. */
export function completeCheckoutOwner(
  lease: CheckoutOwnerLease | null | undefined,
  storage: CheckoutStorage | null = sessionStorageOrNull(),
): boolean {
  if (!lease || !isCheckoutOwner(lease)) return false;
  markCheckoutAttemptCompleted(lease.attemptId, storage);
  return releaseCheckoutOwner(lease);
}

/** Test-only reset; production code releases its own lease. */
export function resetCheckoutSafetyForTests(): void {
  currentCheckoutOwner = null;
  nextLeaseId = 1;
  terminalAttemptIds.clear();
}
