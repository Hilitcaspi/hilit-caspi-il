import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import WaitingQueuePagination, { type WaitingQueuePaginationProps } from "../client/src/components/WaitingQueuePagination";
import { filterProfilesByName } from "../shared/profileNameSearch";
import {
  buildLastAcceptedDeliveryBySingle,
  getWaitingFrom,
  sortWaitingProfilesByWaitingFrom,
  type WaitingQueueProfile,
  type WaitingQueueSortOrder,
} from "../shared/unmatchedQueuePresentation";

// Read source contracts, never import the router or initialize its DB/services.
const routerSource = readFileSync(resolve(import.meta.dirname, "routers.ts"), "utf8");
const crmSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/CRMMatchmaking.tsx"), "utf8");
const paginationSource = readFileSync(resolve(import.meta.dirname, "../client/src/components/WaitingQueuePagination.tsx"), "utf8");
const day = 24 * 60 * 60 * 1000;
const now = 1_000 * day;
const directions: WaitingQueueSortOrder[] = ["longest", "shortest"];

function section(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`Missing source contract boundaries: ${start} / ${end}`);
  return source.slice(from, to);
}

const queueSource = section(routerSource, "getSinglesWithoutMatches: teamProcedure", "getTopMatchesForSingle: teamProcedure");
const querySource = section(crmSource, "getSinglesWithoutMatches.useQuery", "const singlesWithoutMatches");
const searchChangeSource = section(crmSource, "const changeUnmatchedNameSearch =", "useEffect(() => {");
const sortChangeSource = section(crmSource, "const changeUnmatchedSortOrder =", "useEffect(() => {");
const pageChangeSource = section(crmSource, "const changeUnmatchedPage =", "const changeUnmatchedSortOrder =");
const boundsGuardSource = section(crmSource, "    if (unmatchedLoading || unmatchedFetching || unmatchedError) return;", "const changeUnmatchedNameSearch =");

// Execute just the router's real, pure filter/sort/slice declarations against
// synthetic profiles. This catches slice-before-sort regressions without DB,
// network access, customers, or a duplicated implementation in the test.
const pagingDeclarations = section(queueSource, "const nameFilteredSinglesWithout =", "const pagedSingleIds =");
type NamedFixture = WaitingQueueProfile & { firstName: string; lastName: string };
const runRouterPaging = new Function(
  "singlesWithout", "input", "lastMatchDateBySingle", "queueNow", "page", "limit",
  "filterProfilesByName", "sortWaitingProfilesByWaitingFrom",
  `${pagingDeclarations}\nreturn { items: pagedSingles, total: sortedSinglesWithout.length };`,
) as (
  profiles: readonly NamedFixture[],
  input: { search?: string; sortOrder?: WaitingQueueSortOrder },
  deliveries: ReadonlyMap<number, number>,
  clock: number,
  page: number,
  limit: number,
  filter: typeof filterProfilesByName,
  sort: typeof sortWaitingProfilesByWaitingFrom,
) => { items: NamedFixture[]; total: number };

const synthetic707 = (): NamedFixture[] => Array.from({ length: 707 }, (_, index) => {
  const id = ((index * 97) % 707) + 1;
  return {
    id,
    firstName: "Waiting",
    lastName: "Fixture",
    questionnaireCompletedAt: id * day,
    // Creation ordering deliberately contradicts the documented waiting date.
    createdAt: (800 - id) * day,
  };
});

function routerPage(profiles: readonly NamedFixture[], page: number, sortOrder?: WaitingQueueSortOrder, search = "Waiting Fixture") {
  return runRouterPaging(profiles, { search, sortOrder }, new Map(), now, page, 40, filterProfilesByName, sortWaitingProfilesByWaitingFrom);
}

