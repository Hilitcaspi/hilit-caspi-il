import fs from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateBoostEligibility } from "./matchBoostRouter";

const NOW = new Date("2026-08-25T12:00:00Z").getTime();

function completeSingle(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    firstName: "בדיקה",
    lastName: "בטוחה",
    email: "boost@example.com",
    phone: "0500000000",
    gender: "female",
    age: 38,
    city: "תל אביב",
    height: 168,
    occupation: "מנהלת",
    religiosity: "חילונית",
    about: "טקסט מלא ומשמעותי על עצמי",
    partnerDescription: "תיאור מלא ומשמעותי של הזוגיות המבוקשת",
    photoUrl: "/manus-storage/photo.jpg",
    dnaType: "anchor",
    questionnaireCompletedAt: NOW - 10 * 24 * 60 * 60 * 1000,
    createdAt: NOW - 60 * 24 * 60 * 60 * 1000,
    isActive: true,
    isPaid: true,
    isSeed: false,
    consentMatchmaking: true,
    ...overrides,
  };
}

function pendingMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    singleAId: 10,
    singleBId: 11,
    status: "pending",
    score: 82,
    matchDetailStatus: null,
    returnedToPoolAt: null,
    ...overrides,
  };
}

describe("match boost eligibility", () => {
  it("allows a complete paid active member with a hidden pending candidate", () => {
    const result = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch()],
      boostRequests: [],
      now: NOW,
    });
    expect(result.eligible).toBe(true);
    expect(result.candidateCount).toBe(1);
    expect(result.topScore).toBe(82);
  });

  it("does not offer a boost when the hidden candidate is no longer eligible", () => {
    const result = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch({ candidateEligible: false })],
      boostRequests: [],
      now: NOW,
    });
    expect(result.eligible).toBe(false);
    expect(result.candidateCount).toBe(0);
    expect(result.blockers).toContain("אין כרגע התאמה אפשרית שמתאימה לבדיקת בוסט");
  });

  it("blocks incomplete profiles and never bypasses the scientific questionnaire", () => {
    const result = evaluateBoostEligibility({
      single: completeSingle({ questionnaireCompletedAt: null, photoUrl: null }),
      memberMatches: [pendingMatch()],
      boostRequests: [],
      now: NOW,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockers.join(" ")).toContain("להשלים את הפרופיל");
    expect(result.blockers.join(" ")).toContain("השאלון המדעי");
  });

  it("blocks a boost while a proposal or successful relationship is active", () => {
    const active = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch(), pendingMatch({ id: 102, status: "proposed" })],
      boostRequests: [],
      now: NOW,
    });
    expect(active.eligible).toBe(false);
    expect(active.blockers).toContain("יש לך התאמה פעילה כרגע");

    const relationship = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch(), pendingMatch({ id: 103, status: "matched", matchDetailStatus: "relationship" })],
      boostRequests: [],
      now: NOW,
    });
    expect(relationship.positiveOutcome).toBe(true);
    expect(relationship.eligible).toBe(false);
  });

  it("enforces one request every 30 days and blocks duplicate open requests", () => {
    const result = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch()],
      boostRequests: [{ id: 1, status: "queued", requestedAt: NOW - 1000, source: "paid" }],
      now: NOW,
    });
    expect(result.eligible).toBe(false);
    expect(result.openRequest?.id).toBe(1);
    expect(result.blockers).toContain("בקשת בוסט קודמת עדיין בטיפול");
  });

  it("includes one Plus boost per active billing cycle only", () => {
    const plusMember = {
      status: "active",
      billingStatus: "active",
      billingCycleStartedAt: NOW - 5 * 24 * 60 * 60 * 1000,
    };
    const available = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch()],
      plusMember,
      boostRequests: [],
      now: NOW,
    });
    expect(available.plusBenefitAvailable).toBe(true);

    const used = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch()],
      plusMember,
      boostRequests: [{
        id: 3,
        status: "approved",
        source: "plus_included",
        requestedAt: NOW - 4 * 24 * 60 * 60 * 1000,
        plusBillingCycleStartedAt: plusMember.billingCycleStartedAt,
      }],
      now: NOW,
    });
    expect(used.plusBenefitAvailable).toBe(false);
  });
});

describe("match boost privacy and payment gate", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "server/matchBoostRouter.ts"), "utf8");
  const uiSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");
  const operationsSource = fs.readFileSync(path.join(process.cwd(), "client/src/components/OperationsSection.tsx"), "utf8");
  const routersSource = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");

  it("returns only candidate count and score to the personal area, not candidate identity", () => {
    const publicReturn = source.slice(source.indexOf("return {\n        eligible:"), source.indexOf("redeemPlusBoost:"));
    expect(publicReturn).toContain("candidateCount");
    expect(publicReturn).toContain("topScore");
    expect(publicReturn).not.toContain("topCandidate");
    expect(publicReturn).not.toContain("otherId");
  });

  it("keeps regular payment visibly blocked until a dedicated Grow product is connected", () => {
    expect(source).toContain("GROW_PAGE_CODE_MATCH_BOOST");
    expect(source).toContain("התשלום לבוסט עדיין אינו מחובר");
    expect(uiSource).toContain("const regularPaymentReady = false");
    expect(uiSource).not.toContain("trpc.matchBoost.startPaidBoost");
    expect(uiSource).toContain("בוסט התאמה ב־19.99 ש״ח · בקרוב");
    expect(uiSource).toContain("הבוסט אינו מבטיח שההתאמה תאושר");
  });

  it("exposes candidate identity only in the team-protected CRM review queue", () => {
    expect(source).toContain("listReviewQueue: teamProcedure");
    expect(operationsSource).toContain("ההתאמה המוסתרת");
    expect(operationsSource).toContain("trpc.matchBoost.listReviewQueue");
    expect(uiSource).not.toContain("candidate.firstName");
    expect(uiSource).not.toContain("candidate.photoUrl");
  });

  it("starts review from Operations but sends or rejects only through the normal match flow", () => {
    expect(operationsSource).toContain("trpc.matchBoost.startReview");
    expect(operationsSource).toContain("/crm/matchmaking?tab=matches&boostMatchId=");
    expect(operationsSource).not.toContain("trpc.matchmaking.approveMatch");
    expect(operationsSource).not.toContain("trpc.matchmaking.rejectMatch");
    expect(routersSource).toContain('decision: "approved"');
    expect(routersSource).toContain('decision: "rejected"');
  });

  it("updates the boost request and CRM task together after a match decision", () => {
    const syncFunction = source.slice(
      source.indexOf("export async function syncBoostRequestAfterMatchDecision"),
      source.indexOf("async function getVerifiedSingle"),
    );
    expect(syncFunction).toContain("db.transaction");
    expect(syncFunction).toContain("tx.update(matchBoostRequests)");
    expect(syncFunction).toContain("tx.update(crmTeamTasks)");
  });
});
