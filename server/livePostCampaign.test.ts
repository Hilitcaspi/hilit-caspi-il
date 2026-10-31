import { describe, expect, it, vi } from "vitest";
import {
  LIVE_POST_CAMPAIGN_KEY,
  LIVE_POST_SEND_NOT_BEFORE,
  LIVE_POST_SEND_EXPIRES_AT,
  isLivePostSendWindow,
  planLivePostAudience,
  readLivePostCampaignPreview,
  runLivePostCampaign,
  type LivePostRawAudience,
} from "./livePostCampaign";
import { LIVE_POST_OFFER_START } from "../shared/livePostOffer";

const NOW = LIVE_POST_SEND_NOT_BEFORE + 1_000;
const raw = (overrides: Partial<LivePostRawAudience> = {}): LivePostRawAudience => ({
  tickets: [], openRegistrations: [], profiles: [], crm: [], plus: [], completedPayments: [], activity: [], ...overrides,
});
const ticket = (overrides: Record<string, unknown> = {}) => ({
  id: 1, eventSlug: "matching-secrets-2026-10-31", email: "attendee@example.com", name: "נועה כהן", singleId: null,
  source: "standalone", voucherCode: "HC31-REAL", revokedAt: null, issuedAt: NOW - 1000, ...overrides,
});
const profile = (overrides: Record<string, unknown> = {}) => ({
  id: 11, email: "attendee@example.com", firstName: "נועה", questionnaireToken: "personal-token", isPaid: 0, isActive: 1, isSeed: 0, market: "il", consentEmailMarketing: 1, ...overrides,
});

