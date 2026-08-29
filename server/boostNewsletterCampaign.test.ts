import fs from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BOOST_NEWSLETTER_CAMPAIGN_KEY,
  BOOST_NEWSLETTER_WAVES,
  createBoostNewsletterUnsubscribeToken,
  partitionBoostNewsletterAudience,
  verifyBoostNewsletterUnsubscribeToken,
} from "./boostNewsletterCampaign";

beforeAll(() => {
  process.env.JWT_SECRET ||= "boost-newsletter-test-secret";
});

describe("Boost newsletter campaign", () => {
  it("partitions a deduplicated audience into three balanced, non-overlapping waves", () => {
    const audience = Array.from({ length: 101 }, (_, index) => ({
      singleId: index + 1,
      email: `member${index + 1}@example.com`,
      firstName: `חבר ${index + 1}`,
      leadId: index + 100,
    }));
    audience.push({ ...audience[0], email: audience[0].email.toUpperCase() });

    const waves = partitionBoostNewsletterAudience(audience);
    const all = [...waves["0700"], ...waves["0800"], ...waves["0900"]];
    const uniqueEmails = new Set(all.map((member) => member.email));
    const sizes = [waves["0700"].length, waves["0800"].length, waves["0900"].length];

    expect(all).toHaveLength(101);
    expect(uniqueEmails.size).toBe(101);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it("keeps the same assignment when audience order changes", () => {
    const audience = Array.from({ length: 12 }, (_, index) => ({
      singleId: index + 1,
      email: `stable${index + 1}@example.com`,
      firstName: "",
      leadId: null,
    }));
    const first = partitionBoostNewsletterAudience(audience);
    const second = partitionBoostNewsletterAudience([...audience].reverse());
    expect(first).toEqual(second);
  });

  it("schedules 07:00, 08:00 and 09:00 Israel time on 30 August 2026", () => {
    expect(BOOST_NEWSLETTER_WAVES.map((wave) => ({ key: wave.key, iso: new Date(wave.scheduledAt).toISOString() }))).toEqual([
      { key: "0700", iso: "2026-08-30T04:00:00.000Z" },
      { key: "0800", iso: "2026-08-30T05:00:00.000Z" },
      { key: "0900", iso: "2026-08-30T06:00:00.000Z" },
    ]);
  });

  it("creates a signed unsubscribe token and rejects tampering", () => {
    const token = createBoostNewsletterUnsubscribeToken(42, " Member@Example.com ");
    expect(verifyBoostNewsletterUnsubscribeToken(token)).toEqual({
      singleId: 42,
      email: "member@example.com",
    });
    expect(verifyBoostNewsletterUnsubscribeToken(`${token}x`)).toBeNull();
  });

  it("uses one campaign key and independent UTM content per wave", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/boostNewsletterCampaign.ts"), "utf8");
    const analyticsSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/Analytics.tsx"), "utf8");
    expect(BOOST_NEWSLETTER_CAMPAIGN_KEY).toBe("boost_launch_2026_08_30");
    expect(source).toContain("utm_source=brevo");
    expect(source).toContain("utm_medium=email");
    expect(source).toContain("utm_content=${utmContent}");
    expect(source).toContain("wave_${wave.key}");
    expect(analyticsSource).toContain('boost_launch_2026_08_30:   { label: "ניוזלטר Boost - בדיקת שעת שליחה"');
  });

  it("revalidates active paid marketing consent and exclusions immediately before sending", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/boostNewsletterCampaign.ts"), "utf8");
    expect(source).toContain("COALESCE(s.isActive, 0) = 1");
    expect(source).toContain("COALESCE(s.isPaid, 0) = 1");
    expect(source).toContain("COALESCE(s.consentEmailMarketing, 0) = 1");
    expect(source).toContain("COALESCE(blocked.emailUnsubscribed, 0) = 1");
    expect(source).toContain("FROM match_boost_memberships mbm");
    expect(source).toContain("mbi.status = 'declined'");
    expect(source).toContain("const eligible = new Set((await loadEligibleAudience())");
  });

  it("uses batch idempotency and binds each wave to the Heartbeat task UID", () => {
    const campaignSource = fs.readFileSync(path.join(process.cwd(), "server/boostNewsletterCampaign.ts"), "utf8");
    const brevoSource = fs.readFileSync(path.join(process.cwd(), "server/brevo.ts"), "utf8");
    const indexSource = fs.readFileSync(path.join(process.cwd(), "server/_core/index.ts"), "utf8");
    expect(campaignSource).toContain("deterministicBatchUuid(input.waveKey, batchNumber)");
    expect(campaignSource).toContain("meta.taskUid !== input.cronTaskUid");
    expect(brevoSource).toContain("headers: { idempotencyKey: input.idempotencyKey }");
    expect(brevoSource).toContain("input.versions.length > 1000");
    expect(indexSource).toContain('req.headers["x-manus-cron-task-uid"]');
  });

  it("turns off marketing consent for signed member unsubscriptions", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/boostNewsletterCampaign.ts"), "utf8");
    expect(source).toContain("consentEmailMarketing: false");
    expect(source).toContain("emailUnsubscribed: true");
    expect(source).toContain("timingSafeEqual");
  });
});
