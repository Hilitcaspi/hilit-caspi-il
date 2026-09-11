import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const dashboardSource = readFileSync(
  new URL("../client/src/pages/UserDashboard.tsx", import.meta.url),
  "utf8",
);
const crmSource = readFileSync(
  new URL("../client/src/pages/CRMMatchmaking.tsx", import.meta.url),
  "utf8",
);
const automationSource = readFileSync(new URL("./automation.ts", import.meta.url), "utf8");
const returnPageSource = readFileSync(
  new URL("../client/src/pages/MatchReturnToPool.tsx", import.meta.url),
  "utf8",
);

describe("personal-area match release", () => {
  it("authenticates the member and applies the full release lifecycle", () => {
    const route = routerSource.slice(
      routerSource.indexOf("returnToPool: publicProcedure"),
      routerSource.indexOf("releaseFromMatch: teamProcedure"),
    );

    expect(route).toContain("email: z.string().email()");
    expect(route).toContain("token: z.string()");
    expect(route).toContain("profile.questionnaireToken !== input.token");
    expect(route).toContain("match.singleAId !== profile.id && match.singleBId !== profile.id");
    expect(route).toContain("getReleaseLifecycleUpdate(match)");
    expect(route).toContain('setLegacyMatchNote(match.notes, "שוחרר מהאזור האישי")');
  });

  it("passes dashboard credentials and shows explicit success and failure messages", () => {
    expect(dashboardSource).toContain("function MatchCard({ match, email, token }");
    expect(dashboardSource).toContain("releaseMutation.mutate({ matchId: match.matchId, email, token })");
    expect(dashboardSource).toContain("ההתאמה שוחררה בהצלחה");
    expect(dashboardSource).toContain("לא הצלחנו להשלים את השחרור");
  });

  it("renders released history as released rather than as an active couple", () => {
    expect(dashboardSource).toContain("const isReleased = Boolean(match.returnedToPoolAt)");
    expect(dashboardSource).toContain("ההתאמה שוחררה");
    expect(crmSource).toContain("returnedToPoolAt: m.returnedToPoolAt");
    expect(crmSource).toContain('h.returnedToPoolAt ? "🔓 שוחררו"');
  });

  it("creates authenticated return-to-pool links for both follow-up recipients", () => {
    expect(automationSource).toContain("buildReturnUrl(singleA)");
    expect(automationSource).toContain("buildReturnUrl(singleB)");
    expect(returnPageSource).toContain("email");
    expect(returnPageSource).toContain("token");
    expect(returnPageSource).toContain("matchId: Number(matchId), email, token");
  });
});
