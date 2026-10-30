import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { getDb } from "./db";

/**
 * Durable, cross-instance checkout reservation.
 *
 * Call this immediately before the first checkout-related write or provider call.
 * `fingerprint` is deliberately opaque to this module: callers must generate it on
 * the server with createCheckoutReservationFingerprint() from the authenticated
 * identity and checkout inputs (including normalized phone, coupon and any personal
 * token).  Only a second HMAC of it is persisted.
 */

export type CheckoutReservationState = "creating" | "open" | "uncertain" | "completed" | "failed";

export interface CheckoutReservationInput {
  email: string;
  product: string;
  boostMatchId?: string | number;
  /** A client-generated UUID. A new UUID is mandatory when rotating repeatable purchases. */
  checkoutAttemptId?: string;
  /** Server-generated, keyed fingerprint; never send or store raw identity secrets here. */
  fingerprint?: string;
  /**
   * Server-only evidence that an unguessable registration-resume bearer token
   * belongs to the current unpaid profile and its current identity. This never
   * creates, rotates, releases, or broadens a reservation; it can only replay
   * an existing open result with the same secure binding after paid checks pass.
   */
  verifiedOpenResume?: boolean;
  /** Binds an explicitly authorized diagnostic checkout to a separate reservation identity. */
  diagnosticTest?: boolean;
}

/**
 * Kept separate from the two required arguments so a caller can prove that an
 * exception happened before the provider request began. Any error not explicitly
 * classified safe is persisted as uncertain and cannot create another payment flow.
 */
export interface CheckoutReservationOptions {
  isSafeToRetry?: (error: unknown) => boolean;
}

export interface CheckoutReservationCreateContext {
  /** Reserved for observability-free local bookkeeping; provider state remains caller-owned. */
  readonly checkoutAttemptId: string;
}

export interface CheckoutReservationRecord {
  reservationKey: string;
  scopeKind: string;
  attemptId: string;
  bindingHmac: string;
  ownerToken: string;
  state: CheckoutReservationState;
  resultJson: string | null;
  diagnosticTest: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CheckoutPaidEvidence {
  /** A product-family paid receipt. This only blocks products which are one-time by design. */
  paidForProductFamily: boolean;
  /** Exact confirmation for the provider process token saved in this reservation's result. */
  exactProviderProcessConfirmed: boolean;
  /** Database registration has independently reached a paid state. */
  databaseProfilePaid: boolean;
}

export interface CheckoutReservationStore {
  get(reservationKey: string): Promise<CheckoutReservationRecord | null>;
  insert(record: CheckoutReservationRecord): Promise<boolean>;
  updateOwned(
    reservationKey: string,
    ownerToken: string,
    expectedState: CheckoutReservationState,
    patch: Partial<Pick<CheckoutReservationRecord, "state" | "resultJson" | "updatedAt">>,
  ): Promise<boolean>;
  claimFailed(record: CheckoutReservationRecord): Promise<boolean>;
  rotateOpen(record: CheckoutReservationRecord, previousAttemptId: string): Promise<boolean>;
  findPaidEvidence(context: {
    email: string;
    product: string;
    productAliases: string[];
    providerProcessToken?: string;
  }): Promise<CheckoutPaidEvidence>;
  hasRecentLegacyPending(context: { email: string; productAliases: string[]; sinceMs: number }): Promise<boolean>;
}

export class CheckoutReservationConflictError extends Error {
  readonly code = "CHECKOUT_RESERVATION_CONFLICT";

  constructor(
    readonly state: "creating" | "open" | "uncertain" | "completed" | "legacy_pending",
    readonly safeMessage: string,
  ) {
    super(safeMessage);
    this.name = "CheckoutReservationConflictError";
  }
}

export class CheckoutReservationInputError extends Error {
  readonly code = "CHECKOUT_RESERVATION_INPUT_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "CheckoutReservationInputError";
  }
}

export class CheckoutReservationInfrastructureError extends Error {
  readonly code = "CHECKOUT_RESERVATION_UNAVAILABLE";
  constructor() {
    super(CHECKOUT_RESERVATION_MESSAGES.unavailable);
    this.name = "CheckoutReservationInfrastructureError";
  }
}

