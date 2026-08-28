import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BOOST_CONSENT_VERSION, buildAnonymousBoostCard, evaluateBoostEligibility } from "./matchBoostRouter";

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

function activeMembership(overrides: Record<string, unknown> = {}) {
  return {
    status: "active",
    consentVersion: BOOST_CONSENT_VERSION,
    algorithmicDisclosureAccepted: true,
    anonymousProfileAccepted: true,
    termsAccepted: true,
    consentedAt: NOW - 1000,
    ...overrides,
  };
}

describe("match boost eligibility", () => {
  it("allows a complete paid active member with a hidden pending candidate", () => {
    const result = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch()],
      membership: activeMembership(),
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
      membership: activeMembership(),
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
      membership: activeMembership(),
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
      membership: activeMembership(),
      boostRequests: [],
      now: NOW,
    });
    expect(active.eligible).toBe(false);
    expect(active.blockers).toContain("יש לך התאמה פעילה כרגע");

    const relationship = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch(), pendingMatch({ id: 103, status: "matched", matchDetailStatus: "relationship" })],
      membership: activeMembership(),
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
      membership: activeMembership(),
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
      membership: activeMembership(),
      boostRequests: [],
      now: NOW,
    });
    expect(available.plusBenefitAvailable).toBe(true);

    const used = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch()],
      plusMember,
      membership: activeMembership(),
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

  it("blocks members without current explicit Boost consent", () => {
    const missing = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch()],
      boostRequests: [],
      now: NOW,
    });
    expect(missing.eligible).toBe(false);
    expect(missing.blockers).toContain("יש להצטרף למסלול Boost ולאשר את תנאי השירות");

    const outdated = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [pendingMatch()],
      membership: activeMembership({ consentVersion: "old-version" }),
      boostRequests: [],
      now: NOW,
    });
    expect(outdated.eligible).toBe(false);
  });
});

