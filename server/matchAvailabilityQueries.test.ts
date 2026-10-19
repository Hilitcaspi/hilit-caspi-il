import { describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { readFileSync } from "node:fs";
import { findBlockingMatchForSingle, matchAvailabilityColumns, visibleMatchSql, type AvailabilityMatchRow } from "./matchAvailabilityQueries";

const NOW = 1_000_000_000;
function row(id: number, values: Partial<AvailabilityMatchRow> = {}): AvailabilityMatchRow {
  return { id, singleAId: 10, singleBId: 20, status: "pending", proposedAt: null,
    approvalExpiresAt: null, approvedByA: false, approvedByB: false,
    tokenAUsedAt: null, tokenBUsedAt: null, singleAConsent: false, singleBConsent: false,
    singleAConsentAt: null, singleBConsentAt: null, matchedAt: null, contactRevealedAt: null,
    returnedToPoolAt: null, matchDetailStatus: null, ownerApprovedAt: null,
    approvalTokenA: null, approvalTokenB: null, singleAToken: null, singleBToken: null,
    emailAOpenedAt: null, emailBOpenedAt: null, emailRetriedAt: null, waSentAt: null,
    notes: null, score: 83, createdAt: null, ...values };
}
function mockDb(rows: AvailabilityMatchRow[]) {
  const chain = { from: vi.fn(), where: vi.fn(), orderBy: vi.fn().mockResolvedValue(rows) };
  chain.from.mockReturnValue(chain); chain.where.mockReturnValue(chain);
  return { db: { select: vi.fn().mockReturnValue(chain) }, chain };
}
describe("match availability read queries", () => {
  it("does not let a newer expired proposal hide an older real mutual connection", async () => {
    const live = row(2, { status: "matched", notes: "[BOOST_CANDIDATE] synthetic", approvedByA: true, approvedByB: true, matchedAt: NOW - 1000 });
    const {db} = mockDb([row(1, { status: "proposed", ownerApprovedAt: NOW - 5000, approvalExpiresAt: NOW - 1 }), live]);
    expect(await findBlockingMatchForSingle(db, 10, NOW)).toEqual(live);
    expect(db.select).toHaveBeenCalledTimes(1);
  });
  it("ignores ended, returned, expired and unsent rows without modifying them", async () => {
    const rows = [row(1, {status:"matched",matchDetailStatus:"ended"}),row(2,{status:"matched",returnedToPoolAt:NOW}),row(3,{status:"proposed",ownerApprovedAt:NOW-1,approvalExpiresAt:NOW}),row(4,{status:"proposed",proposedAt:NOW-1})];
    const snapshot = structuredClone(rows); const {db}=mockDb(rows);
    expect(await findBlockingMatchForSingle(db,10,NOW)).toBeNull();
    expect(rows).toEqual(snapshot);
  });
  it("protects false database defaults until an actual decline is recorded", async () => {
    const current=row(1,{status:"proposed",ownerApprovedAt:NOW-1000,approvalExpiresAt:NOW+1000});
    expect(await findBlockingMatchForSingle(mockDb([current]).db,10,NOW)).toEqual(current);
    expect(await findBlockingMatchForSingle(mockDb([{...current,tokenAUsedAt:NOW-10}]).db,10,NOW)).toBeNull();
  });
  it("keeps an already-sent proposal with missing dates available for manual review", async () => {
    const current=row(1,{status:"proposed",approvalTokenA:"synthetic-delivery-proof"});
    expect(await findBlockingMatchForSingle(mockDb([current]).db,10,NOW)).toEqual(current);
  });
  it("excludes only the current draft in the SQL query and does not limit before lifecycle filtering", async () => {
    const {db,chain}=mockDb([]); await findBlockingMatchForSingle(db,10,NOW,900);
    const query=new MySqlDialect().sqlToQuery(chain.where.mock.calls[0][0]);
    expect(query.params).toContain(900); expect(query.sql).toContain("<>");
    expect(chain.orderBy).toHaveBeenCalledTimes(1); expect("limit" in chain).toBe(false);
  });
  it("does not project profile text, contact information or payment identifiers", () => {
    for (const field of ["phone", "email", "about"]) expect(Object.keys(matchAvailabilityColumns)).not.toContain(field);
    expect(Object.keys(matchAvailabilityColumns)).not.toContain("providerSubscriptionId");
  });
  it("applies candidate-marker hiding only when there is no sent-lifecycle evidence", () => {
    const query=new MySqlDialect().sqlToQuery(visibleMatchSql("[BOOST_CANDIDATE]")!);
    expect(query.params).toContain("%[BOOST_CANDIDATE]%"); expect(query.params).toContain("matched");
    expect(query.sql).toContain("ownerApprovedAt"); expect(query.sql).toContain("approvalTokenA");
    expect(query.sql).toContain("tokenAUsedAt"); expect(query.sql).toContain(" or ");
  });
  it("uses the shared guard for both send paths and active-profile detail, preserving customer contact gates", () => {
    const src=readFileSync("server/routers.ts","utf8");
    const create=src.slice(src.indexOf("createAndSendMatch: teamProcedure"),src.indexOf("approveMatch: teamProcedure"));
    const approve=src.slice(src.indexOf("approveMatch: teamProcedure"),src.indexOf("ownerApproveMatch: publicProcedure"));
    const detail=src.slice(src.indexOf("getSingleActiveMatch: teamProcedure"),src.indexOf("toggleSingleActive: teamProcedure"));
    expect(create).toContain("findBlockingMatchForSingle(db, input.idA");
    expect(approve).toContain("findBlockingMatchForSingle(db, match.singleAId");
    expect(detail).toContain("findBlockingMatchForSingle(db, input.singleId");
    expect(src).toContain("m.status === 'matched' && m.approvedByA && m.approvedByB");
    const list=src.slice(src.indexOf("listPendingMatches: teamProcedure"),src.indexOf("backfillMatchScores: teamProcedure"));
    expect(list).toContain("visibleMatchSql(BOOST_CANDIDATE_NOTE_MARKER)");
    expect(list).not.toContain("db.update");
  });
});
