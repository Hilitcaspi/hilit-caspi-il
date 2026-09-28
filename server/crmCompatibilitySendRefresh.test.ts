import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("CRM compatibility direct-send refresh", () => {
  it("refetches the match list after a direct compatibility send", () => {
    const start = source.indexOf("const createAndSendMatch");
    const end = source.indexOf("const approveMatch", start);
    const mutationSource = source.slice(start, end);

    expect(mutationSource).toContain("refetchMatches();");
    expect(mutationSource).toContain("מופיעה בטאב קיבלו התאמה");
  });

  it("passes an explicit criteria override through both new and existing match paths", () => {
    expect(source).toContain("allowCriteriaOverride: canOverrideCriteria");
    expect(source).toContain('approveMatch.mutate({ matchId: compatResult.matchId, hilitsNote: "", allowCriteriaOverride }');
    expect(source).toContain("זו התראה בלבד. אפשר לאשר במפורש ולשלוח את ההתאמה בכל זאת.");
    expect(source).toContain("אשר חריגה ושלח לשני הצדדים");
  });

  it("returns the strict blocker separately and honors the override in approveMatch", () => {
    const checkStart = routerSource.indexOf("checkCompatibility: teamProcedure");
    const createStart = routerSource.indexOf("createAndSendMatch: teamProcedure", checkStart);
    const checkSource = routerSource.slice(checkStart, createStart);
    const approveStart = routerSource.indexOf("approveMatch: teamProcedure");
    const approveEnd = routerSource.indexOf("ownerApproveMatch: publicProcedure", approveStart);
    const approveSource = routerSource.slice(approveStart, approveEnd);

    expect(checkSource).toContain("hardBlockReason");
    expect(checkSource).toContain("canOverrideCriteria");
    expect(approveSource).toContain("allowCriteriaOverride");
    expect(approveSource).toContain("computeFullScoreForAdminSend");
    expect(approveSource).toContain("[CRITERIA_OVERRIDE]");
  });
});
