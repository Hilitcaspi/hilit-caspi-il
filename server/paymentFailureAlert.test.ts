import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock, sendSmsMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(async () => ({ success: true })),
  sendSmsMock: vi.fn(async () => true),
}));

vi.mock("./brevo", () => ({ sendEmail: sendEmailMock }));
vi.mock("./vibrate", () => ({ sendSMS: sendSmsMock }));

import {
  notifyPaymentFailure,
  resetPaymentFailureAlertStateForTests,
  shouldSendCriticalPaymentSms,
} from "./paymentFailureAlert";

describe("payment failure operational alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPaymentFailureAlertStateForTests();
  });

  it("treats profile-save and create-process failures as critical with a cooldown", () => {
    expect(shouldSendCriticalPaymentSms("profile_save", 1_000_000)).toBe(true);
    expect(shouldSendCriticalPaymentSms("createProcess", 1_000_001)).toBe(false);
    expect(shouldSendCriticalPaymentSms("createProcess", 1_900_001)).toBe(true);
    expect(shouldSendCriticalPaymentSms("sdk_failure", 3_000_000)).toBe(false);
  });

  it("sends email and one SMS for a pre-payment profile-save failure", async () => {
    await notifyPaymentFailure({
      customerName: "בדיקת מערכת",
      customerEmail: "monitor@example.com",
      customerPhone: "0500000000",
      product: "database",
      amount: 299,
      errorMessage: "network_error",
      stage: "profile_save",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
    expect(sendSmsMock.mock.calls[0]?.[1]).toContain("שמירת פרופיל לפני תשלום");
    expect(sendSmsMock.mock.calls[0]?.[1]).toContain("לא בוצע חיוב");
  });

  it("does not send critical SMS for an SDK/card-level failure", async () => {
    await notifyPaymentFailure({
      customerName: "בדיקת מערכת",
      customerEmail: "monitor@example.com",
      product: "database",
      stage: "sdk_failure",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendSmsMock).not.toHaveBeenCalled();
  });
});
