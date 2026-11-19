import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { matchEmailProfile } from "./matchEmailProfile";

const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

describe("consistent match email profile wiring", () => {
  it("has an explicit public allowlist without contact or staff data", () => {
    const data = matchEmailProfile({ firstName: "פרופיל בדיקה", age: 38, city: "תל אביב", height: 170,
      education: "bachelor", occupation: "מעצבת", about: "אוהבת לטייל", gender: "female",
      maritalStatus: "divorced", hasKids: true, numKids: 2, wantsKids: "open", dnaType: "anchor",
      email: "private@example.invalid", phone: "PRIVATE", lastName: "PRIVATE", notes: "PRIVATE" } as any);
    expect(data.matchHeight).toBe(170);
    expect(data.matchEducation).toBe("bachelor");
    expect(data.matchAbout).toBe("אוהבת לטייל");
    expect(data.matchGender).toBe("female");
    expect(JSON.stringify(data)).not.toContain("PRIVATE");
    expect(JSON.stringify(data)).not.toContain("example.invalid");
  });
  it("uses the same mapping in each regular proposal and reveal", () => {
    const router = source("./routers.ts");
    expect(router.match(/\.\.\.matchEmailProfile\(single[AB]\)/g)).toHaveLength(8);
    expect(router).toContain("getMatchResponseView(recorded.match, input.token, now)");
    const start = router.indexOf("getMatchDetails: publicProcedure");
    const end = router.indexOf("respondToMatch: publicProcedure", start);
    const getDetails = router.slice(start, end);
    expect(getDetails).toContain("...responseView");
    expect(getDetails).not.toContain("status: match.status");
  });
  it("reminders use the full proposal and validate the unused token", () => {
    const router = source("./routers.ts");
    const start = router.indexOf("sendMatchReminder: teamProcedure");
    const reminder = router.slice(start, router.indexOf("return { success: true };", start));
    expect(reminder).toContain("...matchEmailProfile(opponent)");
    expect(reminder).toContain("buildMatchProposalEmailTemplate");
    expect(reminder).toContain('classifyMatchDecision(match, token, Date.now()).kind !== "active"');
    expect(reminder).toContain("textContent: template.textBody");
    const automation = source("./automation.ts");
    const followups = automation.slice(automation.indexOf("export async function processMatchFollowUps"));
    expect(followups).toContain("...matchEmailProfile(singleA)");
    expect(followups).toContain("...matchEmailProfile(singleB)");
    expect(followups).not.toContain("buildMatchFollowUpEmail({");
  });
  it("boost proposals pass full profile and text alternatives", () => {
    const boost = source("./matchBoostRouter.ts");
    expect(boost).toContain("...matchEmailProfile(partyA)");
    expect(boost).toContain("...matchEmailProfile(partyB)");
    expect(boost).toContain("textContent: emailA.textBody");
    expect(boost).toContain("textContent: emailB.textBody");
  });
  it("late feedback only gives a screen result, never another closure email", () => {
    const router = source("./routers.ts");
    const start = router.indexOf("if (recorded.lateFeedback)");
    const late = router.slice(start, router.indexOf('if (input.response === "no")', start));
    expect(late).toContain('responseOutcome: "not_matched"');
    expect(late).not.toContain("sendEmail(");
  });
});

describe("explicit manual closure markers", () => {
  it("marks admin rejection and historical closure as ended", () => {
    const router = source("./routers.ts");
    for (const operation of ["rejectMatch: teamProcedure", "markMatchSentBefore: teamProcedure"]) {
      const start = router.indexOf(operation);
      const body = router.slice(start, router.indexOf("return { success: true };", start));
      expect(body).toContain('matchDetailStatus: "ended"');
    }
  });
  it("redacts free-text contact details on the pre-vote response page too", () => {
    const router = source("./routers.ts");
    const start = router.indexOf("getMatchDetails: publicProcedure");
    const body = router.slice(start, router.indexOf("respondToMatch: publicProcedure", start));
    expect(body).toContain("about: redactMatchProposalText(partner.about)");
    expect(body).toContain("occupation: redactMatchProposalText(partner.occupation)");
  });
});
