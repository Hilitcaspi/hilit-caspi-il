import { describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

const mock = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("./db", () => ({ getDb: async () => ({ execute: mock.execute }) }));
import { loadNovemberBundleFirstMatchQueue } from "./novemberBundleFirstMatchQueue";

describe("November recipient delivery SQL safeguards", () => {
  it("filters qualifying evidence before MIN, so a later valid resend is not hidden", async () => {
    mock.execute.mockResolvedValue([[], []]);
    const now = Date.parse("2026-11-12T12:00:00Z");
    const result = await loadNovemberBundleFirstMatchQueue(now);
    const query = new MySqlDialect().sqlToQuery(mock.execute.mock.calls[0][0]);
    expect(query.sql).toContain("MIN(COALESCE(mde.acceptedAt, mde.attemptedAt))");
    expect(query.sql).toContain("mde.singleId = rs.id");
    expect(query.sql).toContain("mde.matchId = mm.match_id");
    expect(query.sql).toContain("mde.status = 'accepted'");
    expect(query.sql).toContain("COALESCE(mde.providerMessageId, '') <> 'blocked'");
    expect(query.sql).toContain("NOT EXISTS (SELECT 1 FROM match_boost_requests br WHERE br.match_id = mm.match_id)");
    expect(query.sql).toContain(">= GREATEST(ep.paid_at, COALESCE(rs.questionnaireCompletedAt, 0))");
    expect(query.sql).toContain("COALESCE(mde.acceptedAt, mde.attemptedAt) <= ?");
    expect(query.params).toContain(now);
    expect(query.params).toContain("bundle_november");
    expect(query.params).toContain(34900);
    expect(query.sql).toContain("cp.amount_source = 'grow'");
    expect(result.summary.total).toBe(0);
  });
});
