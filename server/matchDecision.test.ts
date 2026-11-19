import { describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { SQL } from "drizzle-orm";
import { matches, type Match } from "../drizzle/schema";
import {
  classifyMatchDecision,
  getMatchResponseView,
  recordMatchDecision,
} from "./matchDecision";

// A real database connection must never be created by these unit tests.
vi.mock("./db", () => ({
  getDb: vi.fn(() => {
    throw new Error("Live DB forbidden");
  }),
}));

const NOW = 1_800_000_000_000;
const TOKEN_A = "synthetic-match-token-a";
const TOKEN_B = "synthetic-match-token-b";
const SIDES = ["A", "B"] as const;
type Side = (typeof SIDES)[number];
const tokenFor = (side: Side) => (side === "A" ? TOKEN_A : TOKEN_B);
const otherSide = (side: Side): Side => (side === "A" ? "B" : "A");
const decisionFields = (
  side: Side,
  yes: boolean,
  usedAt: number | null
): Partial<Match> =>
  side === "A"
    ? { approvedByA: yes, tokenAUsedAt: usedAt }
    : { approvedByB: yes, tokenBUsedAt: usedAt };

function matchRow(overrides: Partial<Match> = {}): Match {
  return {
    id: 41,
    singleId: 101,
    matchedSingleId: 102,
    singleAId: 101,
    singleBId: 102,
    score: 80,
    proposedAt: NOW - 1_000,
    emailAOpenedAt: null,
    emailBOpenedAt: null,
    singleAConsent: false,
    singleBConsent: false,
    singleAConsentAt: null,
    singleBConsentAt: null,
    singleAToken: null,
    singleBToken: null,
    approvalTokenA: TOKEN_A,
    approvalTokenB: TOKEN_B,
    tokenAUsedAt: null,
    tokenBUsedAt: null,
    approvalExpiresAt: NOW + 10_000,
    approvedByA: false,
    approvedByB: false,
    status: "proposed",
    matchedAt: null,
    contactRevealedAt: null,
    ownerApprovalToken: null,
    ownerApprovedAt: NOW - 2_000,
    scoreBreakdown: null,
    autoExplanation: null,
    notes: null,
    followUpSentAt: null,
    emailRetriedAt: null,
    waSentAt: null,
    matchWeekFollowupSentAt: null,
    matchMonthFollowupSentAt: null,
    returnedToPoolAt: null,
    matchDetailStatus: null,
    createdAt: new Date(NOW - 2_000),
    updatedAt: NOW - 1_000,
    ...overrides,
  };
}

/**
 * Models row-lock serialization without MySQL, networking, or providers. SQL is
 * compiled by the real Drizzle dialect so token lookup and update IDs are checked.
 * Each callback sees a snapshot taken AFTER acquiring the simulated lock; writes
 * commit together, and a thrown callback rolls back. This is not a DB-engine test.
 */
function serializedDb(initial: Match | undefined, failUpdate = false) {
  let row = initial ? { ...initial } : undefined;
  let tail: Promise<unknown> = Promise.resolve();
  let activeTransactions = 0;
  let maxActiveTransactions = 0;
  const writes: Partial<Match>[] = [];
  const locks: string[] = [];
  const dialect = new MySqlDialect();
  const transaction = vi.fn(
    <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
      const run = tail.then(async () => {
        activeTransactions++;
        maxActiveTransactions = Math.max(
          maxActiveTransactions,
          activeTransactions
        );
        let snapshot = row ? { ...row } : undefined;
        let locked = false;
        const pendingWrites: Partial<Match>[] = [];
        const tx = {
          select: () => ({
            from: (table: unknown) => {
              expect(table).toBe(matches);
              return {
                where: (predicate: SQL) => ({
                  limit: (limit: number) => ({
                    for: async (mode: string) => {
                      expect(limit).toBe(1);
                      expect(mode).toBe("update");
                      locks.push(mode);
                      locked = true;
                      const params = dialect.sqlToQuery(predicate).params;
                      expect(params).toHaveLength(2);
                      expect(params[0]).toBe(params[1]);
                      return snapshot &&
                        (snapshot.approvalTokenA === params[0] ||
                          snapshot.approvalTokenB === params[0])
                        ? [{ ...snapshot }]
                        : [];
                    },
                  }),
                }),
              };
            },
          }),
          update: (table: unknown) => {
            expect(table).toBe(matches);
            expect(locked).toBe(true);
            return {
              set: (patch: Partial<Match>) => ({
                where: async (predicate: SQL) => {
                  expect(dialect.sqlToQuery(predicate).params).toEqual([
                    snapshot?.id,
                  ]);
                  if (failUpdate) throw new Error("synthetic update failure");
                  pendingWrites.push({ ...patch });
                  snapshot = { ...snapshot!, ...patch };
                  return [{ affectedRows: 1 }];
                },
              }),
            };
          },
        };
        try {
          const result = await callback(tx);
          row = snapshot;
          writes.push(...pendingWrites);
          return result;
        } finally {
          activeTransactions--;
        }
      });
      tail = run.catch(() => undefined);
      return run;
    }
  );
  const outsideTransaction = vi.fn(() => {
    throw new Error("Decision reads/writes must run in a transaction");
  });
  const db = {
    transaction,
    select: outsideTransaction,
    update: outsideTransaction,
  };
  return {
    db: db as unknown as Parameters<typeof recordMatchDecision>[0],
    transaction,
    writes,
    locks,
    outsideTransaction,
    read: () => (row ? { ...row } : undefined),
    maxActive: () => maxActiveTransactions,
  };
}

