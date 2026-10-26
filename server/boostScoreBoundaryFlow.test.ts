import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  computeFullScore: vi.fn(),
  sendEmail: vi.fn(),
  sendInitialMatchSmsOnce: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./compatibility", async importOriginal => {
  const actual = await importOriginal<typeof import("./compatibility")>();
  return { ...actual, computeFullScore: mocks.computeFullScore };
});
vi.mock("./brevo", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./matchSms", () => ({ sendInitialMatchSmsOnce: mocks.sendInitialMatchSmsOnce }));

import {
  BOOST_CONSENT_VERSION,
  ensureBoostCandidatesForSingle,
  fulfillPaidBoostPayment,
  matchBoostRouter,
  selectOnDemandBoostCandidates,
  selectOnDemandRegularCandidates,
} from "./matchBoostRouter";

const NOW = Date.parse("2026-10-26T12:00:00.000Z");
const BOOST_MARKER = "[BOOST_CANDIDATE]";

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    firstName: "Dana",
    lastName: "Synthetic",
    email: "dana@example.com",
    phone: "0500000000",
    gender: "female",
    seekingGender: "male",
    age: 35,
    city: "Tel Aviv",
    height: 168,
    occupation: "QA",
    religiosity: "secular",
    about: "Synthetic profile with enough detail for deterministic tests",
    partnerDescription: "Synthetic partner description",
    photoUrl: "/synthetic.jpg",
    dnaType: "anchor",
    questionnaireCompletedAt: NOW - 1_000,
    createdAt: NOW - 90 * 24 * 60 * 60 * 1_000,
    isActive: true,
    isPaid: true,
    isSeed: false,
    consentMatchmaking: true,
    questionnaireToken: "synthetic-personal-token-123456",
    ...overrides,
  };
}

function membership(singleId: number) {
  return {
    singleId,
    status: "active",
    consentVersion: BOOST_CONSENT_VERSION,
    algorithmicDisclosureAccepted: true,
    anonymousProfileAccepted: true,
    termsAccepted: true,
    consentedAt: NOW - 1_000,
    lastActiveAt: NOW - 1_000,
  };
}

function candidate(id: number) {
  return member({
    id,
    firstName: `Candidate ${id}`,
    email: `candidate-${id}@example.com`,
    gender: "male",
    seekingGender: "female",
    height: 180,
  });
}

function scoreBreakdown(total: number) {
  return {
    total,
    algorithm: "synthetic",
    questionnaire: 80,
    lifeStage: 80,
    dna: 80,
    practical: 80,
    religiosity: 80,
    education: 80,
    interactionBonus: 0,
    astrologyBonus: 0,
    textBonus: 0,
    cityIntelligence: 80,
    details: [],
  };
}

function publicContext(): TrpcContext {
  return {
    user: null,
    teamMember: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function chain(rows: unknown[]) {
  const query: any = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(rows)),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason?: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
  };
  return query;
}

function selectionInput() {
  const profiles = [59, 60, 79, 79.5, 80, 86, 91, NaN].map((score, index) => ({
    profile: candidate(21 + index),
    score,
  }));
  mocks.computeFullScore.mockImplementation((_a: unknown, b: { id: number }) =>
    scoreBreakdown(profiles.find(row => row.profile.id === b.id)!.score),
  );
  return {
    profiles,
    input: {
      single: member(),
      candidateProfiles: profiles.map(row => row.profile),
      memberships: profiles.map(row => membership(row.profile.id)),
      answersBySingle: new Map(),
      now: NOW,
    },
  };
}

/** A strict scripted Drizzle-shaped mock used only for candidate creation. */
function creationDb(rows: unknown[][]) {
  const inserts: Array<Record<string, unknown>> = [];
  let selectIndex = 0;
  const db: any = {
    select: vi.fn(() => chain(rows[selectIndex++] ?? [])),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })) })),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push(values);
        return Promise.resolve([{ insertId: inserts.length }]);
      }),
    })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })),
  };
  return { db, inserts };
}

