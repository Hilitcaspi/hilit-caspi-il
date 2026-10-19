import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const crm = readFileSync(resolve(root, "client/src/pages/CRMMatchmaking.tsx"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");
function procedure(name: string) {
  const pattern = new RegExp(`\\n    ${name}:\\s*(?:teamProcedure|publicProcedure|protectedProcedure|adminProcedure)`);
  const start = router.search(pattern);
  expect(start, name).toBeGreaterThan(-1);
  const rest = router.slice(start + 1);
  const next = /\n    [A-Za-z_]\w*:\s*(?:teamProcedure|publicProcedure|protectedProcedure|adminProcedure)/.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}
describe("CRM staff markers remain visible and staff-only", () => {
  it("uses the same read-only markers in target and candidate search choices", () => {
    expect(crm).toContain("profileStaffSurface(filterTargetProfile)");
    expect(crm).toContain("<ProfileStaffMarkers profile={filterTargetProfile} compact />");
    expect(crm).toContain("<ProfileStaffMarkers profile={single} compact />");
    expect(crm).toContain("<ProfileStaffMarkers profile={s} compact />");
  });
  it("keeps candidate score-border colors independent of pink coaching background", () => {
    expect(crm).toContain("${scoreColor} ${profileStaffSurface(single)}");
    expect(crm).toContain("isAdvancedMatchCandidate(s, advancedExclusions, filterCompatTarget ?? undefined)");
    expect(crm).toContain("filteredResults.slice(0, filterVisibleLimit)");
  });
  it("labels each side independently in the collapsed pending-match header", () => {
    expect(crm).toContain("<ProfileStaffMarkers profile={comparisonProfile(persons[0])} compact />");
    expect(crm).toContain("<ProfileStaffMarkers profile={comparisonProfile(persons[1])} compact />");
    expect(crm).toContain('profileStaffSurface(comparisonProfile(s), "bg-[#f8f6f0]")');
  });
  it("shows markers before opening a waiting profile", () => {
    const waiting = crm.slice(crm.indexOf("data-waiting-member="), crm.indexOf("{activeTab === \"tokens\""));
    expect(waiting).toContain("<ProfileStaffMarkers profile={profile} compact />");
    expect(waiting.indexOf("<ProfileStaffMarkers")).toBeLessThan(waiting.indexOf("<WaitingMemberProfile"));
  });
  it("keeps markers on the manual person selectors and comparison cards", () => {
    expect(crm).toContain("profileStaffSurface(selectedPerson)");
    expect(crm).toContain("<ProfileStaffMarkers profile={selectedPerson} compact />");
    expect(crm).toContain("<ProfileStaffMarkers profile={comparisonProfiles?.[0] || compatResult.personA} compact />");
    expect(crm).toContain("<ProfileStaffMarkers profile={comparisonProfiles?.[1] || compatResult.personB} compact />");
  });
  it("preserves markers in incomplete and inactive profile rows", () => {
    expect(crm).toContain("${borderColor} ${profileStaffSurface(row)}");
    expect(crm).toContain("<ProfileStaffMarkers profile={row} compact />");
    expect(crm).toContain("border-red-300 ${profileStaffSurface(s)}");
    expect(crm).toContain("border-yellow-400 ${profileStaffSurface(s)}");
  });
  it("exposes new compact fields only in existing team-protected procedures", () => {
    for (const name of ["checkCompatibility", "getMissingData", "boostMembersOverview"]) {
      const scoped = procedure(name);
      expect(scoped).toContain(`${name}: teamProcedure`);
      expect(scoped).toContain("isCoachingClient");
      expect(scoped).toContain("isNotBasic");
    }
  });
  it("does not add internal staff flags to the public missing-fields response", () => {
    const scoped = procedure("getMissingFields");
    expect(scoped).toContain("getMissingFields: publicProcedure");
    expect(scoped).not.toContain("isCoachingClient");
    expect(scoped).not.toContain("isNotBasic");
  });
});