describe("classifyMatchDecision", () => {
  it("rejects an unknown token before inspecting expiry or used-token state", () => {
    expect(
      classifyMatchDecision(
        matchRow({ status: "expired", tokenAUsedAt: NOW }),
        "unknown",
        NOW
      ).kind
    ).toBe("invalid");
  });

  it.each(SIDES)(
    "does not mistake participant %s's default false for an explicit decline",
    side => {
      expect(classifyMatchDecision(matchRow(), tokenFor(side), NOW)).toEqual({
        kind: "active",
        isA: side === "A",
      });
      expect(
        classifyMatchDecision(
          matchRow({ status: "rejected" }),
          tokenFor(side),
          NOW
        ).kind
      ).toBe("closed");
    }
  );

  it.each(SIDES)(
    "allows feedback for %s only after the other token recorded an explicit no",
    side => {
      const decline = matchRow({
        status: "rejected",
        ...decisionFields(otherSide(side), false, NOW - 100),
      });
      expect(classifyMatchDecision(decline, tokenFor(side), NOW)).toEqual({
        kind: "feedback",
        isA: side === "A",
      });
      const otherYes = matchRow({
        status: "rejected",
        ...decisionFields(otherSide(side), true, NOW - 100),
      });
      expect(classifyMatchDecision(otherYes, tokenFor(side), NOW).kind).toBe(
        "closed"
      );
    }
  );

  it.each(SIDES)(
    "reports %s's used token as already even after expiry",
    side => {
      const row = matchRow({
        status: "expired",
        ...decisionFields(side, true, NOW - 100),
      });
      expect(
        classifyMatchDecision(row, tokenFor(side), NOW + 20_000).kind
      ).toBe("already");
    }
  );

  it.each(["matched", "rejected"] as const)(
    "keeps an unused token closed for %s without a participant decline",
    status => {
      for (const side of SIDES) {
        expect(
          classifyMatchDecision(matchRow({ status }), tokenFor(side), NOW).kind
        ).toBe("closed");
      }
    }
  );

  it("expires by status or timestamp, including late feedback after a decline", () => {
    expect(
      classifyMatchDecision(matchRow({ status: "expired" }), TOKEN_A, NOW).kind
    ).toBe("expired");
    expect(
      classifyMatchDecision(
        matchRow({ approvalExpiresAt: NOW - 1 }),
        TOKEN_A,
        NOW
      ).kind
    ).toBe("expired");
    expect(
      classifyMatchDecision(
        matchRow({ status: "rejected", tokenBUsedAt: NOW - 100 }),
        TOKEN_A,
        NOW + 10_001
      ).kind
    ).toBe("expired");
  });

  it("expires exactly at the explicit deadline and accepts the preceding millisecond", () => {
    expect(
      classifyMatchDecision(matchRow({ approvalExpiresAt: NOW }), TOKEN_A, NOW)
        .kind
    ).toBe("expired");
    expect(
      classifyMatchDecision(
        matchRow({ approvalExpiresAt: NOW }),
        TOKEN_A,
        NOW - 1
      ).kind
    ).toBe("active");
  });

  it("falls back to the proposal's 48-hour deadline when no explicit expiry exists", () => {
    const row = matchRow({
      approvalExpiresAt: null,
      proposedAt: NOW - 48 * 60 * 60 * 1_000,
    });
    expect(classifyMatchDecision(row, TOKEN_A, NOW - 1).kind).toBe("active");
    expect(classifyMatchDecision(row, TOKEN_A, NOW).kind).toBe("expired");
    expect(classifyMatchDecision(row, TOKEN_A, NOW + 1).kind).toBe("expired");
    expect(
      classifyMatchDecision(matchRow({ approvalExpiresAt: null }), TOKEN_A, NOW)
        .kind
    ).toBe("active");
  });

  it.each(SIDES)(
    "blocks rejected feedback from %s when both deadline sources are unknown",
    side => {
      const row = matchRow({
        status: "rejected",
        approvalExpiresAt: null,
        proposedAt: null,
        ...decisionFields(otherSide(side), false, NOW - 100),
      });
      expect(classifyMatchDecision(row, tokenFor(side), NOW).kind).toBe(
        "closed"
      );
    }
  );

  it.each([
    { returnedToPoolAt: NOW - 100 },
    { matchDetailStatus: "ended" as const },
  ])(
    "closes returned/ended proposals even after an explicit partner decline: %j",
    lifecycle => {
      for (const side of SIDES) {
        const row = matchRow({
          status: "rejected",
          ...decisionFields(otherSide(side), false, NOW - 100),
          ...lifecycle,
        });
        expect(classifyMatchDecision(row, tokenFor(side), NOW).kind).toBe(
          "closed"
        );
        expect(
          classifyMatchDecision(
            { ...row, ...decisionFields(side, true, NOW - 50) },
            tokenFor(side),
            NOW
          ).kind
        ).toBe("already");
      }
    }
  );
});