/** Context loading is read-only until a candidate is admitted by the 60–79 policy. */
function highCandidateContextDb(requests: unknown[] = []) {
  const owner = member();
  const highMatch = {
    id: 80,
    singleId: owner.id,
    singleAId: owner.id,
    singleBId: 20,
    status: "pending",
    score: 80,
    notes: `${BOOST_MARKER} historic high pending`,
    matchDetailStatus: null,
    returnedToPoolAt: null,
    createdAt: NOW,
  };
  const candidateProfile = candidate(20);
  const selectRows = [
    [owner],
    [highMatch],
    [{ status: "active", billingStatus: "active", billingCycleStartedAt: NOW - 1_000 }],
    requests,
    [membership(owner.id)],
    [],
    [candidateProfile],
    [],
    [membership(candidateProfile.id)],
  ];
  const writes = { inserts: 0, updates: 0, transactions: 0 };
  let selectIndex = 0;
  const db: any = {
    select: vi.fn(() => chain(selectRows[selectIndex++] ?? [])),
    insert: vi.fn(() => {
      writes.inserts += 1;
      return { values: vi.fn() };
    }),
    update: vi.fn(() => {
      writes.updates += 1;
      return { set: vi.fn(() => ({ where: vi.fn() })) };
    }),
    transaction: vi.fn(async () => {
      writes.transactions += 1;
    }),
  };
  return { db, writes };
}

function paymentDb(existingByTransaction: unknown[] = []) {
  const owner = member();
  const request: any = {
    id: 71,
    singleId: owner.id,
    matchId: 80,
    source: "paid",
    status: "awaiting_payment",
    amountAgorot: 1990,
    fulfilledAt: null,
  };
  const highPending = {
    id: 80,
    singleAId: owner.id,
    singleBId: 20,
    status: "pending",
    score: 80,
    notes: `${BOOST_MARKER} historic high pending`,
    returnedToPoolAt: null,
  };
  const rows = [[owner], existingByTransaction, [request], [request], [highPending], [request]];
  let selectIndex = 0;
  const patches: Array<Record<string, unknown>> = [];
  const db: any = {
    select: vi.fn(() => chain(rows[selectIndex++] ?? [])),
    update: vi.fn(() => ({
      set: vi.fn((patch: Record<string, unknown>) => ({
        where: vi.fn(async () => {
          patches.push(patch);
          Object.assign(request, patch);
          return [{ affectedRows: 1 }];
        }),
      })),
    })),
    transaction: vi.fn(),
  };
  return { db, patches, request };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendEmail.mockResolvedValue({ success: true });
  mocks.sendInitialMatchSmsOnce.mockResolvedValue({ sentA: true, sentB: true });
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("network forbidden in boundary tests"); }));
});

