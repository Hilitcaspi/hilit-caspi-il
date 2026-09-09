import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "server/automation.ts"), "utf8");

describe("match email retry completion", () => {
  it("marks a retry complete only after Brevo accepts both recipient emails", () => {
    const start = source.indexOf("export async function retryUnsentMatchEmails");
    const end = source.indexOf("Post-match lifecycle follow-ups", start);
    const retrySource = source.slice(start, end);

    expect(retrySource).toContain("if (resA.success && resB.success)");
    expect(retrySource).toContain("retry remains open");
    expect(retrySource.indexOf("if (resA.success && resB.success)")).toBeLessThan(
      retrySource.indexOf("emailRetriedAt: Date.now()"),
    );
  });
});
