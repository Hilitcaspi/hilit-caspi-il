import { describe, expect, it } from "vitest";
import { classifyPaymentAttempt } from "./paymentAbandonmentAudit";

const base = {
  product: "database",
  completedSameProductAfter: 0,
  completedSameProductBefore: 0,
  abandonmentEmailsSent: 0,
  abandonmentEmailsClicked: 0,
  emailUnsubscribed: false,
  singleIsActive: null,
  plusCheckoutMode: null,
};

describe("classifyPaymentAttempt", () => {
  it("prioritizes a later verified Grow purchase over abandonment signals", () => {
    expect(classifyPaymentAttempt({ ...base, completedSameProductAfter: 1, abandonmentEmailsSent: 3 })).toBe("completed_later");
  });

  it("excludes Plus sandbox attempts from commercial recovery", () => {
    expect(classifyPaymentAttempt({ ...base, product: "plus", plusCheckoutMode: "sandbox" })).toBe("sandbox_plus");
    expect(classifyPaymentAttempt({ ...base, product: "plus", plusCheckoutMode: null })).toBe("sandbox_plus");
  });

  it("blocks unsubscribed and inactive contacts", () => {
    expect(classifyPaymentAttempt({ ...base, emailUnsubscribed: true })).toBe("excluded_contact");
    expect(classifyPaymentAttempt({ ...base, singleIsActive: false })).toBe("excluded_contact");
  });

  it("separates clicked recovery, sent recovery, repeat purchase and untouched abandonment", () => {
    expect(classifyPaymentAttempt({ ...base, abandonmentEmailsClicked: 1 })).toBe("recovery_clicked");
    expect(classifyPaymentAttempt({ ...base, abandonmentEmailsSent: 3 })).toBe("recovery_already_sent");
    expect(classifyPaymentAttempt({ ...base, completedSameProductBefore: 2 })).toBe("repeat_purchase_abandoned");
    expect(classifyPaymentAttempt(base)).toBe("abandoned_without_recovery");
  });
});