export const CHECKOUT_RESERVATION_MESSAGES = {
  creating: "בקשת התשלום כבר נמצאת בעיבוד. אין לפתוח תהליך נוסף; אפשר להמתין ולרענן.",
  open: "כבר נפתח תהליך תשלום עבור בקשה זו. אין לפתוח תהליך נוסף.",
  uncertain: "לא ניתן לוודא אם נפתח תהליך תשלום. כדי למנוע חיוב כפול לא נפתח תהליך נוסף. אפשר לפנות לתמיכה עם פרטי הבקשה.",
  completed: "התשלום עבור מוצר זה כבר זוהה. אין צורך לפתוח תהליך תשלום נוסף.",
  legacyPending: "נמצאה בקשת תשלום קודמת שעדיין ממתינה לאישור. כדי למנוע כפילות לא נפתח תהליך נוסף כרגע.",
  unavailable: "לא ניתן לאמת את מצב התשלום כרגע. לא נפתח תהליך תשלום חדש.",
} as const;
const CREATING_MESSAGE = CHECKOUT_RESERVATION_MESSAGES.creating;
const OPEN_MESSAGE = CHECKOUT_RESERVATION_MESSAGES.open;
const UNCERTAIN_MESSAGE = CHECKOUT_RESERVATION_MESSAGES.uncertain;
const PAID_MESSAGE = CHECKOUT_RESERVATION_MESSAGES.completed;
const LEGACY_PENDING_MESSAGE = CHECKOUT_RESERVATION_MESSAGES.legacyPending;
const RECENT_LEGACY_PENDING_MS = 6 * 60 * 60 * 1000;

let testStore: CheckoutReservationStore | undefined;

/** Test-only seam. Production never falls back to memory or an advisory lock. */
export function setCheckoutReservationStoreForTests(store?: CheckoutReservationStore): void {
  testStore = store;
}

function reservationSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new CheckoutReservationInfrastructureError();
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", reservationSecret()).update(value).digest("hex");
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 320 || !normalized.includes("@")) {
    throw new CheckoutReservationInputError("כתובת אימייל אינה תקינה.");
  }
  return normalized;
}

function normalizePhone(phone: string | undefined): string {
  return (phone || "").replace(/[^0-9+]/g, "").replace(/^00/, "+").replace(/^\+?972/, "0");
}

function normalizeProduct(product: string): string {
  const normalized = product.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,50}$/.test(normalized)) {
    throw new CheckoutReservationInputError("מוצר תשלום אינו תקין.");
  }
  return normalized;
}

function normalizeOpaqueFingerprint(fingerprint: string | undefined): string {
  const normalized = fingerprint?.trim();
  // Do not silently degrade checkout-result binding to email-only authorization.
  if (!normalized || normalized.length > 1024) {
    throw new CheckoutReservationInputError("חסר אימות מאובטח של פרטי התשלום.");
  }
  return normalized;
}

function normalizeAttemptId(attemptId: string | undefined): string {
  if (!attemptId) return randomUUID();
  const normalized = attemptId.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) {
    throw new CheckoutReservationInputError("מזהה ניסיון תשלום אינו תקין.");
  }
  return normalized;
}

function normalizeMatchId(value: string | number | undefined): string {
  const normalized = typeof value === "number" ? String(value) : value?.trim();
  if (!normalized || !/^[A-Za-z0-9_-]{1,120}$/.test(normalized)) {
    throw new CheckoutReservationInputError("נדרש מזהה התאמה תקין עבור Boost.");
  }
  return normalized;
}

interface CheckoutScope {
  scopeKind: string;
  aliases: string[];
  repeatable: boolean;
  oneTime: boolean;
}

