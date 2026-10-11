import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./_core/metaCapi", () => ({ sendMetaPurchasePayload: vi.fn() }));
import { getDb } from "./db";
import { sendMetaPurchasePayload } from "./_core/metaCapi";
import { encryptMetaPayload, processMetaPurchaseDeliveries, runScheduledMetaPurchaseDelivery } from "./metaPurchaseDelivery";
import { META_RETRY_WINDOW_MS, isFreshMetaEvent, metaNotificationPaidAt, matchesMetaCheckout } from "../shared/metaPurchasePolicy";
const now = Date.UTC(2026, 9, 11, 12);
const payload: any = { data: [{ event_name: "Purchase", event_id: "synthetic-event", event_time: now / 1000, custom_data: { value: 19.9 } }] };
function mockDb({ claim = 1, save = 1, enabled = true, rows = true, old = false, throwSave = false } = {}) {
  const row = { id: 1, eventKey: "synthetic-key", product: "match_boost", eventTime: old ? now - META_RETRY_WINDOW_MS : now,
    payloadEncrypted: encryptMetaPayload(payload, "test-only-secret"), state: "pending", attemptCount: 0, nextAttemptAt: now, claimedUntil: null, createdAt: now };
  let reads = 0, writes = 0;
  const select = vi.fn(() => { const chain: any = { from: () => chain, where: () => chain, orderBy: () => chain,
    limit: () => Promise.resolve(reads++ === 0 ? [{ enabled, enabledAt: now, scheduleCronTaskUid: "test-task" }] : rows ? [row] : []) }; return chain; });
  const update = vi.fn(() => ({ set: (values: any) => ({ where: async () => { const first = writes++ === 0;
    if (!first && throwSave) throw Error("synthetic-storage-failure"); return [{ affectedRows: first ? claim : save }]; } }) }));
  vi.mocked(getDb).mockResolvedValue({ select, update } as any);
  return { select, update };
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("JWT_SECRET", "test-only-secret"); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.mocked(sendMetaPurchasePayload).mockResolvedValue({ state: "accepted", category: "accepted", eventsReceived: 1 });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("Meta delivery worker isolated behavior", () => {
  it("never calls the provider when another worker wins the claim", async () => {
    mockDb({ claim: 0 }); expect(await processMetaPurchaseDeliveries()).toEqual({ processed: 0, accepted: 0 });
    expect(sendMetaPurchasePayload).not.toHaveBeenCalled();
  });
  it("records acceptance only after its owned write succeeds", async () => {
    mockDb(); expect(await processMetaPurchaseDeliveries()).toEqual({ processed: 1, accepted: 1 });
    expect(sendMetaPurchasePayload).toHaveBeenCalledWith(payload);
  });
  it("does not report acceptance if ownership is lost before persistence", async () => {
    mockDb({ save: 0 }); expect(await processMetaPurchaseDeliveries()).toEqual({ processed: 1, accepted: 0 });
  });
  it("surfaces persistence failure rather than claiming provider acceptance was saved", async () => {
    mockDb({ throwSave: true }); await expect(processMetaPurchaseDeliveries()).rejects.toThrow("synthetic-storage-failure");
  });
  it("does not send an expired event", async () => {
    mockDb({ old: true }); expect(await processMetaPurchaseDeliveries()).toEqual({ processed: 1, accepted: 0 });
    expect(sendMetaPurchasePayload).not.toHaveBeenCalled();
  });
  it("keeps disabled schedules inert", async () => {
    mockDb({ enabled: false }); expect(await runScheduledMetaPurchaseDelivery("test-task")).toMatchObject({ skipped: "unregistered_schedule" });
    expect(sendMetaPurchasePayload).not.toHaveBeenCalled();
  });
  it("does not send rows already accepted and absent from pending selection", async () => {
    mockDb({ rows: false }); expect(await processMetaPurchaseDeliveries()).toEqual({ processed: 0, accepted: 0 });
    expect(sendMetaPurchasePayload).not.toHaveBeenCalled();
  });
  it("rejects before-activation history and next-day date-only notifications", () => {
    expect(isFreshMetaEvent(now - 1000, now, now)).toBe(false);
    expect(metaNotificationPaidAt("10/10/26", now)).toBeNull();
    expect(metaNotificationPaidAt("11/10/26", now)).toBe(now);
    expect(metaNotificationPaidAt("11/10/2026", now)).toBe(now);
    expect(metaNotificationPaidAt("2026-10-11T12:00:00Z", now)).toBe(now);
    expect(metaNotificationPaidAt("31/02/26", now)).toBeNull();
  });
  it("never reuses another payment's checkout event or cookies", () => {
    expect(matchesMetaCheckout({ processToken: "synthetic-a", checkoutProcessToken: "synthetic-b", transactionId: "123" })).toBe(false);
    expect(matchesMetaCheckout({ processToken: "synthetic-a", checkoutProcessToken: "synthetic-a", confirmedTransactionId: "124", transactionId: "123" })).toBe(false);
    expect(matchesMetaCheckout({ processToken: "synthetic-a", checkoutProcessToken: "synthetic-a", confirmedTransactionId: "123", transactionId: "123" })).toBe(true);
  });
});
