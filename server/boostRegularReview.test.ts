import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { pendingOwnerReviewSql, unclaimedHighBoostReviewSql } from "./boostRegularReview";

const dialect = new MySqlDialect();
const marker = "[BOOST_CANDIDATE]";

function compiled(condition: ReturnType<typeof unclaimedHighBoostReviewSql>) {
  return dialect.sqlToQuery(condition);
}

function routeSection(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe("unclaimed high Boost review SQL", () => {
  it("surfaces only an unsent pending 80+ Boost draft and binds every lifecycle guard", () => {
    const query = compiled(unclaimedHighBoostReviewSql(1_700_000_000_000));

    expect(query.sql).toContain("`matches`.`status` = ?");
    expect(query.sql).toContain("`matches`.`returnedToPoolAt` is null");
    expect(query.sql).toContain("`matches`.`notes` like ?");
    expect(query.sql).toContain("`matches`.`score` >= ?");
    expect(query.sql).toContain("COALESCE((`matches`.`notes` is null");
    expect(query.sql).toContain("COALESCE(br.fulfilled_at, 0) > 0");
    expect(query.sql).toContain("br.status IN ('awaiting_payment', 'paid', 'queued', 'reviewing')");
    expect(query.sql).toContain("FROM match_delivery_events de");
    expect(query.sql).toContain("de.matchId = `matches`.`id` AND de.status = 'accepted'");
    expect(query.sql).not.toContain("expires_at");

    expect(query.params).toEqual([
      "pending",
      `${marker}%`,
      80,
      `%${marker}%`,
      "matched",
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      true,
      true,
      "%נשלחה בעבר%",
    ]);
  });

  it("does not let a pre-existing sent lifecycle, any fulfilled request, or an active payment state disappear into owner review", () => {
    const query = compiled(unclaimedHighBoostReviewSql(1_700_000_000_000));

    expect(query.sql).toContain("`matches`.`ownerApprovedAt` > ?");
    expect(query.sql).toContain("`matches`.`emailAOpenedAt` > ?");
    expect(query.sql).toContain("`matches`.`emailBOpenedAt` > ?");
    expect(query.sql).toContain("`matches`.`approvalTokenA` IS NOT NULL");
    expect(query.sql).toContain("`matches`.`approvedByA` = ?");
    expect(query.sql).toContain("`matches`.`notes` LIKE ?");
    expect(query.sql).toContain("NOT EXISTS");
    expect(query.params).toContain("%נשלחה בעבר%");
    expect(query.params).toContain(true);
    expect(query.params).not.toContain(1_700_000_000_000);
  });
});

describe("pending owner review queue SQL", () => {
  it("includes ordinary pending work and the eligible unsent high-score Boost branch", () => {
    const query = dialect.sqlToQuery(pendingOwnerReviewSql(1_700_000_000_000));

    expect(query.sql).toContain("`matches`.`notes` IS NULL OR `matches`.`notes` NOT LIKE ?");
    expect(query.sql).toContain("`matches`.`notes` like ?");
    expect(query.sql).toContain("`matches`.`score` >= ?");
    expect(query.sql).toContain("br.status IN ('awaiting_payment', 'paid', 'queued', 'reviewing')");
    expect(query.params).toEqual([
      "pending",
      `%${marker}%`,
      "pending",
      `${marker}%`,
      80,
      `%${marker}%`,
      "matched",
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      true,
      true,
      "%נשלחה בעבר%",
    ]);
  });

  it("uses read-only predicates in both owner queue endpoints while retaining the historical visibility predicate", () => {
    const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const pending = routeSection(routers, "getPendingMatches: teamProcedure", "approveMatch: teamProcedure");
    const history = routeSection(routers, "listPendingMatches: teamProcedure", "backfillMatchScores: teamProcedure");

    expect(pending).toContain(".where(pendingOwnerReviewSql())");
    expect(pending).toContain("pendingOwnerReviewSql");
    expect(history).toContain("or(visibleMatchSql(BOOST_CANDIDATE_NOTE_MARKER), unclaimedHighBoostReviewSql())");
    expect(history).toContain("visibleMatchSql(BOOST_CANDIDATE_NOTE_MARKER)");
    expect(history).toContain("unclaimedHighBoostReviewSql()");

    for (const section of [pending, history]) {
      expect(section).not.toContain(".insert(");
      expect(section).not.toContain(".update(");
      expect(section).not.toContain(".delete(");
    }
  });
});