function checkoutScope(product: string, boostMatchId: string | number | undefined, diagnosticTest: boolean): CheckoutScope {
  let scope: CheckoutScope;
  if (product === "database" || product.startsWith("bundle")) {
    scope = { scopeKind: "database_bundle", aliases: ["database", "bundle_tubav", "bundle_new_year", "bundle"], repeatable: false, oneTime: true };
  } else if (product === "guide" || product.startsWith("guide_")) {
    scope = { scopeKind: "guide", aliases: ["guide", "guide_149", "guide_live_bonus"], repeatable: false, oneTime: true };
  } else if (product === "course" || product.startsWith("course_")) {
    scope = { scopeKind: "course", aliases: ["course", "course_249"], repeatable: false, oneTime: true };
  } else if (product === "match_boost") {
    scope = { scopeKind: `match_boost:${normalizeMatchId(boostMatchId)}`, aliases: ["match_boost"], repeatable: false, oneTime: false };
  } else if (product === "session" || product === "coaching" || product === "coaching_mas" || product === "plus") {
    scope = { scopeKind: product, aliases: [product], repeatable: true, oneTime: false };
  } else {
    // Unknown products are conservatively one-time until intentionally classified.
    scope = { scopeKind: `product:${product}`, aliases: [product], repeatable: false, oneTime: true };
  }
  if (diagnosticTest) scope = { ...scope, scopeKind: `${scope.scopeKind}:diagnostic` };
  return scope;
}

/**
 * Generate the opaque request fingerprint on the server. The returned value may be
 * handed to withCheckoutReservation; the raw inputs are not persisted by either API.
 */
export function createCheckoutReservationFingerprint(input: {
  email: string;
  product: string;
  phone?: string;
  couponCode?: string;
  personalToken?: string;
  identity?: string;
}): string {
  const email = normalizeEmail(input.email);
  const product = normalizeProduct(input.product);
  const value = [
    "checkout-fingerprint-v1",
    email,
    product,
    normalizePhone(input.phone),
    (input.couponCode || "").trim().toUpperCase(),
    (input.personalToken || "").trim(),
    (input.identity || "").trim(),
  ].join("\u0000");
  return hmac(value);
}

function resultProviderProcessToken(resultJson: string | null): string | undefined {
  if (!resultJson) return undefined;
  try {
    const result = JSON.parse(resultJson) as unknown;
    if (!result || typeof result !== "object") return undefined;
    const source = result as Record<string, unknown>;
    for (const key of ["providerProcessToken", "processToken", "provider_process_token", "process_token"]) {
      const candidate = source[key];
      if (typeof candidate === "string" && candidate.trim().length > 0 && candidate.length <= 255) return candidate.trim();
    }
  } catch {
    // Corrupt stored result is fail-closed below as an uncertain reservation.
  }
  return undefined;
}

function parseResult<Result>(record: CheckoutReservationRecord): Result {
  if (!record.resultJson) throw new CheckoutReservationConflictError("uncertain", UNCERTAIN_MESSAGE);
  try {
    return JSON.parse(record.resultJson) as Result;
  } catch {
    throw new CheckoutReservationConflictError("uncertain", UNCERTAIN_MESSAGE);
  }
}

function randomOwnerToken(): string {
  return randomBytes(32).toString("hex");
}

