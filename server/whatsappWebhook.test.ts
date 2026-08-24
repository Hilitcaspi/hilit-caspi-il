import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  BUSINESS_WHATSAPP_SENDER_INTERNATIONAL,
  BUSINESS_WHATSAPP_SENDER_LOCAL,
  buildMakeWhatsAppPayload,
  buildPurchaseOwnerMessage,
  PURCHASE_ALERT_RECIPIENTS,
  sendWhatsAppViaMake,
} from "./whatsappWebhook";

describe("general Make WhatsApp webhook", () => {
  it("forces every payload to request the business sender number", () => {
    const payload = buildMakeWhatsAppPayload({
      event: "purchase_completed",
      idempotencyKey: "purchase-test",
      phone: "054-453-0975",
      message: "בדיקה",
      metadata: { sender: "000", from: "000", senderPhone: "000" },
    });
    expect(payload).toMatchObject({
      phone: "0544530975",
      phoneInternational: "972544530975",
      phoneLocal: "0544530975",
      to: "0544530975",
      number: "0544530975",
      recipientPhone: "0544530975",
      recipient_phone: "0544530975",
      chatId: "972544530975@c.us",
      text: "בדיקה",
      body: "בדיקה",
      sender: BUSINESS_WHATSAPP_SENDER_LOCAL,
      from: BUSINESS_WHATSAPP_SENDER_LOCAL,
      senderPhone: BUSINESS_WHATSAPP_SENDER_LOCAL,
      sender_phone: BUSINESS_WHATSAPP_SENDER_LOCAL,
      senderPhoneInternational: BUSINESS_WHATSAPP_SENDER_INTERNATIONAL,
    });
  });

  it("sends the complete payload to Make", async () => {
    const previous = process.env.MATCH_WHATSAPP_WEBHOOK_URL;
    process.env.MATCH_WHATSAPP_WEBHOOK_URL = "https://hook.eu1.make.com/test";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const ok = await sendWhatsAppViaMake({
      event: "system_test",
      idempotencyKey: "system-test",
      phone: "0529467614",
      message: "בדיקה",
    }, fetchMock as any);
    expect(ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      phone: "0529467614",
      phoneInternational: "972529467614",
      senderPhone: "0552442334",
      senderPhoneInternational: "972552442334",
    });
    if (previous === undefined) delete process.env.MATCH_WHATSAPP_WEBHOOK_URL;
    else process.env.MATCH_WHATSAPP_WEBHOOK_URL = previous;
  });

  it("builds a detailed owner purchase notification for both recipients", () => {
    const message = buildPurchaseOwnerMessage({
      name: "ישראל ישראלי",
      email: "test@example.com",
      phone: "0500000000",
      product: "database",
      amount: 299,
      transactionId: "tx-1",
    });
    expect(message).toContain("רכישה חדשה הושלמה");
    expect(message).toContain("מאגר הרווקים");
    expect(message).toContain("299.00 ש״ח");
    expect(PURCHASE_ALERT_RECIPIENTS.map(item => item.phone)).toEqual(["0544530975", "0529467614"]);
  });

  it("leaves no active Vibrate callers in the server", () => {
    const files = ["automation.ts", "dashboardRouter.ts", "growWebhook.ts", "matchingScheduler.ts", "routers.ts"];
    for (const file of files) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(source).not.toContain("sendSMS(");
      expect(source).not.toContain('from "./vibrate"');
    }
  });

  it("keeps purchase WhatsApp after Grow idempotency and successful processing", () => {
    const source = readFileSync(new URL("./growWebhook.ts", import.meta.url), "utf8");
    expect(source).toContain("PURCHASE_ALERT_RECIPIENTS.map");
    expect(source.indexOf("Duplicate transactionId")).toBeLessThan(source.indexOf("PURCHASE_ALERT_RECIPIENTS.map"));
    expect(source.indexOf("await handleDatabase")).toBeLessThan(source.indexOf("PURCHASE_ALERT_RECIPIENTS.map"));
  });
});
