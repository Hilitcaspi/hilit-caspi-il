import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ui = readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/CRMMatchmaking.tsx"), "utf8");
const initializer = ui.slice(ui.indexOf("const applyPreferredSearchFilters ="), ui.indexOf("const closeWaitingSearch ="));
const selection = ui.slice(ui.indexOf("const selectFilterTarget ="), ui.indexOf("const checkOneVisible ="));
const bridge = ui.slice(ui.indexOf("{(compatPersonA || compatPersonB) && ("), ui.indexOf("<CompatibilityCheckTab", ui.indexOf("{(compatPersonA || compatPersonB) && (")));

describe("advanced matching preference prefill wiring", () => {
  it("shares defaults across standalone selection and the waiting workspace", () => {
    expect(initializer).toContain("getAdvancedMatchFilterDefaults(single)");
    for (const setter of ["setFilterGender(defaults.gender)", "setFilterMinAge(defaults.minAge)", "setFilterMaxAge(defaults.maxAge)", "setFilterMinHeight(defaults.minHeight)"]) expect(initializer).toContain(setter);
    expect(ui.match(/applyPreferredSearchFilters\(single\)/g)).toHaveLength(2);
    expect(selection).toContain("applyPreferredSearchFilters(single)");
    expect(initializer).toContain('setFilterMaxHeight("")');
  });
  it("does not rank, send or edit preferences when initializing or bridging tabs", () => {
    for (const code of [initializer, selection, bridge]) {
      expect(code).not.toMatch(/\.mutate(?:Async)?\(|updateSingle|sendEmail|sendSms|approveMatch|createAndSendMatch/);
    }
    expect(bridge).toContain("selectFilterTarget(target)");
    expect(bridge).toContain('setActiveTab("filter_search")');
    expect(bridge).toContain("if (!target)");
  });
  it("keeps manual filter edits and adult age bounds available", () => {
    expect(ui).toContain("onChange={e => setFilterMinAge(e.target.value)}");
    expect(ui).toContain("onChange={e => setFilterMaxAge(e.target.value)}");
    expect(ui).toContain('placeholder="מ-" min={18} max={120}');
    expect(ui).toContain('placeholder="עד-" min={18} max={120}');
    expect(ui).toContain("אפשר לשנות את כל המסננים לפני החיפוש");
  });
});
