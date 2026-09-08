import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");

describe("CRM compatibility direct-send refresh", () => {
  it("refetches the match list after a direct compatibility send", () => {
    const start = source.indexOf("const createAndSendMatch");
    const end = source.indexOf("const approveMatch", start);
    const mutationSource = source.slice(start, end);

    expect(mutationSource).toContain("refetchMatches();");
    expect(mutationSource).toContain("מופיעה בטאב קיבלו התאמה");
  });
});
