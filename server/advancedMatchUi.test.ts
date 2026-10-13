import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const ui = readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/CRMMatchmaking.tsx"), "utf8");
const card = readFileSync(path.resolve(import.meta.dirname, "../client/src/components/MatchProfileCard.tsx"), "utf8");
describe("advanced matchmaking UI contracts (no network or customer data)", () => {
  it("places advanced search and compatibility directly between the care queue and NOW", () => {
    expect(ui).toMatch(/id: "unmatched"[^\n]+\n\s*\{ id: "filter_search"[^\n]+\n\s*\{ id: "compatibility"[^\n]+\n\s*\{ id: "now"/);
  });
  it("uses the same profile card for pending and advanced pair comparisons", () => {
    expect(ui).toContain("profile={comparisonProfile(s)} comparison");
    expect(ui).toContain("profile={asMatchProfile(filterTargetProfile)}");
    expect(ui).toContain("profile={asMatchProfile(profile)} comparison");
    expect(ui).toContain("השוואה זוגית");
    expect(card).toContain('data-match-comparison="classic"');
    expect(card).toContain('size="comparison"');
    expect(card).toContain('"h-16 w-16 rounded-xl"');
    expect(card).toContain('line-clamp-2 group-open:hidden');
    expect(card).toContain('line-clamp-3 group-open:hidden');
    expect(card).toContain('פתיחת התיאור המלא');
  });
  it("does not invent observance or education preference fields", () => {
    expect(card).toContain("שמירת נגיעה:</b> לא מתועד במערכת");
    expect(card).not.toContain("shomerNegiah");
    expect(card).not.toContain("educationPreference");
    expect(card).toContain('profile.shomerShabbat == null ? "לא צוין"');
  });
  it("only previews compatibility in the bounded batch with target and generation guards", () => {
    const batch = ui.slice(ui.indexOf("const checkAllVisible"), ui.indexOf("const baseUrl =", ui.indexOf("const checkAllVisible")));
    expect(batch).toContain("Math.min(3, queue.length)");
    expect(batch).toContain("generation === batchGeneration.current && filterTargetRef.current === targetId");
    expect(batch).toContain("checkCompatForFilter.mutateAsync");
    for (const unsafe of ["approveMatch", "createAndSendMatch", "runMatching", "sendEmail", "sendSms"]) expect(batch).not.toContain(unsafe);
    expect(ui).toContain("[filterCompatTarget, activeTab]");
    expect(ui).not.toContain("toCheck.slice(0, 50)");
  });
  it("uses actual delivery history and pure exclusions, and prevents photo clicks toggling the pair", () => {
    expect(ui).toContain("typedMatches.filter(wasMatchProposalSent)");
    expect(ui).toContain("isAdvancedMatchCandidate(s, advancedExclusions");
    expect(ui).toContain('size="small" onPhoto={setLightboxUrl}');
    expect(card).toContain("event.stopPropagation()");
    expect(card).toContain('"flex-col sm:flex-row"');
  });
});
