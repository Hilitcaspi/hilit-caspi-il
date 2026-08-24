import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");

describe("personal-area profile completeness", () => {
  it("returns the stored height in singles.getDashboard", () => {
    const dashboardProcedure = routerSource.slice(
      routerSource.indexOf("getDashboard: publicProcedure"),
      routerSource.indexOf("sendDashboardLink: publicProcedure"),
    );
    expect(dashboardProcedure).toContain("height: profile.height");
  });

  it("only reports height as missing when the returned value is empty or zero", () => {
    expect(dashboardSource).toContain('if (!profile.height || profile.height === 0) missing.push("גובה")');
  });
});
