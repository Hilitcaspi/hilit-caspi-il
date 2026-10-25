import { describe, expect, it } from "vitest";
import { buildPurchaseRecoverySms } from "./purchaseRecoverySms";
import {
  purchaseRecoveryOfferUrl,
  RECOVERY_BUSINESS_WHATSAPP_URL,
} from "../shared/purchaseRecoveryLinks";

const unsubscribeUrl = "https://hilitcaspi.com/u?sig=synthetic-signed-preview";
const products = ["database", "session", "plus"] as const;
const smsOfferUrl = (product: typeof products[number]) => new URL(purchaseRecoveryOfferUrl(product, "sms"), "https://hilitcaspi.com").href;

function build(product: typeof products[number]) {
  return buildPurchaseRecoverySms({
    product,
    unsubscribeUrl,
    offerUrl: purchaseRecoveryOfferUrl(product, "sms"),
  });
}

function nonUrlCopy(sms: string) {
  return sms.replace(/https:\/\/\S+/g, "");
}

function hebrewWordCount(text: string) {
  return text.match(/[\u0590-\u05FF]+/g)?.length ?? 0;
}

describe("purchase recovery SMS drafts", () => {
  it("identifies Hilit, contains warm recovery context, and keeps offer, help, and removal links separate", () => {
    for (const product of products) {
      const sms = build(product);
      expect(sms).toContain("הילית כספי |");
      expect(sms).not.toContain("פרסומת");
      expect(sms).toContain("🎁");
      expect(sms).toContain("ראיתי שהתעניינת");
      expect(sms).toContain("אתמול לא הייתה אפשרות לבצע רכישות באתר");
      expect(sms).toContain("עכשיו האפשרות חזרה לפעול");
      expect(sms).toContain("כמחווה אישית להשלמת הרכישה הטבה מיוחדת");
      expect(sms).toContain("הקוד כבר בקישור");
      expect(sms).toContain("26.10 בשעה 23:59, שעון ישראל");
      expect(sms.match(/26\.10 בשעה 23:59, שעון ישראל/g)).toHaveLength(1);
      expect(sms).not.toContain("UTC");
      expect(sms).toContain(smsOfferUrl(product));
      expect(sms).toContain("אם יש שאלה או צורך בעזרה לפני שמחליטים");
      expect(sms).toContain(RECOVERY_BUSINESS_WHATSAPP_URL);
      expect(sms).toContain(`להסרה: ${unsubscribeUrl}`);
      expect(sms.indexOf(smsOfferUrl(product))).toBeLessThan(sms.indexOf(RECOVERY_BUSINESS_WHATSAPP_URL));
      expect(sms.indexOf(RECOVERY_BUSINESS_WHATSAPP_URL)).toBeLessThan(sms.indexOf(`להסרה: ${unsubscribeUrl}`));
    }
  });

  it("uses longer personal Hebrew copy without advertising labels, gender slashes, or long dashes", () => {
    for (const product of products) {
      const copy = nonUrlCopy(build(product));
      expect(hebrewWordCount(copy)).toBeGreaterThanOrEqual(90);
      expect(hebrewWordCount(copy)).toBeLessThanOrEqual(150);
      expect(copy).not.toMatch(/[–—]/);
      expect(copy).not.toContain("/");
      expect(copy).not.toContain("פרסומת");
    }
  });

  it("uses the correct factual offer and scope for each product", () => {
    const database = build("database");
    expect(database).toContain("MATCH10");
    expect(database).toContain("269.10 ₪ במקום 299 ₪");
    expect(database).toContain("בתשלום חד פעמי");
    expect(database).toContain("התאמה על בסיס DNA");
    expect(database).toContain("בניית פרופיל והעדפות");
    expect(database).toContain("הצעות שנבחנות בידי אדם");
    expect(database).toContain("רק לאחר אישור הדדי");
    expect(database).toContain("אין כאן התחייבות למועד, לכמות הצעות או לתוצאה");
    expect(database).not.toMatch(/499|התחייבות לדייט|התחייבות לזוגיות/);

    const session = build("session");
    expect(session).toContain("LOVE10DAY");
    expect(session).toContain("60 דקות");
    expect(session).toContain("בזום או בקליניקה");
    expect(session).toContain("450 ₪ במקום 500 ₪");
    expect(session).toContain("הילית, או עם צוות מיומן הפועל בהשגחה צמודה שלי");
    expect(session).toContain("אין כאן הבטחה לתוצאה, למועד או להתקדמות מסוימת");
    expect(session).not.toMatch(/LOVE10 מעניק|תוצאה מובטחת/);

    const plus = build("plus");
    expect(plus).toContain("PLUSGIFT");
    expect(plus).toContain("בוסט נוסף במתנה בהצטרפות ראשונה");
    expect(plus).toContain("מעבר לבוסט הכלול במסלול");
    expect(plus).toContain("99 ₪ בחיוב חודשי מתחדש עד לביטול");
    expect(plus).toContain("שתי הצעות בכל 30 יום");
    expect(plus).toContain("לחברות ולחברי מאגר בתשלום פעיל בלבד");
    expect(plus).toContain("אינן הבטחה לדייט, לזוגיות, למועד מסוים או לתוצאה");
    expect(plus).not.toMatch(/3 הצעות|שלוש הצעות|איפוס מכסה|הבטחת זוגיות/);
  });

  it("rejects a noncanonical or personally identifying offer URL and an unsigned unsubscribe URL", () => {
    const canonical = purchaseRecoveryOfferUrl("database", "sms");
    expect(() => buildPurchaseRecoverySms({
      product: "database",
      offerUrl: `${canonical}&token=private-token`,
      unsubscribeUrl,
    })).toThrow("purchase recovery offer URL");

    expect(() => buildPurchaseRecoverySms({
      product: "database",
      offerUrl: canonical,
      unsubscribeUrl: "https://hilitcaspi.com/u",
    })).toThrow("Invalid unsubscribe URL");
  });

  it("allows a paired fresh personal checkout URL only for Plus", () => {
    const plus = new URL(purchaseRecoveryOfferUrl("plus", "sms"), "https://hilitcaspi.com");
    plus.searchParams.set("email", "member@example.invalid");
    plus.searchParams.set("token", "fresh-questionnaire-token");
    expect(() => buildPurchaseRecoverySms({
      product: "plus",
      offerUrl: plus.href,
      unsubscribeUrl,
    })).not.toThrow();
  });
});
