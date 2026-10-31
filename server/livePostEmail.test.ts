import { describe, expect, it } from "vitest";
import { buildLivePostEmail } from "./livePostEmail";
const unsubscribeUrl = "https://hilitcaspi.com/unsubscribe?token=synthetic-test-token";
const account = { plusEmail: "synthetic@example.com", plusToken: "synthetic-account-token" };
describe("after-live email templates", () => {
  it("does not claim actual attendance for a registration-only cohort", () => {
    const mail = buildLivePostEmail({ variant: "database", unsubscribeUrl });
    expect(mail.textContent).toContain("תודה שבחרתם להיות חלק מהלייב הערב");
    expect(mail.textContent).not.toContain("אני שמחה שהצטרפתם אליי ללייב");
    expect(mail.textContent).toContain("48 שעות");
    expect(mail.textContent).toContain("1.11");
    expect(new URL(mail.ctaUrl).searchParams.get("coupon")).toBe("LIVE48");
  });
  it("offers three first-cycle proposals, then two, with clear renewable Plus billing", () => {
    const mail = buildLivePostEmail({ variant: "plus", unsubscribeUrl, attended: true, ...account });
    expect(mail.textContent).toContain("אני שמחה שהצטרפתם אליי ללייב");
    expect(mail.textContent).toContain("3 הצעות התאמה");
    expect(mail.textContent).toContain("99 ₪ לחודש");
    expect(mail.textContent).toContain("חיוב מתחדש עד לביטול");
    expect(mail.textContent).toContain("בוסט אחד בחינם");
    expect(new URL(mail.ctaUrl).searchParams.get("coupon")).toBe("LIVEPLUS");
    expect(new URL(mail.ctaUrl).searchParams.get("email")).toBe(account.plusEmail);
    expect(new URL(mail.ctaUrl).searchParams.get("token")).toBe(account.plusToken);
  });
  it("escapes personal data and signed unsubscribe URLs in HTML", () => {
    const mail = buildLivePostEmail({ variant: "plus", firstName: '<img src=x onerror=alert(1)>', unsubscribeUrl, ...account });
    expect(mail.htmlContent).toContain("&lt;img");
    expect(mail.htmlContent).not.toContain('<img src=x');
    expect(mail.htmlContent).toContain("coupon=LIVEPLUS&amp;utm_source");
    expect(mail.htmlContent).not.toMatch(/[—–]/);
  });
  it("rejects a Plus email without an existing personal account link", () => {
    expect(() => buildLivePostEmail({ variant: "plus", unsubscribeUrl })).toThrow("account-bound");
  });
  it("rejects unsigned or off-site removal links", () => {
    expect(() => buildLivePostEmail({ variant: "database", unsubscribeUrl: "https://hilitcaspi.com/unsubscribe" })).toThrow();
    expect(() => buildLivePostEmail({ variant: "database", unsubscribeUrl: "https://example.com/unsubscribe?token=x" })).toThrow();
  });
  it("attributes both offers to live email while distinguishing each product", () => {
    const database = new URL(buildLivePostEmail({ variant: "database", unsubscribeUrl }).ctaUrl);
    const plus = new URL(buildLivePostEmail({ variant: "plus", unsubscribeUrl, ...account }).ctaUrl);
    for (const url of [database, plus]) {
      expect(url.searchParams.get("utm_source")).toBe("live_email");
      expect(url.searchParams.get("utm_medium")).toBe("email");
      expect(url.searchParams.get("utm_campaign")).toBe("live_2026_10_31_after");
    }
    expect(database.searchParams.get("utm_content")).toBe("database_first_match_48h");
    expect(plus.searchParams.get("utm_content")).toBe("plus_first_month_3");
    expect(plus.searchParams.get("token")).toBe(account.plusToken);
  });
});
