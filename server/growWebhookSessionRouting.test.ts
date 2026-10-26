import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(), accounting: vi.fn(), sendEmail: vi.fn(), notifyOwner: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./growPaymentAccounting", () => ({ recordGrowPaymentOnce: mocks.accounting }));
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));

import {
  buildCoachingMasOwnerNotification,
  detectProductByAmount,
  detectProductByDesc,
  handleGrowWebhook,
} from "./growWebhook";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDb.mockResolvedValue(null);
  mocks.accounting.mockResolvedValue("review");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External providers forbidden"); }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Grow introductory-session routing", () => {
  it("classifies canonical introductory-session descriptions without guessing coaching from amount alone", () => {
    expect(detectProductByDesc("פגישת היכרות אישית וליווי")).toBe("session");
    expect(detectProductByDesc("פגישת הכרות אישית")).toBe("session");
    expect(detectProductByAmount(450)).toBeNull();
    expect(detectProductByAmount(420)).toBe("coaching_mas");
    expect(detectProductByAmount(4200)).toBe("coaching_mas");
  });

  it.each(["פגישת היכרות עם הילית כספי", "פגישת הכרות אישית"])("routes a discounted 450 ILS %s notification to session accounting, not coaching", async description => {
    await handleGrowWebhook({ data: {
      payerEmail: "synthetic@example.test", fullName: "Synthetic QA", sum: "450", description,
      transactionId: "123456789", transactionToken: "syntheticTransactionToken12345",
      processToken: "synthetic-process", statusCode: 2, paymentDate: "26/10/26",
    } });
    expect(mocks.accounting).toHaveBeenCalledWith(expect.objectContaining({ product: "session", amountAgorot: 45000 }));
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the callback's paid sum rather than catalogue price in a coaching owner notification", () => {
    expect(buildCoachingMasOwnerNotification("Synthetic QA", "synthetic@example.test", 450)).toMatchObject({
      title: "רכישת ליווי אישי חדשה! 🌟 תהליך המסע",
      content: "Synthetic QA (synthetic@example.test) רכש תהליך המסע (12 פגישות) ב-450 ₪",
    });
    expect(buildCoachingMasOwnerNotification("Synthetic QA", "synthetic@example.test", 420).content).toContain("ב-420 ₪");
  });
});
