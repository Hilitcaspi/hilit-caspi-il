import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProgressiveList, getProgressiveWindow } from "../client/src/lib/ProgressiveList";

const mainSource = readFileSync(resolve(process.cwd(), "client/src/main.tsx"), "utf8");
const crmSource = readFileSync(resolve(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");

type FixtureItem = { id: string; label: string };

const fixtureItems = (count: number): FixtureItem[] =>
  Array.from({ length: count }, (_, index) => ({ id: `member-${index}`, label: `Member ${index}` }));

const renderList = (items: FixtureItem[], forceVisibleIds: readonly string[] = []) =>
  renderToStaticMarkup(
    createElement(ProgressiveList<FixtureItem>, {
      items,
      resetKey: "fixture",
      getItemId: item => item.id,
      forceVisibleIds,
      children: item => createElement("span", { "data-fixture-member": item.id }, item.label),
    }),
  );

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

describe("CRM progressive-list performance behavior", () => {
  it("renders the initial 50 of 2,000 while retaining the complete total for local counts", () => {
    const items = fixtureItems(2_000);
    const html = renderList(items);

    expect(getProgressiveWindow(items, 50, [], item => item.id)).toBe(50);
    expect(html).toContain('data-progressive-total="2000"');
    expect(html).toContain('data-progressive-rendered="50"');
    expect((html.match(/id="progressive-item-member-/g) ?? [])).toHaveLength(50);
    expect(html).toContain('data-fixture-member="member-49"');
    expect(html).not.toContain('data-fixture-member="member-50"');
  });

  it("extends its rendered prefix through a forced deep item without losing the total", () => {
    const items = fixtureItems(2_000);
    const html = renderList(items, ["member-1999"]);

    expect(getProgressiveWindow(items, 50, ["member-1999"], item => item.id)).toBe(2_000);
    expect(html).toContain('data-progressive-total="2000"');
    expect(html).toContain('data-progressive-rendered="2000"');
    expect(html).toContain('id="progressive-item-member-1999"');
    expect(html).toContain('data-fixture-member="member-1999"');
  });

  it("handles empty and short lists without an unnecessary expansion control", () => {
    expect(getProgressiveWindow([], 50, [], item => String(item))).toBe(0);
    expect(getProgressiveWindow(fixtureItems(3), 50, [], item => item.id)).toBe(3);

    const emptyHtml = renderList([]);
    const shortHtml = renderList(fixtureItems(3));
    for (const html of [emptyHtml, shortHtml]) {
      expect(html).not.toContain("<button");
      expect(html).not.toContain("נטען אוטומטית בהגעה לסוף הרשימה");
    }
    expect(shortHtml).toContain('data-progressive-total="3"');
    expect(shortHtml).toContain('data-progressive-rendered="3"');
  });

  it("keeps the accessible load-more fallback in SSR when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const html = renderList(fixtureItems(51));

    expect(html).toContain('data-progressive-total="51"');
    expect(html).toContain('data-progressive-rendered="50"');
    expect(html).toContain("<button");
    expect(html).toContain("הצג עוד (50 מתוך 51)");
    expect(html).toContain("נטען אוטומטית בהגעה לסוף הרשימה");
  });
});

describe("CRM frontend performance source contracts", () => {
  it("shows manual scores before requesting a narrative and fences late explanation responses", () => {
    expect(crmSource).toContain("checkCompatMutation.mutate({ idA, idB, includeNarrative: false }");
    expect(crmSource).toContain("checkCompatNarrativeMutation.mutate({ idA, idB, includeNarrative: true }");
    expect(crmSource).toContain("if (!stillCurrent()) return;");
    expect(crmSource).toContain("previous.__previewIdentity?.epoch !== epoch");
    expect(crmSource).toContain("previous.score !== detail.score");
    expect(crmSource).toContain("return { ...previous, narrative: detail.narrative }");
    expect(crmSource).toContain("הציון וההשוואה מוכנים. מכינה את הנימוק המפורט");
  });

  it("never merges stale detail or assumes empty availability before index load", () => {
    expect(crmSource).toContain("!expandedMatchDetailsQuery.isFetching");
    expect(crmSource).toContain("expandedMatchDetailsQuery.dataUpdatedAt >= matchIndexUpdatedAt");
    expect(crmSource).toContain("if (!matchIndexReady)");
    expect(crmSource).toContain("canSendDirectly={matchIndexReady && !!displayedCompatResult}");
    expect(crmSource).toContain("זמינות והיסטוריה בבדיקה");
    expect(crmSource).toContain('loading="lazy"');
    expect(crmSource).toContain('decoding="async"');
  });

  it("routes skip-batch CRM reads through the shared authenticated, credentialed transport", () => {
    expect(mainSource).toContain("const trpcTransportOptions = {");
    expect(mainSource).toContain("Authorization: `Bearer ${token}`");
    expect(mainSource).toContain('return { "x-team-token": teamToken };');
    expect(mainSource).toContain('credentials: "include",');

    const clientStart = mainSource.indexOf("const trpcClient");
    const client = mainSource.slice(clientStart);
    expect(client).toContain("splitLink({");
    expect(client).toContain("condition: op => op.context.skipBatch === true");
    expect(client).toContain("true: httpLink(trpcTransportOptions)");
    expect(client).toContain("false: httpBatchLink(trpcTransportOptions)");
  });

  it("loads the compact match index for admins and gates full detail to one expanded match on the matches tab", () => {
    const indexStart = crmSource.indexOf("getCrmMatchIndex.useQuery");
    const detailStart = crmSource.indexOf("getCrmMatchDetails.useQuery");
    const detailsEnd = crmSource.indexOf("const refetchMatches", detailStart);
    const indexQuery = crmSource.slice(indexStart, detailStart);
    const detailsQuery = crmSource.slice(detailStart, detailsEnd);

    expect(indexQuery).toContain('enabled: !!user && user.role === "admin"');
    expect(indexQuery).toContain("trpc: { context: { skipBatch: true } }");
    expect(detailsQuery).toContain("{ matchId: expandedMatch ?? 1 }");
    expect(detailsQuery).toContain('enabled: !!user && user.role === "admin" && activeTab === "matches" && expandedMatch !== null');
    expect(detailsQuery).toContain("trpc: { context: { skipBatch: true } }");
  });

  it("uses ProgressiveList for both fully filtered CRM surfaces and preserves their expanded records", () => {
    const progressiveUses = [...crmSource.matchAll(/<ProgressiveList/g)].map(match => match.index ?? -1);
    expect(progressiveUses).toHaveLength(2);

    const singlesSurface = crmSource.slice(progressiveUses[0], progressiveUses[1]);
    const matchesSurface = crmSource.slice(progressiveUses[1]);
    expect(singlesSurface).toContain("items={filteredSingles}");
    expect(singlesSurface).toContain("forceVisibleIds={[selectedSingle]}");
    expect(matchesSurface).toContain("items={filteredMatchesBySubTab[matchSubTab]}");
    expect(matchesSurface).toContain("forceVisibleIds={[expandedMatch]}");
  });

  it("filters the full singles and match collections by name before either progressive list receives them", () => {
    const singlesFilterStart = crmSource.indexOf("const filteredSingles = typedSingles");
    const singlesFilterEnd = crmSource.indexOf("const renderAdvancedSearch", singlesFilterStart);
    const singlesListStart = crmSource.indexOf("<ProgressiveList", singlesFilterEnd);
    const singlesFilter = crmSource.slice(singlesFilterStart, singlesFilterEnd);
    expect(singlesFilter).toContain("const fullName = `${s.firstName} ${s.lastName || \"\"}`.toLowerCase();");
    expect(singlesFilter).toContain("return fullName.includes(q)");
    expect(singlesFilter).not.toContain(".slice(");
    expect(singlesFilterStart).toBeLessThan(singlesListStart);

    const matchesFilterStart = crmSource.indexOf("const filteredMatchesBySubTab");
    const matchesFilterEnd = crmSource.indexOf("const advancedExclusions", matchesFilterStart);
    const matchesListStart = crmSource.indexOf("<ProgressiveList", matchesFilterEnd);
    const matchesFilter = crmSource.slice(matchesFilterStart, matchesFilterEnd);
    expect(matchesFilter).toContain(".filter(filterMatchByName)");
    expect(matchesFilter).not.toContain(".slice(");
    expect(matchesFilterStart).toBeLessThan(matchesListStart);
  });
});
