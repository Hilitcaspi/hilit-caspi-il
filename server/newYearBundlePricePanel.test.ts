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
  it("compares the original combined value with one clear holiday price", () => {
    expect(pricePanelSource).toContain("השווי המקורי הכולל");
    expect(pricePanelSource).toContain("1,245 ₪");
    expect(pricePanelSource).toContain("מחיר ההטבה");
    expect(pricePanelSource).toContain("399 ₪");
    expect(pricePanelSource).toContain("חיסכון של 846 ₪");
    expect(pricePanelSource).toContain("68% הנחה");
    expect(pricePanelSource).not.toContain("697 ₪");
    expect(pricePanelSource).not.toContain("תוספת 100 ₪ בלבד");
  });

  it("uses a balanced two-column price comparison", () => {
    expect(pricePanelSource).toContain("grid-cols-2");
    expect(pricePanelSource).not.toContain("grid-cols-3");
  });

  it("keeps the database at the center of the offer and names both included tools", () => {
    expect(pageSource).toContain("המאגר הוא הלב");
    expect(pageSource).toContain("המדריך ״לבחור נכון״");
    expect(pageSource).toContain("הקורס ״המסע לזוגיות״");
    expect(pageSource).toContain("אני רוצה את שלושתם ב־399 ₪");
    expect(pageSource).toContain("אני רוצה את שלושתם");
    expect(pageSource).toContain("אני שמה עכשיו גז על ההתאמות");
    expect(pageSource).toContain("הטבה שלא הייתה כאן מעולם");
  });

  it("does not reintroduce individual price blocks inside the product cards", () => {
    expect(pageSource).not.toContain("מחיר המוצר");
    expect(pageSource).not.toContain("כיום בנפרד");
    expect(pageSource).not.toContain("בקנייה נפרדת");
    expect(pageSource).not.toContain("שווי 398 ₪");
    expect(pageSource).toContain("הלב של חבילת החג");
    expect(pageSource).toContain("כלול בחבילת החג");
  });
});
