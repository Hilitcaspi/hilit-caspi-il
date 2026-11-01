import { describe, expect, it } from "vitest";
import {
  detectProductByAmount,
  detectProductByDesc,
  isValidNovemberBundleWebhookBinding,
} from "./growWebhook";

describe("November bundle webhook discrimination", () => {
  it("never infers November from the historical 349 ILS amount", () => {
    expect(detectProductByAmount(349)).toBe("bundle_tubav");
    expect(detectProductByDesc("חבילת נובמבר - מאגר + הקורס המלא המסע לזוגיות"))
      .toBe("bundle_november");
    expect(detectProductByDesc("bundle_november")).toBe("bundle_november");
  });

  it("requires the exact persisted provider process and full 349 ILS amount", () => {
    expect(isValidNovemberBundleWebhookBinding({
      sum: 349,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "grow-process-1",
    })).toBe(true);
    expect(isValidNovemberBundleWebhookBinding({
      sum: 349,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "different-process",
    })).toBe(false);
    expect(isValidNovemberBundleWebhookBinding({
      sum: 299,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "grow-process-1",
    })).toBe(false);
  });

  it("allows TEST1 only with the matching server order and exact diagnostic price", () => {
    expect(isValidNovemberBundleWebhookBinding({
      sum: 1,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "grow-process-1",
      couponCode: "TEST1",
    })).toBe(true);
    expect(isValidNovemberBundleWebhookBinding({
      sum: 1,
      webhookProcessToken: "grow-process-1",
      checkoutProcessToken: "grow-process-1",
      couponCode: "OTHER",
    })).toBe(false);
  });
});