describe("recordMatchDecision with a serialized fake transaction", () => {
  it.each(SIDES)(
    "records %s's first yes without inferring consent from defaults",
    async side => {
      const h = serializedDb(matchRow());
      const result = await recordMatchDecision(
        h.db,
        tokenFor(side),
        "yes",
        NOW
      );
      expect(result).toMatchObject({
        kind: "recorded",
        isA: side === "A",
        becameMatched: false,
        lateFeedback: false,
        status: "proposed",
      });
      expect(h.read()).toMatchObject({
        ...decisionFields(side, true, NOW),
        ...decisionFields(otherSide(side), false, null),
        status: "proposed",
        matchedAt: null,
        updatedAt: NOW,
      });
      expect(h.locks).toEqual(["update"]);
      expect(h.transaction).toHaveBeenCalledOnce();
      expect(h.outsideTransaction).not.toHaveBeenCalled();
    }
  );

  it.each(SIDES)(
    "preserves legacy/admin explicit partner true approval when %s says yes",
    async side => {
      const h = serializedDb(
        matchRow(decisionFields(otherSide(side), true, null))
      );
      expect(
        await recordMatchDecision(h.db, tokenFor(side), "yes", NOW)
      ).toMatchObject({
        kind: "recorded",
        becameMatched: true,
        lateFeedback: false,
        status: "matched",
      });
      expect(h.read()).toMatchObject({
        approvedByA: true,
        approvedByB: true,
        matchedAt: NOW,
        status: "matched",
        ...decisionFields(otherSide(side), true, null),
      });
    }
  );

  it.each(SIDES)(
    "matches once when %s says yes after an explicitly recorded partner yes",
    async side => {
      const before = matchRow(decisionFields(otherSide(side), true, NOW - 100));
      const h = serializedDb(before);
      const result = await recordMatchDecision(
        h.db,
        tokenFor(side),
        "yes",
        NOW
      );
      expect(result).toMatchObject({
        kind: "recorded",
        becameMatched: true,
        lateFeedback: false,
        status: "matched",
        match: before,
      });
      expect(h.read()).toMatchObject({
        approvedByA: true,
        approvedByB: true,
        status: "matched",
        matchedAt: NOW,
      });
      expect(before.status).toBe("proposed");
    }
  );

  it.each(SIDES)(
    "records %s's first no and keeps matchedAt unset",
    async side => {
      const h = serializedDb(matchRow());
      expect(
        await recordMatchDecision(h.db, tokenFor(side), "no", NOW)
      ).toMatchObject({
        kind: "recorded",
        becameMatched: false,
        lateFeedback: false,
        status: "rejected",
      });
      expect(h.read()).toMatchObject({
        ...decisionFields(side, false, NOW),
        status: "rejected",
        matchedAt: null,
      });
    }
  );

  it.each(
    SIDES.flatMap(side =>
      (["yes", "no"] as const).map(response => ({ side, response }))
    )
  )(
    "records late $response from $side before expiry without reopening",
    async ({ side, response }) => {
      const h = serializedDb(
        matchRow({
          status: "rejected",
          ...decisionFields(otherSide(side), false, NOW - 100),
        })
      );
      expect(
        await recordMatchDecision(h.db, tokenFor(side), response, NOW)
      ).toMatchObject({
        kind: "recorded",
        lateFeedback: true,
        becameMatched: false,
        status: "rejected",
      });
      expect(h.read()).toMatchObject({
        ...decisionFields(side, response === "yes", NOW),
        ...decisionFields(otherSide(side), false, NOW - 100),
        status: "rejected",
        matchedAt: null,
      });
      expect(h.writes).toHaveLength(1);
    }
  );

  it("evaluates the production clock after acquiring the row lock", async () => {
    const h = serializedDb(
      matchRow({
        status: "rejected",
        tokenBUsedAt: NOW - 100,
        approvalExpiresAt: NOW,
      })
    );
    let current = NOW - 1;
    const clock = vi.fn(() => current);
    const pending = recordMatchDecision(h.db, TOKEN_A, "yes", clock);
    expect(clock).not.toHaveBeenCalled();
    current = NOW;
    expect(await pending).toMatchObject({ kind: "expired" });
    expect(clock).toHaveBeenCalledOnce();
    expect(h.writes).toHaveLength(0);
  });

  it.each(["yes", "no"] as const)(
    "does not save late %s after expiry",
    async response => {
      const before = matchRow({
        status: "rejected",
        tokenBUsedAt: NOW - 100,
        approvalExpiresAt: NOW - 1,
      });
      const h = serializedDb(before);
      expect(
        await recordMatchDecision(h.db, TOKEN_A, response, NOW)
      ).toMatchObject({ kind: "expired" });
      expect(h.read()).toEqual(before);
      expect(h.writes).toHaveLength(0);
    }
  );

  it.each([
    {
      label: "unknown deadline after decline",
      overrides: {
        status: "rejected",
        tokenBUsedAt: NOW - 100,
        approvalExpiresAt: null,
        proposedAt: null,
      },
      kind: "closed",
    },
    {
      label: "fallback 48-hour deadline",
      overrides: {
        approvalExpiresAt: null,
        proposedAt: NOW - 48 * 60 * 60 * 1_000,
      },
      kind: "expired",
    },
    {
      label: "exact expiry boundary",
      overrides: { approvalExpiresAt: NOW },
      kind: "expired",
    },
    {
      label: "returned to pool after decline",
      overrides: {
        status: "rejected",
        tokenBUsedAt: NOW - 100,
        returnedToPoolAt: NOW - 50,
      },
      kind: "closed",
    },
    {
      label: "ended after decline",
      overrides: {
        status: "rejected",
        tokenBUsedAt: NOW - 100,
        matchDetailStatus: "ended",
      },
      kind: "closed",
    },
  ] satisfies Array<{
    label: string;
    overrides: Partial<Match>;
    kind: string;
  }>)("does not save yes or no for $label", async ({ overrides, kind }) => {
    const before = matchRow(overrides);
    const h = serializedDb(before);
    for (const response of ["yes", "no"] as const) {
      expect(
        await recordMatchDecision(h.db, TOKEN_A, response, NOW)
      ).toMatchObject({ kind });
    }
    expect(h.read()).toEqual(before);
    expect(h.writes).toHaveLength(0);
  });

  it.each(["matched", "rejected", "expired"] as const)(
    "does not save an unused token on a %s closed proposal",
    async status => {
      const before = matchRow({ status });
      const h = serializedDb(before);
      expect(
        await recordMatchDecision(h.db, TOKEN_A, "yes", NOW)
      ).toMatchObject({ kind: status === "expired" ? "expired" : "closed" });
      expect(h.read()).toEqual(before);
      expect(h.writes).toHaveLength(0);
    }
  );

  it.each([undefined, matchRow()])(
    "returns invalid without updates for an absent or unknown-token row",
    async row => {
      const h = serializedDb(row);
      expect(await recordMatchDecision(h.db, "unknown", "yes", NOW)).toEqual({
        kind: "invalid",
      });
      expect(h.read()).toEqual(row);
      expect(h.writes).toHaveLength(0);
    }
  );

  it.each(
    SIDES.flatMap(side =>
      (["yes", "no"] as const).map(response => ({ side, response }))
    )
  )(
    "never overwrites $side's saved $response on repeat/opposite response",
    async ({ side, response }) => {
      const h = serializedDb(matchRow());
      await recordMatchDecision(h.db, tokenFor(side), response, NOW);
      const saved = h.read();
      for (const repeated of [
        response,
        response === "yes" ? "no" : "yes",
      ] as const) {
        expect(
          await recordMatchDecision(
            h.db,
            tokenFor(side),
            repeated,
            NOW + 20_000
          )
        ).toMatchObject({ kind: "already" });
      }
      expect(h.read()).toEqual(saved);
      expect(h.writes).toHaveLength(1);
    }
  );

  it("keeps a saved late yes when the same feedback token is reused for no", async () => {
    const h = serializedDb(
      matchRow({ status: "rejected", tokenBUsedAt: NOW - 100 })
    );
    await recordMatchDecision(h.db, TOKEN_A, "yes", NOW);
    const saved = h.read();
    expect(
      await recordMatchDecision(h.db, TOKEN_A, "no", NOW + 1)
    ).toMatchObject({ kind: "already" });
    expect(h.read()).toEqual(saved);
    expect(h.writes).toHaveLength(1);
  });

  it.each(SIDES)(
    "concurrent yes/yes with %s first produces exactly one becameMatched",
    async first => {
      const h = serializedDb(matchRow());
      const results = await Promise.all([
        recordMatchDecision(h.db, tokenFor(first), "yes", NOW),
        recordMatchDecision(h.db, tokenFor(otherSide(first)), "yes", NOW + 1),
      ]);
      expect(
        results.filter(
          result => result.kind === "recorded" && result.becameMatched
        )
      ).toHaveLength(1);
      expect(results[0]).toMatchObject({
        kind: "recorded",
        becameMatched: false,
      });
      expect(results[1]).toMatchObject({
        kind: "recorded",
        becameMatched: true,
      });
      expect(h.read()).toMatchObject({
        approvedByA: true,
        approvedByB: true,
        tokenAUsedAt: expect.any(Number),
        tokenBUsedAt: expect.any(Number),
        status: "matched",
        matchedAt: NOW + 1,
      });
      expect(h.writes).toHaveLength(2);
      expect(h.writes.filter(patch => patch.matchedAt != null)).toHaveLength(1);
      expect(h.maxActive()).toBe(1);
      expect(h.locks).toEqual(["update", "update"]);
    }
  );

  it.each(
    SIDES.flatMap(yesSide =>
      [true, false].map(yesFirst => ({ yesSide, yesFirst }))
    )
  )(
    "concurrent yes/no stays rejected: yes side $yesSide, yes first $yesFirst",
    async ({ yesSide, yesFirst }) => {
      const h = serializedDb(matchRow());
      const yes = () =>
        recordMatchDecision(
          h.db,
          tokenFor(yesSide),
          "yes",
          NOW + (yesFirst ? 0 : 1)
        );
      const no = () =>
        recordMatchDecision(
          h.db,
          tokenFor(otherSide(yesSide)),
          "no",
          NOW + (yesFirst ? 1 : 0)
        );
      const results = await Promise.all(
        yesFirst ? [yes(), no()] : [no(), yes()]
      );
      expect(
        results.every(
          result => result.kind === "recorded" && !result.becameMatched
        )
      ).toBe(true);
      expect(results[1]).toMatchObject({ lateFeedback: !yesFirst });
      expect(h.read()).toMatchObject({
        ...decisionFields(yesSide, true, NOW + (yesFirst ? 0 : 1)),
        ...decisionFields(otherSide(yesSide), false, NOW + (yesFirst ? 1 : 0)),
        status: "rejected",
        matchedAt: null,
      });
      expect(h.writes).toHaveLength(2);
      expect(h.maxActive()).toBe(1);
    }
  );

  it.each(
    SIDES.flatMap(side =>
      (["yes", "no"] as const).map(first => ({ side, first }))
    )
  )(
    "concurrent opposite responses on token $side save only first $first",
    async ({ side, first }) => {
      const h = serializedDb(matchRow());
      const results = await Promise.all([
        recordMatchDecision(h.db, tokenFor(side), first, NOW),
        recordMatchDecision(
          h.db,
          tokenFor(side),
          first === "yes" ? "no" : "yes",
          NOW + 1
        ),
      ]);
      expect(results[0]).toMatchObject({ kind: "recorded" });
      expect(results[1]).toMatchObject({ kind: "already" });
      expect(h.read()).toMatchObject({
        ...decisionFields(side, first === "yes", NOW),
        ...decisionFields(otherSide(side), false, null),
        status: first === "yes" ? "proposed" : "rejected",
      });
      expect(h.writes).toHaveLength(1);
      expect(h.maxActive()).toBe(1);
    }
  );

  it("propagates a persistence failure without committing token usage", async () => {
    const before = matchRow();
    const h = serializedDb(before, true);
    await expect(
      recordMatchDecision(h.db, TOKEN_A, "yes", NOW)
    ).rejects.toThrow("synthetic update failure");
    expect(h.read()).toEqual(before);
    expect(h.writes).toHaveLength(0);
  });
});

