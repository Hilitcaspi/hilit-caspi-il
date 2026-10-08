import { describe, expect, it, vi } from "vitest";
import {
  LIVE_LAUNCH_CAMPAIGN,
  LIVE_LAUNCH_SEND_EXPIRES_AT,
  LIVE_LAUNCH_SEND_NOT_BEFORE,
  canonicalEmail,
  canonicalPhone,
  classifyLiveLaunchAudience,
  liveLaunchRecipientHash,
  readBrevoBlockedRecipientSet,
  readLiveLaunchDryRun,
  runLiveLaunchCampaign,
  smsUnitReport,
  type LiveLaunchRawAudience,
} from "./liveLaunchCampaign";

const now = Date.parse("2026-10-08T18:01:00Z");
const raw = (overrides: Partial<LiveLaunchRawAudience> = {}): LiveLaunchRawAudience => ({
  profiles: [], crm: [], plus: [], tickets: [], completedPayments: [], paymentLeads: [], activity: [], ...overrides,
});

describe("live launch campaign safety", () => {
  it("canonicalizes only valid addresses and Israeli mobile phones", () => {
    expect(canonicalEmail(" Person@Example.COM ")).toBe("person@example.com");
    expect(canonicalEmail("First.Last+check@gmail.com")).toBe("firstlast@gmail.com");
    expect(canonicalEmail("not-an-email")).toBeNull();
    expect(canonicalPhone("+972-50-123-4567")).toBe("0501234567");
    expect(canonicalPhone("03-1234567")).toBeNull();
  });

  it("builds disjoint cold, database and Plus cohorts while requiring existing Plus tickets", () => {
    const audience = classifyLiveLaunchAudience(raw({
      profiles: [
        { id: 1, email: "cold@example.com", phone: "0501111111", firstName: "Cold", isActive: 1, isSeed: 0, boostExcluded: 0, isPaid: 0, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: null, questionnaireCompletedAt: null, createdAt: now },
        { id: 2, email: "member@example.com", phone: "0502222222", firstName: "Member", isActive: 1, isSeed: 0, boostExcluded: 0, isPaid: 1, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: "member-token", questionnaireCompletedAt: null, createdAt: now },
        { id: 3, email: "plus@example.com", phone: "0503333333", firstName: "Plus", isActive: 1, isSeed: 0, boostExcluded: 0, isPaid: 1, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: "plus-token", questionnaireCompletedAt: null, createdAt: now },
      ],
      plus: [{ singleId: 3, status: "active", billingStatus: "active", billingCycleEndsAt: null }],
      tickets: [{ id: 30, eventSlug: "matching-secrets-2026-10-31", email: "plus@example.com", voucherCode: "HC31-REAL", issuedAt: now, revokedAt: null, source: "plus", singleId: 3, attendanceConfirmedAt: null }],
      completedPayments: [{ email: "member@example.com", product: "database" }, { email: "plus@example.com", product: "plus" }],
    }), now);
    expect(audience.members.map(row => row.segment).sort()).toEqual(["cold", "database", "plus"]);
    expect(audience.plusMissingTicket).toBe(0);
  });

  it("suppresses duplicate CRM opt-out, seed/boost-owner tests and paid contacts from cold", () => {
    const audience = classifyLiveLaunchAudience(raw({
      profiles: [
        { id: 1, email: "unsub@example.com", phone: null, firstName: "A", isActive: 1, isSeed: 0, boostExcluded: 0, isPaid: 0, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: null, questionnaireCompletedAt: null, createdAt: now },
        { id: 2, email: "test@example.com", phone: null, firstName: "B", isActive: 1, isSeed: 0, boostExcluded: 1, isPaid: 0, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: null, questionnaireCompletedAt: null, createdAt: now },
      ],
      crm: [{ id: 9, email: "UNSUB@example.com", phone: null, name: "A", status: "new_lead", emailUnsubscribed: 1, createdAt: now }],
    }), now);
    expect(audience.members).toHaveLength(0);
    expect(audience.suppressions.crm_unsubscribed).toBe(1);
    expect(audience.suppressions.boost_excluded_owner_test).toBe(1);
  });

  it("reports Unicode transport parts separately from verified 256-unit provider billing", () => {
    expect(smsUnitReport("א".repeat(70))).toMatchObject({ providerUnits256: 1, unicodeTransportParts: 1 });
    expect(smsUnitReport("א".repeat(71))).toMatchObject({ providerUnits256: 1, unicodeTransportParts: 2 });
  });

  it("defaults to a PII-free read-only dry run and disables SMS without callbacks", async () => {
    const result = await readLiveLaunchDryRun({ now }, { readRawAudience: async () => raw() });
    expect(result.readOnly).toBe(true);
    expect(result.email.total).toBe(0);
    expect(result.sms.disabledWithoutDraftCallback).toBe(true);
    expect(JSON.stringify(result)).not.toContain("@example.com");
  });

  it("never sends unless execution is explicit, in-window, bounded and frozen", async () => {
    const result = await runLiveLaunchCampaign({ now }, { readRawAudience: async () => raw() });
    expect(result.readOnly).toBe(true);
    await expect(runLiveLaunchCampaign({ execute: true, dryRun: false, now: LIVE_LAUNCH_SEND_NOT_BEFORE, expiresAt: LIVE_LAUNCH_SEND_EXPIRES_AT }, { readRawAudience: async () => raw() }))
      .rejects.toThrow("frozen dry-run");
  });

  it("reads the documented paginated Brevo blocklist and refuses an unknown response", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ contacts: [{ email: "Blocked+tag@gmail.com" }], count: 1 }) });
    const blocked = await readBrevoBlockedRecipientSet(fetcher as any);
    expect(blocked.has("blocked@gmail.com")).toBe(true);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.brevo.com/v3/smtp/blockedContacts?limit=100&offset=0");
    await expect(readBrevoBlockedRecipientSet(vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any)).rejects.toThrow("response unavailable");
  });

  it("keeps the stored Gmail address for member verification instead of its dedupe key", () => {
    const audience = classifyLiveLaunchAudience(raw({ profiles: [{ id: 9, email: "First.Last+member@gmail.com", phone: null, firstName: "Test", isActive: 1, isSeed: 0, boostExcluded: 0, isPaid: 1, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: "test-only", questionnaireCompletedAt: null, createdAt: now }] }), now);
    expect(audience.members[0].email).toBe("first.last+member@gmail.com");
    expect(canonicalEmail(audience.members[0].email)).toBe("firstlast@gmail.com");
  });

  it("allows approved cohorts to shrink without ever adding a newly eligible recipient", async () => {
    let rows: Array<{ recipientEmail: string }> = [];
    let queries = 0;
    const db = {
      execute: vi.fn(async () => (++queries === 2 ? [rows.map((row, index) => ({ id: index + 1, recipientEmail: row.recipientEmail }))] : [{ affectedRows: 1 }])),
      insert: vi.fn(() => ({ values: async (values: typeof rows) => { rows = values; } })),
      update: vi.fn(() => ({ set: () => ({ where: async () => undefined }) })),
    };
    const send = vi.fn().mockResolvedValue({ success: true });
    const contacts = raw({ crm: ["approved@example.com", "new@example.com"].map((email, index) => ({ id: index + 1, email, phone: null, name: "Test", status: "new_lead", emailUnsubscribed: 0, createdAt: now })) });
    const result = await runLiveLaunchCampaign({ execute: true, dryRun: false, now: LIVE_LAUNCH_SEND_NOT_BEFORE + 1000, expiresAt: LIVE_LAUNCH_SEND_EXPIRES_AT, frozen: { email: { cold: 1, database: 0, plus: 0 }, recipientHashes: [liveLaunchRecipientHash({ email: "approved@example.com", segment: "cold" })] } }, {
      readRawAudience: async () => contacts, getDb: async () => db as any, brevoSmtpBlocked: async () => false,
      isPermanentlyBlockedEmail: () => false, sendEmailBatch: send,
      buildSignedUnsubscribeUrl: () => "https://example.com/unsubscribe",
      buildLiveLaunchEmailDraft: () => ({ subject: "Test", htmlContent: "<html><body>Test</body></html>", textContent: "Test", preheader: "Test" }),
    });
    expect("email" in result && result.email).toMatchObject({ sent: 1 });
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].versions[0].to[0].email).toBe("approved@example.com");
    expect(JSON.stringify(send.mock.calls)).not.toContain("new@example.com");
  });

  it("does not claim, write, or call either provider outside a named phase window", async () => {
    const db = { execute: vi.fn(), insert: vi.fn(), update: vi.fn() };
    const email = vi.fn();
    const sms = vi.fn();
    await expect(runLiveLaunchCampaign({
      execute: true, dryRun: false, deliveryPhase: "sms20", now: Date.parse("2026-10-08T19:59:59+03:00"),
      expiresAt: LIVE_LAUNCH_SEND_EXPIRES_AT, frozen: { email: { cold: 0, database: 0, plus: 0 }, recipientHashes: [] },
    }, { readRawAudience: async () => raw(), getDb: async () => db as any, sendEmailBatch: email, sendSMSBulkDetailed: sms }))
      .rejects.toThrow("phase window");
    expect(db.execute).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
    expect(sms).not.toHaveBeenCalled();
  });

  it("keeps an email delivery from suppressing the frozen cold SMS phase, sends SMS once, and never sends email", async () => {
    const logs: any[] = [];
    const db = {
      execute: vi.fn(async () => [{ affectedRows: 1 }]),
      insert: vi.fn(() => ({ values: async (values: any[]) => { logs.push(...values); } })),
      update: vi.fn(() => ({ set: () => ({ where: async () => undefined }) })),
    };
    const provider = vi.fn().mockResolvedValue({ accepted: true, providerRunId: "protected-run-id", error: null });
    const sendEmail = vi.fn();
    const contacts = raw({
      crm: [
        { id: 1, email: "cold@example.com", phone: "0501111111", name: "Cold", status: "new_lead", emailUnsubscribed: 0, createdAt: now },
        { id: 2, email: "database@example.com", phone: "0502222222", name: "Database", status: "new_lead", emailUnsubscribed: 0, createdAt: now },
      ],
      profiles: [
        { id: 2, email: "database@example.com", phone: "0502222222", firstName: "Database", isActive: 1, isSeed: 0, boostExcluded: 0, isPaid: 1, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: "token", questionnaireCompletedAt: null, createdAt: now },
      ],
      paymentLeads: [{ email: "cold@example.com", product: "database", confirmedAt: null, createdAt: now }],
      activity: [{ email: "cold@example.com", journeyKey: "live_launch26_cold", status: "sent", sentAt: now, clickedAt: null }],
    });
    const result = await runLiveLaunchCampaign({
      execute: true, dryRun: false, deliveryPhase: "sms19", now: LIVE_LAUNCH_SEND_NOT_BEFORE + 1,
      expiresAt: LIVE_LAUNCH_SEND_EXPIRES_AT,
      allowedSegments: ["cold", "database", "plus"], limits: { cold: 1, smsTotal: 1 },
      frozen: { email: { cold: 1, database: 0, plus: 0 }, smsTotal: 1, recipientHashes: [liveLaunchRecipientHash({ email: "cold@example.com", segment: "cold" })] },
      smsConsent: async () => ({ permitted: true, provenance: "approved-test" }), buildSms: () => ({ message: "הודעת בדיקה" }),
    }, {
      readRawAudience: async () => contacts, getDb: async () => db as any, brevoSmtpBlocked: async () => false,
      isPermanentlyBlockedEmail: () => false, sendEmailBatch: sendEmail, sendSMSBulkDetailed: provider,
      getVibrateSmsBalance: async () => 10,
    });
    expect(result).toMatchObject({ sms: { accepted: 1, selected: 1 } });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(provider).toHaveBeenCalledOnce();
    expect(provider.mock.calls[0][0].messages).toHaveLength(1);
    expect(provider.mock.calls[0][0].campaignId).toBe(`${LIVE_LAUNCH_CAMPAIGN}:sms19`);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ journeyKey: "live_launch26_sms_cold", status: "processing", htmlBody: "", recipientName: null });
    expect(JSON.stringify(logs)).not.toContain("0501111111");
  });

  it("treats active cancelled Plus as eligible through paid end but preserves marketing consent", () => {
    const future = now + 60_000;
    const audience = classifyLiveLaunchAudience(raw({
      profiles: [
        { id: 1, email: "eligible@example.com", phone: null, firstName: "Eligible", isActive: 1, isSeed: 0, boostExcluded: 0, isPaid: 1, consentEmailMarketing: 1, isCoachingClient: 0, questionnaireToken: "x", questionnaireCompletedAt: null, createdAt: now },
        { id: 2, email: "no-consent@example.com", phone: null, firstName: "No", isActive: 1, isSeed: 0, boostExcluded: 0, isPaid: 1, consentEmailMarketing: 0, isCoachingClient: 0, questionnaireToken: "x", questionnaireCompletedAt: null, createdAt: now },
      ],
      plus: [
        { singleId: 1, status: "active", billingStatus: "cancelled", billingCycleEndsAt: future },
        { singleId: 2, status: "active", billingStatus: "cancelled", billingCycleEndsAt: future },
      ],
      tickets: [
        { id: 1, eventSlug: "matching-secrets-2026-10-31", email: "eligible@example.com", voucherCode: "REAL", issuedAt: now, revokedAt: null, source: "plus", singleId: 1, attendanceConfirmedAt: null },
        { id: 2, eventSlug: "matching-secrets-2026-10-31", email: "no-consent@example.com", voucherCode: "REAL", issuedAt: now, revokedAt: null, source: "plus", singleId: 2, attendanceConfirmedAt: null },
      ],
    }), now);
    expect(audience.members.map(member => member.email)).toEqual(["eligible@example.com"]);
    expect(audience.members[0].segment).toBe("plus");
    expect(audience.suppressions.profile_marketing_consent).toBe(1);
  });

  it("allows a frozen runtime SMS cohort only to shrink after revalidation", async () => {
    let call = 0;
    const provider = vi.fn();
    const db = { execute: vi.fn(async () => [{ affectedRows: 1 }]), insert: vi.fn(), update: vi.fn() };
    const current = () => raw({ crm: [{ id: 1, email: "gone@example.com", phone: "0501111111", name: "Gone", status: "new_lead", emailUnsubscribed: call++ ? 1 : 0, createdAt: now }], paymentLeads: [{ email: "gone@example.com", product: "database", confirmedAt: null, createdAt: now }] });
    const result = await runLiveLaunchCampaign({
      execute: true, dryRun: false, deliveryPhase: "sms19", now: LIVE_LAUNCH_SEND_NOT_BEFORE + 1, expiresAt: LIVE_LAUNCH_SEND_EXPIRES_AT,
      limits: { cold: 1, smsTotal: 1 }, frozen: { email: { cold: 1, database: 0, plus: 0 }, smsTotal: 1, recipientHashes: [liveLaunchRecipientHash({ email: "gone@example.com", segment: "cold" })] },
      smsConsent: () => ({ permitted: true, provenance: "test" }), buildSms: () => ({ message: "בדיקה" }),
    }, { readRawAudience: async () => current(), getDb: async () => db as any, brevoSmtpBlocked: async () => false, isPermanentlyBlockedEmail: () => false, sendSMSBulkDetailed: provider, getVibrateSmsBalance: async () => 1 });
    expect(result).toMatchObject({ sms: { accepted: 0, selected: 0 } });
    expect(provider).not.toHaveBeenCalled();
  });
});
