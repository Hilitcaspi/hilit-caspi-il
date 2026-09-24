import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("Database Plus launch attribution", () => {
  it("stores dedicated UTM fields on the Plus checkout intent", () => {
    const schema = read("drizzle/schema.ts");
    for (const column of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      expect(schema).toContain(`\"${column}\"`);
    }

    const router = read("server/routers.ts");
    expect(router).toContain("utmSource: input.utmSource");
    expect(router).toContain("utmMedium: input.utmMedium");
    expect(router).toContain("utmCampaign: input.utmCampaign");
    expect(router).toContain("utmContent: input.utmContent");
    expect(router).toContain("utmTerm: input.utmTerm");
  });

  it("does not overwrite the original CRM lead source when Plus checkout begins", () => {
    const router = read("server/routers.ts");
    expect(router).toContain('input.product !== "plus"');
  });

  it("captures link UTM values and passes them to the verified checkout flow", () => {
    const wallet = read("client/src/components/GrowWallet.tsx");
    expect(wallet).toContain("sessionStorage.setItem(key, val)");
    expect(wallet).toContain("utmSource,");
    expect(wallet).toContain("utmMedium,");
    expect(wallet).toContain("utmCampaign,");
    expect(wallet).toContain("utmContent,");
  });

  it("ships an additive migration only", () => {
    const migration = read("drizzle/0027_talented_warpath.sql");
    expect(migration).toContain("ALTER TABLE `plus_checkout_intents` ADD `utm_source`");
    expect(migration).not.toMatch(/\bDROP\b|\bDELETE\b|\bTRUNCATE\b/i);
  });
});