describe("waiting queue navigation: waiting-date direction", () => {
  it("preserves the existing three-argument longest-first default and ignores feedback as a priority", () => {
    const deliveries = buildLastAcceptedDeliveryBySingle([{ matchId: 10, singleId: 30, acceptedAt: 990 * day }]);
    const profiles = [
      { id: 40, questionnaireCompletedAt: 980 * day, createdAt: 975 * day, feedbackNeedsMatchmaking: true },
      { id: 30, questionnaireCompletedAt: 920 * day, createdAt: 910 * day },
      { id: 9, questionnaireCompletedAt: 970 * day, createdAt: 960 * day },
      { id: 7, questionnaireCompletedAt: 970 * day, createdAt: 960 * day },
      { id: 50, questionnaireCompletedAt: null, createdAt: 975 * day },
    ];
    const expected = [7, 9, 50, 40, 30];
    expect(sortWaitingProfilesByWaitingFrom(profiles, deliveries, now).map(profile => profile.id)).toEqual(expected);
    expect(sortWaitingProfilesByWaitingFrom(profiles, deliveries, now, "longest").map(profile => profile.id)).toEqual(expected);
  });

  it.each(directions)("keeps ascending ID ties stable in %s direction, including across a page boundary", sortOrder => {
    const profiles = Array.from({ length: 41 }, (_, index) => ({ id: 41 - index, questionnaireCompletedAt: 950 * day }));
    const sorted = sortWaitingProfilesByWaitingFrom(profiles, new Map(), now, sortOrder);
    expect(sorted.map(profile => profile.id)).toEqual(Array.from({ length: 41 }, (_, index) => index + 1));
    expect(sorted.slice(0, 40).at(-1)?.id).toBe(40);
    expect(sorted.slice(40).map(profile => profile.id)).toEqual([41]);
  });

  it.each(directions)("does not mutate the array, frozen profile objects, or delivery map in %s direction", sortOrder => {
    const profiles = Object.freeze([
      Object.freeze({ id: 3, questionnaireCompletedAt: 980 * day }),
      Object.freeze({ id: 1, questionnaireCompletedAt: 940 * day }),
      Object.freeze({ id: 2, questionnaireCompletedAt: 960 * day }),
    ]);
    const deliveries = new Map([[3, 970 * day]]);
    const beforeProfiles = profiles.map(profile => ({ ...profile }));
    const beforeDeliveries = [...deliveries];
    const sorted = sortWaitingProfilesByWaitingFrom(profiles, deliveries, now, sortOrder);
    expect(sorted).not.toBe(profiles);
    expect(profiles).toEqual(beforeProfiles);
    expect([...deliveries]).toEqual(beforeDeliveries);
    expect(sorted.map(profile => profile.id)).toEqual(sortOrder === "longest" ? [1, 2, 3] : [3, 2, 1]);
    expect(sorted.every(profile => profiles.includes(profile))).toBe(true);
  });

  it.each(directions)("uses latest recipient-accepted delivery rather than creation or questionnaire age for %s", sortOrder => {
    const deliveries = buildLastAcceptedDeliveryBySingle([
      { matchId: 10, singleId: 1, acceptedAt: 950 * day },
      { matchId: 11, singleId: 1, acceptedAt: 990 * day },
      { matchId: 12, singleId: 1, acceptedAt: 960 * day },
      { matchId: 13, singleId: 999, acceptedAt: 999 * day },
    ]);
    const profiles = [
      { id: 1, createdAt: 100 * day, questionnaireCompletedAt: 200 * day },
      { id: 2, createdAt: 800 * day, questionnaireCompletedAt: 980 * day },
      { id: 3, createdAt: 900 * day, questionnaireCompletedAt: 970 * day },
    ];
    expect(getWaitingFrom(profiles[0], deliveries, now)).toBe(990 * day);
    expect(getWaitingFrom(profiles[1], deliveries, now)).toBe(980 * day);
    expect(sortWaitingProfilesByWaitingFrom(profiles, deliveries, now, sortOrder).map(profile => profile.id))
      .toEqual(sortOrder === "longest" ? [3, 2, 1] : [1, 2, 3]);
  });

  it.each(directions)("handles an empty profile collection in %s direction", sortOrder => {
    const profiles = Object.freeze([]);
    const sorted = sortWaitingProfilesByWaitingFrom(profiles, new Map(), now, sortOrder);
    expect(sorted).toEqual([]);
    expect(sorted).not.toBe(profiles);
  });

  it.each(directions)("falls back through questionnaire, creation, and one shared clock for missing dates in %s", sortOrder => {
    const profiles: WaitingQueueProfile[] = [
      { id: 5 },
      { id: 4, questionnaireCompletedAt: null, createdAt: null },
      { id: 3, questionnaireCompletedAt: 0, createdAt: 0 },
      { id: 2, questionnaireCompletedAt: null, createdAt: 950 * day },
      { id: 1, questionnaireCompletedAt: 960 * day, createdAt: 900 * day },
      { id: 6, questionnaireCompletedAt: undefined, createdAt: undefined },
    ];
    expect(profiles.map(profile => getWaitingFrom(profile, new Map(), now)))
      .toEqual([now, now, now, 950 * day, 960 * day, now]);
    expect(sortWaitingProfilesByWaitingFrom(profiles, new Map(), now, sortOrder).map(profile => profile.id))
      .toEqual(sortOrder === "longest" ? [2, 1, 3, 4, 5, 6] : [3, 4, 5, 6, 1, 2]);
  });

  it("ignores empty/invalid acceptance dates but retains valid acceptance for an otherwise undated recipient", () => {
    const deliveries = buildLastAcceptedDeliveryBySingle([
      { matchId: 1, singleId: 1 },
      { matchId: 2, singleId: 1, acceptedAt: null },
      { matchId: 3, singleId: 1, acceptedAt: 0 },
      { matchId: 4, singleId: 1, acceptedAt: Number.NaN },
      { matchId: 5, singleId: 1, acceptedAt: Number.POSITIVE_INFINITY },
      { matchId: 6, singleId: 1, acceptedAt: -1 },
      { matchId: 7, singleId: 2, acceptedAt: 990 * day },
    ]);
    expect([...deliveries]).toEqual([[2, 990 * day]]);
    expect(getWaitingFrom({ id: 1 }, deliveries, now)).toBe(now);
    expect(getWaitingFrom({ id: 2 }, deliveries, now)).toBe(990 * day);
  });
});

