import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_RESERVATION_MESSAGES,
  CheckoutReservationConflictError,
  type CheckoutPaidEvidence,
  type CheckoutReservationRecord,
  type CheckoutReservationStore,
  createCheckoutReservationFingerprint,
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
    this.rows.set(record.reservationKey, { ...record });
    return true;
  }
  async rotateOpen(record: CheckoutReservationRecord, prior: string) {
    const old = this.rows.get(record.reservationKey);
    if (!old || old.state !== "open" || old.attemptId !== prior) return false;
    this.rows.set(record.reservationKey, { ...record });
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
    const denied = await conflict(withCheckoutReservation(input({ fingerprint: "not-the-original-server-keyed-fingerprint" }), async () => ({ processToken: "new" })));
    expect(denied.state).toBe("open");
    expect(denied.message).toBe(CHECKOUT_RESERVATION_MESSAGES.open);
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

    expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B }), create))).state).toBe("open");
    expect((await conflict(withCheckoutReservation(input({
      checkoutAttemptId: ATTEMPT_B,
      verifiedOpenResume: true,
      fingerprint: createCheckoutReservationFingerprint({ email: "buyer@example.test", product: "guide", identity: "other-buyer" }),
    }), create))).state).toBe("open");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("never lets verified resume evidence bypass an uncertain reservation or paid evidence", async () => {
    await expect(withCheckoutReservation(input(), async () => {
      throw new Error("outcome unknown after provider delivery");
    })).rejects.toMatchObject({ code: "CHECKOUT_RESERVATION_CONFLICT", state: "uncertain" });
    expect((await conflict(withCheckoutReservation(input({ checkoutAttemptId: ATTEMPT_B, verifiedOpenResume: true }), async () => ({ processToken: "never" })))).state)
      .toBe("uncertain");

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
    expect((await conflict(withCheckoutReservation(input(), async () => ({ processToken: "never" })))).state).toBe("uncertain");

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

  it("rotates a repeatable purchase only with a new attempt and exact provider confirmation", async () => {
    const plus = {
      email: "member@example.test",
      product: "plus",
      checkoutAttemptId: ATTEMPT_A,
      fingerprint: createCheckoutReservationFingerprint({ email: "member@example.test", product: "plus", identity: "member-1" }),
    };
    await withCheckoutReservation(plus, async () => ({ processToken: "plus-process-1" }));
    const changedAttempt = { ...plus, checkoutAttemptId: ATTEMPT_B };
    expect((await conflict(withCheckoutReservation(changedAttempt, async () => ({ processToken: "plus-process-2" })))).state).toBe("open");

    store.evidence = { ...noPaid, exactProviderProcessConfirmed: true };
    await expect(withCheckoutReservation(changedAttempt, async () => ({ processToken: "plus-process-2" })))
      .resolves.toEqual({ processToken: "plus-process-2" });
  });
});
