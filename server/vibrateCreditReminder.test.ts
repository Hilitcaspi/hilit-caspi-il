import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");

describe("Vibrate credit reminder", () => {
  it("uses a scheduled owner notification and never sends an SMS", () => {
    const start = source.indexOf('app.post("/api/scheduled/vibrate-credit-reminder"');
    const end = source.indexOf("// Daily Plus commitment monitor", start);
    const route = source.slice(start, end);

    expect(start).toBeGreaterThan(0);
    expect(route).toContain("notifyOwner");
    expect(route).toContain("לפחות 10 קרדיטי SMS");
    expect(route).not.toContain("sendSMS");
    expect(route).not.toContain("processIncompleteProfileAlerts");
  });
});