describe("waiting queue navigation: full-set server paging without DB", () => {
  it.each([undefined, "longest", "shortest"] as const)("orders all 707 filtered profiles globally before all 18 pages (%s)", sortOrder => {
    const matching = synthetic707();
    expect(new Set(matching.map(profile => profile.id)).size).toBe(707);
    const profiles = Object.freeze([
      Object.freeze({ id: 1_001, firstName: "Excluded", lastName: "Synthetic", questionnaireCompletedAt: 999 * day }),
      ...matching.map(profile => Object.freeze(profile)),
      Object.freeze({ id: 1_002, firstName: "Excluded", lastName: "Synthetic", questionnaireCompletedAt: day }),
    ]);
    const before = profiles.map(profile => ({ ...profile }));
    const expected = Array.from({ length: 707 }, (_, index) => sortOrder === "shortest" ? 707 - index : index + 1);
    const collected: number[] = [];
    for (let page = 1; page <= 18; page += 1) {
      const result = routerPage(profiles, page, sortOrder);
      const ids = result.items.map(profile => profile.id);
      expect(result.total).toBe(707);
      expect(ids).toEqual(expected.slice((page - 1) * 40, page * 40));
      expect(ids).toHaveLength(page === 18 ? 27 : 40);
      collected.push(...ids);
    }
    expect(collected).toEqual(expected);
    expect(new Set(collected).size).toBe(707);
    expect(profiles).toEqual(before);
  });

  it("returns an empty filtered collection and preserves the global total on an out-of-bounds page", () => {
    const profiles = synthetic707();
    expect(routerPage(profiles, 1, "shortest", "No Such Synthetic Name")).toEqual({ items: [], total: 0 });
    expect(routerPage(profiles, 19, "shortest")).toEqual({ items: [], total: 707 });
  });
});

function renderPagination(overrides: Partial<WaitingQueuePaginationProps> = {}): string {
  return renderToStaticMarkup(createElement(WaitingQueuePagination, {
    page: 1, total: 707, limit: 40, onPageChange: () => {}, ...overrides,
  }));
}

function controls(html: string) {
  return Array.from(html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g), match => ({
    label: match[2],
    disabled: /\bdisabled(?:=|\s|$)/.test(match[1]),
    type: match[1].match(/\btype="([^"]+)"/)?.[1],
  }));
}

function selectedPage(html: string): number {
  const selected = html.match(/<option\b(?=[^>]*\bselected="")(?=[^>]*\bvalue="(\d+)")[^>]*>/);
  if (!selected) throw new Error("SSR pagination did not select a page");
  return Number(selected[1]);
}

