import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("Match Boost personal approval link funnel", () => {
  const routerSource = read("server/matchBoostPilotRouter.ts");
  const boostSource = read("server/matchBoostRouter.ts");
  const schemaSource = read("drizzle/schema.ts");
  const pageSource = read("client/src/pages/MatchBoostLanding.tsx");
  const operationsSource = read("client/src/components/OperationsSection.tsx");
  const appSource = read("client/src/App.tsx");

  it("sends an approval link without creating active Boost membership", () => {
    expect(schemaSource).toContain('mysqlTable("match_boost_pilot_interests"');
    expect(schemaSource).toContain("contactConsent");
    const submitFlow = routerSource.slice(routerSource.indexOf("submitInterest:"), routerSource.indexOf("overview:"));
    expect(submitFlow).toContain("requestLink: z.literal(true)");
    expect(submitFlow).toContain("matchBoostPilotInterests");
    expect(submitFlow).toContain("single?.isPaid");
    expect(submitFlow).toContain("single?.isActive");
    expect(submitFlow).toContain("single?.consentMatchmaking");
    expect(submitFlow).toContain("BOOST_LINK_COOLDOWN_MS");
    expect(submitFlow).toContain("sendEmail");
    expect(submitFlow).toContain("אם כתובת המייל מקושרת לחבר מאגר פעיל");
    expect(submitFlow).not.toContain("insert(matchBoostMemberships)");
  });

  it("makes the distinction between receiving a link and joining visible", () => {
    expect(appSource).toContain('<Route path="/match-boost" component={MatchBoostLanding} />');
    expect(pageSource).toContain("קבלת הקישור אינה מצרפת למסלול");
    expect(pageSource).toContain("שלוש הסכמות מפורשות");
    expect(pageSource).toContain("לא נבדקה ידנית על ידי הילית");
    expect(pageSource).toContain("בלי שם ותמונה");
  });

  it("keeps pilot metrics and personal details behind team procedures", () => {
    expect(routerSource).toContain("overview: teamProcedure");
    expect(routerSource).toContain("listInterests: teamProcedure");
    expect(operationsSource).toContain("מתעניינים מהעמוד הציבורי");
    expect(operationsSource).toContain("אישור הדדי");
  });

  it("synchronizes interest status only after an invitation or personal consent", () => {
    expect(boostSource).toContain('status: "invited", matchedSingleId: single.id');
    expect(boostSource).toContain('status: "joined", matchedSingleId: single.id');
    expect(boostSource).toContain('status: "declined", matchedSingleId: single.id');
    expect(boostSource).toContain('"opted_in"');
    expect(boostSource).toContain('"opted_out"');
  });
});
