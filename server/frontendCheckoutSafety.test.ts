import { beforeEach, describe, expect, it } from "vitest";
import {
  acquireCheckoutOwner,
  checkoutAttemptStorageKey,
  completeCheckoutOwner,
  getOrCreateCheckoutAttemptId,
  isCheckoutAttemptCompleted,
  isCheckoutOwner,
  normalizeCheckoutEmail,
  releaseCheckoutOwner,
  resetCheckoutSafetyForTests,
} from "../client/src/lib/checkoutSafety";

const ATTEMPT_A = "11111111-1111-4111-8111-111111111111";
const ATTEMPT_B = "22222222-2222-4222-8222-222222222222";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  entries() {
    return [...this.values.entries()];
  }
}

beforeEach(() => resetCheckoutSafetyForTests());

describe("frontend checkout safety", () => {
  it("keeps the same opaque UUID in session storage for a normalized product/email/Boost attempt", () => {
    const storage = new MemoryStorage();
    const first = getOrCreateCheckoutAttemptId(
      {
        product: "match_boost",
        email: " Buyer@Example.com ",
        boostMatchId: 17,
      },
      storage,
      () => ATTEMPT_A
    );
    const second = getOrCreateCheckoutAttemptId(
      { product: "match_boost", email: "buyer@example.com", boostMatchId: 17 },
      storage,
      () => ATTEMPT_B
    );

    expect(first).toBe(ATTEMPT_A);
    expect(second).toBe(ATTEMPT_A);
    expect(normalizeCheckoutEmail(" Buyer@Example.com ")).toBe(
      "buyer@example.com"
    );
    expect(
      checkoutAttemptStorageKey({
        product: "match_boost",
        email: "buyer@example.com",
        boostMatchId: 17,
      })
    ).toContain("boost-17");
    expect(storage.entries()).toEqual([[expect.any(String), ATTEMPT_A]]);
  });

  it("rejects two clicks in the same turn before either can await", () => {
    const first = acquireCheckoutOwner(ATTEMPT_A, "wallet-a");
    const second = acquireCheckoutOwner(ATTEMPT_A, "wallet-a");

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("allows only one SDK owner across two GrowWallet components", () => {
    const firstWallet = acquireCheckoutOwner(ATTEMPT_A, "wallet-a");
    const secondWallet = acquireCheckoutOwner(ATTEMPT_B, "wallet-b");

    expect(isCheckoutOwner(firstWallet)).toBe(true);
    expect(secondWallet).toBeNull();
    expect(releaseCheckoutOwner(firstWallet)).toBe(true);
    expect(acquireCheckoutOwner(ATTEMPT_B, "wallet-b")).not.toBeNull();
  });

  it("makes SDK success terminal so a later close cannot invoke a second callback", () => {
    const lease = acquireCheckoutOwner(ATTEMPT_A, "wallet-a");
    let successCalls = 0;
    let closeCalls = 0;
    let terminal = false;
    const onSuccess = () => {
      if (!terminal && isCheckoutOwner(lease)) {
        terminal = true;
        successCalls += 1;
        completeCheckoutOwner(lease);
      }
    };
    const onClose = () => {
      if (!terminal && isCheckoutOwner(lease)) closeCalls += 1;
    };

    onSuccess();
    onClose();

    expect(successCalls).toBe(1);
    expect(closeCalls).toBe(0);
  });

  it("delivers duplicate SDK success at most once", () => {
    const lease = acquireCheckoutOwner(ATTEMPT_A, "wallet-a");
    let completed = false;
    let calls = 0;
    const onSuccess = () => {
      if (completed || !isCheckoutOwner(lease)) return;
      completed = true;
      calls += 1;
      completeCheckoutOwner(lease);
    };

    onSuccess();
    onSuccess();

    expect(calls).toBe(1);
  });

  it("blocks a second GrowWallet from reopening an SDK-success attempt", () => {
    const storage = new MemoryStorage();
    const firstWallet = acquireCheckoutOwner(ATTEMPT_A, "wallet-a", storage);
    expect(completeCheckoutOwner(firstWallet, storage)).toBe(true);

    expect(isCheckoutAttemptCompleted(ATTEMPT_A, storage)).toBe(true);
    expect(acquireCheckoutOwner(ATTEMPT_A, "wallet-b", storage)).toBeNull();
    expect(acquireCheckoutOwner(ATTEMPT_B, "wallet-b", storage)).not.toBeNull();
    expect(storage.entries().some(([key, value]) => key.includes(ATTEMPT_A) && value === "1")).toBe(true);
  });

  it("ignores stale callbacks after another owner has claimed the SDK", () => {
    const staleLease = acquireCheckoutOwner(ATTEMPT_A, "wallet-a");
    releaseCheckoutOwner(staleLease);
    const currentLease = acquireCheckoutOwner(ATTEMPT_B, "wallet-b");
    let staleCalls = 0;
    const staleCallback = () => {
      if (isCheckoutOwner(staleLease)) staleCalls += 1;
    };

    staleCallback();

    expect(staleCalls).toBe(0);
    expect(isCheckoutOwner(currentLease)).toBe(true);
  });

  it("releases a failed attempt so the same immutable attempt ID can retry", () => {
    const lease = acquireCheckoutOwner(ATTEMPT_A, "wallet-a");
    expect(releaseCheckoutOwner(lease)).toBe(true);

    const retry = acquireCheckoutOwner(ATTEMPT_A, "wallet-a");
    expect(retry).not.toBeNull();
    expect(retry?.attemptId).toBe(ATTEMPT_A);
  });
});