function newRecord(params: {
  reservationKey: string;
  scopeKind: string;
  attemptId: string;
  bindingHmac: string;
  diagnosticTest: boolean;
  now: number;
}): CheckoutReservationRecord {
  return {
    reservationKey: params.reservationKey,
    scopeKind: params.scopeKind,
    attemptId: params.attemptId,
    bindingHmac: params.bindingHmac,
    ownerToken: randomOwnerToken(),
    state: "creating",
    resultJson: null,
    diagnosticTest: params.diagnosticTest,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

async function productionStore(): Promise<CheckoutReservationStore> {
  const db = await getDb();
  const client = (db as unknown as { $client?: MySqlPoolLike } | null)?.$client;
  if (!client || typeof client.execute !== "function") throw new CheckoutReservationInfrastructureError();
  return new MysqlCheckoutReservationStore(client);
}

async function activeStore(): Promise<CheckoutReservationStore> {
  return testStore || productionStore();
}

/**
 * Atomically reserve a checkout before any payment-side effect.
 *
 * API contract:
 *   withCheckoutReservation(input, create, { isSafeToRetry? }) => Promise<Result>
 *
 * `create` executes at most once for the winning database reservation. A repeated,
 * matching request receives the exact stored Result. A mismatched fingerprint never
 * receives it. The optional retry predicate must return true only for a proved
 * pre-provider/setup rejection; all other errors become durable `uncertain` state.
 */
export async function withCheckoutReservation<Result>(
  input: CheckoutReservationInput,
  create: () => Promise<Result>,
  options: CheckoutReservationOptions = {},
): Promise<Result> {
  const email = normalizeEmail(input.email);
  const product = normalizeProduct(input.product);
  const fingerprint = normalizeOpaqueFingerprint(input.fingerprint);
  const attemptId = normalizeAttemptId(input.checkoutAttemptId);
  const scope = checkoutScope(product, input.boostMatchId, Boolean(input.diagnosticTest));
  const reservationKey = hmac(["checkout-reservation-v1", email, scope.scopeKind].join("\u0000"));
  const bindingHmac = hmac(["checkout-result-binding-v1", email, product, fingerprint].join("\u0000"));
  const store = await activeStore();
  const now = Date.now();
  let candidate = newRecord({ reservationKey, scopeKind: scope.scopeKind, attemptId, bindingHmac, diagnosticTest: Boolean(input.diagnosticTest), now });

  // INSERT IGNORE on the unique HMAC key is the cross-instance ownership election.
  if (!(await store.insert(candidate))) {
    const existing = await store.get(reservationKey);
    if (!existing) throw new CheckoutReservationInfrastructureError();

    if (existing.state === "creating") throw new CheckoutReservationConflictError("creating", CREATING_MESSAGE);
    if (existing.state === "uncertain") throw new CheckoutReservationConflictError("uncertain", UNCERTAIN_MESSAGE);
    if (existing.state === "completed" && !scope.repeatable) throw new CheckoutReservationConflictError("completed", PAID_MESSAGE);

    if (existing.state === "failed") {
      // Failed is reusable only because the previous owner positively classified the
      // error as pre-provider. This CAS does not reclaim live/unknown reservations.
      if (!(await store.claimFailed(candidate))) {
        throw new CheckoutReservationConflictError("creating", CREATING_MESSAGE);
      }
    } else {
      const evidence = await store.findPaidEvidence({
        email,
        product,
        productAliases: scope.aliases,
        providerProcessToken: resultProviderProcessToken(existing.resultJson),
      });
      // A server-verified marker survives later purchases overwriting the legacy
      // email/product-wide payment_leads row.
      if (existing.state === "completed") evidence.exactProviderProcessConfirmed = true;

      // Only a verified paid repeatable checkout can move to a new explicitly
      // supplied client attempt. This is a CAS, so another instance cannot rotate
      // the same completed process concurrently.
      const mayRotateCompletedRepeatable = scope.repeatable
        && Boolean(input.checkoutAttemptId)
        && existing.attemptId !== attemptId
        && evidence.exactProviderProcessConfirmed;
      if (mayRotateCompletedRepeatable) {
        if (!(await store.rotateOpen(candidate, existing.attemptId))) {
          throw new CheckoutReservationConflictError("creating", CREATING_MESSAGE);
        }
      }

      // An exact confirmation belongs to this reservation's saved provider process.
      // Never replay its authorization after it has become a paid checkout.
      if (evidence.exactProviderProcessConfirmed && !mayRotateCompletedRepeatable) {
        if (!scope.repeatable) await store.updateOwned(existing.reservationKey, existing.ownerToken, "open", { state: "completed", updatedAt: Date.now() });
        throw new CheckoutReservationConflictError("completed", PAID_MESSAGE);
      }

      // A paid receipt must always win over a cached checkout response. In
      // particular do not re-render an old payment authorization after payment.
      // Diagnostics are intentionally isolated from historic production purchases.
      if (!input.diagnosticTest && scope.oneTime && (evidence.paidForProductFamily || evidence.databaseProfilePaid)) {
        await store.updateOwned(existing.reservationKey, existing.ownerToken, "open", { state: "completed", updatedAt: Date.now() });
        throw new CheckoutReservationConflictError("completed", PAID_MESSAGE);
      }

      if (!mayRotateCompletedRepeatable) {
        // An open reservation can be replayed only by the same secure binding and
        // only after paid evidence has been rechecked.
        if (existing.bindingHmac === bindingHmac && existing.attemptId === attemptId) return parseResult<Result>(existing);
        if (existing.bindingHmac === bindingHmac && !input.checkoutAttemptId) return parseResult<Result>(existing);
        // A registration resume starts in a fresh browser session, so its opaque
        // client attempt UUID can be lost even though the unpaid profile still
        // proves the same buyer identity. The router may set this server-only bit
        // only after validating that unguessable bearer token. It never applies
        // to creating, uncertain, completed, or failed reservations, and paid
        // evidence above always wins before the stored authorization is replayed.
        if (existing.state === "open"
          && existing.bindingHmac === bindingHmac
          && Boolean(input.verifiedOpenResume)) {
          return parseResult<Result>(existing);
        }
        throw new CheckoutReservationConflictError("open", OPEN_MESSAGE);
      }
    }
  }

  // This owner now holds `creating`. Do read-only paid / legacy checks before the
  // caller's first mutable or provider action.
  const evidence = await store.findPaidEvidence({ email, product, productAliases: scope.aliases });
  if (!input.diagnosticTest && scope.oneTime && (evidence.paidForProductFamily || evidence.databaseProfilePaid)) {
    await store.updateOwned(candidate.reservationKey, candidate.ownerToken, "creating", { state: "completed", updatedAt: Date.now() });
    throw new CheckoutReservationConflictError("completed", PAID_MESSAGE);
  }
  // Legacy payment_leads are email/product global and carry no match identity, so
  // they cannot safely block a Boost for a different candidate. The durable
  // match-scoped reservation remains the dedupe boundary for Boost.
  if (!input.diagnosticTest && product !== "match_boost" && await store.hasRecentLegacyPending({ email, productAliases: scope.aliases, sinceMs: Date.now() - RECENT_LEGACY_PENDING_MS })) {
    await store.updateOwned(candidate.reservationKey, candidate.ownerToken, "creating", { state: "failed", updatedAt: Date.now() });
    throw new CheckoutReservationConflictError("legacy_pending", LEGACY_PENDING_MESSAGE);
  }

  try {
    const result = await create();
    let resultJson: string;
    try {
      resultJson = JSON.stringify(result);
      if (resultJson === undefined) throw new Error("checkout result is not JSON serializable");
    } catch {
      // A provider may have succeeded even if its result cannot be durably cached.
      await store.updateOwned(candidate.reservationKey, candidate.ownerToken, "creating", { state: "uncertain", updatedAt: Date.now() });
      throw new CheckoutReservationConflictError("uncertain", UNCERTAIN_MESSAGE);
    }
    if (!(await store.updateOwned(candidate.reservationKey, candidate.ownerToken, "creating", {
      state: "open", resultJson, updatedAt: Date.now(),
    }))) {
      // Never retry the provider after a lost acknowledgement / DB update race.
      throw new CheckoutReservationConflictError("uncertain", UNCERTAIN_MESSAGE);
    }
    return result;
  } catch (error) {
    if (error instanceof CheckoutReservationConflictError) throw error;
    const safelyRejected = Boolean(options.isSafeToRetry?.(error));
    const state: CheckoutReservationState = safelyRejected ? "failed" : "uncertain";
    const stored = await store.updateOwned(candidate.reservationKey, candidate.ownerToken, "creating", { state, updatedAt: Date.now() });
    if (safelyRejected && stored) throw error;
    throw new CheckoutReservationConflictError("uncertain", UNCERTAIN_MESSAGE);
  }
}

type MysqlRow = Record<string, unknown>;
type MysqlExecuteResult = [{ affectedRows?: number } | MysqlRow[], unknown];
interface MySqlPoolLike {
  execute(query: string, values?: unknown[]): Promise<MysqlExecuteResult>;
}

function rowsOf(result: MysqlExecuteResult): MysqlRow[] {
  return Array.isArray(result[0]) ? result[0] : [];
}

function affected(result: MysqlExecuteResult): boolean {
  return !Array.isArray(result[0]) && Number(result[0].affectedRows) > 0;
}

function asRecord(row: MysqlRow): CheckoutReservationRecord {
  const state = String(row.state) as CheckoutReservationState;
  if (!["creating", "open", "uncertain", "completed", "failed"].includes(state)) throw new CheckoutReservationInfrastructureError();
  return {
    reservationKey: String(row.reservation_key),
    scopeKind: String(row.scope_kind),
    attemptId: String(row.attempt_id),
    bindingHmac: String(row.binding_hmac),
    ownerToken: String(row.owner_token),
    state,
    resultJson: row.result_json == null ? null : String(row.result_json),
    diagnosticTest: Boolean(row.diagnostic_test),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

class MysqlCheckoutReservationStore implements CheckoutReservationStore {
  constructor(private readonly pool: MySqlPoolLike) {}

  async get(reservationKey: string): Promise<CheckoutReservationRecord | null> {
    const result = await this.pool.execute(
      "SELECT reservation_key, scope_kind, attempt_id, binding_hmac, owner_token, state, result_json, diagnostic_test, created_at, updated_at FROM checkout_reservations WHERE reservation_key = ? LIMIT 1",
      [reservationKey],
    );
    const row = rowsOf(result)[0];
    return row ? asRecord(row) : null;
  }

  async insert(record: CheckoutReservationRecord): Promise<boolean> {
    const result = await this.pool.execute(
      "INSERT IGNORE INTO checkout_reservations (reservation_key, scope_kind, attempt_id, binding_hmac, owner_token, state, result_json, diagnostic_test, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [record.reservationKey, record.scopeKind, record.attemptId, record.bindingHmac, record.ownerToken, record.state, record.resultJson, record.diagnosticTest ? 1 : 0, record.createdAt, record.updatedAt],
    );
    return affected(result);
  }

  async updateOwned(reservationKey: string, ownerToken: string, expectedState: CheckoutReservationState, patch: Partial<Pick<CheckoutReservationRecord, "state" | "resultJson" | "updatedAt">>): Promise<boolean> {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (patch.state !== undefined) { sets.push("state = ?"); values.push(patch.state); }
    if (patch.resultJson !== undefined) { sets.push("result_json = ?"); values.push(patch.resultJson); }
    if (patch.updatedAt !== undefined) { sets.push("updated_at = ?"); values.push(patch.updatedAt); }
    if (!sets.length) return false;
    const result = await this.pool.execute(
      `UPDATE checkout_reservations SET ${sets.join(", ")} WHERE reservation_key = ? AND owner_token = ? AND state = ?`,
      [...values, reservationKey, ownerToken, expectedState],
    );
    return affected(result);
  }

  async claimFailed(record: CheckoutReservationRecord): Promise<boolean> {
    const result = await this.pool.execute(
      "UPDATE checkout_reservations SET attempt_id = ?, binding_hmac = ?, owner_token = ?, state = 'creating', result_json = NULL, diagnostic_test = ?, updated_at = ? WHERE reservation_key = ? AND state = 'failed'",
      [record.attemptId, record.bindingHmac, record.ownerToken, record.diagnosticTest ? 1 : 0, record.updatedAt, record.reservationKey],
    );
    return affected(result);
  }

  async rotateOpen(record: CheckoutReservationRecord, previousAttemptId: string): Promise<boolean> {
    const result = await this.pool.execute(
      "UPDATE checkout_reservations SET attempt_id = ?, binding_hmac = ?, owner_token = ?, state = 'creating', result_json = NULL, diagnostic_test = ?, updated_at = ? WHERE reservation_key = ? AND state IN ('open','completed') AND attempt_id = ?",
      [record.attemptId, record.bindingHmac, record.ownerToken, record.diagnosticTest ? 1 : 0, record.updatedAt, record.reservationKey, previousAttemptId],
    );
    return affected(result);
  }

  async findPaidEvidence(context: { email: string; product: string; productAliases: string[]; providerProcessToken?: string }): Promise<CheckoutPaidEvidence> {
    const aliases = context.productAliases.length ? context.productAliases : [context.product];
    const placeholders = aliases.map(() => "?").join(",");
    const completed = await this.pool.execute(
      `SELECT 1 FROM completed_payments WHERE LOWER(TRIM(email)) = ? AND product IN (${placeholders}) LIMIT 1`,
      [context.email, ...aliases],
    );
    let databaseProfilePaid = false;
    if (aliases.includes("database")) {
      const profile = await this.pool.execute("SELECT 1 FROM singles WHERE LOWER(TRIM(email)) = ? AND isPaid = 1 LIMIT 1", [context.email]);
      databaseProfilePaid = rowsOf(profile).length > 0;
    }
    let exactProviderProcessConfirmed = false;
    if (context.providerProcessToken) {
      const exact = await this.pool.execute(
        `SELECT 1 FROM payment_leads WHERE LOWER(TRIM(email)) = ? AND product IN (${placeholders}) AND provider_process_token = ? AND confirmed_transaction_id IS NOT NULL LIMIT 1`,
        [context.email, ...aliases, context.providerProcessToken],
      );
      exactProviderProcessConfirmed = rowsOf(exact).length > 0;
    }
    return { paidForProductFamily: rowsOf(completed).length > 0, exactProviderProcessConfirmed, databaseProfilePaid };
  }

  async hasRecentLegacyPending(context: { email: string; productAliases: string[]; sinceMs: number }): Promise<boolean> {
    const aliases = context.productAliases;
    if (!aliases.length) return false;
    const placeholders = aliases.map(() => "?").join(",");
    const result = await this.pool.execute(
      `SELECT 1 FROM payment_leads WHERE LOWER(TRIM(email)) = ? AND product IN (${placeholders}) AND provider_process_token IS NOT NULL AND confirmed_transaction_id IS NULL AND created_at >= ? LIMIT 1`,
      [context.email, ...aliases, context.sinceMs],
    );
    return rowsOf(result).length > 0;
  }
}

/** Called only for provider-confirmed accounting, never an SDK success event.
 * Independent of mutable email/product tracking, so another Boost purchase cannot
 * make a previously paid authorization replayable again.
 */
export async function markCheckoutReservationProviderConfirmed(processToken: string): Promise<void> {
  if (!processToken || processToken.length > 255) return;
  const db = await getDb();
  const client = (db as unknown as { $client?: MySqlPoolLike } | null)?.$client;
  if (!client) throw new CheckoutReservationInfrastructureError();
  await client.execute(
    "UPDATE checkout_reservations SET state = 'completed', updated_at = ? WHERE state IN ('open','uncertain') AND (CASE WHEN JSON_VALID(result_json) THEN JSON_UNQUOTE(JSON_EXTRACT(result_json, '$.processToken')) ELSE NULL END) = ?",
    [Date.now(), processToken],
  );
}

/** Server-proxy safety signal: a mutating provider request may have succeeded.
 * This only locks a matching checkout; it never records or invents a payment.
 */
export async function markCheckoutReservationPaymentUncertain(reference: { authCode?: string; processToken?: string }): Promise<void> {
  const processToken = typeof reference.processToken === "string" && reference.processToken.length <= 255 ? reference.processToken : "";
  const authCode = typeof reference.authCode === "string" && reference.authCode.length <= 2048 ? reference.authCode : "";
  if (!processToken && !authCode) return;
  const db = await getDb();
  const client = (db as unknown as { $client?: MySqlPoolLike } | null)?.$client;
  if (!client) throw new CheckoutReservationInfrastructureError();
  const jsonPath = processToken ? "$.processToken" : "$.authCode";
  await client.execute(
    "UPDATE checkout_reservations SET state = 'uncertain', updated_at = ? WHERE state = 'open' AND (CASE WHEN JSON_VALID(result_json) THEN JSON_UNQUOTE(JSON_EXTRACT(result_json, ?)) ELSE NULL END) = ?",
    [Date.now(), jsonPath, processToken || authCode],
  );
}
