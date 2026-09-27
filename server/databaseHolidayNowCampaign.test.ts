import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DATABASE_NOW_COUPON,
  DATABASE_NOW_PRICE_ILS,
  databaseNowOfferUrl,
} from "../shared/databaseHolidayNow";
import { buildDatabaseHolidayNowSms } from "./databaseHolidayNowCampaign";
import {
  buildDatabaseHolidayNowNewsletter,
  DATABASE_NOW_PREHEADER,
  DATABASE_NOW_SUBJECT,
} from "./databaseHolidayNowNewsletter";

const root = process.cwd();

describe("database holiday NOW campaign", () => {
  it("leads with a concrete offer and a qualified three-day first-match promise", () => {
    const result = buildDatabaseHolidayNowNewsletter({
      firstName: "נועה",
      offerUrl: databaseNowOfferUrl("email"),
      unsubscribeUrl: "https://hilitcaspi.com/unsubscribe?token=test",
    });

    expect(DATABASE_NOW_SUBJECT).toContain("149 ₪");
    expect(DATABASE_NOW_PREHEADER).toContain("3 ימים");
    expect(result.htmlContent).toContain("הצעת התאמה ראשונה");
    expect(result.htmlContent).toContain("מהשלמת הפרופיל והשאלון");
    expect(result.htmlContent).toContain("אישור הדדי, פגישה או זוגיות אינם מובטחים");
    expect(result.htmlContent).toContain("תשלום חד־פעמי");
    expect(result.htmlContent).toContain(`>${DATABASE_NOW_PRICE_ILS}<`);
    expect(result.htmlContent).toContain(DATABASE_NOW_COUPON);
    expect(result.htmlContent).toContain("database-now-hero_c48e5ac3.jpg");
    expect(result.htmlContent).toContain("100 הראשונים");
  });

  it("keeps the SMS within two Vibrate units for a normal address", () => {
    const result = buildDatabaseHolidayNowSms({ firstName: "ישראל", email: "example.person@gmail.com" });
    expect(result.message).toContain("149 ₪ במקום 299 ₪");
    expect(result.message).toContain("3 ימים מהשלמת הפרופיל והשאלון");
    expect(result.message).toContain("100 הראשונים");
    expect(result.message).toContain("להסרה:");
    expect(result.offerUrl).toBe("https://hilitcaspi.com/now?s=sms");
    expect(result.message.length).toBeLessThanOrEqual(512);
    expect(result.units).toBe(2);
  });

  it("preserves coupon and campaign attribution through the database funnel", () => {
    const experiment = readFileSync(resolve(root, "client/src/lib/landingPageExperiment.ts"), "utf8");
    const databasePage = readFileSync(resolve(root, "client/src/pages/DatabaseSales.tsx"), "utf8");
    const register = readFileSync(resolve(root, "client/src/pages/Register.tsx"), "utf8");
    const redirect = readFileSync(resolve(root, "client/src/pages/DatabaseNowRedirect.tsx"), "utf8");
    const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");

    expect(experiment).toContain('"coupon"');
    expect(databasePage).toContain("isNowHolidayOffer");
    expect(register).toContain("prefillCoupon={promotionalCoupon || undefined}");
    expect(register).toContain("149 ₪ במקום 299 ₪");
    expect(redirect).toContain("DATABASE_NOW_CAMPAIGN");
    expect(redirect).toContain("utm_campaign");
    expect(app).toContain('<Route path={"/now"} component={DatabaseNowRedirect} />');
  });

  it("keeps sending disabled until an explicit campaign function is called", () => {
    const source = readFileSync(resolve(root, "server/databaseHolidayNowCampaign.ts"), "utf8");
    expect(source).toContain("prepareDatabaseHolidayNowEmail");
    expect(source).toContain("sendPreparedDatabaseHolidayNowEmail");
    expect(source).toContain("sendDatabaseHolidayNowSms");
    expect(source).toContain('audience: "high_intent" | "all"');
    expect(source).toContain("maxUses: DATABASE_NOW_MAX_USES");
    expect(source).not.toContain("void sendPreparedDatabaseHolidayNowEmail()");
    expect(source).not.toContain("void sendDatabaseHolidayNowSms(");
  });
});
