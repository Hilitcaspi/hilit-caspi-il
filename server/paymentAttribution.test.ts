import { describe, expect, it } from "vitest";
import {
  createPurchaseTrackingIdentity,
  getClientIp,
  normalizeMetaCookie,
  PAYMENT_ATTRIBUTION_TTL_MS,
} from "./paymentAttribution";
import { resolvePurchaseEventId } from "./_core/metaCapi";

describe("verified purchase attribution", () => {
  it("accepts Meta cookie formats and rejects arbitrary or oversized values", () => {
    expect(normalizeMetaCookie("fb.1.1723456789012.Abc_def-123")).toBe("fb.1.1723456789012.Abc_def-123");
    expect(normalizeMetaCookie("javascript:alert(1)")).toBeUndefined();
    expect(normalizeMetaCookie(`fb.1.1723456789012.${"x".repeat(260)}`)).toBeUndefined();
  });

  it("creates independent opaque tracking and deduplication identifiers", () => {
    const first = createPurchaseTrackingIdentity();
    const second = createPurchaseTrackingIdentity();

    expect(first.trackingToken).toMatch(/^[a-f0-9]{64}$/);
    expect(first.purchaseEventId).toMatch(/^checkout-[0-9a-f-]{36}$/);
    expect(first.trackingToken).not.toBe(second.trackingToken);
    expect(first.purchaseEventId).not.toBe(second.purchaseEventId);
    expect(PAYMENT_ATTRIBUTION_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("normalizes a trusted Express client IP without accepting oversized input", () => {
    expect(getClientIp({ ip: "::ffff:203.0.113.5" } as any)).toBe("203.0.113.5");
    expect(getClientIp({ ip: "x".repeat(65) } as any)).toBeUndefined();
  });

  it("prefers the checkout event id shared with Pixel and falls back deterministically", () => {
    expect(resolvePurchaseEventId({ product: "database", eventId: "checkout-shared", transactionId: "tx-1" }, 123)).toBe("checkout-shared");
    expect(resolvePurchaseEventId({ product: "database", transactionId: "tx-1" }, 123)).toBe("grow-tx-1");
    expect(resolvePurchaseEventId({ product: "database" }, 123)).toBe("grow-database-123");
  });
});
