import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const landing = read("client/src/pages/NovemberLoveBundle.tsx");
const terms = read("client/src/pages/TermsNovemberBundle.tsx");
const thankYou = read("client/src/pages/ThankYouNovemberBundle.tsx");

describe("November Love Bundle campaign pages", () => {
  it("uses the approved November Sale slogan while explaining the personally reviewed singles database", () => {
    expect(landing).toMatch(/<p dir="ltr"[^>]*>\s*<Sparkles[^>]*\/> NOVEMBER SALE\s*<\/p>/);
    expect(landing).toContain("הטבת נובמבר חד־פעמית");
    expect(landing).toMatch(/זה לא מה קונים\.\s*<span[^>]*>זה את מי מכירים\.<\/span>/);
    expect(landing).toContain("מאגר לרווקים ורווקות שמחפשים זוגיות רצינית");
    expect(landing).toMatch(/הצעות התאמה שאני\s+בודקת אישית/);
    expect(landing).toMatch(/בנובמבר אני נותנת גז על\s+ההתאמות/);
    expect(landing).toContain("NOVEMBER SALE | מאגר זוגיות וקורס ב־349 ₪");
    expect(landing).toContain("NOVEMBER SALE: מאגר רווקים ורווקות");
  });

  it("retains the approved hero portrait, 349 offer, and checkout contract", () => {
    expect(landing).toContain("hilit-standing-close-restored_ffd66094.webp");
    expect(landing).toContain('object-[50%_24%]');
    expect(landing).toContain('data-testid="november-hero-offer"');
    expect(landing).toContain("{NOVEMBER_BUNDLE_PRICE} ₪");
    expect(landing).toContain("499 ₪");
    expect(landing).toContain("הקורס המלא ״המסע לזוגיות״");
    expect(landing).toContain('id="payment"');
    expect(landing).toContain("product={NOVEMBER_BUNDLE_PRODUCT}");
    expect(landing).toContain('termsPath="/terms/november-love"');
    expect(landing).toContain('window.location.assign("/thank-you/november-love")');
  });

  it("states the approved November bundle, course scope, and campaign dates accurately", () => {
    expect(landing).toContain("NOVEMBER_BUNDLE_PRODUCT");
    expect(landing).toContain("NOVEMBER_BUNDLE_PRICE");
    expect(read("shared/novemberBundleOffer.ts")).toContain("NOVEMBER_BUNDLE_EXPIRES_AT");
    expect(landing).toContain("isNovemberBundleOfferActive");
    expect(landing).toContain("349 ₪");
    expect(landing).toContain("499 ₪");
    expect(landing).toMatch(/1\.11\.2026\s+עד\s+30\.11\.2026/);
    expect(landing).toContain("הקורס המלא ״המסע לזוגיות״");
    expect(landing).toMatch(/ערך מקורי של\s+497 ₪/);
    expect(landing).toContain("בנפרד ב־249 ₪");
    expect(landing).toContain("שווי ההטבה: 647 ₪");
    expect(landing).toContain("150 ₪ הנחה על המאגר");
    expect(landing).toContain("compact showValueDetails");
    expect(landing).not.toContain("המדריך ״לבחור נכון״");
    expect(landing).not.toContain("חיסכון של");
  });

  it("uses the agreed single checkout payment anchor and Grow contract", () => {
    expect(landing).toContain('id="payment"');
    expect(landing).not.toContain('id="checkout"');
    expect(landing).toContain("product={NOVEMBER_BUNDLE_PRODUCT}");
    expect(landing).toContain('termsPath="/terms/november-love"');
    expect(landing).toContain(
      'window.location.assign("/thank-you/november-love")'
    );
    expect(landing).toContain('gaViewItem("bundle_november"');
    expect(landing).toMatch(
      /trackViewContent\(\{\s*content_name: "bundle_november"/
    );
    expect(landing).toContain('page: "/november-love"');
    expect(landing).toContain("showCoupon={false}");
  });

  it("omits the extra checkout explanation while retaining the standard payment form", () => {
    expect(landing).not.toContain(
      "הקופה המאובטחת תבקש את הפרטים הדרושים להצטרפות"
    );
    expect(landing).toContain("<GrowWallet");
    expect(landing).toContain("product={NOVEMBER_BUNDLE_PRODUCT}");
    expect(landing).toContain('termsPath="/terms/november-love"');
  });

  it("has an expiry-based disabled checkout state and no manufactured countdown", () => {
    expect(landing).toContain("offerActive ?");
    expect(landing).toContain("הטבת נובמבר הסתיימה");
    expect(landing).toContain("ההצטרפות בהטבה אינה זמינה");
    expect(landing).toContain("ההטבה הסתיימה");
    expect(landing).not.toContain("setInterval");
    expect(landing).not.toContain("Countdown");
    expect(landing).not.toContain("נותרו");
  });

  it("keeps the first-match promise conditional and rejects outcome or cadence promises", () => {
    expect(landing).toContain("עד 3 ימים קלנדריים");
    expect(landing).toMatch(/עד 3 ימים קלנדריים לאחר אישור התשלום והשלמת\s+הפרופיל, התמונה, השאלונים וההעדפות/);
    expect(landing).toContain("הצעת התאמה ראשונה בתוך 3 ימים!");
    expect(landing).toMatch(/אין התחייבות לדייט, להסכמה\s+הדדית או לזוגיות/);
    expect(landing).toContain("Plus לא כלול ולא מופעל אוטומטית");
    expect(landing).toContain("ציון התאמה מעל 80%");
    expect(landing).not.toContain("יותר מ־80 התאמות רגילות");
    expect(landing).not.toContain("אחוזי הצלחה");
    expect(landing).not.toContain("מובטחת זוגיות");
    expect(landing).not.toContain("ספירה לאחור");
  });

  it("uses the approved matching language and renders only approved API or owner-supplied proof", () => {
    expect(landing).toContain("הילית בוחנת אישית את הפרופילים");
    expect(landing).toContain("שאלונים שמבוססים על מחקר");
    expect(landing).toContain("אישור נפרד של שני הצדדים לפני חשיפת פרטים");
    expect(landing).toContain("trpc.publicProof.approvedTestimonials.useQuery");
    expect(landing).toContain("...NOVEMBER_APPROVED_TESTIMONIALS");
    expect(landing).toContain("Array.isArray(approvedTestimonials)");
    expect(landing).toContain("testimonials.length > 0");
    expect(landing).toContain("testimonial.displayName.trim().split(/\\s+/)[0]");
  });

  it("keeps the campaign portrait use to a hero and one lazy below-fold about portrait", () => {
    expect(landing).toContain("hilit-standing-close-restored_ffd66094.webp");
    expect(landing).not.toContain("hilit-smiling-portrait_cddd0dfc.jpg");
    expect(landing).not.toContain("hilit-bundle-standing_b180bb60.jpeg");
    expect(landing).toContain('data-testid="november-hero-photo"');
    expect(landing).toContain('lg:aspect-[4/5]');
    expect(landing).not.toContain('min-h-[100svh]');
    expect(landing).toContain("hilit-bundle-close-portrait_85abe6c9.jpeg");
    expect(landing).toContain('fetchPriority: "high"');
    expect(landing).toContain('loading: "lazy"');
    expect(landing).not.toContain("hilit-bundle-sofa");
  });

  it("supplies brief, reduced-motion-safe campaign transitions", () => {
    expect(landing).toContain("useReducedMotion");
    expect(landing).toContain("prefers-reduced-motion: reduce");
    expect(landing).toContain("duration: 0.22");
    expect(landing).not.toContain("duration: 0.62");
  });

  it("keeps terms narrow, accurate, and linked to the existing database, course, and privacy terms", () => {
    expect(terms).toContain("349 ₪ במקום 499 ₪");
    expect(terms).toContain("ערכו המקורי של הקורס הוא 497 ₪");
    expect(terms).toContain("עד 3 ימים קלנדריים");
    expect(terms).toContain('href="/terms/database"');
    expect(terms).toContain('href="/terms/course"');
    expect(terms).toContain('href="/privacy"');
    expect(terms).toContain('href="/november-love#payment"');
    expect(terms).not.toContain("טיוטת תנאים מסחריים");
    expect(terms).not.toContain("ייעוץ משפטי");
  });

  it("does not treat a redirect as payment proof and keeps thank-you fulfillment pending until server verification", () => {
    expect(thankYou).toContain("readPurchaseTrackingToken");
    expect(thankYou).toContain(
      "trpc.payment.confirmPurchaseTracking.useMutation"
    );
    expect(thankYou).toContain("expectedProduct: NOVEMBER_BUNDLE_PRODUCT");
    expect(read("server/routers.ts")).toContain(
      "input.expectedProduct && row.product !== input.expectedProduct"
    );
    expect(thankYou).toContain(
      'result.status === "confirmed" || result.status === "already_tracked"'
    );
    expect(thankYou).toContain("המעבר לעמוד הזה אינו אישור תשלום");
    expect(thankYou).toContain("אין צורך לשלם שוב");
    expect(thankYou).not.toContain("new URLSearchParams");
    expect(thankYou).not.toContain("התשלום עבר בהצלחה");
  });
});