describe("match boost privacy and payment gate", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "server/matchBoostRouter.ts"), "utf8");
  const uiSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/UserDashboard.tsx"), "utf8");
  const operationsSource = fs.readFileSync(path.join(process.cwd(), "client/src/components/OperationsSection.tsx"), "utf8");
  const emailSource = fs.readFileSync(path.join(process.cwd(), "server/emailTemplates.ts"), "utf8");
  const whatsappSource = fs.readFileSync(path.join(process.cwd(), "server/matchWhatsApp.ts"), "utf8");
  const paymentSource = fs.readFileSync(path.join(process.cwd(), "server/growPayment.ts"), "utf8");
  const paymentRouterSource = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");
  const webhookSource = fs.readFileSync(path.join(process.cwd(), "server/growWebhook.ts"), "utf8");
  const walletSource = fs.readFileSync(path.join(process.cwd(), "client/src/components/GrowWallet.tsx"), "utf8");
  const termsSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/TermsMatchBoost.tsx"), "utf8");
  const demoSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/MatchBoostDemo.tsx"), "utf8");
  const crmSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");

  it("returns a sanitized anonymous card to the personal area, not candidate identity", () => {
    const publicReturn = source.slice(source.indexOf("return {\n        eligible:"), source.indexOf("redeemPlusBoost:"));
    expect(publicReturn).toContain("candidateCount");
    expect(publicReturn).toContain("topScore");
    expect(publicReturn).toContain("anonymousCard");
    expect(publicReturn).toContain("buildAnonymousBoostCard");
    expect(publicReturn).not.toContain("otherId");

    const card = buildAnonymousBoostCard({
      firstName: "נועה",
      lastName: "בדיקה",
      email: "private@example.com",
      phone: "0501234567",
      photoUrl: "/private-photo.jpg",
      city: "רעננה",
      age: 37,
      occupation: "מנהלת מוצר בהייטק",
      education: "master",
      height: 168,
      maritalStatus: "single",
      hasKids: false,
      smokingStatus: "no",
      religiosity: "traditional",
      wantsKids: "yes",
    }, { score: 86, scoreBreakdown: JSON.stringify({ questionnaire: 90, dna: 82, lifeStage: 88 }) });
    const serialized = JSON.stringify(card);
    expect(card.region).toBe("השרון");
    expect(card.occupation).toBe("טכנולוגיה והנדסה");
    expect(card.reasons.length).toBeGreaterThanOrEqual(3);
    expect(serialized).not.toContain("נועה");
    expect(serialized).not.toContain("בדיקה");
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("0501234567");
    expect(serialized).not.toContain("private-photo.jpg");
    expect(serialized).not.toContain("רעננה");
  });

  it("allows every active database member to opt in with all three explicit consents and records opt-in and opt-out events", () => {
    expect(source).toContain("inviteMember: teamProcedure");
    expect(source).toContain('status: "invited"');
    expect(operationsSource).toContain("פתיחת הזמנה אישית");
    expect(operationsSource).toContain("אינה מצרפת את האדם למסלול");
    expect(source).toContain("joinPool: publicProcedure");
    expect(source).toContain("algorithmicDisclosureAccepted: z.literal(true)");
    expect(source).toContain("anonymousProfileAccepted: z.literal(true)");
    expect(source).toContain("termsAccepted: z.literal(true)");
    expect(source).not.toContain("פיילוט Boost פתוח כרגע בהזמנה אישית בלבד");
    expect(source).toContain('"opted_in"');
    expect(source).toContain('"consent_updated"');
    expect(source).toContain("leavePool: publicProcedure");
    expect(source).toContain('eventType: "opted_out"');
    expect(uiSource).toContain("הצטרפות למסלול Boost");
    expect(uiSource).toContain("שירות נוסף לבחירתכם");
    expect(uiSource).toContain("ניהול או יציאה משירות Boost");
    expect(source).toContain("consentSavedBeforeProfileCompletion");
    expect(source).toContain("profileReadiness.ready ? now : null");
    expect(source).not.toContain("יש להשלים את הפרופיל, התמונה והשאלון המדעי לפני ההצטרפות ל־Boost");
    expect(uiSource).toContain("✓ אישור Boost נשמר בפרופיל");
    expect(uiSource).toContain("האישור וההצטרפות לשירות אינם כרוכים בתשלום נוסף");
    expect(crmSource).toContain("✓ אישור Boost פעיל");
    expect(crmSource).toContain("הופעה בכרטיס אנונימי ושליחת הצעות מותנות בהשלמת הפרופיל ובזכאות תקינה");
  });

  it("opens a one-time 19.99 ILS Grow payment only from the personal Boost card with explicit terms", () => {
    expect(paymentSource).toContain('match_boost:  { description: "Boost - הצעת התאמה אלגוריתמית",');
    expect(paymentSource).toContain("sum: 19.99, paymentNum: 1");
    expect(paymentRouterSource).toContain('"match_boost"');
    expect(paymentRouterSource).toContain("boostTermsAccepted: z.literal(true).optional()");
    expect(paymentRouterSource).toContain("preparePaidBoostCheckout");
    expect(uiSource).not.toContain("const regularPaymentReady = false");
    expect(uiSource).toContain('product="match_boost"');
    expect(uiSource).toContain("שליחת Boost ב־19.99 ₪");
    expect(uiSource).toContain('termsPath="/terms/match-boost"');
    expect(walletSource).toContain('boostTermsAccepted: product === "match_boost" ? true : undefined');
    expect(walletSource).toContain("כולל קבלת הצעות Boost אלגוריתמיות שלא נבדקו ידנית על ידי הילית");
    expect(termsSource).toContain("באישור התקנון מאשרים גם לקבל הצעות Boost אלגוריתמיות");
    expect(source).toContain("הצעת Boost אלגוריתמית, לא נבדקה ידנית על ידי הילית");
    expect(uiSource).toContain("card.disclosure");
  });

  it("revalidates the candidate at payment confirmation and creates a reusable credit if dispatch cannot complete", () => {
    expect(source).toContain("fulfillPaidBoostPayment");
    expect(source).toContain('status: "paid"');
    expect(source).toContain("dispatchAlgorithmicBoostProposal(db, request.id)");
    expect(source).toContain('eq(matches.status, "pending")');
    expect(source).toContain("boost_credit_available:");
    expect(source).toContain("redeemPaidCredit: publicProcedure");
    expect(uiSource).toContain("מימוש קרדיט Boost ללא חיוב נוסף");
    expect(webhookSource).toContain('case "match_boost": await handleMatchBoost');
    expect(webhookSource).toContain('product !== "match_boost" && sum >= 19 && sum <= 21');
  });

  it("provides a clearly labelled non-customer demo of the paid Boost card without opening Grow", () => {
    expect(demoSource).toContain("המחשה בלבד: אין פרטי לקוח ולא מתבצע חיוב");
    expect(demoSource).toContain("שליחת Boost ב־19.99 ₪");
    expect(demoSource).toContain('href="/terms/match-boost"');
    expect(demoSource).not.toContain('product="match_boost"');
    expect(demoSource).not.toContain("questionnaireToken");
  });

  it("never exposes candidate identity in the personal-area Boost card", () => {
    expect(source).toContain("listReviewQueue: teamProcedure");
    expect(uiSource).not.toContain("candidate.firstName");
    expect(uiSource).not.toContain("candidate.photoUrl");
  });

  it("dispatches an included Plus boost automatically without a Hilit approval task", () => {
    const plusFlow = source.slice(source.indexOf("redeemPlusBoost:"), source.indexOf("startPaidBoost:"));
    expect(source).toContain("dispatchAlgorithmicBoostProposal");
    expect(plusFlow).toContain("dispatchAlgorithmicBoostProposal");
    expect(plusFlow).not.toContain("tx.insert(crmTeamTasks)");
    expect(source).toContain('proposalSource: "boost"');
    expect(source).toContain('ownerApprovedAt: null');
    expect(source).toContain('decisionReason: "algorithmic_boost_auto_dispatch"');
  });

  it("labels Boost email and WhatsApp as algorithmic and hides name and photo until mutual consent", () => {
    expect(emailSource).toContain('proposalSource?: "manual" | "boost"');
    expect(emailSource).toContain("לא נבדקה ולא אושרה ידנית על ידי הילית");
    expect(emailSource).toContain("!isBoost && params.matchPhotoUrl");
    expect(emailSource).toContain('isBoost ? "כרטיס התאמה אנונימי" : params.matchFirstName');
    expect(whatsappSource).toContain('proposalSource === "boost"');
    expect(whatsappSource).toContain("הצעת Boost אלגוריתמית");
    expect(whatsappSource).toContain("לא נבדקה ידנית על ידי הילית");
  });
});