describe("Boost score boundary candidate flows", () => {
  it("partitions deterministic mutually eligible candidates into Boost 60–79 and regular owner-review 80+ lanes", () => {
    const { input } = selectionInput();
    const boost = selectOnDemandBoostCandidates(input);
    const regular = selectOnDemandRegularCandidates(input);

    expect(boost.map(row => [row.candidate.id, row.score])).toEqual([[23, 79], [22, 60]]);
    expect(regular.map(row => [row.candidate.id, row.score])).toEqual([[27, 91], [26, 86], [25, 80]]);
    expect([...boost, ...regular].map(row => row.candidate.id)).not.toContain(21);
    expect([...boost, ...regular].map(row => row.candidate.id)).not.toContain(24);
    expect([...boost, ...regular].map(row => row.candidate.id)).not.toContain(28);
  });

  it("creates distinct unsent Boost and regular-review drafts with exact marker, score, and source", async () => {
    const { profiles } = selectionInput();
    const ownMembership = membership(10);
    const creationRows: unknown[][] = [
      [],
      [ownMembership],
      [],
      [ownMembership, ...profiles.map(row => membership(row.profile.id))],
      profiles.map(row => row.profile),
      [],
      [],
      [], [{ id: 1 }],
      [], [{ id: 2 }],
      [], [{ id: 3 }],
      [], [{ id: 4 }],
      [], [{ id: 5 }],
    ];
    const harness = creationDb(creationRows);

    await expect(ensureBoostCandidatesForSingle(harness.db, member(), NOW)).resolves.toBe(5);
    expect(harness.db.delete).not.toHaveBeenCalled();
    expect(harness.inserts.map(row => ({ score: row.score, notes: row.notes }))).toEqual([
      { score: 79, notes: expect.stringMatching(/^\[BOOST_CANDIDATE\]/) },
      { score: 60, notes: expect.stringMatching(/^\[BOOST_CANDIDATE\]/) },
      { score: 91, notes: expect.stringMatching(/^\[REGULAR_REVIEW\]/) },
      { score: 86, notes: expect.stringMatching(/^\[REGULAR_REVIEW\]/) },
      { score: 80, notes: expect.stringMatching(/^\[REGULAR_REVIEW\]/) },
    ]);
    expect(harness.inserts.map(row => JSON.parse(String(row.scoreBreakdown)).source)).toEqual([
      "boost_on_demand",
      "boost_on_demand",
      "regular_review_on_demand",
      "regular_review_on_demand",
      "regular_review_on_demand",
    ]);
  });

  it("rejects a supplied 80-point id before Plus, paid checkout, or credit redemption can write or contact a provider", async () => {
    const highCredit = [{
      id: 9,
      source: "paid",
      status: "refunded",
      decisionReason: "boost_credit_available: high score rejected",
    }];
    for (const action of ["redeemPlusBoost", "startPaidBoost", "redeemPaidCredit"] as const) {
      const harness = highCandidateContextDb(action === "redeemPaidCredit" ? highCredit : []);
      mocks.getDb.mockResolvedValue(harness.db);
      const caller = matchBoostRouter.createCaller(publicContext());
      const input = { email: "dana@example.com", token: "synthetic-personal-token-123456", matchId: 80, entryChannel: "personal_area" as const };
      const attempt = action === "startPaidBoost"
        ? caller.startPaidBoost({ ...input, termsAccepted: true })
        : caller[action](input);
      await expect(attempt).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(harness.writes).toEqual({ inserts: 0, updates: 0, transactions: 0 });
    }
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendInitialMatchSmsOnce).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("turns a paid callback for a current high pending draft into a reusable credit without delivery", async () => {
    const harness = paymentDb();
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(fulfillPaidBoostPayment({
      email: "dana@example.com",
      transactionId: "synthetic-transaction-71",
      amountAgorot: 1990,
    })).resolves.toEqual({
      success: true,
      delivered: false,
      creditAvailable: true,
      requestId: 71,
      alreadyProcessed: false,
    });

    expect(harness.patches[0]).toMatchObject({ status: "paid", providerTransactionId: "synthetic-transaction-71" });
    expect(harness.patches[1]).toMatchObject({ status: "refunded", expiresAt: null });
    expect(String(harness.patches[1]?.decisionReason)).toContain("boost_credit_available:");
    expect(harness.db.transaction).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendInitialMatchSmsOnce).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps an already approved historical high-score request idempotent without relabeling or redelivery", async () => {
    const historical = [{
      id: 72,
      singleId: 10,
      matchId: 80,
      source: "paid",
      status: "approved",
      fulfilledAt: NOW - 1_000,
    }];
    const harness = paymentDb(historical);
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(fulfillPaidBoostPayment({
      email: "dana@example.com",
      transactionId: "historical-high-transaction",
      amountAgorot: 1990,
    })).resolves.toEqual({
      success: true,
      delivered: true,
      creditAvailable: false,
      requestId: 72,
      alreadyProcessed: true,
    });

    expect(harness.patches).toEqual([]);
    expect(harness.db.transaction).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendInitialMatchSmsOnce).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
