import { describe, expect, it } from "vitest";
import { chooseStaffBuyerName, chooseClosing, type PaymentRow } from "./salesIntelligence";
const payment: PaymentRow = { id: 1, transactionId: "1111", email: "buyer@example.test", product: "database", couponCode: null, amountAgorot: 29900, amountSource: "grow", paidAt: 100000 };

describe("staff buyer display", () => {
  it("prefers the exact confirmed checkout over a profile name", () => {
    expect(chooseStaffBuyerName(payment, [
      { email: payment.email, name: "Checkout Sample", product: "database", confirmedTransactionId: "1111", kind: "payment" },
      { email: payment.email, name: "Profile Sample", kind: "single" },
    ])).toBe("Checkout Sample");
  });
  it("does not borrow a name from a different email or an unmatched checkout", () => {
    expect(chooseStaffBuyerName(payment, [
      { email: "someone@example.test", name: "Wrong Sample", kind: "single" },
      { email: payment.email, name: "Unconfirmed Sample", product: "database", confirmedTransactionId: "2222", kind: "payment" },
    ])).toBeNull();
  });
  it("leaves conflicting profile names unknown", () => {
    expect(chooseStaffBuyerName(payment, [
      { email: payment.email, name: "Profile One", kind: "single" },
      { email: payment.email, name: "Profile Two", kind: "single" },
    ])).toBeNull();
  });
  it("retains creative UTM only when it belongs to the selected closing touch", () => {
    expect(chooseClosing({ ...payment, utmSource: "meta", utmContent: "ad_2" }, [], [], [], []).creative).toBe("ad_2");
    expect(chooseClosing(payment, [], [{ email: payment.email, journeyKey: "women_first_step_v2", sentAt: 100, clickedAt: 1000, paymentAttemptProduct: "database" }], [], []).creative).toBe("");
  });
});
