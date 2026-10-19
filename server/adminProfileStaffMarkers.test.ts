import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const between = (value: string, start: string, end: string) => value.slice(value.indexOf(start), value.indexOf(end, value.indexOf(start)));

describe("administrative profile staff markers", () => {
  it("uses the shared marker component only on administrative profile surfaces", () => {
    const plus = source("client/src/components/PlusPilotAdminSection.tsx");
    const cancellations = source("client/src/components/PlusCancellationQueue.tsx");
    const boost = source("client/src/components/BoostMembersAdminSection.tsx");
    const live = source("client/src/components/LiveOctoberAdminSection.tsx");
    const now = source("client/src/components/DatabaseNowSlaSection.tsx");

    for (const component of [plus, cancellations, boost, live, now]) {
      expect(component).toContain('from "@/components/ProfileStaffMarkers"');
      expect(component).toContain("profileStaffSurface");
      expect(component).toContain("ProfileStaffMarkers");
    }
    expect(live).toContain("const linkedProfile = ticket.singleId ? ticket : null");
    expect(live).toContain("const linkedProfile = row.singleId ? row : null");
    expect(now).toContain("const linkedProfile = row.singleId ? row : null");
    expect(boost).toContain("row.singleId");
  });

  it("selects markers only into role-gated team administrative datasets", () => {
    const plus = source("server/plusPilotRouter.ts");
    const live = source("server/liveOctoberRouter.ts");
    const liveQueue = source("server/liveFirstMatchQueue.ts");
    const operations = source("server/operationsRouter.ts");

    const plusAdmin = between(plus, "adminOverview: teamProcedure.query", "adminUpdateStatus: teamProcedure");
    expect(plusAdmin).toContain("isCoachingClient: singles.isCoachingClient");
    expect(plusAdmin).toContain("isNotBasic: singles.isNotBasic");
    expect(plusAdmin).toContain("isCoachingClient: other.isCoachingClient");
    expect(plusAdmin).toContain("isNotBasic: other.isNotBasic");

    const liveAdmin = between(live, "adminOverview: teamProcedure.query", "adminFirstMatchQueue: teamProcedure");
    expect(liveAdmin).toContain("isCoachingClient: singles.isCoachingClient");
    expect(liveAdmin).toContain("isNotBasic: singles.isNotBasic");
    expect(liveQueue).toContain("isCoachingClient: base.is_coaching_client === true || Number(base.is_coaching_client) === 1");
    expect(liveQueue).toContain("isNotBasic: base.is_not_basic === true || Number(base.is_not_basic) === 1");

    const nowAdmin = between(operations, "nowSlaDashboard: teamProcedure.query", "createTask: teamProcedure");
    expect(nowAdmin).toContain("s.isCoachingClient AS is_coaching_client");
    expect(nowAdmin).toContain("s.isNotBasic AS is_not_basic");
  });

  it("keeps flags out of public Plus and Live response procedures", () => {
    const plus = source("server/plusPilotRouter.ts");
    const live = source("server/liveOctoberRouter.ts");

    const plusPublic = plus.slice(plus.indexOf("getMyStatus: publicProcedure"), plus.indexOf("adminOverview: teamProcedure.query"));
    expect(plusPublic).not.toContain("isCoachingClient");
    expect(plusPublic).not.toContain("isNotBasic");

    const livePublic = live.slice(live.indexOf("salesStatus: publicProcedure"), live.indexOf("adminOverview: teamProcedure.query"));
    expect(livePublic).not.toContain("isCoachingClient");
    expect(livePublic).not.toContain("isNotBasic");
  });

  it("keeps ranked-singles marker fields on the correct SQL alias", () => {
    const liveQueue = source("server/liveFirstMatchQueue.ts");
    const rankedSingles = between(liveQueue, "), ranked_singles AS (", "), member_matches AS (");
    expect(rankedSingles).toContain("FROM singles s");
    expect(rankedSingles).toContain("s.isCoachingClient");
    expect(rankedSingles).toContain("s.isNotBasic");
    expect(rankedSingles).not.toContain("rs.");
  });

  it("uses existing singleton fields and does not add schema ownership", () => {
    const router = source("server/routers.ts");
    const marker = source("client/src/components/ProfileStaffMarkers.tsx");

    expect(router).toContain("isCoachingClient: singles.isCoachingClient");
    expect(router).toContain("isNotBasic: singles.isNotBasic");
    expect(marker).toContain("isCoachingClient?: boolean | null");
    expect(marker).toContain("isNotBasic?: boolean | null");
  });
});
