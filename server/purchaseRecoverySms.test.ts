import { describe, expect, it } from "vitest";
import { buildPurchaseRecoverySms } from "./purchaseRecoverySms";
import { purchaseRecoveryOfferUrl } from "../shared/purchaseRecoveryLinks";

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

describe("purchase recovery SMS drafts", () => {
  it("labels every message as an advertisement from Hilit and includes an unsubscribe path", () => {
    for (const product of products) {
      const sms = build(product);
      expect(sms).toContain("הילית כספי | פרסומת");
      expect(sms).toContain("להסרה:");
      expect(sms).toContain(unsubscribeUrl);
      expect(sms).toContain(smsOfferUrl(product));
      expect(sms).toContain("🎁");
      expect(sms).toContain("התעניינת");
      expect(sms).toContain("26.10 בשעה 23:59, שעון ישראל");
      expect(sms).not.toContain("UTC");
    }
  });

  it("uses the correct short, factual offer for each product", () => {
    const database = build("database");
    expect(database).toContain("MATCH10");
    expect(database).toContain("269.10 ₪ במקום 299 ₪");
    expect(database).not.toContain("499");

    const session = build("session");
    expect(session).toContain("LOVE10DAY");
    expect(session).not.toContain("LOVE10 מעניק");
    expect(session).toContain("60 דקות");
    expect(session).toContain("בזום או בקליניקה");
    expect(session).toContain("450 ₪ במקום 500 ₪");

    const plus = build("plus");
    expect(plus).toContain("PLUSGIFT");
    expect(plus).toContain("בוסט נוסף במתנה בהצטרפות ראשונה");
    expect(plus).toContain("99 ₪ בחיוב חודשי מתחדש");
    expect(plus).toContain("שתי הצעות בכל 30 יום");
    expect(plus).toContain("לחברי מאגר פעילים בלבד");
    expect(plus).toContain("הצעות אינן הבטחת דייט או זוגיות");
    expect(plus).not.toMatch(/3 הצעות|שלוש הצעות|איפוס מכסה/);
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
