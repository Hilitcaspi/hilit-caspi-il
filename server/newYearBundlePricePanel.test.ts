import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/NewYearLoveBundle.tsx"),
  "utf8",
);

const pricePanelSource = pageSource.slice(
  pageSource.indexOf("function PricePanel"),
  pageSource.indexOf("export default function NewYearLoveBundle"),
);

describe("New Year bundle price panel", () => {
  it("compares the real separate purchase price with the holiday bundle", () => {
    expect(pricePanelSource).toContain("בקנייה נפרדת");
    expect(pricePanelSource).toContain("697 ₪");
    expect(pricePanelSource).toContain("שלושתם בחג");
    expect(pricePanelSource).toContain("399 ₪");
    expect(pricePanelSource).toContain("43% הנחה");
    expect(pricePanelSource).toContain("תוספת 100 ₪ בלבד");
    expect(pricePanelSource).not.toContain("1,245 ₪");
  });

  it("uses a balanced two-column price comparison", () => {
    expect(pricePanelSource).toContain("grid-cols-2");
    expect(pricePanelSource).not.toContain("grid-cols-3");
  });

  it("keeps the database at the center of the offer and names both included tools", () => {
    expect(pageSource).toContain("מאגר הרווקים והרווקות הוא הלב של ההטבה");
    expect(pageSource).toContain("המדריך ״לבחור נכון״");
    expect(pageSource).toContain("הקורס ״המסע לזוגיות״");
    expect(pageSource).toContain("אני רוצה את שלושתם ב־399 ₪");
    expect(pageSource).toContain("אני רוצה את שלושתם");
  });

  it("does not reintroduce individual price blocks inside the product cards", () => {
    expect(pageSource).not.toContain("מחיר המוצר");
    expect(pageSource).not.toContain("כיום בנפרד");
    expect(pageSource).toContain("הלב של חבילת החג");
    expect(pageSource).toContain("כלול בחבילת החג");
  });
});
