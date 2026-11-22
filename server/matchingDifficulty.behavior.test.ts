import { readFileSync } from "node:fs";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, asc, eq, getTableColumns, gt, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { singles, matches, matchDeliveryEvents, feedbackFollowups, completedPayments } from "../drizzle/schema";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import type { TrpcContext } from "./_core/context";
import { regularMatchingAccessSql, hasRegularMatchingAccess } from "./regularMatchingEligibility";
import { blocksNewMatch } from "./unmatchedQueue";
import { getMatchAvailability } from "../shared/matchAvailability";
import { wasMatchProposalSent } from "../shared/matchDelivery";
import { buildLastAcceptedDeliveryBySingle, buildRecipientMatchHistory, getWaitingFrom, normalizeQueueEmail, UNMATCHED_QUEUE_HISTORY_DISCLAIMER } from "../shared/unmatchedQueuePresentation";
import { WAITING_QUEUE_CATEGORIES, emptyWaitingQueueSummary, selectWaitingQueueCategory } from "../shared/waitingQueueCategories";
import { matchEmailProfile } from "./matchEmailProfile";

// Execute the actual procedures without importing unrelated providers or schedulers.
const source = ts.createSourceFile("routers.ts", readFileSync(new URL("./routers.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const procedures = new Map<string, string>();
function visit(node: ts.Node) {
  if (ts.isPropertyAssignment(node) && ["setMatchingDifficulty", "getSinglesWithoutMatches", "getByQuestionnaireToken", "getMatches"].includes(node.name.getText(source))) procedures.set(node.name.getText(source), node.initializer.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
const getDb = vi.fn();
const autoLinkDnaType = vi.fn();
const customerProjection = source.statements.find(statement => ts.isVariableStatement(statement) && statement.getText(source).includes("...customerSingleColumns"));
if (!customerProjection) throw new Error("Customer single projection missing");
const projectionCode = ts.transpileModule(customerProjection.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const customerSingleColumns = new Function("getTableColumns", "singles", `${projectionCode}\nreturn customerSingleColumns;`)(getTableColumns, singles);
const dependencies = { router, publicProcedure, teamProcedure, z, getDb, singles, matches, matchDeliveryEvents, feedbackFollowups, completedPayments, eq, and, asc, gt, inArray, isNotNull, or, sql, TRPCError, regularMatchingAccessSql, blocksNewMatch, getMatchAvailability, wasMatchProposalSent, buildLastAcceptedDeliveryBySingle, buildRecipientMatchHistory, getWaitingFrom, normalizeQueueEmail, UNMATCHED_QUEUE_HISTORY_DISCLAIMER, WAITING_QUEUE_CATEGORIES, emptyWaitingQueueSummary, selectWaitingQueueCategory, customerSingleColumns, autoLinkDnaType };
const compiled = ts.transpileModule(`const testRouter = router({${[...procedures].map(([name, procedure]) => `${name}: ${procedure}`).join(",")}});`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const testRouter = new Function(...Object.keys(dependencies), `${compiled}\nreturn testRouter;`)(...Object.values(dependencies));
const now = 1800000000000;
const day = 86400000;
const dialect = new MySqlDialect();
function context(role: "admin" | "user" | "team" | null = "admin"): TrpcContext {
  return { user: role === "admin" || role === "user" ? { id: 1, openId: "synthetic", name: "Synthetic", email: "staff@example.test", loginMethod: "manus", role, createdAt: new Date(0), updatedAt: new Date(0), lastSignedIn: new Date(0) } : null, teamMember: role === "team" ? { id: 2, name: "Synthetic staff", role: "admin" } as TrpcContext["teamMember"] : null, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}
const person = (id = 1, overrides = {}) => ({ id, firstName: "Synthetic", lastName: "Profile", gender: "female", age: 35, city: "City", email: null, photoUrl: "https://example.test/photo.jpg", createdAt: now - 20 * day, questionnaireCompletedAt: now - 20 * day, questionnaireToken: "synthetic-token-64", isActive: true, isPaid: true, isSeed: false, consentMatchmaking: true, consentDataSharing: true, market: "il", isMatchingDifficult: false, matchingDifficultyNote: "private staff text", isCoachingClient: true, isNotBasic: true, dnaType: "anchor", updatedAt: now - day, ...overrides });
function harness(initial = [person()], matchRows: any[] = [], deliveries: any[] = [], feedback: any[] = []) {
  const rows = initial.map(row => ({ ...row }));
  const writes: Record<string, unknown>[] = [];
  const predicates: { table: unknown; sql: string; params: unknown[] }[] = [];
  const data = new Map<unknown, any[]>([[singles, rows], [matches, matchRows], [matchDeliveryEvents, deliveries], [feedbackFollowups, feedback], [completedPayments, []]]);
  const db = {
    select: vi.fn((projection?: Record<string, any>) => {
      let table: unknown;
      let predicate: SQL | undefined;
      const result = () => {
        let selected = data.get(table) || [];
        const query = predicate ? dialect.sqlToQuery(predicate) : null;
        if (query && table === singles) {
          if (query.sql.includes("`isActive`")) selected = selected.filter(row => hasRegularMatchingAccess(row) && row.questionnaireCompletedAt != null);
          const idParam = query.sql.match(/`singles`\.`id` = \?/);
          if (idParam) selected = selected.filter(row => row.id === query.params[0]);
          if (query.sql.includes("`questionnaireToken` = ?")) selected = selected.filter(row => row.questionnaireToken === query.params[0]);
        }
        return selected.map(row => projection ? Object.fromEntries(Object.entries(projection).map(([key, col]) => [key, row[col?.name || key]])) : { ...row });
      };
      const chain: any = { from: vi.fn((t: unknown) => { table = t; return chain; }), where: vi.fn((p: SQL) => { predicate = p; predicates.push({ table, ...dialect.sqlToQuery(p) }); return chain; }), orderBy: vi.fn(() => chain), limit: vi.fn(async (limit: number) => result().slice(0, limit)), then: (resolve: (rows: any[]) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject) };
      return chain;
    }),
    update: vi.fn(() => ({ set: vi.fn((patch: Record<string, unknown>) => ({ where: vi.fn(async (p: SQL) => { writes.push(patch); const id = dialect.sqlToQuery(p).params[0]; rows.filter(row => row.id === id).forEach(row => Object.assign(row, patch)); return [{ affectedRows: 1 }]; }) })) })),
  };
  getDb.mockResolvedValue(db);
  return { db, rows, writes, predicates };
}

beforeEach(() => { vi.restoreAllMocks(); getDb.mockReset(); autoLinkDnaType.mockReset(); vi.spyOn(Date, "now").mockReturnValue(now); });
describe("matching difficulty staff mutation (actual tRPC procedure)", () => {
  it.each([null, "user"] as const)("denies read/write for %s before any DB access", async role => {
    harness(); const caller = testRouter.createCaller(context(role));
    for (const operation of [() => caller.setMatchingDifficulty({ id: 1, isMatchingDifficult: true }), () => caller.getSinglesWithoutMatches({ category: "difficulty" })]) await expect(operation()).rejects.toMatchObject({ code: role ? "FORBIDDEN" : "UNAUTHORIZED" });
    expect(getDb).not.toHaveBeenCalled();
  });
  it.each(["admin", "team"] as const)("sets true/false idempotently for %s, retaining unrelated flags and omitted note", async role => {
    const { rows, writes } = harness(); const caller = testRouter.createCaller(context(role));
    await caller.setMatchingDifficulty({ id: 1, isMatchingDifficult: true });
    await caller.setMatchingDifficulty({ id: 1, isMatchingDifficult: true });
    expect(writes).toHaveLength(1); expect(writes[0]).toEqual({ isMatchingDifficult: true, updatedAt: now });
    expect(rows[0]).toMatchObject({ isCoachingClient: true, isNotBasic: true, matchingDifficultyNote: "private staff text" });
    await caller.setMatchingDifficulty({ id: 1, isMatchingDifficult: false });
    expect(rows[0].isMatchingDifficult).toBe(false); expect(writes).toHaveLength(2);
  });
  it("normalizes explicit note edits, clears only explicit empty note, rejects >2000 characters", async () => {
    const { rows, writes } = harness(); const caller = testRouter.createCaller(context());
    await caller.setMatchingDifficulty({ id: 1, isMatchingDifficult: true, note: "  confidential  " });
    expect(rows[0].matchingDifficultyNote).toBe("confidential");
    await caller.setMatchingDifficulty({ id: 1, isMatchingDifficult: false, note: " " });
    expect(rows[0].matchingDifficultyNote).toBeNull();
    await expect(caller.setMatchingDifficulty({ id: 1, isMatchingDifficult: true, note: "x".repeat(2001) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(writes).toHaveLength(2);
  });
  it("rejects an unknown single without writes", async () => { const { writes } = harness([]); await expect(testRouter.createCaller(context()).setMatchingDifficulty({ id: 1, isMatchingDifficult: true })).rejects.toMatchObject({ code: "NOT_FOUND" }); expect(writes).toEqual([]); });
});

describe("waiting category router wiring and eligibility", () => {
  it("keeps all base access gates for every category and returns private fields only to staff", async () => {
    const { predicates } = harness([person(1, { isMatchingDifficult: true, questionnaireCompletedAt: now - day }), person(2, { isActive: false, isMatchingDifficult: true }), person(3, { isPaid: false }), person(4, { isSeed: true }), person(5, { createdAt: now, consentMatchmaking: false, consentDataSharing: false }), person(6, { questionnaireCompletedAt: null })]);
    const caller = testRouter.createCaller(context("team"));
    const fresh = await caller.getSinglesWithoutMatches({ category: "difficulty" });
    expect(fresh.items).toHaveLength(1); expect(fresh.items[0]).toMatchObject({ id: 1, isMatchingDifficult: true, matchingDifficultyNote: "private staff text", matchHistory: [] });
    expect((await caller.getSinglesWithoutMatches()).items).toEqual([]);
    const base = predicates.find(p => p.table === singles)!;
    for (const name of ["isActive", "isPaid", "isSeed", "questionnaireCompletedAt", "consentMatchmaking", "consentDataSharing"]) expect(base.sql).toContain(name);
  });
  it("preserves recipient-specific accepted delivery active-connection exclusion and operational overlap", async () => {
    harness([person(1, { isMatchingDifficult: true }), person(2)], [{ id: 10, singleAId: 1, singleBId: 2, status: "matched", approvedByA: true, approvedByB: true, returnedToPoolAt: null, matchDetailStatus: "dating" }], [{ matchId: 10, singleId: 1, acceptedAt: now - 20 * day }], [{ singleId: 1 }]);
    const caller = testRouter.createCaller(context());
    const overdue = await caller.getSinglesWithoutMatches();
    expect(overdue.items.map((p: any) => p.id)).toEqual([2]);
    expect(overdue.summary).toMatchObject({ over14: 1, fromFeedback: 1, difficulty: 1, neverDelivered: 1, blocked: 2 });
    expect((await caller.getSinglesWithoutMatches({ category: "feedback" })).items.map((p: any) => p.id)).toEqual([1]);
    expect((await caller.getSinglesWithoutMatches({ category: "blocked" })).items).toHaveLength(2);
  });
  it("returns the difficulty zero summary when DB is unavailable", async () => { getDb.mockResolvedValue(null); expect((await testRouter.createCaller(context()).getSinglesWithoutMatches()).summary).toEqual(emptyWaitingQueueSummary()); });
});

describe("public profile and email privacy", () => {
  it.each([false, true])("never returns either difficulty field from customer questionnaire token including DNA relink path %s", async relink => {
    harness([person(1, { isMatchingDifficult: true, dnaType: relink ? null : "anchor" })]); autoLinkDnaType.mockResolvedValue("romantic");
    const result = await testRouter.createCaller(context(null)).getByQuestionnaireToken({ token: "synthetic-token-64" });
    expect(result).toMatchObject({ id: 1 }); expect(result).not.toHaveProperty("isMatchingDifficult"); expect(result).not.toHaveProperty("matchingDifficultyNote");
  });
  it("never returns either field in public customer match profiles", async () => {
    harness([person(), person(2, { isMatchingDifficult: true })], [{ id: 1, singleAId: 1, singleBId: 2, status: "proposed", score: 80 }]);
    const result = await testRouter.createCaller(context(null)).getMatches({ singleId: 1, token: "synthetic-token-64" });
    expect(result).toHaveLength(1); expect(result[0]).not.toHaveProperty("isMatchingDifficult"); expect(result[0]).not.toHaveProperty("matchingDifficultyNote");
  });
  it("email profile allowlist excludes flag, private note and unrelated admin metadata", () => {
    const profile = matchEmailProfile(person(1, { isMatchingDifficult: true }) as any);
    expect(JSON.stringify(profile)).not.toContain("private staff text"); expect(profile).not.toHaveProperty("isMatchingDifficult"); expect(profile).not.toHaveProperty("matchingDifficultyNote");
  });
});