function deliveryDb() {
  const inserted: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  let claimed = true;
  const tx = {
    execute: vi.fn(async () => [{ affectedRows: claimed ? 1 : 0 }]),
    insert: vi.fn(() => ({ values: vi.fn(async (value: Record<string, unknown>) => {
      inserted.push(value);
      claimed = false;
      return [{ insertId: inserted.length }];
    }) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
  };
  const db = {
    transaction: vi.fn(async (callback: (inner: typeof tx) => Promise<unknown>) => callback(tx)),
    update: vi.fn(() => ({ set: vi.fn((value: Record<string, unknown>) => {
      updates.push(value);
      return { where: vi.fn(async () => undefined) };
    }) })),
  };
  return { db, inserted, updates, tx };
}

describe("live post campaign audience", () => {
  it("includes existing affirmative profile consent for a valid ticket even without open registration", () => {
    const plan = planLivePostAudience(raw({ tickets: [ticket()], profiles: [profile()] }), NOW);
    expect(plan.members).toEqual([expect.objectContaining({ email: "attendee@example.com", variant: "database", attended: false })]);
  });

  it("requires independent affirmative marketing consent; a ticket alone never consents", () => {
    const plan = planLivePostAudience(raw({ tickets: [ticket()] }), NOW);
    expect(plan.members).toHaveLength(0);
    expect(plan.suppressions).toMatchObject({ no_affirmative_marketing_consent: 1 });
  });

  it("accepts a consented open registration only when it is linked to the same valid event ticket", () => {
    const plan = planLivePostAudience(raw({
      tickets: [ticket()],
      openRegistrations: [{ eventSlug: "matching-secrets-2026-10-31", ticketId: 1, email: "ATTENDEE@example.com", firstName: "נועה", marketingConsent: 1 }],
    }), NOW);
    expect(plan.members).toHaveLength(1);
    const unlinked = planLivePostAudience(raw({
      tickets: [ticket()],
      openRegistrations: [{ eventSlug: "matching-secrets-2026-10-31", ticketId: 999, email: "attendee@example.com", firstName: "נועה", marketingConsent: 1 }],
    }), NOW);
    expect(unlinked.members).toHaveLength(0);
  });

  it("accepts a fresh ticket-bound open-form opt-in despite a historical/default profile false, but never a CRM unsubscribe", () => {
    const consented = raw({
      tickets: [ticket()],
      openRegistrations: [{ eventSlug: "matching-secrets-2026-10-31", ticketId: 1, email: "attendee@example.com", firstName: "נועה", marketingConsent: 1 }],
      profiles: [profile({ consentEmailMarketing: 0 })],
    });
    expect(planLivePostAudience(consented, NOW).members).toEqual([
      expect.objectContaining({ email: "attendee@example.com", variant: "database" }),
    ]);

    const unsubscribed = planLivePostAudience(raw({
      ...consented,
      crm: [{ id: 5, email: "attendee@example.com", emailUnsubscribed: 1 }],
    }), NOW);
    expect(unsubscribed.members).toHaveLength(0);
    expect(unsubscribed.suppressions).toMatchObject({ crm_unsubscribed: 1 });
  });

  it("never promotes immutable historical false or null open-form consent", () => {
    for (const marketingConsent of [false, null] as const) {
      const plan = planLivePostAudience(raw({
        tickets: [ticket()],
        openRegistrations: [{
          eventSlug: "matching-secrets-2026-10-31", ticketId: 1,
          email: "attendee@example.com", firstName: "נועה", marketingConsent,
        }],
      }), NOW);
      expect(plan.members).toHaveLength(0);
      expect(plan.suppressions).toMatchObject({ no_affirmative_marketing_consent: 1 });
    }
  });

  it("normalizes Gmail aliases for consent and delivery de-dupe while preserving the stored ticket address", () => {
    const plan = planLivePostAudience(raw({
      tickets: [ticket({ email: "First.Last+live@gmail.com" })],
      profiles: [profile({ email: "firstlast@googlemail.com" })],
    }), NOW);
    expect(plan.members).toHaveLength(1);
    expect(plan.members[0]!.email).toBe("first.last+live@gmail.com");
  });

  it("fails closed for CRM opt-outs, profile false consent, inactive and seed profiles", () => {
    const cases: Array<{ reason: string; input: Partial<LivePostRawAudience> }> = [
      { reason: "crm_unsubscribed", input: { crm: [{ id: 2, email: "attendee@example.com", emailUnsubscribed: 1 }] } },
      { reason: "profile_marketing_consent_veto", input: { profiles: [profile({ consentEmailMarketing: 0 })] } },
      { reason: "inactive_profile", input: { profiles: [profile({ isActive: 0 })] } },
      { reason: "seed_or_test_profile", input: { profiles: [profile({ isSeed: 1 })] } },
    ];
    for (const testCase of cases) {
      const plan = planLivePostAudience(raw({ tickets: [ticket()], profiles: [profile()], ...testCase.input }), NOW);
      expect(plan.members).toHaveLength(0);
      expect(plan.suppressions[testCase.reason]).toBe(1);
    }
  });

  it("uses an actual paid active database account as the Plus authority, including legacy and verified bundle membership", () => {
    const legacy = planLivePostAudience(raw({
      tickets: [ticket({ source: "database_live", singleId: 11 })],
      profiles: [profile({ isPaid: 1 })],
    }), NOW);
    expect(legacy.members).toEqual([expect.objectContaining({ variant: "plus", singleId: 11, questionnaireToken: "personal-token" })]);

    const verifiedBundle = planLivePostAudience(raw({
      tickets: [ticket({ source: "database_live", singleId: 11 })],
      profiles: [profile({ isPaid: 1 })],
      completedPayments: [{ email: "attendee@example.com", product: "bundle_tubav", amountSource: "grow" }],
    }), NOW);
    expect(verifiedBundle.members).toEqual([expect.objectContaining({ variant: "plus", singleId: 11 })]);
  });

  it("holds payment-only database or bundle evidence and invalid/unpaid profiles instead of sending either offer", () => {
    const paymentOnly = planLivePostAudience(raw({
      tickets: [ticket()],
      openRegistrations: [{ eventSlug: "matching-secrets-2026-10-31", ticketId: 1, email: "attendee@example.com", firstName: "נועה", marketingConsent: 1 }],
      completedPayments: [{ email: "attendee@example.com", product: "bundle_tubav", amountSource: "grow" }],
    }), NOW);
    expect(paymentOnly.members).toHaveLength(0);
    expect(paymentOnly.suppressions).toMatchObject({ database_membership_conflict: 1 });

    const unpaid = planLivePostAudience(raw({
      tickets: [ticket()],
      profiles: [profile({ isPaid: 0 })],
      completedPayments: [{ email: "attendee@example.com", product: "database", amountSource: "grow" }],
    }), NOW);
    expect(unpaid.members).toHaveLength(0);
    expect(unpaid.suppressions).toMatchObject({ database_membership_conflict: 1 });

    const fake = planLivePostAudience(raw({
      tickets: [ticket()],
      profiles: [profile({ isPaid: 1, isSeed: 1 })],
    }), NOW);
    expect(fake.members).toHaveLength(0);
    expect(fake.suppressions).toMatchObject({ seed_or_test_profile: 1 });

    const inactive = planLivePostAudience(raw({
      tickets: [ticket()],
      profiles: [profile({ isPaid: 1, isActive: 0 })],
    }), NOW);
    expect(inactive.members).toHaveLength(0);
    expect(inactive.suppressions).toMatchObject({ inactive_profile: 1 });

    const wrongMarket = planLivePostAudience(raw({
      tickets: [ticket()],
      profiles: [profile({ isPaid: 1, market: "us" })],
    }), NOW);
    expect(wrongMarket.members).toHaveLength(0);
    expect(wrongMarket.suppressions).toMatchObject({ invalid_database_membership_profile: 1 });
  });

  it("holds a paid member for review rather than creating an anonymous LIVEPLUS CTA without their account token", () => {
    const plan = planLivePostAudience(raw({
      tickets: [ticket({ source: "database_live", singleId: 11 })],
      profiles: [profile({ isPaid: 1, questionnaireToken: null })],
      completedPayments: [{ email: "attendee@example.com", product: "database", amountSource: "grow" }],
    }), NOW);
    expect(plan.members).toHaveLength(0);
    expect(plan.suppressions).toMatchObject({ plus_account_token_missing: 1 });
  });

  it("excludes active Plus and former Plus, and fails closed on unknown Plus states", () => {
    const base = {
      tickets: [ticket({ source: "database_live", singleId: 11 })],
      profiles: [profile({ isPaid: 1 })],
      completedPayments: [{ email: "attendee@example.com", product: "database", amountSource: "grow" }],
    };
    const active = planLivePostAudience(raw({ ...base, plus: [{ singleId: 11, status: "active", billingStatus: "active", billingCycleEndsAt: null }] }), NOW);
    expect(active.suppressions).toMatchObject({ active_plus_member: 1 });
    const former = planLivePostAudience(raw({ ...base, plus: [{ singleId: 11, status: "churned", billingStatus: "cancelled", billingCycleEndsAt: NOW - 1 }] }), NOW);
    expect(former.suppressions).toMatchObject({ former_plus_not_new_subscriber: 1 });
    const unknown = planLivePostAudience(raw({ ...base, plus: [{ singleId: 11, status: "eligible", billingStatus: "pending", billingCycleEndsAt: null }] }), NOW);
    expect(unknown.suppressions).toMatchObject({ plus_membership_unconfirmed: 1 });
  });

  it("suppresses an earlier database or Plus delivery regardless of the current membership variant", () => {
    const plan = planLivePostAudience(raw({
      tickets: [ticket({ source: "database_live", singleId: 11 })], profiles: [profile({ isPaid: 1 })],
      completedPayments: [{ email: "attendee@example.com", product: "database", amountSource: "grow" }],
      activity: [{ recipientEmail: "attendee@example.com", journeyKey: `${LIVE_POST_CAMPAIGN_KEY}:database`, status: "sent" }],
    }), NOW);
    expect(plan.members).toHaveLength(0);
    expect(plan.suppressions).toMatchObject({ already_logged_for_campaign: 1 });
  });

  it("returns an aggregate-only PII-free preview", async () => {
    const preview = await readLivePostCampaignPreview({ now: NOW }, {
      readRawAudience: async () => raw({ tickets: [ticket()], profiles: [profile()] }),
    });
    expect(preview).toMatchObject({ readOnly: true, recipients: { database: 1, plus: 0, total: 1 } });
    expect(JSON.stringify(preview)).not.toContain("@example.com");
  });
});

describe("live post campaign delivery guards", () => {
  it("shares the owner-approved offer start and preserves the expiry boundary", () => {
    expect(LIVE_POST_SEND_NOT_BEFORE).toBe(LIVE_POST_OFFER_START);
    expect(LIVE_POST_SEND_NOT_BEFORE).toBe(Date.parse("2026-10-31T21:20:29+02:00"));
    expect(isLivePostSendWindow(LIVE_POST_SEND_NOT_BEFORE - 1)).toBe(false);
    expect(isLivePostSendWindow(LIVE_POST_SEND_NOT_BEFORE)).toBe(true);
    expect(isLivePostSendWindow(LIVE_POST_SEND_EXPIRES_AT)).toBe(true);
    expect(isLivePostSendWindow(LIVE_POST_SEND_EXPIRES_AT + 1)).toBe(false);
  });

  it("fails closed without reading or writing outside the Jerusalem send window", async () => {
    const readRawAudience = vi.fn(async () => raw());
    const getDb = vi.fn();
    await expect(runLivePostCampaign({ now: LIVE_POST_SEND_NOT_BEFORE - 1 }, { readRawAudience, getDb })).rejects.toThrow("allowed only");
    expect(readRawAudience).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("refreshes the complete Brevo blocked-recipient set for every recipient and never sends a blocked address", async () => {
    const data = raw({ tickets: [ticket({ id: 1 }), ticket({ id: 2, email: "two@example.com", name: "שני" })], profiles: [profile(), profile({ id: 12, email: "two@example.com", firstName: "שני" })] });
    const { db, inserted } = deliveryDb();
    const blocked = vi.fn()
      .mockResolvedValueOnce(new Set<string>())
      .mockResolvedValueOnce(new Set<string>(["two@example.com"]));
    const send = vi.fn(async () => ({ success: true, messageIds: ["m"] }));
    const email = vi.fn(({ variant, unsubscribeUrl, attended }) => ({ subject: variant, htmlContent: "<p>ok</p>", textContent: "ok", ctaUrl: "https://hilitcaspi.com/join", variant, campaignKey: LIVE_POST_CAMPAIGN_KEY, attended, unsubscribeUrl }));
    const result = await runLivePostCampaign({ now: NOW }, {
      getDb: async () => db as any, readRawAudience: async () => data, readBrevoBlockedRecipientSet: blocked,
      sendEmailBatch: send, buildSignedUnsubscribeUrl: () => "https://hilitcaspi.com/unsubscribe?token=test",
      buildLivePostEmail: email as any, isPermanentlyBlockedEmail: () => false,
    });
    expect(result).toMatchObject({ sent: { total: 1 }, suppressed: { brevo_smtp_blocked: 1 } });
    expect(blocked).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledOnce();
    expect(inserted).toHaveLength(1);
    expect(email.mock.calls[0]![0]).toMatchObject({ attended: false });
  });

  it("never calls Brevo when the required current blocklist cannot be read", async () => {
    const { db } = deliveryDb();
    const send = vi.fn();
    const result = await runLivePostCampaign({ now: NOW }, {
      getDb: async () => db as any, readRawAudience: async () => raw({ tickets: [ticket()], profiles: [profile()] }),
      readBrevoBlockedRecipientSet: async () => { throw new Error("outage"); }, sendEmailBatch: send,
      isPermanentlyBlockedEmail: () => false,
    });
    expect(result.suppressed).toMatchObject({ brevo_blocklist_unavailable: 1 });
    expect(send).not.toHaveBeenCalled();
  });

  it("durably claims once and marks a provider-ambiguous SMTP attempt for review instead of retrying", async () => {
    const { db, inserted, updates } = deliveryDb();
    const send = vi.fn(async () => ({ success: false, error: "timeout" }));
    const result = await runLivePostCampaign({ now: NOW }, {
      getDb: async () => db as any, readRawAudience: async () => raw({ tickets: [ticket()], profiles: [profile()] }),
      readBrevoBlockedRecipientSet: async () => new Set(), sendEmailBatch: send,
      buildSignedUnsubscribeUrl: () => "https://hilitcaspi.com/unsubscribe?token=test", isPermanentlyBlockedEmail: () => false,
    });
    expect(inserted).toHaveLength(1);
    expect(send).toHaveBeenCalledOnce();
    expect(result.reviewRequired).toBe(1);
    expect(updates).toContainEqual(expect.objectContaining({ status: "failed", errorMessage: "review_required_after_smtp_attempt" }));
  });
});
