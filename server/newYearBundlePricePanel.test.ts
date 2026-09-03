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
  it("shows only the original value and the holiday price", () => {
    expect(pricePanelSource).toContain("שווי מקורי");
    expect(pricePanelSource).toContain("1,245 ₪");
    expect(pricePanelSource).toContain("מחיר החג");
    expect(pricePanelSource).toContain("399 ₪");
    expect(pricePanelSource).not.toContain("כיום בנפרד");
    expect(pricePanelSource).not.toContain("697 ₪");
  });

  it("uses a balanced two-column price comparison", () => {
    expect(pricePanelSource).toContain("grid-cols-2");
    expect(pricePanelSource).not.toContain("grid-cols-3");
  });
});
