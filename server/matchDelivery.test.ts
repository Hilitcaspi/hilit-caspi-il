import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { wasMatchProposalSent } from "../shared/matchDelivery";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("wasMatchProposalSent", () => {
  it("does not treat pending or rejected internal candidates as sent", () => {
    expect(wasMatchProposalSent({ status: "pending" })).toBe(false);
    expect(wasMatchProposalSent({ status: "rejected" })).toBe(false);
    expect(wasMatchProposalSent({ status: "rejected", ownerApprovedAt: null, approvalTokenA: null, approvalTokenB: null })).toBe(false);
  });

  it("does not trust proposedAt-like lifecycle status without delivery evidence", () => {
    expect(wasMatchProposalSent({ status: "expired" })).toBe(false);
    expect(wasMatchProposalSent({ status: "proposed" })).toBe(false);
  });

  it("recognizes modern and legacy evidence of a real proposal", () => {
    expect(wasMatchProposalSent({ status: "proposed", approvalTokenA: "token" })).toBe(true);
    expect(wasMatchProposalSent({ status: "rejected", tokenBUsedAt: 123 })).toBe(true);
    expect(wasMatchProposalSent({ status: "rejected", notes: "נשלחה בעבר" })).toBe(true);
    expect(wasMatchProposalSent({ status: "matched" })).toBe(true);
  });

  it("blocks the specific-match route from reusing a proposal already sent", () => {
    const start = routerSource.indexOf("createAndSendMatch: teamProcedure");
    const end = routerSource.indexOf("adminCreateMatch: teamProcedure", start);
    const createAndSendSource = routerSource.slice(start, end);
    expect(createAndSendSource).toContain("wasMatchProposalSent(existingMatch[0])");
    expect(createAndSendSource).toContain("כבר נשלחה בעבר");
  });

  it("blocks a repeated click on the owner approval link", () => {
    const start = routerSource.indexOf("ownerApproveMatch: publicProcedure");
    const end = routerSource.indexOf("Get match details by token", start);
    const ownerApprovalSource = routerSource.slice(start, end);
    expect(ownerApprovalSource).toContain("wasMatchProposalSent(match)");
    expect(ownerApprovalSource).toContain("לא תישלח פעם נוספת");
  });

  it("treats a mutual match as active until it is returned to the pool", () => {
    const start = routerSource.indexOf("createAndSendMatch: teamProcedure");
    const end = routerSource.indexOf("adminCreateMatch: teamProcedure", start);
    const createAndSendSource = routerSource.slice(start, end);
    expect(createAndSendSource).toContain('eq(matches.status, "matched")');
    expect(createAndSendSource).toContain("isNull(matches.returnedToPoolAt)");
    expect(createAndSendSource).toContain('ne(matches.matchDetailStatus, "ended")');
  });

  it("rejects reminder delivery when the requested single is not a match participant", () => {
    const start = routerSource.indexOf("sendMatchReminder: teamProcedure");
    const end = routerSource.indexOf("updateSinglePhoto: teamProcedure", start);
    const reminderSource = routerSource.slice(start, end);
    expect(reminderSource).toContain("match.singleAId !== input.singleId && match.singleBId !== input.singleId");
    expect(reminderSource).toContain("הנמען אינו משתתף בהתאמה");
  });
});
