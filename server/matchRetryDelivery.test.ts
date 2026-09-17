import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "server/automation.ts"), "utf8");

describe("match email retry safety", () => {
  it("never auto-resends a proposal based on missing open pixels", () => {
    const start = source.indexOf("export async function retryUnsentMatchEmails");
    const end = source.indexOf("Post-match lifecycle follow-ups", start);
    const retrySource = source.slice(start, end);

    expect(retrySource).toContain("Opening pixels are not delivery receipts");
    expect(retrySource).toContain("return 0");
    expect(retrySource).not.toContain("sendEmail(");
    expect(retrySource).not.toContain("emailAOpenedAt");
    expect(retrySource).not.toContain("emailBOpenedAt");
  });
});
