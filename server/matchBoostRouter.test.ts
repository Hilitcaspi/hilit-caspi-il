import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BOOST_CANDIDATE_NOTE_MARKER, BOOST_CONSENT_VERSION, MIN_BOOST_SCORE, buildAnonymousBoostCard, createBoostCheckoutReference, evaluateBoostEligibility, parseBoostCheckoutReference, selectOnDemandBoostCandidates } from "./matchBoostRouter";

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
  it("signs the prepared checkout to the exact request and member and rejects tampering", () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "boost-checkout-test-secret";
    try {
      const reference = createBoostCheckoutReference(321, 654);
      expect(parseBoostCheckoutReference(reference)).toEqual({ requestId: 321, singleId: 654 });
      expect(parseBoostCheckoutReference(reference.replace("321", "322"))).toBeNull();
      expect(parseBoostCheckoutReference("invalid.reference")).toBeNull();
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });

  it("creates at most six on-demand choices from mutually consented, recent, eligible members", () => {
    const single = completeSingle({ seekingGender: "male", religiosity: "secular" });
    const candidateProfiles = Array.from({ length: 10 }, (_, index) => completeSingle({
      id: 20 + index,
      email: `candidate-${index}@example.com`,
      gender: "male",
      seekingGender: "female",
      height: 180,
      religiosity: "secular",
    }));
    const memberships = candidateProfiles.map((candidate, index) => ({
      ...activeMembership(),
      singleId: candidate.id,
      lastActiveAt: index === 1 ? NOW - 91 * 24 * 60 * 60 * 1000 : NOW - 1000,
    }));
    const options = selectOnDemandBoostCandidates({
      single,
      candidateProfiles,
      memberships,
      answersBySingle: new Map(),
      existingCandidateIds: new Set([20]),
      now: NOW,
    });
    expect(options).toHaveLength(6);
    expect(options.map(option => option.candidate.id)).not.toContain(20);
    expect(options.map(option => option.candidate.id)).not.toContain(21);
    expect(options.every(option => option.score >= MIN_BOOST_SCORE)).toBe(true);
    expect(options.map(option => option.score)).toEqual([...options.map(option => option.score)].sort((a, b) => b - a));
  });

  it("opens Boost choices at 60 percent and excludes scores below the threshold", () => {
    expect(MIN_BOOST_SCORE).toBe(60);
    const result = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [
        pendingMatch({ id: 301, score: 59 }),
        pendingMatch({ id: 302, score: 60 }),
        pendingMatch({ id: 303, score: 78 }),
      ],
      membership: activeMembership(),
      boostRequests: [],
      now: NOW,
    });
    expect(result.eligible).toBe(true);
    expect(result.candidates.map(candidate => candidate.id)).toEqual([303, 302]);
  });

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

  it("keeps multiple eligible Boost options sorted by score for an explicit card choice", () => {
    const result = evaluateBoostEligibility({
      single: completeSingle(),
      memberMatches: [
        pendingMatch({ id: 201, score: 74 }),
        pendingMatch({ id: 202, score: 91 }),
        pendingMatch({ id: 203, score: 83 }),
      ],
      membership: activeMembership(),
      boostRequests: [],
      now: NOW,
    });
    expect(result.eligible).toBe(true);
    expect(result.candidateCount).toBe(3);
    expect(result.candidates.map(candidate => candidate.id)).toEqual([202, 203, 201]);
    expect(result.topScore).toBe(91);
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
  const landingSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/MatchBoostLanding.tsx"), "utf8");
  const responseSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/MatchRespond.tsx"), "utf8");
  const silhouetteSource = fs.readFileSync(path.join(process.cwd(), "client/src/components/AnonymousBoostSilhouette.tsx"), "utf8");
  const thankYouSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/ThankYouMatchBoost.tsx"), "utf8");
  const routersSource = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");
  const crmSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");
  const automationSource = fs.readFileSync(path.join(process.cwd(), "server/automation.ts"), "utf8");
  const boostCardSource = uiSource.slice(uiSource.indexOf("function MatchBoostCard"), uiSource.indexOf("function DnaSection"));

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
    expect(BOOST_CONSENT_VERSION).toBe("2026-08-29-v2");
    expect(source).toContain("membership.consentVersion === BOOST_CONSENT_VERSION");
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
    expect(uiSource).toContain("האישור וההצטרפות ל־Boost אינם כרוכים בתשלום");
    expect(uiSource).toContain("השם, התמונה ופרטי הפרופיל יישלחו לשני הצדדים במייל");
    expect(landingSource).toContain("פרטי הקשר נשלחים רק לאחר ששני הצדדים מאשרים");
    expect(uiSource).not.toContain("במערכת וב־CRM");
    expect(crmSource).toContain("✓ אישור Boost פעיל");
    expect(crmSource).toContain("הופעה בכרטיס אנונימי ושליחת הצעות מותנות בהשלמת הפרופיל ובזכאות תקינה");
  });

  it("opens a one-time 19.90 ILS Grow payment only from the selected personal Boost card with explicit terms", () => {
    expect(paymentSource).toContain('match_boost:  { description: "Boost - הצעת התאמה אלגוריתמית",');
    expect(paymentSource).toContain("sum: 19.90, paymentNum: 1");
    expect(paymentRouterSource).toContain('"match_boost"');
    expect(paymentRouterSource).toContain("boostTermsAccepted: z.literal(true).optional()");
    expect(paymentRouterSource).toContain("preparePaidBoostCheckout");
    expect(uiSource).not.toContain("const regularPaymentReady = false");
    expect(uiSource).toContain('product="match_boost"');
    expect(uiSource).toContain("שליחת Boost | 19.90 ₪");
    expect(boostCardSource.match(/19\.90/g)).toHaveLength(1);
    expect(uiSource).toContain("boostMatchId={option.matchId}");
    expect(source).toContain("eligibility.candidates.find((candidate: any) => candidate.id === input.matchId)");
    expect(boostCardSource).not.toContain("Plus חודשי");
    expect(boostCardSource).not.toContain("במערכת וב־CRM");
    expect(uiSource).toContain('termsPath="/terms/match-boost"');
    expect(walletSource).toContain('boostTermsAccepted: product === "match_boost" ? true : undefined');
    expect(walletSource).toContain("שליחת שם, תמונה ופרטי פרופיל לשני הצדדים בעת שליחת ההצעה");
    expect(termsSource).toContain("התשלום אינו מהווה אישור של ההתאמה מצד המשלם");
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
    expect(uiSource).toContain("מימוש קרדיט ושליחת Boost");
    expect(webhookSource).toContain('case "match_boost": await handleMatchBoost');
    expect(webhookSource).toContain('product !== "match_boost" && sum >= 19 && sum <= 21');
    expect(source).toContain("checkoutReference?: string");
    expect(source).toContain("parseBoostCheckoutReference(input.checkoutReference)");
    expect(source).toContain("if (!request && !input.checkoutReference)");
  });

  it("generates anonymous pending choices without sending messages or charging and hides them from Hilit's regular queue", () => {
    const generationSource = source.slice(source.indexOf("async function ensureBoostCandidatesForSingle"), source.indexOf("const EDUCATION_LABELS"));
    const routersSource = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");
    expect(source).toContain("refreshOptions: publicProcedure");
    expect(source).toContain(BOOST_CANDIDATE_NOTE_MARKER);
    expect(generationSource).toContain('status: "pending"');
    expect(generationSource).not.toContain("sendEmail(");
    expect(generationSource).not.toContain("sendInitialMatchWhatsAppsOnce(");
    expect(generationSource).not.toContain("preparePaidBoostCheckout(");
    expect(routersSource).toContain("notLike(matches.notes, `%${BOOST_CANDIDATE_NOTE_MARKER}%`)");
    expect(boostCardSource).toContain("didRefreshOptionsRef");
    expect(boostCardSource).toContain("refreshOptions.mutate({ email, token })");
    expect(boostCardSource).toContain("אין כרגע אפשרויות Boost זמינות");
  });

  it("provides a clearly labelled non-customer demo of the paid Boost card without opening Grow", () => {
    expect(demoSource).toContain("המחשה בלבד: אין פרטי לקוח ולא מתבצע חיוב");
    expect(demoSource).toContain("שליחת Boost | 19.90 ₪");
    expect(demoSource).toContain('href="/terms/match-boost"');
    expect(demoSource).not.toContain('product="match_boost"');
    expect(demoSource).not.toContain("questionnaireToken");
    expect(demoSource).toContain("התשלום אינו אישור להתאמה");
    expect(demoSource).toContain("כפתורי אישור");
    expect(demoSource).not.toContain("השלמת התשלום מהווה אישור שלך");
  });

  it("keeps the 60 percent eligibility rule without highlighting it in the personal-area sales copy", () => {
    expect(source).toContain("MIN_BOOST_SCORE = 60");
    expect(boostCardSource).not.toContain("60% ומעלה");
    expect(boostCardSource).toContain("השם והתמונה מוסתרים כדי לשמור על הפרטיות");
    expect(demoSource).not.toContain("60% ומעלה");
    expect(`${boostCardSource}\n${landingSource}\n${demoSource}`).not.toContain("לפי המחקרים");
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

  it("labels Boost as algorithmic while sending name and photo to both sides for separate approval", () => {
    expect(emailSource).toContain('proposalSource?: "manual" | "boost"');
    expect(emailSource).toContain('boostRole?: "sender" | "recipient"');
    expect(emailSource).toContain("בקשת ה־Boost שלך נשלחה ומחכה לאישור שלך");
    expect(emailSource).toContain("נשלחה אליך התאמת Boost שמחכה לאישור שלך");
    expect(emailSource).toContain("התשלום ושליחת ה־Boost אינם אישור להתאמה");
    expect(emailSource).toContain("לא נבחרה או נבדקה אישית על ידי הילית");
    expect(emailSource).toContain("${params.matchPhotoUrl ?");
    expect(source).toContain("matchPhotoUrl: partyB.photoUrl ?? undefined");
    expect(source).toContain("matchPhotoUrl: partyA.photoUrl ?? undefined");
    expect(whatsappSource).toContain('proposalSource === "boost"');
    expect(whatsappSource).toContain("בקשת ה־Boost שלך");
    expect(whatsappSource).toContain("נשלחה אליך התאמת Boost מיוחדת");
    expect(whatsappSource).toContain("לא נבחרה או נבדקה אישית על ידי הילית");
    expect(automationSource).toContain('proposalSource: isBoost ? "boost" : "regular"');
    expect(emailSource).toContain('proposalSource?: "regular" | "boost"');
    expect(emailSource).toContain("התאמת ה־Boost עדיין ממתינה לאישור שלך");
    expect(emailSource).not.toContain("לפני שבוע שלחתי לך הצעה: ${params.matchFirstName}");
  });

  it("requires separate approval from both Boost sides and shows the full profile without contact details", () => {
    expect(source).toContain("approvedByA: false");
    expect(source).toContain("approvedByB: false");
    expect(source).toContain("tokenAUsedAt: null");
    expect(source).toContain("tokenBUsedAt: null");
    expect(source).toContain("boostSenderSide: senderIsA ? \"A\" : \"B\"");
    expect(routersSource).toContain("buildAnonymousBoostCard(partner, match, me)");
    expect(routersSource).toContain("photoUrl: partner.photoUrl");
    expect(routersSource).toContain("isAnonymous: false");
    expect(responseSource).toContain("קיבלת התאמת Boost");
    expect(responseSource).toContain("התשלום ושליחת ה־Boost אינם אישור להתאמה");
    expect(routersSource).toContain('reason: "boost_participant_declined"');
    expect(source).toContain('["paid", "queued", "reviewing", "approved"] as const');
  });

  it("uses an anonymous silhouette instead of a question mark and confirms reveal only after mutual consent", () => {
    expect(silhouetteSource).toContain("צללית אנונימית");
    expect(silhouetteSource).toContain("התמונה תישלח לשני הצדדים במייל לאחר שליחת Boost");
    expect(boostCardSource).toContain("AnonymousBoostSilhouette");
    expect(boostCardSource).not.toContain('blur-[1px]\">?</div>');
    expect(boostCardSource).toContain("למה האלגוריתם מצא כאן פוטנציאל");
    expect(boostCardSource).toContain("group-open:rotate-180");
    expect(boostCardSource).toContain("פתחו לפרטים האנונימיים ולסיבות ההתאמה");
    expect(boostCardSource).not.toContain("מה כדאי לקחת בחשבון");
    expect(boostCardSource).toContain("card.participationReason");
    expect(uiSource).toContain("preferredPendingMatches.length > 0 ? preferredPendingMatches : allPendingMatches");
    expect(thankYouSource).toContain("שלחת Boost");
    expect(thankYouSource).toContain("התשלום אינו אישור להתאמה");
    expect(boostCardSource).toContain("טוענים את אפשרויות ה־Boost");
    expect(boostCardSource).toContain("לא הצלחנו לטעון את Boost כרגע");
  });

  it("shows the waiting banner while one or both Boost sides still need to respond", () => {
    expect(source).toContain('latestRequestMatch?.status === "proposed"');
    expect(source).toContain("!latestRequestMatch?.returnedToPoolAt");
    expect(source).toContain("!(Boolean(latestRequestMatch?.approvedByA) && Boolean(latestRequestMatch?.approvedByB))");
    expect(source).toContain("awaitingRecipientResponse");
    expect(boostCardSource).toContain("status.awaitingRecipientResponse");
    expect(boostCardSource).not.toContain('status.latestRequest?.status === "approved"');
  });

  it("matches the refund terms to delivery, rejection and automatic credit behavior", () => {
    expect(termsSource).toContain("דחייה של הצד השני, אי־תגובה, פקיעת ההצעה");
    expect(termsSource).toContain("אינם מזכים בהחזר כספי");
    expect(termsSource).toContain("הכול בכפוף לזכויות שלא ניתן להתנות עליהן לפי דין");
    expect(termsSource).toContain("עומדות 48 שעות להגיב");
    expect(termsSource).toContain("נשמר אוטומטית קרדיט Boost");
    expect(termsSource).toContain("חיוב כפול");
    expect(source).toContain("bothSidesReceivedAtLeastOneChannel");
    expect(source).toContain("boost_recipient_delivery_failed");
    expect(source).toContain("boost_credit_available:");
    expect(source).toContain('status: "reviewing"');
    expect(source).toContain('status: "approved"');
  });
});
