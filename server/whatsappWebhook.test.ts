import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  BUSINESS_WHATSAPP_SENDER_INTERNATIONAL,
  BUSINESS_WHATSAPP_SENDER_LOCAL,
  buildMakeWhatsAppPayload,
  sendWhatsAppViaMake,
} from "./whatsappWebhook";

describe("match-only Make WhatsApp webhook", () => {
  it("forces every match payload to request the business sender number", () => {
    const payload = buildMakeWhatsAppPayload({
      event: "match_proposal_sent",
      idempotencyKey: "match-test",
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
      event: "match_follow_up",
      idempotencyKey: "match-follow-up-test",
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

  it("keeps Make exclusive to match events and routes operational SMS through Vibrate", () => {
    const webhookSource = readFileSync(new URL("./whatsappWebhook.ts", import.meta.url), "utf8");
    const growSource = readFileSync(new URL("./growWebhook.ts", import.meta.url), "utf8");
    const incompleteSource = readFileSync(new URL("./incompleteProfileAlerts.ts", import.meta.url), "utf8");
    const dashboardSource = readFileSync(new URL("./dashboardRouter.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

    expect(webhookSource).toContain('"match_proposal_sent"');
    expect(webhookSource).toContain('"match_follow_up"');
    expect(webhookSource).toContain('"match_expired"');
    expect(webhookSource).not.toMatch(/purchase_completed|incomplete_profile_alert|profile_completion_request|system_test/);
    expect(growSource).not.toContain("sendWhatsAppViaMake");
    expect(incompleteSource).toContain("sendSMS(HILIT_ALERT_PHONE, message)");
    expect(incompleteSource).not.toContain("sendWhatsAppViaMake");
    expect(dashboardSource).toContain("sendSMS(s.phone, message)");
    expect(routerSource).toContain("sendSMS(phone,");
  });
});
