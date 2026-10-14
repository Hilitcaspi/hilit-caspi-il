import { describe, expect, it, vi } from "vitest";
import {
  OCTOBER14_SEND_EXPIRES_AT,
  OCTOBER14_SEND_NOT_BEFORE,
  classifyOctober14Audience,
  prepareOctober14Audience,
  runOctober14Campaign,
  type October14RawAudience,
} from "./october14Campaign";

const now = OCTOBER14_SEND_NOT_BEFORE + 1_000;

function raw(overrides: Partial<October14RawAudience> = {}): October14RawAudience {
  return {
    profiles: [], crm: [], plus: [], tickets: [], completedPayments: [], paymentLeads: [], activity: [],
    ...overrides,
    paymentLeads: overrides.paymentLeads || (overrides.crm || []).map(row => ({email: row.email, product: "database", confirmedAt: null, createdAt: now - 60_000})),
  } as October14RawAudience;
}

function coldCrm(email = "warm@example.test") {
  return { id: 1, email, phone: "0501234567", name: "Warm", status: "new_lead", emailUnsubscribed: 0, createdAt: now };
}

function paidProfile(id: number, email: string) {
  return {
    id, email, phone: "0507654321", firstName: "Member", isActive: 1, isSeed: 0, boostExcluded: 0,
    isPaid: 1, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: "verified", questionnaireCompletedAt: null, createdAt: now,
  };
}

const safeDependencies = (source: October14RawAudience) => ({
  readRawAudience: async () => source,
  readBrevoBlockedRecipientSet: async () => new Set<string>(),
  isPermanentlyBlockedEmail: () => false,
});

describe("October 14 campaign", () => {
  it("does not confuse a Plus waitlist or invitation with a paid past subscription", () => {
    const audience=classifyOctober14Audience(raw({profiles:[paidProfile(7,"member@example.test")],plus:[{singleId:7,status:"waitlist",billingStatus:"not_configured",billingCycleEndsAt:null,activatedAt:null,lastPaymentAt:null}]}),now);
    expect(audience.plusMembers).toHaveLength(1);
  });
  it("never expands the database campaign to unengaged CRM contacts", () => {
    const audience = classifyOctober14Audience(raw({crm:[coldCrm()],paymentLeads:[]}),now);
    expect(audience.databaseWarm).toEqual([]);
    expect(audience.suppressions.no_recent_verified_engagement).toBe(1);
  });
  it("blocks public SMS while the owner is revising its copy", async () => {
    const sms=vi.fn();
    await expect(runOctober14Campaign({channel:"sms",execute:true,dryRun:false,approvalConfirmed:true},{sendSMSBulkDetailed:sms})).rejects.toThrow("SMS copy is awaiting");
    expect(sms).not.toHaveBeenCalled();
  });
  it("suppresses a recent 8 October legacy launch rather than preserving its rest exemption", () => {
    const audience = classifyOctober14Audience(raw({
      crm: [coldCrm()],
      activity: [{ email: "warm@example.test", journeyKey: "live_launch26_cold", status: "sent", sentAt: now - 60_000, clickedAt: null }],
    }), now);
    expect(audience.databaseWarm).toEqual([]);
    expect(audience.suppressions.recent_marketing_email).toBe(1);
  });

  it("excludes any paid database member with prior Plus activation or billing evidence", () => {
    const audience = classifyOctober14Audience(raw({
      profiles: [paidProfile(7, "former-plus@example.test")],
      plus: [{ singleId: 7, status: "cancelled", billingStatus: "cancelled", billingCycleEndsAt: null, activatedAt: now - 1000, lastPaymentAt: null }],
    }), now);
    expect(audience.plusMembers).toEqual([]);
    expect(audience.suppressions.previously_activated_or_billed_plus).toBe(1);
  });

  it("keeps unpaid database-warm and eligible never-Plus members disjoint", () => {
    const audience = classifyOctober14Audience(raw({
      crm: [coldCrm("warm@example.test")],
      profiles: [paidProfile(8, "member@example.test")],
    }), now);
    expect(audience.databaseWarm.map(member => member.canonicalEmail)).toEqual(["warm@example.test"]);
    expect(audience.plusMembers.map(member => member.canonicalEmail)).toEqual(["member@example.test"]);
    expect(new Set([...audience.databaseWarm, ...audience.plusMembers].map(member => member.canonicalEmail)).size).toBe(2);
  });

  it("is read-only by default and never calls either provider", async () => {
    const email = vi.fn();
    const sms = vi.fn();
    const result = await runOctober14Campaign({ now }, {
      ...safeDependencies(raw({ crm: [coldCrm()] })),
      sendEmailBatch: email,
      sendSMSBulkDetailed: sms,
    });
    expect(result.readOnly).toBe(true);
    expect(result.summary?.databaseWarm).toBe(1);
    expect(email).not.toHaveBeenCalled();
    expect(sms).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("@example.test");
  });

  it("claims one email channel once and cannot call the SMS provider", async () => {
    const source = raw({ crm: [coldCrm()] });
    const review = await prepareOctober14Audience({ now, channel: "email" }, safeDependencies(source));
    const logs: Array<{ id: number; recipientEmail: string }> = [];
    let claimCount = 0;
    const db = {
      execute: vi.fn(async () => {
        claimCount += 1;
        if (claimCount === 1) return [{ affectedRows: 1 }];
        if (claimCount === 2) return [logs];
        if (claimCount === 3) return [{ affectedRows: 1 }];
        if (claimCount === 4) return [{ affectedRows: 0 }];
        return [{ affectedRows: 1 }];
      }),
      insert: vi.fn(() => ({ values: async (rows: Array<{ recipientEmail: string }>) => {
        rows.forEach((row, index) => logs.push({ id: index + 1, recipientEmail: row.recipientEmail }));
      } })),
      update: vi.fn(() => ({ set: () => ({ where: async () => undefined }) })),
    };
    const email = vi.fn().mockResolvedValue({ success: true, messageIds: ["accepted-id"] });
    const sms = vi.fn();
    const dependencies = {
      ...safeDependencies(source),
      getDb: async () => db as any,
      sendEmailBatch: email,
      sendSMSBulkDetailed: sms,
      buildSignedUnsubscribeUrl: () => "https://hilitcaspi.com/unsubscribe?token=mock",
    };
    const options = {
      execute: true as const, dryRun: false as const, approvalConfirmed: true as const, channel: "email" as const,
      now, expiresAt: OCTOBER14_SEND_EXPIRES_AT, frozen: review.frozen,
    };
    await expect(runOctober14Campaign(options, dependencies)).resolves.toMatchObject({ emailAccepted: 1, smsAccepted: 0, reviewRequired: 0 });
    await expect(runOctober14Campaign(options, dependencies)).rejects.toThrow("already claimed");
    expect(email).toHaveBeenCalledOnce();
    expect(sms).not.toHaveBeenCalled();
  });

  it("rejects a deferred or expired approval before reading, writing, or sending", async () => {
    const email = vi.fn();
    await expect(runOctober14Campaign({
      execute: true, dryRun: false, approvalConfirmed: true, channel: "email",
      now: OCTOBER14_SEND_EXPIRES_AT + 1, expiresAt: OCTOBER14_SEND_EXPIRES_AT,
      frozen: { email: { databaseWarm: [], plusMembers: [] }, sms: [] },
    }, { sendEmailBatch: email })).rejects.toThrow("approved Jerusalem window");
    expect(email).not.toHaveBeenCalled();
  });
});
