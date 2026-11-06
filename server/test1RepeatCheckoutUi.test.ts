import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  acquireCheckoutOwner, checkoutAttemptStorageKey, completeCheckoutOwner,
  createNextDiagnosticCheckoutAttempt, getOrCreateCheckoutAttemptId,
  isCheckoutAttemptCompleted, resetCheckoutSafetyForTests,
} from "../client/src/lib/checkoutSafety";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const identity = { product: "guide", email: "owner@example.test" };
function fixture(complete = true) {
  const rows = new Map<string, string>();
  const storage = { getItem: (k: string) => rows.get(k) ?? null, setItem: (k: string, v: string) => { rows.set(k, v); } };
  getOrCreateCheckoutAttemptId(identity, storage, () => A);
  if (complete) {
    const lease = acquireCheckoutOwner(A, "test-widget", storage);
    expect(completeCheckoutOwner(lease, storage)).toBe(true);
  }
  return { rows, storage };
}
afterEach(resetCheckoutSafetyForTests);

describe("explicit TEST1 repeat preparation", () => {
  it("creates a fresh opaque label but keeps the prior completion marker", () => {
    const { rows, storage } = fixture();
    expect(createNextDiagnosticCheckoutAttempt(identity, "TEST1", A, storage, () => B)).toBe(B);
    expect(rows.get(checkoutAttemptStorageKey(identity))).toBe(B);
    expect(isCheckoutAttemptCompleted(A, storage)).toBe(true);
    expect(isCheckoutAttemptCompleted(B, storage)).toBe(false);
  });
  it.each([undefined, "LIVE", "WELCOME", "test1"])("does not reset a normal or unvalidated coupon %s", code => {
    const { rows, storage } = fixture();
    expect(createNextDiagnosticCheckoutAttempt(identity, code, A, storage, () => B)).toBeNull();
    expect(rows.get(checkoutAttemptStorageKey(identity))).toBe(A);
  });
  it("does not reset an incomplete or uncertain attempt", () => {
    const { storage } = fixture(false);
    expect(createNextDiagnosticCheckoutAttempt(identity, "TEST1", A, storage, () => B)).toBeNull();
  });
  it("cannot replace another identity's label or release a different wallet owner", () => {
    const { storage } = fixture();
    expect(createNextDiagnosticCheckoutAttempt({ ...identity, email: "someone@example.test" }, "TEST1", A, storage, () => B)).toBeNull();
    expect(acquireCheckoutOwner(B, "other-widget", storage)).not.toBeNull();
    expect(createNextDiagnosticCheckoutAttempt(identity, "TEST1", A, storage, () => B)).toBeNull();
  });
  it.each([A, "invalid"])("rejects a reused or invalid new attempt label %s", value => {
    const { storage } = fixture();
    expect(createNextDiagnosticCheckoutAttempt(identity, "TEST1", A, storage, () => value)).toBeNull();
  });
  it("fails closed when storage is unavailable", () => {
    fixture();
    expect(createNextDiagnosticCheckoutAttempt(identity, "TEST1", A, null, () => B)).toBeNull();
  });
  it("exposes repeat preparation only after TEST1 completion and guards a pending hidden TEST1 coupon", () => {
    const wallet = readFileSync("client/src/components/GrowWallet.tsx", "utf8");
    expect(wallet).toContain('paymentCompleted && couponApplied?.code === "TEST1"');
    expect(wallet).toContain('prior.couponCode !== "TEST1"');
    expect(wallet).toContain('prefillCoupon?.trim().toUpperCase() === "TEST1"');
    expect(wallet).toContain("createNextDiagnosticCheckoutAttempt(");
    expect(wallet).toContain("חיוב נוסף של 1 ₪");
    const november = readFileSync("client/src/pages/NovemberLoveBundle.tsx", "utf8");
    expect(november).toContain('get("coupon")?.trim().toUpperCase() === "TEST1"');
    expect(november).toContain("prefillCoupon={diagnosticCoupon}");
    expect(november).toContain("showCoupon={false}");
  });
});
