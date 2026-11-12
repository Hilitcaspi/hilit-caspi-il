import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { SQL } from "drizzle-orm";
import { singles, type Match } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import type { recordMatchDecision } from "./matchDecision";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  recordMatchDecision: vi.fn(),
  sendEmail: vi.fn(),
  notifyOwner: vi.fn(),
  syncBoost: vi.fn(),
  ensureFeedback: vi.fn(),
  consolation: vi.fn(),
  reveal: vi.fn(),
  sendSMS: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./matchDecision", async importOriginal => ({
  ...(await importOriginal<typeof import("./matchDecision")>()),
  recordMatchDecision: mocks.recordMatchDecision,
}));
vi.mock("./brevo", async importOriginal => ({
  ...(await importOriginal<typeof import("./brevo")>()),
  sendEmail: mocks.sendEmail,
}));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./vibrate", async importOriginal => ({
  ...(await importOriginal<typeof import("./vibrate")>()),
  sendSMS: mocks.sendSMS,
}));
vi.mock("./matchBoostRouter", async importOriginal => ({
  ...(await importOriginal<typeof import("./matchBoostRouter")>()),
  syncBoostRequestAfterMatchDecision: mocks.syncBoost,
}));
vi.mock("./feedbackAutomation", async importOriginal => ({
  ...(await importOriginal<typeof import("./feedbackAutomation")>()),
  ensurePositiveFeedbackRequest: mocks.ensureFeedback,
}));
vi.mock("./emailTemplates", async importOriginal => ({
  ...(await importOriginal<typeof import("./emailTemplates")>()),
  buildConsolationEmail: mocks.consolation,
  buildContactRevealEmail: mocks.reveal,
}));
import { appRouter } from "./routers";

type DecisionResult = Awaited<ReturnType<typeof recordMatchDecision>>;
const NOW = 1_800_000_000_000;
const SIDES = ["A", "B"] as const;
const participants = [
  {
    id: 101,
    firstName: "Synthetic A",
    email: "participant-a@example.test",
    phone: "0500000001",
    gender: "female",
    age: 35,
    city: "QA",
    questionnaireToken: "qa-a",
  },
  {
    id: 102,
    firstName: "Synthetic B",
    email: "participant-b@example.test",
    phone: "0500000002",
    gender: "male",
    age: 36,
    city: "QA",
    questionnaireToken: "qa-b",
  },
];
const matchRow = (overrides: Partial<Match> = {}): Match =>
  ({
    id: 41,
    singleAId: 101,
    singleBId: 102,
    score: 80,
    status: "rejected",
    approvedByA: false,
    approvedByB: false,
    tokenAUsedAt: null,
    tokenBUsedAt: NOW - 100,
    autoExplanation: null,
    notes: null,
    ...overrides,
  }) as Match;
const context = (): TrpcContext =>
  ({
    user: null,
    teamMember: null,
    req: { protocol: "https", headers: {} },
    res: {},
  }) as TrpcContext;
const caller = () => appRouter.createCaller(context()).matchmaking;