describe("waiting queue navigation: accessible React SSR pagination", () => {
  // Vitest's existing JSX setup uses the classic transform; production Vite uses
  // the automatic runtime. Match the existing SSR suites without changing source.
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  it("renders RTL navigation, accessible native page selection, and named non-submit buttons", () => {
    const html = renderPagination();
    expect(html).toContain('aria-label="ניווט בין עמודי הממתינים"');
    expect(html).toContain('dir="rtl"');
    const selectId = html.match(/<select\b[^>]*\bid="([^"]+)"/)?.[1];
    expect(selectId).toBeTruthy();
    expect(html).toContain(`<label for="${selectId}"`);
    expect(html).toContain("קפיצה לעמוד</label>");
    expect(controls(html).map(control => control.label)).toEqual(["ראשון", "הקודם", "הבא", "אחרון"]);
    expect(controls(html).every(control => control.type === "button")).toBe(true);
  });

  it("provides all 18 native page options for 707 items at limit 40, including the last page", () => {
    const html = renderPagination();
    const options = Array.from(html.matchAll(/<option\b[^>]*\bvalue="(\d+)"[^>]*>(\d+)<\/option>/g), match => [Number(match[1]), Number(match[2])]);
    expect(options).toEqual(Array.from({ length: 18 }, (_, index) => [index + 1, index + 1]));
    expect(selectedPage(html)).toBe(1);
    expect(html).toContain("מתוך 18");
    expect(html.match(/<select\b[^>]*>/)?.[0]).not.toContain("disabled");
  });

  it.each([
    { page: 1, expected: [true, true, false, false] },
    { page: 9, expected: [false, false, false, false] },
    { page: 18, expected: [false, false, true, true] },
  ])("selects page $page and disables only its boundary controls", ({ page, expected }) => {
    const html = renderPagination({ page });
    expect(selectedPage(html)).toBe(page);
    expect(controls(html).map(control => control.disabled)).toEqual(expected);
  });

  it.each([1, 9, 18])("disables all four buttons and the selector during loading/fetching on page %s", page => {
    const html = renderPagination({ page, disabled: true });
    expect(controls(html)).toHaveLength(4);
    expect(controls(html).every(control => control.disabled)).toBe(true);
    expect(html.match(/<select\b[^>]*>/)?.[0]).toContain('disabled=""');
    expect(selectedPage(html)).toBe(page);
  });

  it.each([0, 1, 40])("keeps a single disabled page for total %s", total => {
    const html = renderPagination({ total });
    expect((html.match(/<option\b/g) ?? [])).toHaveLength(1);
    expect(selectedPage(html)).toBe(1);
    expect(controls(html).every(control => control.disabled)).toBe(true);
    expect(html.match(/<select\b[^>]*>/)?.[0]).toContain('disabled=""');
  });

  it.each([
    { page: 0, expected: 1 },
    { page: -2, expected: 1 },
    { page: 19, expected: 18 },
    { page: 999, expected: 18 },
  ])("clamps an out-of-range page $page to selected page $expected", ({ page, expected }) => {
    const html = renderPagination({ page });
    expect(selectedPage(html)).toBe(expected);
    expect(controls(html).map(control => control.disabled))
      .toEqual(expected === 1 ? [true, true, false, false] : [false, false, true, true]);
  });

  it("gives top and bottom pagination unique useId selectors with their own associated labels in one SSR tree", () => {
    const props: WaitingQueuePaginationProps = { page: 18, total: 707, limit: 40, onPageChange: () => {} };
    const html = renderToStaticMarkup(createElement(React.Fragment, null,
      createElement(WaitingQueuePagination, { ...props, key: "top" }),
      createElement("main", null, "Synthetic waiting rows"),
      createElement(WaitingQueuePagination, { ...props, key: "bottom" }),
    ));
    const ids = Array.from(html.matchAll(/<select\b[^>]*\bid="([^"]+)"/g), match => match[1]);
    const labels = Array.from(html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g), match => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(labels).toEqual(ids);
    expect((html.match(/<option\b/g) ?? [])).toHaveLength(36);
  });
});

