import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { markCheckoutReservationPaymentUncertain, markCheckoutReservationProviderConfirmed, setCheckoutReservationStoreForTests, type CheckoutReservationStore, type CheckoutReservationRecord } from "./checkoutReservation";
const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createPaymentProcess: vi.fn(), isRejected: vi.fn(), sendEmail: vi.fn(), notifyOwner: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./growPayment", () => ({
  PRODUCT_CONFIGS: { database: { sum: 299 }, guide: { sum: 149 }, course: { sum: 249 }, session: { sum: 500 } },
  getPlusCheckoutConfig: () => ({ configured: true, mode: "production", checkoutAmount: 99, displayAmount: 99 }),
  createPaymentProcess: mocks.createPaymentProcess,
  isGrowCreateDefinitelyRejected: mocks.isRejected,
}));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail, addContactToList: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./acquisitionCapture", async importOriginal => ({ ...await importOriginal<typeof import("./acquisitionCapture")>(), recordAcquisitionSafely: vi.fn() }));
import { appRouter } from "./routers";
const ctx = () => ({ user: null, req: { protocol: "https", headers: {} }, res: {} }) as TrpcContext;
const input = { product: "database" as const, fullName: "Synthetic Checkout", email: "synthetic-checkout@example.test", phone: "0500000000", checkoutAttemptId: "aabacada-1111-4111-8111-123456789012" };
function harness() {
  const records = new Map<string, CheckoutReservationRecord>();
  let paid = false, exact = false, legacy = false;
  const store: CheckoutReservationStore = {
    get: async key => records.get(key) || null,
    insert: async row => { if (records.has(row.reservationKey)) return false; records.set(row.reservationKey, { ...row }); return true; },
    updateOwned: async (key, owner, state, patch) => { const r = records.get(key); if (!r || r.ownerToken !== owner || r.state !== state) return false; records.set(key, { ...r, ...patch }); return true; },
    claimFailed: async r => { if (records.get(r.reservationKey)?.state !== "failed") return false; records.set(r.reservationKey, { ...r }); return true; },
    rotateOpen: async (r, old) => { const p = records.get(r.reservationKey); if ((!p || !["open", "completed"].includes(p.state)) || p.attemptId !== old) return false; records.set(r.reservationKey, { ...r }); return true; },
    findPaidEvidence: async () => ({ paidForProductFamily: paid, databaseProfilePaid: paid, exactProviderProcessConfirmed: exact }),
    hasRecentLegacyPending: async () => legacy,
  };
  const persist = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  const db = {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onDuplicateKeyUpdate: persist })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })) })),
  };
  return { records, store, db, persist, setPaid: () => { paid = true; exact = true; }, setLegacy: () => { legacy = true; } };
}
let h: ReturnType<typeof harness>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("JWT_SECRET", "synthetic-test-checkout-reservation-key-only");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Live supplier requests forbidden"); }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  h = harness(); setCheckoutReservationStoreForTests(h.store); mocks.getDb.mockResolvedValue(h.db);
  mocks.isRejected.mockReturnValue(false);
  mocks.createPaymentProcess.mockResolvedValue({ authCode: "synthetic-auth", processToken: "synthetic-process" });
});
afterEach(() => { setCheckoutReservationStoreForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("checkout reservation at payment API boundary", () => {
  it("concurrent requests create exactly one provider process and persist attribution once", async () => {
    let release!: (v: unknown) => void;
    mocks.createPaymentProcess.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const caller = appRouter.createCaller(ctx());
    const a = caller.payment.createProcess(input);
    await vi.waitFor(() => expect(mocks.createPaymentProcess).toHaveBeenCalledOnce());
    await expect(caller.payment.createProcess(input)).rejects.toMatchObject({ code: "CONFLICT" });
    release({ authCode: "synthetic-auth", processToken: "synthetic-process" });
    const result = await a;
    const replay = await caller.payment.createProcess(input);
    expect(replay).toEqual(result);
    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce(); expect(h.persist).toHaveBeenCalledOnce();
    expect(result.purchaseTrackingToken).toMatch(/^[a-f0-9]{64}$/);
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
  it("cannot bypass an open checkout by changing client attempt id", async () => {
    const caller = appRouter.createCaller(ctx()); await caller.payment.createProcess(input);
    await expect(caller.payment.createProcess({ ...input, checkoutAttemptId: "babacada-1111-4111-8111-123456789012" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
  });
  it("does not replay a paid process even for the same client attempt", async () => {
    const caller = appRouter.createCaller(ctx()); await caller.payment.createProcess(input); h.setPaid();
    await expect(caller.payment.createProcess(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
  });
  it("blocks an existing database purchase before any lead or provider writes", async () => {
    h.setPaid();
    await expect(appRouter.createCaller(ctx()).payment.createProcess(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(h.db.insert).not.toHaveBeenCalled(); expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });
  it("does not reset an uncertain provider request on retry or after a new attempt id", async () => {
    mocks.createPaymentProcess.mockRejectedValue(new Error("synthetic timeout"));
    const caller = appRouter.createCaller(ctx());
    await expect(caller.payment.createProcess(input)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller.payment.createProcess({ ...input, checkoutAttemptId: "babacada-1111-4111-8111-123456789012" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
    expect([...h.records.values()][0].state).toBe("uncertain");
  });
  it("blocks legacy pending checkout before rewriting its payment tracking", async () => {
    h.setLegacy();
    await expect(appRouter.createCaller(ctx()).payment.createProcess(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(h.db.insert).not.toHaveBeenCalled(); expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
  });
  it("allows proved pre-provider storage failure to retry without a provider duplicate", async () => {
    h.persist.mockRejectedValueOnce(new Error("synthetic storage unavailable"));
    const caller = appRouter.createCaller(ctx());
    await expect(caller.payment.createProcess(input)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    await expect(caller.payment.createProcess(input)).resolves.toMatchObject({ processToken: "synthetic-process" });
    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
  });
  it("permits a separate future session only after verified completion and a new explicit attempt", async () => {
    const caller = appRouter.createCaller(ctx());
    await caller.payment.createProcess({ ...input, product: "session" });
    h.setPaid();
    await expect(caller.payment.createProcess({ ...input, product: "session" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller.payment.createProcess({ ...input, product: "session", checkoutAttemptId: "babacada-1111-4111-8111-123456789012" })).resolves.toMatchObject({ processToken: "synthetic-process" });
    expect(mocks.createPaymentProcess).toHaveBeenCalledTimes(2);
  });
  it("retains verified completion when another checkout overwrote legacy tracking", async () => {
    const caller = appRouter.createCaller(ctx());
    await caller.payment.createProcess({ ...input, product: "session" });
    [...h.records.values()][0].state = "completed";
    await expect(caller.payment.createProcess({ ...input, product: "session" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller.payment.createProcess({ ...input, product: "session", checkoutAttemptId: "babacada-1111-4111-8111-123456789012" })).resolves.toMatchObject({ processToken: "synthetic-process" });
    expect(mocks.createPaymentProcess).toHaveBeenCalledTimes(2);
  });
  it("marks only the exact stored provider authorization completed without any provider or messaging call", async () => {
    const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]);
    mocks.getDb.mockResolvedValue({ $client: { execute } });
    await markCheckoutReservationProviderConfirmed("synthetic-provider-process");
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("WHERE state IN ('open','uncertain')"), [expect.any(Number), "synthetic-provider-process"]);
    expect(execute.mock.calls[0][0]).toContain("$.processToken");
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
  it("locks only a matching opaque authorization after an unknown payment outcome", async () => {
    const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]);
    mocks.getDb.mockResolvedValue({ $client: { execute } });
    await markCheckoutReservationPaymentUncertain({ authCode: "synthetic-opaque-auth" });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("state = 'uncertain'"), [expect.any(Number), "$.authCode", "synthetic-opaque-auth"]);
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
  it("fails closed if durable store is unavailable, with no raw database error", async () => {
    h.store.insert = async () => { throw new Error("synthetic private db error"); };
    await expect(appRouter.createCaller(ctx()).payment.createProcess(input)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: expect.not.stringContaining("private db") });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled(); expect(h.db.insert).not.toHaveBeenCalled();
  });
});
