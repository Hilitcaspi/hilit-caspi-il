import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY,
  HOLIDAY_BUNDLE_DNA_COUPON,
  HOLIDAY_BUNDLE_DNA_OFFER_URL,
} from "./holidayBundleDnaCampaign";

describe("holiday bundle DNA campaign", () => {
  it("uses a bundle-only coupon link with complete UTM attribution", () => {
    const url = new URL(HOLIDAY_BUNDLE_DNA_OFFER_URL);
    expect(HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY).toBe("holiday_bundle_dna_2026_09_03");
    expect(HOLIDAY_BUNDLE_DNA_COUPON).toBe("HOLIDAY10");
    expect(url.pathname).toBe("/new-year-love");
    expect(url.searchParams.get("utm_source")).toBe("brevo");
    expect(url.searchParams.get("utm_medium")).toBe("email");
    expect(url.searchParams.get("utm_campaign")).toBe(HOLIDAY_BUNDLE_DNA_CAMPAIGN_KEY);
    expect(url.searchParams.get("coupon")).toBe("HOLIDAY10");
    expect(url.hash).toBe("#payment");
  });

  it("requires a completed DNA result and excludes unsubscribed, purchasers and suppressed profiles", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/holidayBundleDnaCampaign.ts"), "utf8");
    expect(source).toContain("FROM dna_quiz_results dqr");
    expect(source).toContain("dqr.sessionId = cl.quizSessionId");
    expect(source).toContain("COALESCE(blocked.emailUnsubscribed, 0) = 1");
    expect(source).toContain("paid.product = 'bundle_new_year'");
    expect(source).toContain("COALESCE(suppressed.isActive, 0) = 0");
    expect(source).toContain("COALESCE(suppressed.consentEmailMarketing, 0) = 0");
    expect(source).toContain("isPermanentlyBlockedEmail");
    expect(source).toContain("loadHolidayBundleDnaEligibleAudience()).map");
  });

  it("queues once, signs unsubscribe links and uses deterministic batch idempotency", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/holidayBundleDnaCampaign.ts"), "utf8");
    const page = fs.readFileSync(path.join(process.cwd(), "client/src/pages/NewYearLoveBundle.tsx"), "utf8");
    expect(source).toContain("buildSignedUnsubscribeUrl");
    expect(source).toContain("campaign is already queued");
    expect(source).toContain("deterministicBatchUuid(batch.map((row) => row.recipientEmail))");
    expect(source).toContain('status: "cancelled"');
    expect(source).toContain("textContent: row.textBody || undefined");
    expect(page).toContain('requested === "HOLIDAY10"');
    expect(page).toContain("prefillCoupon={newsletterCoupon}");
  });
});
