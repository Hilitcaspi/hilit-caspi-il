import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("./matchingScheduler.ts", import.meta.url)),
  "utf8",
);

describe("matching scheduler consent guard", () => {
  it("requires an active matchmaking consent before selecting candidates", () => {
    expect(source).toContain("eq(singles.isActive, true)");
    expect(source).toContain("eq(singles.consentMatchmaking, true)");
  });
});
