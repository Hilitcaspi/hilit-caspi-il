import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMatchWhatsAppMessage,
  buildMatchWhatsAppPayload,
  didClaimMatchWhatsApp,
  normalizeWhatsAppPhone,
  postMatchWhatsAppWebhook,
  sendInitialMatchWhatsAppsOnce,
} from "./matchWhatsApp";

describe("match WhatsApp delivery via Make", () => {
  const originalWebhook = process.env.MATCH_WHATSAPP_WEBHOOK_URL;

  beforeEach(() => {
    process.env.MATCH_WHATSAPP_WEBHOOK_URL = "https://hook.eu1.make.com/test-webhook";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalWebhook === undefined) delete process.env.MATCH_WHATSAPP_WEBHOOK_URL;
    else process.env.MATCH_WHATSAPP_WEBHOOK_URL = originalWebhook;
  });

  it("normalizes Israeli mobile numbers for WhatsApp", () => {
    expect(normalizeWhatsAppPhone("055-934-8719")).toBe("972559348719");
    expect(normalizeWhatsAppPhone("+972 55 934 8719")).toBe("972559348719");
    expect(normalizeWhatsAppPhone("559348719")).toBe("972559348719");
    expect(normalizeWhatsAppPhone("123")).toBeNull();
  });

  it("builds the approved Hebrew message and a stable idempotency key", () => {
    const message = buildMatchWhatsAppMessage("דנה", "עידו", 85);
    expect(message).toContain("היי דנה");
    expect(message).toContain("85%");
    expect(message).toContain("עידו");
    expect(message).toContain("תיבת המייל");

    const payload = buildMatchWhatsAppPayload({
      matchId: 42,
      score: 85,
      recipient: { side: "A", phone: "0559348719", firstName: "דנה", matchFirstName: "עידו" },
    });
    expect(payload).toMatchObject({
      event: "match_proposal_sent",
      channel: "whatsapp",
      idempotencyKey: "match-42-A",
      matchId: 42,
      recipientSide: "A",
      phone: "972559348719",
      phoneLocal: "0559348719",
      sender: "0552442334",
      from: "0552442334",
      senderPhone: "0552442334",
      senderPhoneInternational: "972552442334",
      recipientName: "דנה",
      matchFirstName: "עידו",
      score: 85,
    });
  });

  it("posts JSON to Make and handles rejection without throwing", async () => {
    const payload = buildMatchWhatsAppPayload({
      matchId: 42,
      score: 85,
      recipient: { side: "B", phone: "0559348719", firstName: "עידו", matchFirstName: "דנה" },
    })!;
    const acceptedFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    expect(await postMatchWhatsAppWebhook(payload, acceptedFetch as any)).toBe(true);
    expect(acceptedFetch).toHaveBeenCalledWith(
      "https://hook.eu1.make.com/test-webhook",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    const rejectedFetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "bad payload" });
    expect(await postMatchWhatsAppWebhook(payload, rejectedFetch as any)).toBe(false);
  });

  it("claims a match once and sends exactly one webhook per valid recipient", async () => {
    const where = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendInitialMatchWhatsAppsOnce({ update } as any, {
      matchId: 77,
      score: 91,
      recipientA: { phone: "0559348719", firstName: "דנה", matchFirstName: "עידו" },
      recipientB: { phone: "0541234567", firstName: "עידו", matchFirstName: "דנה" },
    });

    expect(result).toEqual({ skipped: false, sentA: true, sentB: true });
    expect(update).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const payloads = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(payloads.map(payload => payload.idempotencyKey).sort()).toEqual(["match-77-A", "match-77-B"]);
  });

  it("skips both recipients when another flow already claimed the same match", async () => {
    const where = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
    const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where }) });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendInitialMatchWhatsAppsOnce({ update } as any, {
      matchId: 77,
      score: 91,
      recipientA: { phone: "0559348719", firstName: "דנה", matchFirstName: "עידו" },
      recipientB: { phone: "0541234567", firstName: "עידו", matchFirstName: "דנה" },
    });

    expect(result).toEqual({ skipped: true, sentA: false, sentB: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not claim delivery when the webhook secret is unavailable", async () => {
    delete process.env.MATCH_WHATSAPP_WEBHOOK_URL;
    const update = vi.fn();
    const result = await sendInitialMatchWhatsAppsOnce({ update } as any, {
      matchId: 77,
      score: 91,
      recipientA: { phone: "0559348719", firstName: "דנה", matchFirstName: "עידו" },
      recipientB: { phone: "0541234567", firstName: "עידו", matchFirstName: "דנה" },
    });
    expect(result).toEqual({ skipped: false, sentA: false, sentB: false });
    expect(update).not.toHaveBeenCalled();
  });

  it("removes the initial Vibrate message builder from all three match-send flows", () => {
    const routersSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(routersSource).not.toContain("buildMatchSmsMessage");
    expect(routersSource).not.toContain("Send SMS notifications via Vibrate");
    expect(routersSource.match(/sendInitialMatchWhatsAppsOnce\(db/g)?.length).toBe(3);
    expect(routersSource.match(/sendEmail\(\{ to: \{ email: singleA\.email!/g)?.length).toBe(3);
    expect(routersSource.match(/sendEmail\(\{ to: \{ email: singleB\.email!/g)?.length).toBe(3);
  });

  it("recognizes MySQL affected-row claims", () => {
    expect(didClaimMatchWhatsApp([{ affectedRows: 1 }])).toBe(true);
    expect(didClaimMatchWhatsApp([{ affectedRows: 0 }])).toBe(false);
    expect(didClaimMatchWhatsApp(undefined)).toBe(false);
  });
});
