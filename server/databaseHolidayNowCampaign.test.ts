import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DATABASE_NOW_COUPON,
  DATABASE_NOW_MAX_USES,
  DATABASE_NOW_PRICE_ILS,
  databaseNowOfferUrl,
} from "../shared/databaseHolidayNow";
import { buildDatabaseHolidayNowSms } from "./databaseHolidayNowCampaign";
import { buildDatabaseHolidayNowReminder, DATABASE_NOW_REMINDER_SUBJECT } from "./databaseHolidayNowReminder";
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

    expect(DATABASE_NOW_SUBJECT).toContain("הבשורה לחג");
    expect(DATABASE_NOW_SUBJECT).toContain("ההתאמה הראשונה");
    expect(DATABASE_NOW_PREHEADER).toContain("הטבת הצטרפות מיוחדת");
    expect(DATABASE_NOW_PREHEADER).toContain("3 ימים");
    expect(result.htmlContent).toContain("הצעת התאמה ראשונה");
    expect(result.htmlContent).toContain("מהשלמת הפרופיל והשאלון");
    expect(result.htmlContent).toContain("אישור הדדי, פגישה או זוגיות אינם מובטחים");
    expect(result.htmlContent).toContain("תשלום חד־פעמי");
    expect(result.htmlContent).toContain(`${DATABASE_NOW_PRICE_ILS}`);
    expect(result.htmlContent).toContain(DATABASE_NOW_COUPON);
    expect(result.htmlContent).toContain("database-now-hilit-hero_cde5a6ed.jpg");
    expect(result.htmlContent).toContain("database-now-couple-walk_609920bc.jpg");
    expect(result.htmlContent).toContain("Boost לחברי המאגר");
    expect(result.htmlContent).toContain("רווק השבוע");
    expect(result.htmlContent).toContain("יותר מאלף חברים פעילים");
    expect(result.htmlContent).toContain("משובים אמיתיים של 5/5");
    expect(DATABASE_NOW_MAX_USES).toBe(200);
    expect(result.htmlContent).toContain("200");
  });

  it("keeps the SMS within one Vibrate unit even with a long first name", () => {
    const result = buildDatabaseHolidayNowSms({ firstName: "אביגילאביטל", email: "example.person@gmail.com" });
    expect(result.message).toContain("הצעת התאמה ראשונה בתוך 3 ימים מסיום הפרופיל והשאלון");
    expect(result.message).toContain("הטבת הצטרפות מיוחדת");
    expect(result.message).toContain("💛");
    expect(result.message).toContain("✨");
    expect(result.message).toContain("200 הראשונים");
    expect(result.message).toContain("להסרה:");
    expect(result.offerUrl).toBe("https://hilitcaspi.com/now?s=sms");
    expect(result.message.length).toBeLessThanOrEqual(256);
    expect(result.units).toBe(1);
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
    expect(register).toContain("299 ₪ במקום 499 ₪");
    expect(redirect).toContain("DATABASE_NOW_CAMPAIGN");
    expect(redirect).toContain("utm_campaign");
    expect(redirect).toContain('source === "whatsapp" ? "group"');
    expect(databaseNowOfferUrl("whatsapp")).toBe("https://hilitcaspi.com/now?s=whatsapp");
    expect(app).toContain('<Route path={"/now"} component={DatabaseNowRedirect} />');
  });

  it("keeps the September 30 reminder honest about the added places and tomorrow deadline", () => {
    const result = buildDatabaseHolidayNowReminder({
      firstName: "נועה",
      offerUrl: databaseNowOfferUrl("email"),
      unsubscribeUrl: "https://hilitcaspi.com/unsubscribe?token=test",
    });
    expect(DATABASE_NOW_REMINDER_SUBJECT).toContain("מחר זה נגמר");
    expect(result.htmlContent).toContain("עוד 100 מקומות");
    expect(result.textContent).toContain("עוד 100 מקומות");
    expect(result.htmlContent).toContain("ההטבה מסתיימת מחר");
    expect(result.textContent).toContain("המכסה המצטברת של 200 מימושים");
    expect(result.htmlContent).toContain("הצעת התאמה ראשונה");
    expect(result.htmlContent).not.toContain("ל־100 המצטרפים הראשונים");
    expect(result.textContent).toContain("https://hilitcaspi.com/now?s=email");
    expect(result.textContent).toContain("אישור הדדי, פגישה או זוגיות אינם מובטחים");
  });

  it("keeps sending disabled until an explicit campaign function is called", () => {
    const source = readFileSync(resolve(root, "server/databaseHolidayNowCampaign.ts"), "utf8");
    expect(source).toContain("prepareDatabaseHolidayNowEmail");
    expect(source).toContain("sendPreparedDatabaseHolidayNowEmail");
    expect(source).toContain("sendDatabaseHolidayNowSms");
    expect(source).toContain('audience: "high_intent" | "all"');
    expect(source).toContain("recent.journeyKey <> ${DATABASE_NOW_EMAIL_JOURNEY}");
    expect(source).toContain("allowSameCampaignReminderEmail");
    expect(source).toContain('recent.journeyKey <> ${`${DATABASE_NOW_CAMPAIGN}_reminder_email`}');
    expect(source).toContain("maxUses: DATABASE_NOW_MAX_USES");
    expect(source).not.toContain("void sendPreparedDatabaseHolidayNowEmail()");
    expect(source).not.toContain("void sendDatabaseHolidayNowSms(");
  });
});
