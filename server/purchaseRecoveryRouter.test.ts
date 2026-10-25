import { describe, expect, it } from "vitest";
import {
  purchaseRecoveryEvidenceLabel,
  purchaseRecoveryRecipientStatus,
  purchaseRecoverySummary,
} from "./purchaseRecoveryRouter";

describe("purchase recovery staff presentation", () => {
  it("keeps email opens distinct from checkout failure evidence", () => {
    expect(purchaseRecoveryEvidenceLabel("product_marketing_email_opened")).toBe("נפתח מייל שיווקי");
    expect(purchaseRecoveryEvidenceLabel("saved_checkout_failure_alert")).toBe("נשמרה התראת כשל בתשלום");
  });

  it("presents provider acceptance without claiming inbox delivery", () => {
    expect(purchaseRecoveryRecipientStatus({
      emailState: "accepted",
      smsState: "draft",
      sendAt: null,
      offerRedeemedAt: null,
      purchased: false,
    })).toBe("accepted");
  });

  it("keeps an SMS hold distinct from a queued email", () => {
    expect(purchaseRecoveryRecipientStatus({
      emailState: "queued",
      smsState: "held",
      sendAt: Date.parse("2026-10-25T19:00:00+02:00"),
      offerRedeemedAt: null,
      purchased: false,
    })).toBe("sms_held");
  });

  it("prioritizes a verified purchase and redemption over a delivery state", () => {
    expect(purchaseRecoveryRecipientStatus({
      emailState: "accepted",
      smsState: "accepted",
      sendAt: null,
      offerRedeemedAt: 1,
      purchased: true,
    })).toBe("purchased");
    expect(purchaseRecoveryRecipientStatus({
      emailState: "accepted",
      smsState: "accepted",
      sendAt: null,
      offerRedeemedAt: 1,
      purchased: false,
    })).toBe("redeemed");
  });

  it("returns a complete zero-safe product summary from aggregate-only rows", () => {
    const summary = purchaseRecoverySummary([
      {
        product: "database",
        total: 3,
        emailConsented: 2,
        smsConsented: 1,
        emailHeld: 1,
        smsHeld: 0,
        scheduled19: 2,
        accepted: 0,
        redeemed: 0,
        purchased: 0,
        giftsGranted: 0,
      },
    ]);

    expect(summary.total).toBe(3);
    expect(summary.emailConsented).toBe(2);
    expect(summary.products.database.emailHeld).toBe(1);
    expect(summary.products.session).toMatchObject({ total: 0, purchased: 0 });
    expect(summary.products.plus).toMatchObject({ total: 0, giftsGranted: 0 });
  });
});
