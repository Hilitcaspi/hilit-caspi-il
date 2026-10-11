import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/components/ProfitAndLossSection.tsx"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");

describe("sales expense management presentation", () => {
  it("supports expense-only management without a second revenue total", () => {
    expect(source).toContain("expensesOnly = false");
    expect(source).toContain("!expensesOnly &&");
    expect(source).toContain("תמונת המכירות והיתרה מופיעה בראש הדאשבורד");
    expect(dashboard).toMatch(/<ProfitAndLossSection[\s\S]*?expensesOnly/);
  });
  it("invalidates sales intelligence after every expense mutation", () => {
    expect(source.match(/utils\.dashboard\.salesIntelligence\.invalidate\(\)/g)).toHaveLength(4);
  });
  it("does not imply provider verification from the site's ledger", () => {
    expect(source).not.toContain("חיובי Grow מאומתים · כל הוצאות Meta");
  });
});