function fakeDb(rows = participants) {
  const ids: unknown[] = [];
  const dialect = new MySqlDialect();
  const select = vi.fn(() => ({
    from: (table: unknown) => {
      expect(table).toBe(singles);
      return {
        where: (predicate: SQL) => ({
          limit: async (limit: number) => {
            expect(limit).toBe(1);
            const [id] = dialect.sqlToQuery(predicate).params;
            ids.push(id);
            return rows.filter(person => person.id === id);
          },
        }),
      };
    },
  }));
  const forbidden = vi.fn(() => {
    throw new Error(
      "Router must delegate all decision writes to recordMatchDecision"
    );
  });
  return {
    db: { select, update: forbidden, transaction: forbidden },
    ids,
    select,
    forbidden,
  };
}
function decision(result: DecisionResult) {
  mocks.recordMatchDecision.mockResolvedValue(result);
}
function feedback(
  isA: boolean,
  overrides: Partial<Match> = {}
): DecisionResult {
  return {
    kind: "recorded",
    match: matchRow(overrides),
    isA,
    lateFeedback: true,
    becameMatched: false,
    status: "rejected",
  };
}
function expectNoRevealEffects() {
  expect(mocks.reveal).not.toHaveBeenCalled();
  expect(mocks.ensureFeedback).not.toHaveBeenCalled();
  expect(mocks.notifyOwner).not.toHaveBeenCalled();
  expect(mocks.syncBoost).not.toHaveBeenCalled();
  expect(mocks.sendSMS).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Live providers forbidden");
    })
  );
  mocks.sendEmail.mockResolvedValue({ success: true });
  mocks.notifyOwner.mockResolvedValue(true);
  mocks.ensureFeedback.mockResolvedValue(null);
  mocks.syncBoost.mockResolvedValue(undefined);
  mocks.consolation.mockReturnValue({
    subject: "Synthetic consolation",
    htmlBody: "Synthetic consolation only",
  });
  mocks.reveal.mockReturnValue({
    subject: "Synthetic contact reveal",
    htmlBody: "Synthetic contact reveal",
  });
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("matchmaking.respondToMatch decision integration", () => {
  it.each(
    SIDES.flatMap(side => [
      { side, source: "regular", overrides: {} },
      {
        side,
        source: "boost explanation",
        overrides: { autoExplanation: "[BOOST] synthetic" },
      },
      {
        side,
        source: "boost notes",
        overrides: { notes: "[BOOST_SENT] synthetic" },
      },
    ])
  )(
    "late yes from $side ($source) sends consolation only to the responder",
    async ({ side, overrides }) => {
      const h = fakeDb();
      mocks.getDb.mockResolvedValue(h.db);
      decision(feedback(side === "A", overrides));
      const result = await caller().respondToMatch({
        token: `synthetic-${side}`,
        response: "yes",
      });
      const responder = participants[side === "A" ? 0 : 1]!;
      expect(result).toEqual({
        success: true,
        closed: true,
        lateFeedback: true,
        status: "rejected",
      });
      expect(mocks.recordMatchDecision).toHaveBeenCalledOnce();
      expect(mocks.recordMatchDecision).toHaveBeenCalledWith(
        h.db,
        `synthetic-${side}`,
        "yes"
      );
      expect(h.ids).toEqual([responder.id]);
      expect(mocks.consolation).toHaveBeenCalledOnce();
      expect(mocks.consolation).toHaveBeenCalledWith({
        firstName: responder.firstName,
        recipientEmail: responder.email,
        singleId: responder.id,
      });
      expect(mocks.sendEmail).toHaveBeenCalledOnce();
      expect(mocks.sendEmail).toHaveBeenCalledWith({
        to: { email: responder.email, name: responder.firstName },
        subject: "Synthetic consolation",
        htmlContent: "Synthetic consolation only",
      });
      expectNoRevealEffects();
      expect(h.forbidden).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty("partner");
      expect(result).not.toHaveProperty("bothApproved");
    }
  );

  it.each(SIDES)(
    "late no from %s has no delivery, boost sync, or contact reveal effects",
    async side => {
      const h = fakeDb();
      mocks.getDb.mockResolvedValue(h.db);
      decision(
        feedback(side === "A", {
          autoExplanation: "[BOOST] synthetic",
          notes: "[BOOST_SENT] synthetic",
        })
      );
      expect(
        await caller().respondToMatch({
          token: `synthetic-${side}`,
          response: "no",
        })
      ).toEqual({
        success: true,
        closed: true,
        lateFeedback: true,
        status: "rejected",
      });
      expect(h.select).not.toHaveBeenCalled();
      expect(mocks.consolation).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expectNoRevealEffects();
      expect(h.forbidden).not.toHaveBeenCalled();
    }
  );

  it.each(["missing recipient", "recipient without email"])(
    "late yes remains successful for a %s without emailing the decliner",
    async situation => {
      const h = fakeDb(
        situation === "missing recipient"
          ? []
          : [{ ...participants[0]!, email: "" }]
      );
      mocks.getDb.mockResolvedValue(h.db);
      decision(feedback(true));
      expect(
        await caller().respondToMatch({ token: "synthetic-A", response: "yes" })
      ).toMatchObject({
        success: true,
        lateFeedback: true,
        status: "rejected",
      });
      expect(h.ids).toEqual([101]);
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.consolation).not.toHaveBeenCalled();
      expectNoRevealEffects();
    }
  );

  it("keeps feedback successful if the fire-and-forget consolation email fails", async () => {
    const h = fakeDb();
    mocks.getDb.mockResolvedValue(h.db);
    mocks.sendEmail.mockRejectedValueOnce(
      new Error("synthetic provider failure")
    );
    decision(feedback(true));
    expect(
      await caller().respondToMatch({ token: "synthetic-A", response: "yes" })
    ).toMatchObject({ success: true, closed: true, lateFeedback: true });
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expectNoRevealEffects();
  });

  it.each(["matched", "rejected"] as const)(
    "truthfully reports an unused token on %s as closed, not already responded",
    async status => {
      const h = fakeDb();
      mocks.getDb.mockResolvedValue(h.db);
      decision({ kind: "closed", isA: true, match: matchRow({ status }) });
      expect(
        await caller().respondToMatch({
          token: "unused-token",
          response: "yes",
        })
      ).toEqual({ alreadyResponded: false, closed: true, status });
      expect(h.select).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expectNoRevealEffects();
    }
  );

  it.each(["matched", "rejected", "expired"] as const)(
    "truthfully reports a used token on %s as already responded",
    async status => {
      const h = fakeDb();
      mocks.getDb.mockResolvedValue(h.db);
      decision({
        kind: "already",
        isA: true,
        match: matchRow({ status, tokenAUsedAt: NOW - 10 }),
      });
      expect(
        await caller().respondToMatch({ token: "used-token", response: "no" })
      ).toEqual({ alreadyResponded: true, status });
      expect(h.select).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expectNoRevealEffects();
    }
  );

  it.each([
    { kind: "invalid" as const, code: "NOT_FOUND", message: "קישור לא תקין" },
    {
      kind: "expired" as const,
      code: "BAD_REQUEST",
      message: "הקישור פג תוקף",
    },
  ])(
    "returns a truthful $kind error without side effects",
    async ({ kind, code, message }) => {
      const h = fakeDb();
      mocks.getDb.mockResolvedValue(h.db);
      decision(
        kind === "invalid" ? { kind } : { kind, isA: true, match: matchRow() }
      );
      await expect(
        caller().respondToMatch({ token: "synthetic-token", response: "yes" })
      ).rejects.toMatchObject({ code, message });
      expect(h.select).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expectNoRevealEffects();
    }
  );

  it("fails closed when the database is unavailable before recording or sending", async () => {
    mocks.getDb.mockResolvedValue(null);
    await expect(
      caller().respondToMatch({ token: "synthetic-token", response: "yes" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mocks.recordMatchDecision).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expectNoRevealEffects();
  });

  it("propagates decision persistence failure before sending anything", async () => {
    const h = fakeDb();
    mocks.getDb.mockResolvedValue(h.db);
    mocks.recordMatchDecision.mockRejectedValueOnce(
      new Error("synthetic persistence failure")
    );
    await expect(
      caller().respondToMatch({ token: "synthetic-token", response: "yes" })
    ).rejects.toThrow("synthetic persistence failure");
    expect(h.select).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expectNoRevealEffects();
  });

  it("does not reveal contacts merely because a snapshot has both approvals without becameMatched", async () => {
    const h = fakeDb();
    mocks.getDb.mockResolvedValue(h.db);
    decision({
      kind: "recorded",
      isA: true,
      match: matchRow({
        status: "proposed",
        approvedByA: true,
        approvedByB: true,
      }),
      lateFeedback: false,
      becameMatched: false,
      status: "proposed",
    });
    expect(
      await caller().respondToMatch({
        token: "synthetic-token",
        response: "yes",
      })
    ).toEqual({ success: true, status: "waiting", bothApproved: false });
    expect(h.select).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expectNoRevealEffects();
  });

  it("performs contact reveals only for the transaction marked becameMatched, never again on a used token", async () => {
    const h = fakeDb();
    mocks.getDb.mockResolvedValue(h.db);
    decision({
      kind: "recorded",
      isA: true,
      match: matchRow({ status: "proposed", approvedByB: true }),
      lateFeedback: false,
      becameMatched: true,
      status: "matched",
    });
    expect(
      await caller().respondToMatch({
        token: "synthetic-token",
        response: "yes",
      })
    ).toEqual({ success: true, status: "matched", bothApproved: true });
    expect(h.ids).toEqual([101, 102]);
    expect(mocks.reveal).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.ensureFeedback).toHaveBeenCalledTimes(2);
    expect(mocks.notifyOwner).toHaveBeenCalledOnce();
    expect(mocks.reveal.mock.calls[0]![0]).toMatchObject({
      recipientEmail: participants[0]!.email,
      matchEmail: participants[1]!.email,
      matchPhone: participants[1]!.phone,
    });
    expect(mocks.reveal.mock.calls[1]![0]).toMatchObject({
      recipientEmail: participants[1]!.email,
      matchEmail: participants[0]!.email,
      matchPhone: participants[0]!.phone,
    });
    decision({
      kind: "already",
      isA: true,
      match: matchRow({ status: "matched", tokenAUsedAt: NOW }),
    });
    expect(
      await caller().respondToMatch({
        token: "synthetic-token",
        response: "no",
      })
    ).toEqual({ alreadyResponded: true, status: "matched" });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.reveal).toHaveBeenCalledTimes(2);
    expect(mocks.ensureFeedback).toHaveBeenCalledTimes(2);
    expect(mocks.notifyOwner).toHaveBeenCalledOnce();
    expect(h.forbidden).not.toHaveBeenCalled();
  });
});
