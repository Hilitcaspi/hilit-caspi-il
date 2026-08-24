import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");

describe("personal-area profile completeness", () => {
  it("returns the CRM-editable profile fields in singles.getDashboard", () => {
    const dashboardProcedure = routerSource.slice(
      routerSource.indexOf("getDashboard: publicProcedure"),
      routerSource.indexOf("sendDashboardLink: publicProcedure"),
    );
    const expectedFields = [
      "phone", "gender", "seekingGender", "age", "birthDate", "height", "city",
      "occupation", "education", "religiosity", "shomerShabbat", "maritalStatus",
      "hasKids", "numKids", "wantsKids", "acceptsKids", "hasPets", "petType",
      "acceptsPets", "locationPreference", "smokingStatus", "smokingPreference",
      "minAgePreference", "maxAgePreference", "minHeightPreference", "maxHeightPreference",
      "relationshipPace", "stepParentOpenness", "partnerDescription", "about", "interests",
      "photoUrl", "dnaType", "isActive",
    ];
    for (const field of expectedFields) {
      expect(dashboardProcedure).toContain(`${field}: profile.${field}`);
    }
  });

  it("only reports height as missing when the returned value is empty or zero", () => {
    expect(dashboardSource).toContain('if (!profile.height || profile.height === 0) missing.push("גובה")');
  });
});
