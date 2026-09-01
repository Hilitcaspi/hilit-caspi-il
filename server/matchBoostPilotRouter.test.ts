import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBoostApprovalLinkEmail } from "./matchBoostPilotRouter";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("Boost personal approval link funnel", () => {
  const routerSource = read("server/matchBoostPilotRouter.ts");
  const boostSource = read("server/matchBoostRouter.ts");
  const schemaSource = read("drizzle/schema.ts");
  const pageSource = read("client/src/pages/MatchBoostLanding.tsx");
  const dashboardSource = read("client/src/pages/UserDashboard.tsx");
  const operationsSource = read("client/src/components/OperationsSection.tsx");
  const appSource = read("client/src/App.tsx");
  const rootRouterSource = read("server/routers.ts");

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

  it("matches member emails case-insensitively throughout the Boost approval flow", () => {
    const submitFlow = routerSource.slice(routerSource.indexOf("submitInterest:"), routerSource.indexOf("overview:"));
    expect(submitFlow).toContain("normalizeEmail(input.email)");
    expect(submitFlow).toContain("normalizedEmailEquals(singles.email, email)");
    expect(submitFlow).toContain("normalizedEmailEquals(matchBoostPilotInterests.email, email)");
    expect(boostSource).toContain("normalizedEmailEquals(singles.email, email)");
    expect(boostSource).toContain("normalizedEmailEquals(singles.email, normalizedEmail)");
    expect(boostSource).not.toContain("eq(singles.email, email.trim().toLowerCase())");
  });

  it("opens the Boost section inside the personal-area matches tab and keeps joining as a separate action", () => {
    expect(appSource).toContain('<Route path="/match-boost" component={MatchBoostLanding} />');
    expect(routerSource).toContain("https://hilitcaspi.com/my-profile?email=");
    expect(routerSource).toContain("&tab=matches#boost-card");
    expect(pageSource).toContain("&tab=matches#boost-card");
    expect(pageSource).toContain("window.location.replace(dashboardUrl)");
    expect(pageSource).toContain("הקישור נשלח כדי לוודא שזהו הפרופיל שלי במאגר");
    expect(dashboardSource).not.toContain('{ id: "boost" as const, label: "Boost", icon: "⚡" }');
    expect(dashboardSource).toContain('activeTab === "matches"');
    expect(dashboardSource).toContain("כל ההזדמנויות להיכרות במקום אחד");
    expect(dashboardSource).toContain('id="boost-card"');
    expect(dashboardSource).toContain('window.location.hash !== "#boost-card"');
    expect(dashboardSource).toContain("didAutoFocusRef");
    expect(dashboardSource).toContain("joinPool.mutate");
    expect(dashboardSource).toContain("אינן עוברות אישור אישי של הילית");
    expect(dashboardSource).toContain("פרטים מזהים ייחשפו רק לאחר הסכמה הדדית");
  });

  it("presents Hilit's professional positioning without an unsupported size claim", () => {
    expect(pageSource).toContain("הילית כספי | מאמנת ומרצה למציאת זוגיות");
    expect(pageSource).toContain("מייסדת מאגר הרווקים החכם בישראל");
    expect(pageSource).not.toContain("הגדול בישראל");
    expect(pageSource).toContain("Boost | הילית כספי - מאמנת ומרצה למציאת זוגיות");
  });

  it("renders a branded Boost email with a human preview and clear free-approval disclosure", () => {
    const email = buildBoostApprovalLinkEmail({
      firstName: "הילית",
      approvalUrl: "https://hilitcaspi.com/my-profile?token=personal-secret",
    });
    expect(email.subject).toBe("נפתחה עבורך האפשרות להצטרף ל־Boost");
    expect(email.preheader).toBe("אישור קצר יאפשר לך לשלוח ולקבל בקשות Boost דרך האזור האישי");
    expect(email.subject).not.toContain("19.99");
    expect(email.preheader).not.toContain("19.99");
    expect(email.htmlContent).toContain("יותר בחירה בידיים שלכם");
    expect(email.htmlContent).not.toContain("19.99");
    expect(email.htmlContent).toContain("חברי מאגר שיאשרו את שירות הבוסט יוכלו לשלוח ולקבל בקשות Boost באזור האישי");
    expect(email.htmlContent).toContain("linear-gradient(135deg,#2a125d");
    expect(email.htmlContent).toContain("hilit-profile_6821862b.jpg");
    expect(email.htmlContent).toContain("display:none;max-height:0;overflow:hidden");
    expect(email.textContent).toContain("האישור וההצטרפות ל־Boost אינם כרוכים בתשלום");
  });

  it("adds Boost consent status to both active and incomplete CRM profile lists", () => {
    const activeList = rootRouterSource.slice(rootRouterSource.indexOf("listSingles:"), rootRouterSource.indexOf("createSingle:"));
    const inactiveList = rootRouterSource.slice(rootRouterSource.indexOf("listInactiveSingles:"), rootRouterSource.indexOf("reactivateSingle:"));
    expect(activeList).toContain("boostStatus");
    expect(activeList).toContain("matchBoostMemberships");
    expect(inactiveList).toContain("boostStatus");
    expect(inactiveList).toContain("matchBoostMemberships");
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
