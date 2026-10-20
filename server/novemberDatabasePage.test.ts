import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/NovemberDatabaseSales.tsx"),
  "utf8",
);

describe("November database public-preview page", () => {
  it("is plainly a public preview with no active payment, process, waitlist, or delivery integration", () => {
    expect(pageSource).toContain("תצוגה מוקדמת · המכירה עדיין לא נפתחה");
    expect(pageSource).toContain("המכירה תיפתח לאחר השלמת ההכנה");
    expect(pageSource).toContain("אין כרגע קופה ב־349 ₪.");
    expect(pageSource).not.toContain("GrowWallet");
    expect(pageSource).not.toContain("createProcess");
    expect(pageSource).not.toContain("waitlist");
    expect(pageSource).not.toContain("שליחת מייל");
    expect(pageSource).not.toContain("setInterval");
    expect(pageSource).not.toContain("setTimeout");
  });

  it("keeps the November price, guide value, planned dates, and eligibility language accurate", () => {
    expect(pageSource).toContain("349 ₪");
    expect(pageSource).toContain("499 ₪");
    expect(pageSource).toContain("149 ₪");
    expect(pageSource).toContain("כ־30% פחות מהמחיר הרגיל");
    expect(pageSource).toContain("1–30.11.2026");
    expect(pageSource).toContain("1.11.2026");
    expect(pageSource).toContain("אישור התשלום וגם לאחר השלמת הפרופיל, התמונה, השאלון וההעדפות");
    expect(pageSource).toContain("עד 3 ימים קלנדריים להצעת התאמה ראשונה");
    expect(pageSource).toContain("אין בכך התחייבות לדייט, למענה מצד אדם אחר, לאישור הדדי או לזוגיות.");
    expect(pageSource).not.toContain("748 ₪");
    expect(pageSource).not.toContain("₪748");
    expect(pageSource).not.toContain("249 ₪");
    expect(pageSource).not.toContain("₪249");
    expect(pageSource).not.toContain("חיסכון של ₪399");
    expect(pageSource).not.toContain("299 ₪");
  });

  it("avoids unsupported superlatives and outcome claims while keeping the launch inactive", () => {
    expect(pageSource).toContain("הטבת נובמבר חדשה");
    expect(pageSource).not.toContain("מעולם לא הייתה");
    expect(pageSource).not.toContain("הנחה הכי");
    expect(pageSource).not.toContain("אחוזי הצלחה");
    expect(pageSource).not.toContain("500 הצלחות");
    expect(pageSource).not.toContain("מובטחת זוגיות");
    expect(pageSource).toContain('robotsMeta.setAttribute("content", "noindex, nofollow")');
    expect(pageSource).toContain("scrollToDetails");
  });

  it("limits the footer to the approved home, database terms, and privacy routes", () => {
    const footer = pageSource.slice(pageSource.indexOf("<footer"));

    expect(footer).toContain('href="/"');
    expect(footer).toContain('href="/terms/database"');
    expect(footer).toContain('href="/privacy"');
    expect(footer).not.toContain("mailto:");
    expect(footer).not.toContain("tel:");
    expect(footer).not.toContain("wa.me");
  });
});
