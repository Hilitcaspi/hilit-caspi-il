import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_RESERVATION_MESSAGES,
  CheckoutReservationConflictError,
  type CheckoutPaidEvidence,
  type CheckoutReservationRecord,
  type CheckoutReservationStore,
  createCheckoutReservationFingerprint,
  OPEN_REPLAY_MAX_AGE_MS,
  OPEN_TAKEOVER_MIN_AGE_MS,
  STALE_TAKEOVER_MS,
  setCheckoutReservationStoreForTests,
  withCheckoutReservation,
} from "./checkoutReservation";

const ATTEMPT_A = "11111111-1111-4111-8111-111111111111";
const ATTEMPT_B = "22222222-2222-4222-8222-222222222222";
const noPaid: CheckoutPaidEvidence = {
  paidForProductFamily: false,
  exactProviderProcessConfirmed: false,
  databaseProfilePaid: false,
};

class FakeStore implements CheckoutReservationStore {
  readonly rows = new Map<string, CheckoutReservationRecord>();
  evidence: CheckoutPaidEvidence = { ...noPaid };
  legacyPending = false;
  evidenceCalls = 0;
  legacyCalls = 0;

  async get(key: string) { return this.rows.get(key) ?? null; }
  async insert(record: CheckoutReservationRecord) {
    if (this.rows.has(record.reservationKey)) return false;
    this.rows.set(record.reservationKey, { ...record });
    return true;
  }
  async updateOwned(key: string, owner: string, expected: CheckoutReservationRecord["state"], patch: Partial<Pick<CheckoutReservationRecord, "state" | "resultJson" | "updatedAt">>) {
    const old = this.rows.get(key);
    if (!old || old.ownerToken !== owner || old.state !== expected) return false;
    this.rows.set(key, { ...old, ...patch });
    return true;
  }
  async claimFailed(record: CheckoutReservationRecord) {
    const old = this.rows.get(record.reservationKey);
    if (!old || old.state !== "failed") return false;
    this.rows.set(record.reservationKey, { ...record, createdAt: old.createdAt });
    return true;
  }
  async rotateOpen(record: CheckoutReservationRecord, prior: string) {
    const old = this.rows.get(record.reservationKey);
    if (!old || !["open", "completed"].includes(old.state) || old.attemptId !== prior) return false;
    this.rows.set(record.reservationKey, { ...record });
    return true;
  }
  takeOverCalls = 0;
  async takeOver(record: CheckoutReservationRecord, priorOwner: string, priorState: CheckoutReservationRecord["state"]) {
    this.takeOverCalls++;
    const old = this.rows.get(record.reservationKey);
    if (!old || old.ownerToken !== priorOwner || old.state !== priorState || old.diagnosticTest) return false;
    if (!["open", "creating", "uncertain"].includes(priorState)) return false;
    this.rows.set(record.reservationKey, { ...record, createdAt: old.createdAt });
    return true;
  }
  async findPaidEvidence() { this.evidenceCalls++; return { ...this.evidence }; }
  async hasRecentLegacyPending() { this.legacyCalls++; return this.legacyPending; }
}

function input(overrides: Partial<Parameters<typeof withCheckoutReservation>[0]> = {}) {
  return {
    email: "  buyer@example.test ",
    product: "guide",
    checkoutAttemptId: ATTEMPT_A,
    fingerprint: createCheckoutReservationFingerprint({
      email: "buyer@example.test", product: "guide", phone: "050-123-4567", couponCode: "welcome", identity: "user-42",
    }),
    ...overrides,
  };
}

/** Make the single stored reservation look older than `ms` (plus one second). */
function age(target: FakeStore, ms: number) {
  for (const row of target.rows.values()) {
    row.updatedAt -= ms + 1000;
    row.createdAt -= ms + 1000;
  }
}

async function conflict(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error("expected a checkout reservation conflict");
  } catch (error) {
    expect(error).toBeInstanceOf(CheckoutReservationConflictError);
    return error as CheckoutReservationConflictError;
  }
}

