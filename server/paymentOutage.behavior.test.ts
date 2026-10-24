import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(), createPaymentProcess: vi.fn(), sendEmail: vi.fn(), notifyOwner: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./growPayment", () => ({
  PRODUCT_CONFIGS: { database: { sum: 299 }, guide: { sum: 149 }, course: { sum: 249 }, session: { sum: 500 } },
  getPlusCheckoutConfig: () => ({ configured: true, mode: "production", checkoutAmount: 99, displayAmount: 99 }),
  createPaymentProcess: mocks.createPaymentProcess,
}));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail, addContactToList: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./acquisitionCapture", async importOriginal => ({
  ...await importOriginal<typeof import("./acquisitionCapture")>(),
  recordAcquisitionSafely: vi.fn(),
}));

import { appRouter } from "./routers";

const context = () => ({ user: null, req: { protocol: "https", headers: {} }, res: {} }) as TrpcContext;
const input = { product: "database" as const, fullName: "Synthetic QA", email: "synthetic@example.test", phone: "0500000000" };
function checkoutDb(persist: boolean) {
  const persistOrder = persist ? vi.fn().mockResolvedValue([{ affectedRows: 1 }]) : vi.fn().mockRejectedValue(new Error("synthetic storage failure"));
  const db = {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onDuplicateKeyUpdate: persistOrder })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })) })),
  };
  return { db, persistOrder };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External providers forbidden"); }));
  mocks.createPaymentProcess.mockResolvedValue({ authCode: "synthetic-auth", processToken: "synthetic-process" });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Payment database outage safeguards", () => {
  it.each(["database", "guide", "course", "coaching", "coaching_mas", "session", "bundle_new_year", "match_boost", "plus", "live_october"] as const)("does not open %s checkout while the database is unavailable", async product => {
    mocks.getDb.mockResolvedValue(null);
    await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, product }))
      .rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: expect.stringContaining("לא נפתח מסך חיוב") });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("propagates a thrown database failure before contacting Grow", async () => {
    mocks.getDb.mockRejectedValue(new Error("synthetic connection failure"));
    await expect(appRouter.createCaller(context()).payment.createProcess(input)).rejects.toThrow();
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["database", "guide", "course", "session"] as const)("requires a durable order for %s before calling Grow", async product => {
    const h = checkoutDb(false); mocks.getDb.mockResolvedValue(h.db);
    await expect(appRouter.createCaller(context()).payment.createProcess({ ...input, product }))
      .rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(h.persistOrder).toHaveBeenCalledOnce();
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    expect(h.db.update).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves a normal database checkout after the order is persisted", async () => {
    const h = checkoutDb(true); mocks.getDb.mockResolvedValue(h.db);
    const result = await appRouter.createCaller(context()).payment.createProcess(input);
    expect(h.persistOrder).toHaveBeenCalledOnce();
    expect(mocks.createPaymentProcess).toHaveBeenCalledOnce();
    expect(h.persistOrder.mock.invocationCallOrder[0]).toBeLessThan(mocks.createPaymentProcess.mock.invocationCallOrder[0]);
    expect(mocks.createPaymentProcess).toHaveBeenCalledWith(expect.objectContaining({ product: "database", sum: undefined }));
    expect(result).toMatchObject({ authCode: "synthetic-auth", purchaseTrackingToken: expect.any(String) });
    expect(h.db.update).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns a useful registration outage message without creating a profile", async () => {
    mocks.getDb.mockResolvedValue(null);
    await expect(appRouter.createCaller(context()).singles.registerBasicProfile({
      firstName: "Synthetic", gender: "female", age: 30, city: "QA", phone: "0500000000", email: "synthetic@example.test", deferUntilPayment: true,
    })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: expect.stringContaining("לא ניתן לשמור את ההרשמה") });
    expect(mocks.createPaymentProcess).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
