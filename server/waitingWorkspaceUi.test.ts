import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const ui = readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/CRMMatchmaking.tsx"), "utf8");
const queueStart = ui.indexOf('{activeTab === "unmatched" && (');
const queueEnd = ui.indexOf('{/* Tokens Tab */}', queueStart);
if (queueStart < 0 || queueEnd <= queueStart) throw new Error("Waiting queue source boundaries missing");
const queue = ui.slice(queueStart, queueEnd);
const opener = ui.slice(ui.indexOf("const openAdvancedForUnmatched ="), ui.indexOf("const { data: inactiveSingles", ui.indexOf("const openAdvancedForUnmatched =")));
const card = readFileSync(path.resolve(import.meta.dirname, "../client/src/components/WaitingMemberProfile.tsx"), "utf8");
describe("waiting workspace UI safety and performance contracts", () => {
  it("opens a single full profile on demand instead of expanding the entire page", () => {
    expect(ui).toContain("waitingExpandedId === s.id");
    expect(queue).toContain("isExpanded &&");
    expect(queue).toContain("<WaitingMemberProfile");
    expect(queue).toContain("typedSingles.find(profile => profile.id === s.id)");
    expect(queue).toContain("s.matchHistory || []");
    expect(queue).not.toContain("s.suggestions.map");
  });
  it("reuses the existing advanced workspace, locked to the waiting person", () => {
    expect(ui).toContain("const renderAdvancedSearch = (embedded = false)");
    expect(queue).toContain("waitingSearchId === s.id && filterCompatTarget === s.id && renderAdvancedSearch(true)");
    expect(ui).toContain('activeTab === "filter_search" && renderAdvancedSearch(false)');
    expect(ui).toContain('{!embedded && <div className="md:col-span-2">');
    expect(ui).toContain("if (!embedded) { setFilterCompatTarget(null)");
    expect(opener).toContain("setFilterVisibleLimit(10)");
    expect(opener).toContain("batchGeneration.current += 1");
    for (const action of ["approveMatch.mutate", "createAndSendMatch.mutate", "toggleActive.mutate", "sendEmail", "sendSms", "rankForFilter.mutateAsync"]) expect(opener).not.toContain(action);
  });
  it("keeps scoring, pair layout and five-more pagination identical to the advanced tab", () => {
    expect(ui).toContain("rankForFilter.mutateAsync");
    expect(ui).toContain("filteredResults.slice(0, filterVisibleLimit)");
    expect(ui).toContain("setFilterVisibleLimit(limit => limit + 5)");
    expect(ui).toMatch(/profile=\{asMatchProfile\(profile\)\} otherProfile=\{asMatchProfile\(profile.id === filterTargetProfile.id \? single : filterTargetProfile\)\} comparison/);
    expect(ui).toContain("window.confirm(`לשלוח התאמה בין");
    expect(ui).toContain("advancedExclusions.unavailableIds.has(filterCompatTarget!)");
    expect(ui).toContain("isAdvancedMatchCandidate(s, advancedExclusions");
  });
  it("separates purchase dates, service status and missing information", () => {
    expect(queue).toContain("s.databasePurchasedAt");
    expect(queue).toContain("תאריך רכישה לא תועד");
    expect(queue).toContain('profile.plusStatus === "active" && profile.plusBillingStatus === "active"');
    expect(queue).toContain("אישור Boost פעיל");
    expect(queue).toContain("waitingProfileMissingFields(profile)");
    expect(queue).toContain("onDeactivate={() => { if (window.confirm");
    expect(card).toContain("ProfileClosureDialog");
    expect(card).not.toMatch(/sendEmail\(|sendSms\(|sendWhatsApp\(/);
    expect(card).toContain("UNMATCHED_QUEUE_HISTORY_DISCLAIMER");
    expect(card).toContain('legacyEvidence ? "תועדה חשיפה או תגובה" : "נשלחה"');
    expect(card).toContain("sentCount={historicalMatches.length}");
    expect(queue).toContain("full && missing.length > 0");
  });
  it("invalidates outstanding results on page, care filter, edits and closure", () => {
    expect(ui).toContain("[unmatchedPage, unmatchedView, activeTab]");
    expect(ui).toContain("const closeWaitingSearch =");
    expect(ui).toContain("filterTargetRef.current = null");
    expect(ui).toContain("onSuccess: () => { closeWaitingSearch(); refetchSingles(); refetchMatches(); refetchUnmatched();");
    const clearButton = ui.slice(ui.lastIndexOf("<button onClick", ui.indexOf("נקה הכל</button>")), ui.indexOf("נקה הכל</button>"));
    expect(clearButton).toContain("batchGeneration.current += 1");
    expect(clearButton).toContain("setFilterVisibleLimit(10)");
  });
});