describe("withCheckoutReservation", () => {
  let store: FakeStore;
  const initialSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-only-secret-long-enough-for-hmac";
    store = new FakeStore();
    setCheckoutReservationStoreForTests(store);
  });

  afterEach(() => {
    setCheckoutReservationStoreForTests();
    if (initialSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = initialSecret;
  });

  it("elects one owner across concurrent requests and returns the original saved result on replay", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const create = vi.fn(async () => {
      await gate;
      return { processToken: "provider-process-1", purchaseTrackingToken: "tracking-1", checkoutUrl: "private-url" };
    });

    const first = withCheckoutReservation(input(), create);
    await expect.poll(() => create.mock.calls.length).toBe(1);
    const waiting = await conflict(withCheckoutReservation(input(), create));
    expect(waiting.state).toBe("creating");
    expect(waiting.message).toBe(CHECKOUT_RESERVATION_MESSAGES.creating);

    release();
    const original = await first;
    const replay = await withCheckoutReservation(input(), create);
    expect(replay).toEqual(original);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("never returns a cached private result when the keyed identity fingerprint differs", async () => {
    await withCheckoutReservation(input(), async () => ({ processToken: "provider-process-1", privateCheckoutUrl: "secret" }));
    const other = input({ fingerprint: "not-the-original-server-keyed-fingerprint" });
    const denied = await conflict(withCheckoutReservation(other, async () => ({ processToken: "new" })));
    expect(denied.state).toBe("creating");
    expect(denied.message).toBe(CHECKOUT_RESERVATION_MESSAGES.creating);
    // After the double-click window a production buyer gets a fresh process, never the cached one.
    age(store, OPEN_TAKEOVER_MIN_AGE_MS);
    await expect(withCheckoutReservation(other, async () => ({ processToken: "new" }))).resolves.toEqual({ processToken: "new" });
  });

  it("checks paid evidence before cached replay and never returns a prior payment authorization after payment", async () => {
    const create = vi.fn(async () => ({ processToken: "provider-process-1", purchaseTrackingToken: "tracking-1" }));
    await withCheckoutReservation(input(), create);
    store.evidence = { ...noPaid, paidForProductFamily: true };

    const denied = await conflict(withCheckoutReservation(input(), create));
    expect(denied.state).toBe("completed");
    expect(denied.message).toBe(CHECKOUT_RESERVATION_MESSAGES.completed);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("keeps the explicit November bundle in the one-time database purchase family", async () => {
    const november = input({
      product: "bundle_november",
      fingerprint: createCheckoutReservationFingerprint({
        email: "buyer@example.test", product: "bundle_november", identity: "user-42",
      }),
    });
    await withCheckoutReservation(november, async () => ({ processToken: "november-provider-process" }));

    const database = input({
      product: "database",
      checkoutAttemptId: ATTEMPT_B,
      fingerprint: createCheckoutReservationFingerprint({
        email: "buyer@example.test", product: "database", identity: "user-42",
      }),
    });
    expect((await conflict(withCheckoutReservation(database, async () => ({ processToken: "must-not-create" })))).state)
      .toBe("creating");
    // A paid November bundle still blocks a later database checkout after the takeover window.
    age(store, OPEN_TAKEOVER_MIN_AGE_MS);
    store.evidence = { ...noPaid, paidForProductFamily: true };
    expect((await conflict(withCheckoutReservation(database, async () => ({ processToken: "must-not-create" })))).state)
      .toBe("completed");
    expect(store.takeOverCalls).toBe(0);
  });

  it("lets a returning unpaid November buyer open a fresh database checkout after the takeover window", async () => {
    const november = input({
      product: "bundle_november",
      fingerprint: createCheckoutReservationFingerprint({ email: "buyer@example.test", product: "bundle_november", identity: "user-42" }),
    });
    await withCheckoutReservation(november, async () => ({ processToken: "november-provider-process" }));
    age(store, OPEN_TAKEOVER_MIN_AGE_MS);
    store.legacyPending = true; // the abandoned November lead itself
    store.legacyCalls = 0;
    const database = input({
      product: "database", checkoutAttemptId: ATTEMPT_B,
      fingerprint: createCheckoutReservationFingerprint({ email: "buyer@example.test", product: "database", identity: "user-42" }),
    });
    await expect(withCheckoutReservation(database, async () => ({ processToken: "database-process" })))
      .resolves.toEqual({ processToken: "database-process" });
    expect(store.legacyCalls).toBe(0);
    expect(store.rows.size).toBe(1);
    expect([...store.rows.values()][0].state).toBe("open");
  });

  it("replays the same open authorization after a new browser nonce only with server-verified matching resume evidence", async () => {
    const create = vi.fn(async () => ({ processToken: "provider-process-1", authCode: "opaque-auth" }));
    const original = await withCheckoutReservation(input(), create);

    await expect(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B, verifiedOpenResume: true }), create))
      .resolves.toEqual(original);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("does not replay an open authorization across a new nonce without verified resume evidence or with a mismatched binding", async () => {
    const create = vi.fn(async () => ({ processToken: "provider-process-1", authCode: "opaque-auth" }));
    await withCheckoutReservation(input(), create);

    expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))).state).toBe("creating");
    expect((await conflict(withCheckoutReservation(input({
      checkoutAttemptId: ATTEMPT_B,
      verifiedOpenResume: true,
      fingerprint: createCheckoutReservationFingerprint({ email: "buyer@example.test", product: "guide", identity: "other-buyer" }),
    }), create))).state).toBe("creating");
    expect(create).toHaveBeenCalledTimes(1);
    // Other device/tab/email link after 30s: a fresh process, not the cached authorization.
    age(store, OPEN_TAKEOVER_MIN_AGE_MS);
    create.mockResolvedValueOnce({ processToken: "provider-process-2", authCode: "opaque-auth-2" });
    await expect(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))
      .resolves.toEqual({ processToken: "provider-process-2", authCode: "opaque-auth-2" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("never lets verified resume evidence bypass an uncertain reservation or paid evidence", async () => {
    await expect(withCheckoutReservation(input(), async () => {
      throw new Error("outcome unknown after provider delivery");
    })).rejects.toMatchObject({ code: "CHECKOUT_RESERVATION_CONFLICT", state: "uncertain" });
    // A fresh unknown outcome stays blocked (production shows the retry-in-2-minutes message).
    expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B, verifiedOpenResume: true }), async () => ({ processToken: "never" })))).state)
      .toBe("creating");

    const paidStore = new FakeStore();
    setCheckoutReservationStoreForTests(paidStore);
    await withCheckoutReservation(input(), async () => ({ processToken: "provider-process-2" }));
    paidStore.evidence = { ...noPaid, paidForProductFamily: true };
    expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B, verifiedOpenResume: true }), async () => ({ processToken: "never" })))).state)
      .toBe("completed");
  });

  it("fails closed after an unclassified error but releases only a proven pre-provider error", async () => {
    await expect(withCheckoutReservation(input(), async () => { throw new Error("timeout after unknown provider delivery"); }))
      .rejects.toMatchObject({ code: "CHECKOUT_RESERVATION_CONFLICT", state: "uncertain" });
    expect((await conflict(withCheckoutReservation(input(), async () => ({ processToken: "never" })))).state).toBe("creating");
    expect([...store.rows.values()][0].state).toBe("uncertain");

    const safeInput = input({ email: "safe@example.test", fingerprint: createCheckoutReservationFingerprint({ email: "safe@example.test", product: "guide", identity: "safe" }) });
    await expect(withCheckoutReservation(safeInput, async () => { throw new Error("input validation failed"); }, { isSafeToRetry: () => true }))
      .rejects.toThrow("input validation failed");
    await expect(withCheckoutReservation(safeInput, async () => ({ processToken: "new-provider-process" }))).resolves.toEqual({ processToken: "new-provider-process" });
  });

  it("does not let legacy global Boost leads block a different match and scopes reservations by match id", async () => {
    store.legacyPending = true;
    const boostFingerprint = createCheckoutReservationFingerprint({ email: "buyer@example.test", product: "match_boost", identity: "single-1" });
    await expect(withCheckoutReservation({ email: "buyer@example.test", product: "match_boost", boostMatchId: 101, checkoutAttemptId: ATTEMPT_A, fingerprint: boostFingerprint }, async () => ({ processToken: "boost-101" })))
      .resolves.toEqual({ processToken: "boost-101" });
    await expect(withCheckoutReservation({ email: "buyer@example.test", product: "match_boost", boostMatchId: 202, checkoutAttemptId: ATTEMPT_A, fingerprint: boostFingerprint }, async () => ({ processToken: "boost-202" })))
      .resolves.toEqual({ processToken: "boost-202" });
    expect(store.legacyCalls).toBe(0);
  });

  it("keeps an explicit diagnostic reservation independent of historic paid evidence", async () => {
    store.evidence = { ...noPaid, paidForProductFamily: true, databaseProfilePaid: true };
    const diagnostic = input({ diagnosticTest: true });
    await expect(withCheckoutReservation(diagnostic, async () => ({ processToken: "diagnostic-only" })))
      .resolves.toEqual({ processToken: "diagnostic-only" });
  });

  it.each(["database", "bundle_november", "guide", "course", "match_boost", "live_october"])("rotates confirmed diagnostic %s only with a fresh explicit attempt", async product => {
    const diagnostic = input({
      product, diagnosticTest: true, boostMatchId: product === "match_boost" ? 101 : undefined,
      fingerprint: createCheckoutReservationFingerprint({ email: "buyer@example.test", product, couponCode: "TEST1", identity: "owner-test" }),
    });
    const create = vi.fn(async () => ({ processToken: "diagnostic-process" }));
    await withCheckoutReservation(diagnostic, create);
    expect((await conflict(withCheckoutReservation({ ...diagnostic, checkoutAttemptId: ATTEMPT_B }, create))).state).toBe("open");
    const row = [...store.rows.values()][0];
    row.state = "completed"; // Only the server's provider-confirmed marker may set this in production.
    expect((await conflict(withCheckoutReservation(diagnostic, create))).state).toBe("completed");
    await expect(withCheckoutReservation({ ...diagnostic, checkoutAttemptId: ATTEMPT_B }, create)).resolves.toEqual({ processToken: "diagnostic-process" });
    expect(create).toHaveBeenCalledTimes(2);
    expect([...store.rows.values()][0].diagnosticTest).toBe(true);
  });

  it.each(["creating", "uncertain"] as const)("never releases a %s diagnostic with a new attempt ID", async state => {
    const diagnostic = input({ diagnosticTest: true });
    const create = vi.fn(async () => ({ processToken: "diagnostic-process" }));
    await withCheckoutReservation(diagnostic, create);
    [...store.rows.values()][0].state = state;
    expect((await conflict(withCheckoutReservation({ ...diagnostic, checkoutAttemptId: ATTEMPT_B }, create))).state).toBe(state);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("keeps database/bundle diagnostics on the original shared lock until the prior test is confirmed", async () => {
    const database = input({ product: "database", diagnosticTest: true });
    await withCheckoutReservation(database, async () => ({ processToken: "old-database-test" }));
    const november = input({ product: "bundle_november", diagnosticTest: true, checkoutAttemptId: ATTEMPT_B });
    expect((await conflict(withCheckoutReservation(november, async () => ({ processToken: "must-not-create" })))).state).toBe("open");
    [...store.rows.values()][0].state = "completed";
    await expect(withCheckoutReservation(november, async () => ({ processToken: "new-november-test" }))).resolves.toEqual({ processToken: "new-november-test" });
    expect(store.rows.size).toBe(1);
  });

  it("elects just one new diagnostic owner when two requests race to rotate the same confirmed test", async () => {
    const diagnostic = input({ diagnosticTest: true });
    await withCheckoutReservation(diagnostic, async () => ({ processToken: "old-test" }));
    [...store.rows.values()][0].state = "completed";
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const create = vi.fn(async () => { await gate; return { processToken: "new-test" }; });
    const next = { ...diagnostic, checkoutAttemptId: ATTEMPT_B };
    const first = withCheckoutReservation(next, create);
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect((await conflict(withCheckoutReservation(next, create))).state).toBe("creating");
    release();
    await expect(first).resolves.toEqual({ processToken: "new-test" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rotates a repeatable purchase only with a new attempt and exact provider confirmation", async () => {
    const plus = {
      email: "member@example.test",
      product: "plus",
      checkoutAttemptId: ATTEMPT_A,
      fingerprint: createCheckoutReservationFingerprint({ email: "member@example.test", product: "plus", identity: "member-1" }),
    };
    await withCheckoutReservation(plus, async () => ({ processToken: "plus-process-1" }));
    const changedAttempt = { ...plus, checkoutAttemptId: ATTEMPT_B };
    expect((await conflict(withCheckoutReservation(changedAttempt, async () => ({ processToken: "plus-process-2" })))).state).toBe("creating");

    store.evidence = { ...noPaid, exactProviderProcessConfirmed: true };
    await expect(withCheckoutReservation(changedAttempt, async () => ({ processToken: "plus-process-2" })))
      .resolves.toEqual({ processToken: "plus-process-2" });
  });

  describe("legacy-pending production recovery", () => {
    let now: number;

    beforeEach(() => {
      now = 1_800_000_000_000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      store.legacyPending = true;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("stores the first legacy hit as uncertain without a provider result or provider call", async () => {
      const create = vi.fn(async () => ({ processToken: "must-not-create" }));
      const blocked = await conflict(withCheckoutReservation(input(), create));

      expect(blocked.state).toBe("legacy_pending");
      expect(blocked.message).toBe(CHECKOUT_RESERVATION_MESSAGES.legacyPending);
      expect(store.rows.size).toBe(1);
      expect([...store.rows.values()][0]).toMatchObject({
        state: "uncertain", resultJson: null, attemptId: ATTEMPT_A,
        createdAt: now, updatedAt: now, diagnosticTest: false,
      });
      expect(create).not.toHaveBeenCalled();
      expect(store.evidenceCalls).toBe(1);
      expect(store.legacyCalls).toBe(1);
      expect(store.takeOverCalls).toBe(0);
    });

    it.each([ATTEMPT_A, ATTEMPT_B])("does not reset the timestamp or call the provider on an immediate retry with attempt %s", async checkoutAttemptId => {
      const create = vi.fn(async () => ({ processToken: "must-not-create" }));
      await conflict(withCheckoutReservation(input(), create));
      const original = { ...[...store.rows.values()][0] };
      now += 1_000;

      const blocked = await conflict(withCheckoutReservation(input({ checkoutAttemptId }), create));

      expect(blocked.state).toBe("creating");
      expect(blocked.message).toBe(CHECKOUT_RESERVATION_MESSAGES.creating);
      expect([...store.rows.values()][0]).toEqual(original);
      expect(create).not.toHaveBeenCalled();
      expect(store.evidenceCalls).toBe(1);
      expect(store.legacyCalls).toBe(1);
      expect(store.takeOverCalls).toBe(0);
    });

    it("protects the full two-minute window, then elects exactly one recovery owner and skips the abandoned legacy lead", async () => {
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const recovered = { processToken: "recovered-provider-process", checkoutUrl: "synthetic-private-url" };
      const create = vi.fn(async () => { await gate; return recovered; });
      await conflict(withCheckoutReservation(input(), create));
      const original = { ...[...store.rows.values()][0] };
      expect(STALE_TAKEOVER_MS).toBe(120_000);
      now += STALE_TAKEOVER_MS - 1;
      expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))).state).toBe("creating");
      expect([...store.rows.values()][0]).toEqual(original);
      expect(create).not.toHaveBeenCalled();

      now += 1;
      const next = input({ checkoutAttemptId: ATTEMPT_B });
      const winner = withCheckoutReservation(next, create);
      const loser = conflict(withCheckoutReservation(next, create));
      await expect.poll(() => create.mock.calls.length).toBe(1);
      expect((await loser).state).toBe("creating");
      expect(store.legacyPending).toBe(true);
      expect(store.legacyCalls).toBe(1);
      release();
      await expect(winner).resolves.toEqual(recovered);
      await expect(withCheckoutReservation(next, create)).resolves.toEqual(recovered);

      expect(create).toHaveBeenCalledTimes(1);
      expect(store.legacyCalls).toBe(1);
      expect(store.rows.size).toBe(1);
      expect([...store.rows.values()][0]).toMatchObject({
        state: "open", attemptId: ATTEMPT_B, resultJson: JSON.stringify(recovered),
        createdAt: original.createdAt, updatedAt: now,
      });
      expect([...store.rows.values()][0].ownerToken).not.toBe(original.ownerToken);
    });

    it("converts an old failed legacy row to uncertain, preserves immediate retry timestamps, and later recovers", async () => {
      const create = vi.fn(async () => ({ processToken: "old-failed-recovered" }));
      await conflict(withCheckoutReservation(input(), create));
      const old = [...store.rows.values()][0];
      old.state = "failed"; // Simulate a row persisted by the previous legacy guard.
      age(store, STALE_TAKEOVER_MS);
      const oldCreatedAt = old.createdAt;
      const oldOwner = old.ownerToken;

      const blocked = await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create));
      expect(blocked.state).toBe("legacy_pending");
      const migrated = { ...[...store.rows.values()][0] };
      expect(migrated).toMatchObject({
        state: "uncertain", resultJson: null, createdAt: oldCreatedAt, updatedAt: now,
      });
      expect(migrated.ownerToken).not.toBe(oldOwner);
      expect(create).not.toHaveBeenCalled();
      expect(store.legacyCalls).toBe(2);

      now += 1_000;
      expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))).state).toBe("creating");
      expect([...store.rows.values()][0]).toEqual(migrated);
      expect(create).not.toHaveBeenCalled();
      expect(store.legacyCalls).toBe(2);

      now = migrated.updatedAt + STALE_TAKEOVER_MS;
      await expect(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))
        .resolves.toEqual({ processToken: "old-failed-recovered" });
      expect(create).toHaveBeenCalledTimes(1);
      expect(store.legacyCalls).toBe(2);
      expect(store.takeOverCalls).toBe(1);
      expect([...store.rows.values()][0]).toMatchObject({ state: "open", createdAt: oldCreatedAt });
    });

    it.each(["paidForProductFamily", "databaseProfilePaid"] as const)("lets initial %s evidence win before checking a legacy lead", async evidenceKey => {
      store.evidence = { ...noPaid, [evidenceKey]: true };
      const create = vi.fn(async () => ({ processToken: "must-not-create" }));
      const blocked = await conflict(withCheckoutReservation(input(), create));

      expect(blocked.state).toBe("completed");
      expect(blocked.message).toBe(CHECKOUT_RESERVATION_MESSAGES.completed);
      expect([...store.rows.values()][0]).toMatchObject({ state: "completed", resultJson: null });
      expect(create).not.toHaveBeenCalled();
      expect(store.legacyCalls).toBe(0);
      expect(store.takeOverCalls).toBe(0);
    });

    it.each(["paidForProductFamily", "databaseProfilePaid"] as const)("lets %s evidence win over a stale legacy-blocked reservation", async evidenceKey => {
      const create = vi.fn(async () => ({ processToken: "must-not-create" }));
      await conflict(withCheckoutReservation(input(), create));
      const original = { ...[...store.rows.values()][0] };
      now += STALE_TAKEOVER_MS;
      store.evidence = { ...noPaid, [evidenceKey]: true };

      const blocked = await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create));

      expect(blocked.state).toBe("completed");
      expect(blocked.message).toBe(CHECKOUT_RESERVATION_MESSAGES.completed);
      expect(create).not.toHaveBeenCalled();
      expect(store.takeOverCalls).toBe(0);
      expect(store.legacyCalls).toBe(1);
      expect([...store.rows.values()][0]).toEqual(original);
    });

    it("keeps explicit TEST1 diagnostics isolated from legacy and paid production evidence without allowing uncertain takeover", async () => {
      store.evidence = { ...noPaid, paidForProductFamily: true, databaseProfilePaid: true };
      const diagnostic = input({
        diagnosticTest: true,
        fingerprint: createCheckoutReservationFingerprint({
          email: "buyer@example.test", product: "guide", couponCode: "TEST1", identity: "owner-test",
        }),
      });
      const create = vi.fn(async () => ({ processToken: "test1-diagnostic-process" }));
      const original = await withCheckoutReservation(diagnostic, create);
      await expect(withCheckoutReservation(diagnostic, create)).resolves.toEqual(original);
      expect(store.legacyCalls).toBe(0);
      [...store.rows.values()][0].state = "uncertain";
      const uncertain = { ...[...store.rows.values()][0] };
      now += STALE_TAKEOVER_MS;

      const blocked = await conflict(withCheckoutReservation({ ...diagnostic, checkoutAttemptId: ATTEMPT_B }, create));

      expect(blocked.state).toBe("uncertain");
      expect(blocked.message).toBe(CHECKOUT_RESERVATION_MESSAGES.uncertain);
      expect([...store.rows.values()][0]).toEqual(uncertain);
      expect(create).toHaveBeenCalledTimes(1);
      expect(store.legacyCalls).toBe(0);
      expect(store.takeOverCalls).toBe(0);
    });
  });

  describe("returning production buyer takeover (owner-approved 7.11.2026)", () => {
    it.each(["creating", "uncertain"] as const)("keeps a fresh %s reservation blocked, then takes it over after the stale window", async state => {
      const create = vi.fn(async () => ({ processToken: "first" }));
      await withCheckoutReservation(input(), create);
      [...store.rows.values()][0].state = state;
      const blocked = await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create));
      expect(blocked.state).toBe("creating");
      expect(blocked.message).toBe(CHECKOUT_RESERVATION_MESSAGES.creating);
      expect(create).toHaveBeenCalledTimes(1);

      age(store, STALE_TAKEOVER_MS);
      store.legacyPending = true;
      store.legacyCalls = 0;
      create.mockResolvedValueOnce({ processToken: "second" });
      await expect(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create)).resolves.toEqual({ processToken: "second" });
      expect(create).toHaveBeenCalledTimes(2);
      expect(store.legacyCalls).toBe(0);
      const row = [...store.rows.values()][0];
      expect(row.state).toBe("open");
      expect(row.attemptId).toBe(ATTEMPT_B);
    });

    it("lets paid evidence win over a stale reservation without calling the provider", async () => {
      const create = vi.fn(async () => ({ processToken: "first" }));
      await withCheckoutReservation(input(), create);
      [...store.rows.values()][0].state = "uncertain";
      age(store, STALE_TAKEOVER_MS);
      store.evidence = { ...noPaid, paidForProductFamily: true };
      expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))).state).toBe("completed");
      expect(create).toHaveBeenCalledTimes(1);
      expect(store.takeOverCalls).toBe(0);
    });

    it("replays the same fresh authorization but opens a new process once it is older than the replay window", async () => {
      const create = vi.fn(async () => ({ processToken: "first" }));
      const original = await withCheckoutReservation(input(), create);
      await expect(withCheckoutReservation(input(), create)).resolves.toEqual(original);
      expect(create).toHaveBeenCalledTimes(1);

      age(store, OPEN_REPLAY_MAX_AGE_MS);
      create.mockResolvedValueOnce({ processToken: "renewed" });
      await expect(withCheckoutReservation(input(), create)).resolves.toEqual({ processToken: "renewed" });
      expect(create).toHaveBeenCalledTimes(2);
    });

    it("elects one owner when two returning requests race for the same stale reservation", async () => {
      await withCheckoutReservation(input(), async () => ({ processToken: "first" }));
      age(store, OPEN_TAKEOVER_MIN_AGE_MS);
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const create = vi.fn(async () => { await gate; return { processToken: "winner" }; });
      const winner = withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create);
      await expect.poll(() => create.mock.calls.length).toBe(1);
      expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))).state).toBe("creating");
      release();
      await expect(winner).resolves.toEqual({ processToken: "winner" });
      expect(create).toHaveBeenCalledTimes(1);
    });

    it("fails closed when the compare-and-swap takeover loses", async () => {
      await withCheckoutReservation(input(), async () => ({ processToken: "first" }));
      age(store, OPEN_TAKEOVER_MIN_AGE_MS);
      store.takeOver = async () => false;
      const create = vi.fn(async () => ({ processToken: "never" }));
      expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))).state).toBe("creating");
      expect(create).not.toHaveBeenCalled();
    });

    it("never takes over a completed one-time purchase", async () => {
      await withCheckoutReservation(input(), async () => ({ processToken: "first" }));
      [...store.rows.values()][0].state = "completed";
      age(store, OPEN_REPLAY_MAX_AGE_MS);
      const create = vi.fn(async () => ({ processToken: "never" }));
      expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))).state).toBe("completed");
      expect(create).not.toHaveBeenCalled();
    });

    it.each(["open", "creating", "uncertain"] as const)("never takes over a stale %s TEST1 diagnostic reservation", async state => {
      const diagnostic = input({ diagnosticTest: true });
      const create = vi.fn(async () => ({ processToken: "diagnostic-process" }));
      await withCheckoutReservation(diagnostic, create);
      [...store.rows.values()][0].state = state;
      age(store, OPEN_REPLAY_MAX_AGE_MS + STALE_TAKEOVER_MS);
      expect((await conflict(withCheckoutReservation({ ...diagnostic, checkoutAttemptId: ATTEMPT_B }, create))).state).toBe(state);
      expect(create).toHaveBeenCalledTimes(1);
      expect(store.takeOverCalls).toBe(0);
    });
  });
});
