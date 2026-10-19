import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getMatchAvailability, isBlockingMatch } from "../shared/matchAvailability";

const crmSource = readFileSync(new URL("../client/src/pages/CRMMatchmaking.tsx", import.meta.url), "utf8");
const NOW = 1_700_000_000_000;

describe("CRM match availability UI", () => {
  it("treats a mutually confirmed match as an active connection, not an expired proposal", () => {
    const confirmedMatch = {
      status: "matched",
      proposedAt: NOW - 72 * 60 * 60 * 1000,
      approvalExpiresAt: NOW - 24 * 60 * 60 * 1000,
      approvedByA: true,
      approvedByB: true,
    };

    expect(isBlockingMatch(confirmedMatch, NOW)).toBe(true);
    expect(getMatchAvailability(confirmedMatch, NOW)).toMatchObject({
      blocksNewMatch: true,
      reason: "active_connection",
    });
  });

  it("uses the shared blocker predicate for the ID set, profile map, and new-match exclusion set", () => {
    const availabilityStart = crmSource.indexOf("const matchAvailabilityNow = Date.now()");
    const availabilityEnd = crmSource.indexOf("const isPendingVisible", availabilityStart);
    const availabilitySource = crmSource.slice(availabilityStart, availabilityEnd);

    expect(availabilitySource).toContain("const activeMatchSingleIds");
    expect(availabilitySource).toContain("const activeMatchBySingleId");
    expect(availabilitySource).toContain("const unavailableForNewMatchIds");
    expect(availabilitySource.match(/isBlockingMatch\(m, matchAvailabilityNow\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(availabilitySource).toContain('availability.reason === "active_connection" ? 2 : 1');
    expect(availabilitySource).toContain("if (!existing || blocker.priority > existing.priority)");
  });

  it("renders the confirmed active-connection label rather than a zero-hour proposal countdown", () => {
    expect(crmSource).toContain('"התאמה הדדית פעילה"');
    expect(crmSource).toContain('am.reason === "active_connection" && <span className="text-xs text-green-700">({am.daysInMatch} ימים)</span>');
    expect(crmSource).toContain('availability.reason !== "current_proposal" || !availability.deadline');
    expect(crmSource).toContain('"לסיים את ההתאמה ולהחזיר את שני הצדדים למאגר? לא יישלחו הודעות."');
  });
});
