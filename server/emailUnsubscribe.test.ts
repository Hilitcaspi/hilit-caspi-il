import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import {
  applyEmailUnsubscribe,
  buildSignedUnsubscribeUrl,
  createSignedUnsubscribeToken,
  isEmailMarketingSuppressed,
  parseLegacyLeadUnsubscribeToken,
  verifySignedUnsubscribeToken,
} from "./emailUnsubscribe";
import { EMAIL_SEQUENCES, renderTemplate } from "./emailTemplates";

type UpdateCapture = { values: Record<string, unknown> };

function createDbMock(selectResults: unknown[][] = []) {
  const queuedResults = [...selectResults];
  const updates: UpdateCapture[] = [];
  const select = vi.fn(() => {
    const chain: any = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(async () => queuedResults.shift() ?? []);
    return chain;
  });
  const update = vi.fn(() => ({
    set: vi.fn((values: Record<string, unknown>) => {
      updates.push({ values });
      return { where: vi.fn(async () => undefined) };
    }),
  }));
  return { db: { select, update } as any, updates, select, update };
}

describe("email unsubscribe security and suppression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "unit-test-secret-that-is-not-production";
  });

  it("creates a signed URL and verifies its normalized payload", () => {
    const token = createSignedUnsubscribeToken({
      email: " Person@Example.COM ",
      leadId: 12,
      singleId: 34,
    });
    expect(verifySignedUnsubscribeToken(token)).toEqual({
      email: "person@example.com",
      leadId: 12,
      singleId: 34,
    });
    expect(buildSignedUnsubscribeUrl({ email: "person@example.com" }))
      .toMatch(/^https:\/\/hilitcaspi\.com\/unsubscribe\?token=/);
  });

  it("rejects a tampered signed token", () => {
    const token = createSignedUnsubscribeToken({ email: "person@example.com" });
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(verifySignedUnsubscribeToken(tampered)).toBeNull();
  });

  it("replaces generic and legacy-placeholder journey links with signed tokens", () => {
    for (const template of [
      EMAIL_SEQUENCES.women_first_step[0],
      EMAIL_SEQUENCES.meta_lead_dna[0],
    ]) {
      const rendered = renderTemplate(template, { firstName: "נועה" }, "person@example.com", 91);
      expect(rendered.htmlBody).toContain("/unsubscribe?token=");
      expect(rendered.htmlBody).not.toContain("/unsubscribe?email=");
      expect(rendered.htmlBody).not.toContain("{{recipientEmail}}");
      expect(rendered.htmlBody).not.toContain('href="https://hilitcaspi.com/unsubscribe"');
    }
  });

  it("parses valid legacy base64 links and rejects malformed payloads", () => {
    const valid = Buffer.from("17:person@example.com").toString("base64");
    expect(parseLegacyLeadUnsubscribeToken(valid)).toEqual({ leadId: 17, email: "person@example.com" });
    expect(parseLegacyLeadUnsubscribeToken("not-a-valid-payload")).toBeNull();
  });

  it("updates CRM and the matching database profile and cancels queued marketing email", async () => {
    const mock = createDbMock();
    vi.mocked(getDb).mockResolvedValue(mock.db);

    await expect(applyEmailUnsubscribe({ email: " Person@Example.com ", source: "signed_token" }))
      .resolves.toBe(true);

    expect(mock.updates).toHaveLength(3);
    expect(mock.updates[0].values).toMatchObject({ emailUnsubscribed: true });
    expect(mock.updates[1].values).toMatchObject({ consentEmailMarketing: false });
    expect(mock.updates[2].values).toMatchObject({ status: "cancelled" });
  });

  it("is idempotent when the same unsubscribe link is confirmed twice", async () => {
    const mock = createDbMock();
    vi.mocked(getDb).mockResolvedValue(mock.db);

    await expect(applyEmailUnsubscribe({ email: "person@example.com", source: "signed_token" }))
      .resolves.toBe(true);
    await expect(applyEmailUnsubscribe({ email: "person@example.com", source: "signed_token" }))
      .resolves.toBe(true);
    expect(mock.update).toHaveBeenCalledTimes(6);
  });

  it("suppresses a CRM contact that previously opted out", async () => {
    const mock = createDbMock([[{ id: 1, emailUnsubscribed: true }]]);
    vi.mocked(getDb).mockResolvedValue(mock.db);
    await expect(isEmailMarketingSuppressed("person@example.com"))
      .resolves.toEqual({ suppressed: true, reason: "crm_unsubscribed" });
  });

  it("suppresses inactive and non-consenting database profiles", async () => {
    const inactive = createDbMock([[], [{ id: 2, isActive: false, consentEmailMarketing: true }]]);
    vi.mocked(getDb).mockResolvedValue(inactive.db);
    await expect(isEmailMarketingSuppressed("inactive@example.com"))
      .resolves.toEqual({ suppressed: true, reason: "inactive_profile" });

    const declined = createDbMock([[], [{ id: 3, isActive: true, consentEmailMarketing: false }]]);
    vi.mocked(getDb).mockResolvedValue(declined.db);
    await expect(isEmailMarketingSuppressed("declined@example.com"))
      .resolves.toEqual({ suppressed: true, reason: "marketing_consent" });
  });
});
