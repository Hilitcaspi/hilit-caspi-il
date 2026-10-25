import { describe, expect, it } from "vitest";
import { buildPurchaseRecoveryNewsletter } from "./purchaseRecoveryNewsletter";
import { purchaseRecoveryOfferUrl, recoveryOfferCode, RECOVERY_CAMPAIGN, RECOVERY_OFFER_EXPIRES_AT } from "../shared/purchaseRecoveryLinks";

const unsubscribeUrl = "https://hilitcaspi.com/unsubscribe?token=synthetic-signed-preview";
const products = ["database", "session", "plus"] as const;
const emailOfferUrl = (product: typeof products[number]) => new URL(purchaseRecoveryOfferUrl(product, "email"), "https://hilitcaspi.com").href;
const htmlOfferUrl = (product: typeof products[number]) => emailOfferUrl(product).replaceAll("&", "&amp;");

function build(product: typeof products[number], firstName?: string) {
  return buildPurchaseRecoveryNewsletter({
    product,
    firstName,
    unsubscribeUrl,
    offerUrl: purchaseRecoveryOfferUrl(product, "email"),
  });
}

describe("purchase recovery newsletter drafts", () => {
  it("uses the approved 26 October 2026 23:59 Israel deadline", () => {
    expect(RECOVERY_OFFER_EXPIRES_AT).toBe(Date.parse("2026-10-26T23:59:59+02:00"));
  });

  it("builds a distinct, product-specific email from only approved canonical links", () => {
    const subjects = products.map(product => build(product).subject);
    expect(new Set(subjects).size).toBe(3);

    for (const product of products) {
      const email = build(product);
      expect(email.subject).not.toContain("פרסומת");
      expect(email.subject).toContain("התעניינת");
      expect(email.subject).toContain("🎁");
      expect(email.preheader).toContain(recoveryOfferCode(product));
      expect(email.htmlContent).toContain("database-now-hilit-hero_cde5a6ed.jpg");
      const opening = "אתמול לא ניתן היה להשלים רכישות באתר. כעת אפשר שוב";
      for (const content of [email.htmlContent, email.textContent]) {
        expect(content).toContain(opening);
        expect(content.indexOf(opening)).toBeLessThan(content.indexOf("אני הילית כספי"));
        expect(content).not.toContain("תקלה");
        expect(content).not.toContain("שדרוג");
      }
      expect(email.htmlContent).toContain("26.10.2026 בשעה 23:59, שעון ישראל");
      expect(email.htmlContent).not.toContain("UTC+2");
      expect(email.htmlContent).not.toContain("פרסומת");
      expect(email.textContent).not.toContain("פרסומת");
      expect(email.htmlContent).toContain("הסרה מרשימת הדיוור");
      expect(email.textContent).toContain(`להסרה: ${unsubscribeUrl}`);
      expect(email.htmlContent).toContain(unsubscribeUrl);
      expect(email.htmlContent).toContain(htmlOfferUrl(product));
      expect(email.textContent).toContain(emailOfferUrl(product));
    }
  });

  it("states only the approved database price and offer", () => {
    const email = build("database");
    expect(email.htmlContent).toContain("MATCH10");
    expect(email.htmlContent).toContain("299 ₪");
    expect(email.htmlContent).toContain("269.10 ₪");
    expect(email.htmlContent).not.toContain("499");
    expect(email.htmlContent).not.toMatch(/3 ימים|שלושה ימים|לייב במתנה/);
    expect(email.textContent).toContain("אין התחייבות לתדירות הצעות, לדייט או לזוגיות");
  });

  it("states the approved session format without claiming only Hilit conducts it", () => {
    const email = build("session");
    expect(email.htmlContent).toContain("LOVE10DAY");
    expect(email.htmlContent).not.toContain("LOVE10 מעניק");
    expect(email.htmlContent).toContain("500 ₪");
    expect(email.htmlContent).toContain("450 ₪");
    expect(email.htmlContent).toContain("60 דקות");
    expect(email.htmlContent).toContain("זום או בקליניקה");
    expect(email.htmlContent).toContain("הילית או עם איש צוות מקצועי שהוכשר");
    expect(email.htmlContent).not.toMatch(/רק עם הילית|בלעדית עם הילית/);
  });

  it("keeps Plus at its regular recurring price and gives one additional first-signup Boost", () => {
    const email = build("plus");
    expect(email.htmlContent).toContain("PLUSGIFT");
    expect(email.htmlContent).toContain("99 ₪ לחודש");
    expect(email.htmlContent).toContain("חיוב חודשי מתחדש עד לביטול");
    expect(email.htmlContent).toContain("שתי הצעות התאמה");
    expect(email.htmlContent).toContain("30 ימים");
    expect(email.htmlContent).toContain("בוסט אחד ללא תשלום בכל מחזור פעיל");
    expect(email.htmlContent).toContain("בוסט מתנה אחד בהצטרפות ראשונה בלבד");
    expect(email.htmlContent).toContain("בלי איפוס מכסה");
    expect(email.htmlContent).not.toMatch(/3 הצעות|שלוש הצעות/);
    expect(email.textContent).toContain("לא מבטיח דייט או זוגיות");
  });

  it("escapes a greeting and requires a signed link or the synthetic preview unsubscribe placeholder", () => {
    const email = build("database", "<img src=x onerror=alert(1)>");
    expect(email.htmlContent).toContain("&lt;img");
    expect(email.htmlContent).not.toContain("<img src=x onerror");

    expect(() => buildPurchaseRecoveryNewsletter({
      product: "database",
      unsubscribeUrl: "https://hilitcaspi.com/unsubscribe",
      offerUrl: purchaseRecoveryOfferUrl("database", "email"),
    })).toThrow("Invalid unsubscribe URL");

    expect(buildPurchaseRecoveryNewsletter({
      product: "database",
      unsubscribeUrl: "https://hilitcaspi.com/unsubscribe?preview=1",
      offerUrl: purchaseRecoveryOfferUrl("database", "email"),
    }).htmlContent).toContain("preview=1");
  });

  it("rejects off-site, wrong-product, personal-data, altered-code, and altered-campaign destinations", () => {
    const canonical = purchaseRecoveryOfferUrl("database", "email");
    const malformed = [
      "https://evil.example/join?source=database&coupon=MATCH10&utm_campaign=recovery_oct25_2026",
      purchaseRecoveryOfferUrl("session", "email"),
      `${canonical}&email=private%40example.com`,
      canonical.replace("MATCH10", "WRONG"),
      canonical.replace(RECOVERY_CAMPAIGN, "other_campaign"),
    ];

    for (const offerUrl of malformed) {
      expect(() => buildPurchaseRecoveryNewsletter({ product: "database", unsubscribeUrl, offerUrl })).toThrow("purchase recovery offer URL");
    }
  });

  it("allows a paired fresh personal checkout URL only for Plus", () => {
    const plus = new URL(purchaseRecoveryOfferUrl("plus", "email"), "https://hilitcaspi.com");
    plus.searchParams.set("email", "member@example.invalid");
    plus.searchParams.set("token", "fresh-questionnaire-token");

    expect(() => buildPurchaseRecoveryNewsletter({
      product: "plus",
      unsubscribeUrl,
      offerUrl: plus.href,
    })).not.toThrow();

    const database = new URL(purchaseRecoveryOfferUrl("database", "email"), "https://hilitcaspi.com");
    database.searchParams.set("email", "member@example.invalid");
    database.searchParams.set("token", "fresh-questionnaire-token");
    expect(() => buildPurchaseRecoveryNewsletter({
      product: "database",
      unsubscribeUrl,
      offerUrl: database.href,
    })).toThrow("purchase recovery offer URL");

    const incompletePlus = new URL(purchaseRecoveryOfferUrl("plus", "email"), "https://hilitcaspi.com");
    incompletePlus.searchParams.set("email", "member@example.invalid");
    expect(() => buildPurchaseRecoveryNewsletter({
      product: "plus",
      unsubscribeUrl,
      offerUrl: incompletePlus.href,
    })).toThrow("purchase recovery offer URL");
  });

  it("contains no gender slash or long dash in the recipient copy outside required URLs", () => {
    const allText = products.map(product => build(product).textContent)
      .join("\n")
      .replaceAll(unsubscribeUrl, "")
      .replaceAll(emailOfferUrl("database"), "")
      .replaceAll(emailOfferUrl("session"), "")
      .replaceAll(emailOfferUrl("plus"), "");
    expect(allText).not.toMatch(/[\/—]/);
  });
});
