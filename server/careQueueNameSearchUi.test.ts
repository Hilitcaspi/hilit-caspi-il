import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const matchmakingSource = readFileSync(resolve(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");
const followupSource = readFileSync(resolve(process.cwd(), "client/src/components/ResponseFollowupSection.tsx"), "utf8");

describe("care-queue name search UI contracts", () => {
  it("debounces the waiting-queue name query, resets its page immediately, and sends it before server pagination", () => {
    expect(matchmakingSource).toContain('const [unmatchedNameSearch, setUnmatchedNameSearch] = useState("");');
    expect(matchmakingSource).toContain('const [debouncedUnmatchedNameSearch, setDebouncedUnmatchedNameSearch] = useState("");');
    expect(matchmakingSource).toContain('window.setTimeout(() => setDebouncedUnmatchedNameSearch(unmatchedNameSearch), 250)');
    expect(matchmakingSource).toContain("return () => window.clearTimeout(timeout);");

    const searchChangeStart = matchmakingSource.indexOf("const changeUnmatchedNameSearch");
    const searchChangeEnd = matchmakingSource.indexOf("useEffect(() => {", searchChangeStart);
    const searchChange = matchmakingSource.slice(searchChangeStart, searchChangeEnd);
    expect(searchChange).toContain("setUnmatchedPage(1);");

    const waitingQueryStart = matchmakingSource.indexOf("getSinglesWithoutMatches.useQuery");
    const waitingQueryEnd = matchmakingSource.indexOf("const singlesWithoutMatches", waitingQueryStart);
    const waitingQuery = matchmakingSource.slice(waitingQueryStart, waitingQueryEnd);
    expect(waitingQuery).toContain("page: unmatchedPage");
    expect(waitingQuery).toContain("limit: 40");
    expect(waitingQuery).toContain("search: debouncedUnmatchedNameSearch || undefined");
    expect(waitingQuery).not.toContain(".filter(");
  });

  it("uses the same field in both treatment views and never displays a stale list while typing", () => {
    expect(matchmakingSource).toContain('htmlFor="unmatched-name-search"');
    expect(matchmakingSource).toContain("const unmatchedQueueIsRefreshing = unmatchedFetching && unmatchedView === \"matches\";");
    expect(matchmakingSource).toContain("{unmatchedSearchIsDebouncing || unmatchedQueueIsRefreshing ?");
    expect(matchmakingSource).toContain("searchQuery={debouncedUnmatchedNameSearch}");
    expect(matchmakingSource).toContain("לא נמצאו ממתינים בשם הזה");
  });

  it("applies the non-response search only after eligibility is determined", () => {
    expect(followupSource).toContain("const qualifiedRows = profiles.filter");
    expect(followupSource).toContain("qualifiedRows.filter(profile => matchesProfileName(profile, searchQuery))");
    expect(followupSource).toContain("searchQuery?: string;");
  });
});