describe("participant response view and complete decision truth table", () => {
  it.each(SIDES)(
    "does not disclose the partner's answer to unused token %s",
    side => {
      const states = [
        matchRow(),
        matchRow(decisionFields(otherSide(side), true, NOW - 100)),
        matchRow({
          status: "rejected",
          ...decisionFields(otherSide(side), false, NOW - 100),
        }),
      ];
      const views = states.map(row =>
        getMatchResponseView(row, tokenFor(side), NOW)
      );
      expect(views[0]).toEqual({
        canRespond: true,
        closed: false,
        isExpired: false,
        alreadyResponded: false,
        myDecision: null,
        status: "proposed",
        responseOutcome: null,
      });
      expect(views[1]).toEqual(views[0]);
      expect(views[2]).toEqual(views[0]);
      expect(views[2]).not.toHaveProperty("canRespondAfterDecline");
    }
  );

  it.each(SIDES)(
    "shows a saved yes from %s as waiting, not mutual consent",
    side => {
      const row = matchRow(decisionFields(side, true, NOW - 100));
      expect(getMatchResponseView(row, tokenFor(side), NOW)).toMatchObject({
        alreadyResponded: true,
        myDecision: true,
        canRespond: false,
        responseOutcome: "waiting",
      });
    }
  );

  it.each(
    SIDES.flatMap(first =>
      (["yes", "no"] as const).flatMap(firstVote =>
        (["yes", "no"] as const).map(secondVote => ({
          first,
          firstVote,
          secondVote,
        }))
      )
    )
  )(
    "$first first: $firstVote then $secondVote records both immutable votes",
    async ({ first, firstVote, secondVote }) => {
      const h = serializedDb(matchRow());
      const second = otherSide(first);
      const firstResult = await recordMatchDecision(
        h.db,
        tokenFor(first),
        firstVote,
        NOW
      );
      expect(firstResult).toMatchObject({
        kind: "recorded",
        becameMatched: false,
      });
      // The remaining side always sees the proposal, even after a no.
      expect(
        getMatchResponseView(h.read()!, tokenFor(second), NOW + 1)
      ).toMatchObject({
        canRespond: true,
        status: "proposed",
        responseOutcome: null,
        myDecision: null,
      });
      const secondResult = await recordMatchDecision(
        h.db,
        tokenFor(second),
        secondVote,
        NOW + 1
      );
      const mutual = firstVote === "yes" && secondVote === "yes";
      expect(secondResult).toMatchObject({
        kind: "recorded",
        becameMatched: mutual,
        lateFeedback: firstVote === "no",
        status: mutual ? "matched" : "rejected",
      });
      const saved = h.read()!;
      expect(saved).toMatchObject({
        ...decisionFields(first, firstVote === "yes", NOW),
        ...decisionFields(second, secondVote === "yes", NOW + 1),
        status: mutual ? "matched" : "rejected",
        matchedAt: mutual ? NOW + 1 : null,
        returnedToPoolAt: null,
      });
      for (const side of SIDES) {
        const view = getMatchResponseView(saved, tokenFor(side), NOW + 2);
        expect(view).toMatchObject({
          alreadyResponded: true,
          canRespond: false,
          responseOutcome: mutual ? "matched" : "not_matched",
        });
        for (const replayVote of ["yes", "no"] as const) {
          expect(
            await recordMatchDecision(h.db, tokenFor(side), replayVote, NOW + 2)
          ).toMatchObject({ kind: "already" });
        }
      }
      expect(h.read()).toEqual(saved);
      expect(h.writes).toHaveLength(2);
    }
  );

  it.each(SIDES)(
    "concurrent no/no with %s first saves both without reopening",
    async first => {
      const h = serializedDb(matchRow());
      const results = await Promise.all([
        recordMatchDecision(h.db, tokenFor(first), "no", NOW),
        recordMatchDecision(h.db, tokenFor(otherSide(first)), "no", NOW + 1),
      ]);
      expect(results[0]).toMatchObject({
        kind: "recorded",
        lateFeedback: false,
        becameMatched: false,
      });
      expect(results[1]).toMatchObject({
        kind: "recorded",
        lateFeedback: true,
        becameMatched: false,
      });
      expect(h.read()).toMatchObject({
        status: "rejected",
        approvedByA: false,
        approvedByB: false,
        matchedAt: null,
      });
      expect(h.writes).toHaveLength(2);
      expect(h.maxActive()).toBe(1);
      expect(h.locks).toEqual(["update", "update"]);
    }
  );

  it.each([
    { returnedToPoolAt: NOW - 1 },
    { matchDetailStatus: "ended" as const },
    { approvalExpiresAt: NOW },
    { status: "expired" as const },
  ])(
    "keeps lifecycle block %j guarded before and after own vote",
    lifecycle => {
      const rejected = matchRow({
        status: "rejected",
        tokenBUsedAt: NOW - 100,
        ...lifecycle,
      });
      expect(getMatchResponseView(rejected, TOKEN_A, NOW).canRespond).toBe(
        false
      );
      const savedYes = matchRow({
        tokenAUsedAt: NOW - 200,
        approvedByA: true,
        ...lifecycle,
      });
      expect(getMatchResponseView(savedYes, TOKEN_A, NOW)).toMatchObject({
        alreadyResponded: true,
        canRespond: false,
        myDecision: true,
        responseOutcome: "closed",
      });
    }
  );

  it("does not show an active mutual match as expired after the proposal deadline", () => {
    const row = matchRow({
      status: "matched",
      approvedByA: true,
      approvedByB: true,
      tokenAUsedAt: NOW - 100,
      tokenBUsedAt: NOW - 50,
    });
    expect(getMatchResponseView(row, TOKEN_A, NOW + 20_000)).toMatchObject({
      isExpired: false,
      responseOutcome: "matched",
      canRespond: false,
    });
    expect(
      getMatchResponseView(
        { ...row, returnedToPoolAt: NOW },
        TOKEN_A,
        NOW + 20_000
      ).responseOutcome
    ).toBe("closed");
  });
});
