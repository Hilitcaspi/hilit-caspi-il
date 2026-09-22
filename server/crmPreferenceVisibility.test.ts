import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const crmSource = readFileSync(new URL("../client/src/pages/CRMMatchmaking.tsx", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("CRM profile preference visibility", () => {
  it("shows both requested age and height ranges on the expanded member card", () => {
    expect(crmSource).toContain("גיל מבוקש:");
    expect(crmSource).toContain("גובה מבוקש:");
    expect(crmSource).toContain("single.minAgePreference && single.maxAgePreference");
    expect(crmSource).toContain("single.minHeightPreference && single.maxHeightPreference");
  });

  it("allows admins to edit the same height bounds used by compatibility warnings", () => {
    expect(crmSource).toContain("value={form.minHeightPreference}");
    expect(crmSource).toContain("value={form.maxHeightPreference}");
    expect(crmSource).toContain("payload.minHeightPreference = Number(form.minHeightPreference)");
    expect(crmSource).toContain("payload.maxHeightPreference = Number(form.maxHeightPreference)");
    expect(routerSource).toContain("minHeightPreference: z.number().min(100).max(250).optional()");
    expect(routerSource).toContain("maxHeightPreference: z.number().min(100).max(250).optional()");
  });
});
