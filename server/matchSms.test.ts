import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  buildInitialMatchSmsMessage,
  buildMatchExpiredSmsMessage,
  buildMatchFollowUpSmsMessage,
  didClaimMatchSms,
  sendInitialMatchSmsOnce,
} from "./matchSms";

describe("automatic match SMS delivery via Vibrate", () => {
  it("builds concise initial, follow-up and expiry messages", () => {
    const initial = buildInitialMatchSmsMessage("דנה", "עידו", 85);
    expect(initial).toContain("היי דנה");
    expect(initial).toContain("85%");
    expect(initial).toContain("עידו");
    expect(initial).toContain("במייל");

    const followUp = buildMatchFollowUpSmsMessage("דנה", "regular");
    expect(followUp).toContain("עדיין ממתינה לתשובה");
    expect(followUp).not.toContain("כבר התקבלה תשובה חיובית מהצד השני");

    const expired = buildMatchExpiredSmsMessage("דנה");
    expect(expired).toContain("פגה");
    expect(expired).toContain("48 שעות");
  });

  it("keeps Boost sender and recipient wording private and distinct", () => {
    const sender = buildInitialMatchSmsMessage("דנה", "שם חסוי", 78, "boost", "sender");
    expect(sender).toContain("בקשת ה־Boost שלך");
    expect(sender).toContain("אינם אישור להתאמה");
    expect(sender).not.toContain("שם חסוי");

    const recipient = buildInitialMatchSmsMessage("דנה", "שם חסוי", 78, "boost", "recipient");
    expect(recipient).toContain("התאמת Boost");
    expect(recipient).toContain("לא נבחרה אישית על ידי הילית");
    expect(recipient).not.toContain("שם חסוי");
  });

  it("claims an initial match once and sends one Vibrate SMS per valid side", async () => {
    const where = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where }) });
    const sender = vi.fn().mockResolvedValue(true);

    const result = await sendInitialMatchSmsOnce({ update } as any, {
      matchId: 77,
      score: 91,
      recipientA: { phone: "0559348719", firstName: "דנה", matchFirstName: "עידו" },
      recipientB: { phone: "0541234567", firstName: "עידו", matchFirstName: "דנה" },
    }, sender);

    expect(result).toEqual({ skipped: false, sentA: true, sentB: true });
    expect(update).toHaveBeenCalledTimes(1);
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it("does not send again after another flow claimed the same match", async () => {
    const where = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
    const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where }) });
    const sender = vi.fn();

    const result = await sendInitialMatchSmsOnce({ update } as any, {
      matchId: 77,
      score: 91,
      recipientA: { phone: "0559348719", firstName: "דנה", matchFirstName: "עידו" },
      recipientB: { phone: "0541234567", firstName: "עידו", matchFirstName: "דנה" },
    }, sender);

    expect(result).toEqual({ skipped: true, sentA: false, sentB: false });
    expect(sender).not.toHaveBeenCalled();
  });

  it("does not send to inactive or seed profiles", async () => {
    const where = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where }) });
    const sender = vi.fn().mockResolvedValue(true);

    const result = await sendInitialMatchSmsOnce({ update } as any, {
      matchId: 78,
      score: 88,
      recipientA: { phone: "0559348719", firstName: "דנה", matchFirstName: "עידו", isActive: false },
      recipientB: { phone: "0541234567", firstName: "עידו", matchFirstName: "דנה", isActive: true, isSeed: true },
    }, sender);

    expect(result).toEqual({ skipped: false, sentA: false, sentB: false });
    expect(sender).not.toHaveBeenCalled();
  });

  it("routes every active automatic match message through Vibrate and not WhatsApp", () => {
    const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const boost = readFileSync(new URL("./matchBoostRouter.ts", import.meta.url), "utf8");
    const automation = readFileSync(new URL("./automation.ts", import.meta.url), "utf8");
    const scheduler = readFileSync(new URL("./matchingScheduler.ts", import.meta.url), "utf8");
    const activeSources = [routers, boost, automation, scheduler].join("\n");

    expect(routers.match(/sendInitialMatchSmsOnce\(db/g)).toHaveLength(3);
    expect(boost).toContain("sendInitialMatchSmsOnce(db");
    expect(automation).toContain("sendSMS(singleA.phone, buildMatchFollowUpSmsMessage");
    expect(scheduler).toContain("sendSMS(singleA.phone, buildMatchExpiredSmsMessage");
    expect(activeSources).not.toContain("sendInitialMatchWhatsAppsOnce");
    expect(activeSources).not.toContain("sendWhatsAppViaMake");
    expect(activeSources).not.toContain('from "./matchWhatsApp"');
    expect(activeSources).not.toContain('from "./whatsappWebhook"');
  });

  it("recognizes MySQL affected-row claims", () => {
    expect(didClaimMatchSms([{ affectedRows: 1 }])).toBe(true);
    expect(didClaimMatchSms([{ affectedRows: 0 }])).toBe(false);
    expect(didClaimMatchSms(undefined)).toBe(false);
  });
});
