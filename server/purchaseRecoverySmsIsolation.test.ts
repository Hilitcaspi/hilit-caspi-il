import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./db", () => ({ getDb: vi.fn() }));
import { getDb } from "./db";
import { recoveryDependencies } from "./purchaseRecoveryCampaign";
import { RECOVERY_CAMPAIGN } from "../shared/purchaseRecoveryLinks";
import { readFileSync } from "node:fs";

const row = { id: 1, campaignKey: RECOVERY_CAMPAIGN, phone: "0500000000", email: "synthetic@example.invalid" } as any;
function dbMock() {
  const values: any[] = [];
  const predicates: any[] = [];
  const update = vi.fn(() => ({ set: vi.fn((value: any) => { values.push(value); return { where: vi.fn(async (where: any) => { predicates.push(where); return [{ affectedRows: 1 }]; }) }; }) }));
  return { db: { update }, values, predicates };
}
function sqlText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(sqlText).join(" ");
  if (value.name) return String(value.name);
  return sqlText(value.queryChunks || value.value || "");
}

describe("SMS recovery channel isolation", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["accepted", "failed", "skipped"] as const)("finishing SMS as %s never changes email, coupon eligibility, or schedule", async state => {
    const mock = dbMock(); vi.mocked(getDb).mockResolvedValue(mock.db as any);
    const dependencies = await recoveryDependencies();
    await dependencies.finish(row, "sms", state, 123, state === "accepted" ? "synthetic-provider" : undefined, "sms-only-reason");
    expect(mock.values).toHaveLength(1);
    expect(mock.values[0].smsState).toBe(state);
    expect(mock.values[0]).not.toHaveProperty("suppressionReason");
    expect(mock.values[0]).not.toHaveProperty("emailState");
    expect(mock.values[0]).not.toHaveProperty("emailConsent");
    expect(mock.values[0]).not.toHaveProperty("sendAt");
    expect(mock.values[0]).not.toHaveProperty("scheduleCronTaskUid");
    expect(mock.values[0]).not.toHaveProperty("offerRedeemedAt");
  });
  it("claims only a still-consenting, unredeemed, same-phone queued SMS recipient", async () => {
    const mock = dbMock(); vi.mocked(getDb).mockResolvedValue(mock.db as any);
    const dependencies = await recoveryDependencies();
    expect(await dependencies.claim(row, "sms", 123)).toBe(true);
    expect(mock.values[0]).toEqual({ smsState: "processing", updatedAt: 123 });
    const where = sqlText(mock.predicates[0]);
    expect(where).toContain("campaign_key");
    expect(where).toContain("sms_state");
    expect(where).toContain("sms_consent");
    expect(where).toContain("offer_redeemed_at");
    expect(where).toContain("phone");
  });
  it("uses the SMS signed-removal builder only for the SMS channel", () => {
    const source = readFileSync(new URL("./purchaseRecoveryCampaign.ts", import.meta.url), "utf8");
    expect(source).toContain("channel==='sms' ? buildSignedSmsUnsubscribeUrl");
    expect(source).toContain(" : buildSignedUnsubscribeUrl({email:row.email})");
  });
  it("does not unsubscribe when the link is opened; confirmation remains a user click", () => {
    const source = readFileSync(new URL("../client/src/pages/Unsubscribe.tsx", import.meta.url), "utf8");
    expect(source).toContain('token?.startsWith("sms_unsubscribe_v1_")');
    expect(source).toContain("הודעות שירות ומיילים אינם משתנים");
    const effect = source.slice(source.indexOf("useEffect(() =>"), source.indexOf("const smsOnly"));
    expect(effect).not.toContain(".mutate(");
  });
});