describe("waiting queue navigation: client/server source contracts", () => {
  it("defaults the sort schema to longest while accepting only the two display directions", () => {
    expect(queueSource).toMatch(/sortOrder:\s*z\.enum\(\["longest",\s*"shortest"\]\)\.default\("longest"\)/);
    expect(queueSource).toContain("page: z.number().int().min(1).default(1)");
    expect(queueSource).toContain("limit: z.number().int().min(10).max(100).default(40)");
  });

  it("sorts the full filtered collection using the request direction before slicing, and counts the full result", () => {
    expect(pagingDeclarations).toContain('filterProfilesByName(singlesWithout, input?.search || "")');
    expect(pagingDeclarations).toContain("sortWaitingProfilesByWaitingFrom(nameFilteredSinglesWithout, lastMatchDateBySingle, queueNow, input?.sortOrder)");
    expect(pagingDeclarations).toContain("sortedSinglesWithout.slice((page - 1) * limit, page * limit)");
    expect(section(queueSource, "const allSingles =", "const pagedSingles =")).not.toContain(".slice(");
    expect(queueSource).toContain("total: sortedSinglesWithout.length");
    expect(queueSource).toContain("buildLastAcceptedDeliveryBySingle(acceptedDeliveries)");
  });

  it("explicitly sends the selected direction, current page, page size and debounced search to the server", () => {
    expect(crmSource).toContain('useState<WaitingQueueSortOrder>("longest")');
    expect(querySource).toContain("sortOrder: unmatchedSortOrder");
    expect(querySource).toContain("page: unmatchedPage");
    expect(querySource).toContain("limit: 40");
    expect(querySource).toContain("search: debouncedUnmatchedNameSearch || undefined");
    expect(querySource).not.toContain(".sort(");
    expect(querySource).not.toContain(".filter(");
    expect(crmSource).toContain('htmlFor="unmatched-sort-order"');
    expect(crmSource).toContain("changeUnmatchedSortOrder(event.target.value as WaitingQueueSortOrder)");
    expect(crmSource).toContain('<option value="longest">');
    expect(crmSource).toContain('<option value="shortest">');
  });

  it("resets search to page one immediately and clears stale expansion/workspace results", () => {
    expect(searchChangeSource).toContain("setUnmatchedNameSearch(value)");
    expect(searchChangeSource).toContain("setUnmatchedPage(1)");
    expect(searchChangeSource).toContain("setWaitingExpandedId(null)");
    expect(searchChangeSource).toContain("batchGeneration.current += 1");
    expect(searchChangeSource).toContain("setFilterCompatResult({})");
    expect(searchChangeSource).toContain("waitingReturnPosition.current = null");
    expect(crmSource).toContain("window.setTimeout(() => setDebouncedUnmatchedNameSearch(unmatchedNameSearch), 250)");
  });

  it("resets sort changes through the same page-one reset without losing the current search", () => {
    expect(sortChangeSource).toContain("setUnmatchedSortOrder(order)");
    expect(sortChangeSource).toContain("changeUnmatchedNameSearch(unmatchedNameSearch)");
    expect(searchChangeSource).toContain("setUnmatchedPage(1)");
    expect(searchChangeSource).toContain("setWaitingSearchOriginId(null)");
    expect(searchChangeSource).toContain("waitingReturnPending.current = false");
  });

  it("guards the fallback page correction until loading/fetching/error finishes and clamps to at least page one", () => {
    expect(boundsGuardSource).toContain("if (unmatchedLoading || unmatchedFetching || unmatchedError) return;");
    expect(boundsGuardSource).toContain("Math.max(1, Math.ceil(unmatchedResult.total / unmatchedResult.limit))");
    expect(boundsGuardSource).toContain("if (unmatchedPage > lastPage) setUnmatchedPage(lastPage)");
    expect(boundsGuardSource).toContain("[unmatchedPage, unmatchedResult.total, unmatchedResult.limit, unmatchedLoading, unmatchedFetching, unmatchedError]");
  });

  it("wires both top and bottom controls to one page handler and disables them while fetching", () => {
    const usages = Array.from(crmSource.matchAll(/<WaitingQueuePagination\b[^>]*\/>/g), match => match[0]);
    expect(usages).toHaveLength(2);
    for (const usage of usages) {
      expect(usage).toContain("page={unmatchedPage}");
      expect(usage).toContain("total={unmatchedResult.total}");
      expect(usage).toContain("limit={unmatchedResult.limit}");
      expect(usage).toContain("disabled={unmatchedFetching}");
      expect(usage).toContain("onPageChange={changeUnmatchedPage}");
    }
    expect(pageChangeSource).toContain("setUnmatchedPage(page)");
    expect(pageChangeSource).toContain("setWaitingExpandedId(null)");
  });

  it("keeps native selection and first/previous/next/last callbacks connected to bounded pages", () => {
    expect(paginationSource).toContain("const id = useId()");
    expect(paginationSource).toContain("Math.min(pages, Math.max(1, page))");
    expect(paginationSource).toContain("onPageChange(Number(event.target.value))");
    for (const target of ["1", "current - 1", "current + 1", "pages"]) {
      expect(paginationSource).toContain(`onClick={() => onPageChange(${target})}`);
    }
  });
});
