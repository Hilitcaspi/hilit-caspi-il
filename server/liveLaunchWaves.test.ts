import { describe, expect, it } from "vitest";
import { buildLiveLaunchWavePlan, liveLaunchPhaseAt } from "./liveLaunchWaves";
import { liveLaunchRecipientHash, type LiveLaunchMember } from "./liveLaunchCampaign";
const member = (id: number, segment: LiveLaunchMember["segment"] = "cold", hot = false): LiveLaunchMember => ({
  email: `person${id}@example.com`, phone: hot ? `050${String(id).padStart(7, "0")}` : null,
  firstName: "Test", segment, leadId: id, singleId: null, questionnaireToken: null,
  smsIntentPriority: hot ? 0 : Number.MAX_SAFE_INTEGER, plusTicket: null,
  smsIntent: hot, smsPreviouslySent: false,
});
describe("approved launch wave assignment", () => {
  it("balances reproducible email arms and splits high-intent SMS without duplicate recipients", () => {
    const rows = Array.from({ length: 7200 }, (_, i) => member(i, "cold", i < 250));
    rows.push(member(9000, "plus"), member(9001, "database"));
    const plan = buildLiveLaunchWavePlan(rows, "test-seed-1234567890");
    const emails = [plan.phases.email19,plan.phases.email20,plan.phases.email21];
    const sms = [plan.phases.sms19,plan.phases.sms20,plan.phases.sms21];
    const coldEmailHashes = emails.flatMap(p => p.recipientHashes).filter(h => h !== liveLaunchRecipientHash(rows[7200]));
    expect(new Set(coldEmailHashes).size).toBe(7200);
    const smsHashes = sms.flatMap(p => p.recipientHashes);
    expect(smsHashes).toHaveLength(200);
    expect(new Set(smsHashes).size).toBe(200);
    const sizes = emails.map(p => p.email.cold);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(2);
    const smsSizes = sms.map(p => p.smsTotal);
    expect(Math.max(...smsSizes) - Math.min(...smsSizes)).toBeLessThanOrEqual(1);
    const onlyEmailSizes = emails.map(p => p.email.cold-p.smsComboHashes.length);
    expect(Math.max(...onlyEmailSizes)-Math.min(...onlyEmailSizes)).toBeLessThanOrEqual(1);
    sms.forEach((p,i) => expect(p.recipientHashes.every(h => emails[i].recipientHashes.includes(h))).toBe(true));
    sms.forEach((p,i) => expect(p.recipientHashes).toEqual(emails[i].smsComboHashes));
    expect(plan.phases.email19.recipientHashes).not.toContain(liveLaunchRecipientHash(rows[7201]));
    expect(plan.phases.email20.email.plus).toBe(0);
    expect(plan.phases.email21.email.plus).toBe(0);
    expect(plan.phases).toEqual(buildLiveLaunchWavePlan([...rows].reverse(), "test-seed-1234567890").phases);
    expect(JSON.stringify(plan)).not.toContain("@example.com");
  });
  it("leaves SMS absent for recipients without intent, phone, or with prior SMS", () => {
    const a = member(1,"cold",true); a.smsPreviouslySent = true;
    const plan = buildLiveLaunchWavePlan([a,member(2,"plus",true),member(3,"database",true),member(4)], "test-seed-1234567890");
    expect(plan.phases.sms19.smsTotal+plan.phases.sms20.smsTotal+plan.phases.sms21.smsTotal).toBe(0);
  });
  it("does not catch up outside three narrow slots or send on other dates", () => {
    const at = (time: string) => liveLaunchPhaseAt(Date.parse(`2026-10-08T${time}:00+03:00`));
    expect(at("18:59")).toBeNull(); expect(at("19:00")).toBe("email19");
    expect(at("19:29")).toBe("email19"); expect(at("19:30")).toBeNull();
    expect(at("20:00")).toBe("email20"); expect(at("20:30")).toBeNull();
    expect(at("21:00")).toBe("email21"); expect(at("21:30")).toBeNull();
    expect(liveLaunchPhaseAt(Date.parse("2026-10-09T19:00:00+03:00"))).toBeNull();
  });
});
