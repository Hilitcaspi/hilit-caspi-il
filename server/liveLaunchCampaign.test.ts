import { describe, expect, it, vi } from "vitest";
import {
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
});
