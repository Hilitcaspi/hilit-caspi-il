import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const crmSource = readFileSync(resolve(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");
const profileSource = readFileSync(resolve(process.cwd(), "client/src/components/WaitingMemberProfile.tsx"), "utf8");

describe("waiting queue and advanced-search navigation contracts", () => {
  it("opens unmatched treatment in the separate filter_search tab with target defaults only", () => {
    const start = crmSource.indexOf("const openAdvancedForUnmatched");
    const end = crmSource.indexOf("const returnToWaitingQueue", start);
    const handler = crmSource.slice(start, end > start ? end : start + 1800);

    expect(handler).toContain('setActiveTab("filter_search")');
    expect(handler).toContain("applyPreferredSearchFilters(single)");
    expect(handler).not.toMatch(/rankForFilter|checkCompatForFilter|createAndSendMatch|\.mutate\(/);
  });

  it("keeps the unmatched queue free of embedded advanced search and uses an origin id instead of waitingSearchId", () => {
    expect(crmSource).not.toContain("renderAdvancedSearch(true)");
    expect(crmSource).not.toContain("waitingSearchId");
    expect(crmSource).toContain("waitingSearchOriginId");
  });

  it("returns to the same waiting queue context and scrolls back to the originating row", () => {
    const start = crmSource.indexOf("const returnToWaitingQueue");
    const end = crmSource.indexOf("// Queries", start);
    const navigation = crmSource.slice(start, end > start ? end : start + 2200);

    expect(navigation).toContain('setActiveTab("unmatched")');
    expect(navigation).toContain("setWaitingExpandedId(null)");
    expect(crmSource).toContain("data-waiting-member");
    expect(crmSource).toContain("waitingSearchOriginId");
    expect(crmSource).toContain("scrollIntoView");
  });

  it("renders profile deactivation in the header and disables it while pending", () => {
    const headerStart = profileSource.indexOf("<header");
    const headerEnd = profileSource.indexOf("</header>", headerStart);
    const header = profileSource.slice(headerStart, headerEnd);
    const footerStart = profileSource.indexOf("<footer");
    const footerEnd = profileSource.indexOf("</footer>", footerStart);
    const footer = profileSource.slice(footerStart, footerEnd);

    expect(header).toContain("onDeactivate");
    expect(header).toContain("disabled={deactivatePending}");
    expect(header).toContain("השהיית פרופיל");
    expect(footer).not.toContain("השהיית פרופיל");
  });

  it("preserves comparison rendering and guarded create-and-send confirmation", () => {
    expect(crmSource).toContain("PairCriteriaLegend");
    expect(crmSource).toContain("allowCriteriaOverride");
    expect(crmSource).toContain("window.confirm(");
    expect(crmSource).toContain("hasNonOverridableBlock");
    expect(crmSource).toContain("createAndSendMatch.mutate");
  });
});
