import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SalesSourcesTable } from "../client/src/components/SalesSourcesTable";
import type { SalesIntelligence } from "./salesIntelligence";

const now = Date.parse("2026-11-22T16:00:00+02:00");
const source = (channel: string) => ({ channel, campaign: "database", confidence: "תיעוד מקור קודם" });
const rows: SalesIntelligence["sales"] = [
  {
    order: 1, buyerName: "רוכשת בדיקה סינתטית", paidAt: now, day: "2026-11-22",
    product: "database", productLabel: "מאגר", amountAgorot: 29901, coupon: null,
    status: "included", paymentEvidence: "בדיקה", acquisition: source("Instagram (אורגני/לא ידוע)"),
    closing: source("Email"), emailAssist: null, lagDays: null,
  },
  {
    order: 2, buyerName: "רוכש בבירור סינתטי", paidAt: now, day: "2026-11-22",
    product: "database", productLabel: "מאגר", amountAgorot: 19900, coupon: null,
    status: "review", paymentEvidence: "בדיקה", acquisition: source("ישיר / לא ידוע"),
    closing: source("ישיר / לא ידוע"), emailAssist: null, lagDays: null,
  },
  {
    order: 3, buyerName: "רכישה ישנה סינתטית", paidAt: now - 86400000, day: "2026-11-21",
    product: "database", productLabel: "מאגר", amountAgorot: 29900, coupon: null,
    status: "included", paymentEvidence: "בדיקה", acquisition: source("ישיר / לא ידוע"),
    closing: source("Meta Ads (ממומן)"), emailAssist: null, lagDays: null,
  },
];
const data = {
  sales: rows, startDate: now - 3 * 86400000, endDate: Date.parse("2026-11-23T00:00:00+02:00"),
} as SalesIntelligence;

const render = (props: React.ComponentProps<typeof SalesSourcesTable>) => {
  // Vitest's existing JSX transform is classic; production Vite uses automatic JSX.
  vi.stubGlobal("React", React);
  vi.spyOn(Date, "now").mockReturnValue(now);
  return renderToStaticMarkup(React.createElement(SalesSourcesTable, props));
};
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("isolated sales source component presentation", () => {
  it("renders closing-first with one consistent selected day, review exclusions and historical context", () => {
    const html = render({ data, loading: false, error: false });
    const sourceChoices = html.slice(html.indexOf('aria-label="בחירת תצוגת מקור"'), html.indexOf('aria-label="טווח הסיכום'));
    expect(sourceChoices).toContain('aria-pressed="true"');
    expect(sourceChoices.indexOf("מאיפה בוצעה הרכישה")).toBeLessThan(sourceChoices.indexOf("מקור ההיכרות"));
    expect(html).toContain("היום · 22.11.2026");
    expect(html).toContain("1 רכישות שנכללו בסך");
    expect(html).toContain("1 רשומות בסך");
    expect(html).toContain("לבדיקה, לא בסכום הראשי");
    expect(html).toContain("היכרות היסטורית (לא סגירה): אינסטגרם");
    expect(html).toContain("רוכשת בדיקה סינתטית");
    expect(html).not.toContain("רכישה ישנה סינתטית");
    expect(html).not.toContain("סיכום כל התקופה");
    expect(html).not.toContain("פתיחת יתר הרכישות בתקופה");
    const cards = html.slice(html.indexOf('<section aria-label="סיכום רכישות לפי מקור'), html.indexOf("לחיצה על ערוץ"));
    expect(cards).toContain("מייל");
    expect(cards).not.toContain("אינסטגרם");
  });

  it("does not render stale buyers or totals when a query errors or refreshes", () => {
    for (const state of [{ loading: true, error: false }, { loading: false, error: true }]) {
      const html = render({ data, ...state });
      expect(html).not.toContain("רוכשת בדיקה סינתטית");
      expect(html).not.toContain("רכישות שנכללו בסך");
      expect(html).not.toContain('<section aria-label="סיכום רכישות לפי מקור');
    }
  });

  it("uses only names explicitly supplied to the component and never renders personal email fields", () => {
    const anonymous = { ...data, sales: rows.map(({ buyerName: _, ...row }) => ({ ...row, email: "never-render@example.test" })) };
    const html = render({ data: anonymous, loading: false, error: false });
    expect(html).toContain("שם לא זמין");
    expect(html).not.toContain("never-render@example.test");
    expect(html).not.toContain("רוכשת בדיקה סינתטית");
  });
});
