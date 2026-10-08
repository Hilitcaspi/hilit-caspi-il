import { describe, expect, it } from "vitest";
import { hasRegularMatchingAccess, IL_SERVICE_CHOICES_STARTED_AT } from "./regularMatchingEligibility";
const member = { isPaid: true, isActive: true, isSeed: false, market: "il", createdAt: IL_SERVICE_CHOICES_STARTED_AT - 86400000, questionnaireCompletedAt: IL_SERVICE_CHOICES_STARTED_AT - 1000, consentMatchmaking: false, consentDataSharing: false, subscriptionCancelledAt: null };
describe("regular matching legacy IL access", () => {
  it("keeps a completed paid legacy IL member eligible without any Boost membership or consent write", () => {
    expect(hasRegularMatchingAccess(member)).toBe(true);
    expect(member.consentMatchmaking).toBe(false);
  });
  it("keeps newer or US explicit refusals out", () => {
    expect(hasRegularMatchingAccess({ ...member, createdAt: IL_SERVICE_CHOICES_STARTED_AT })).toBe(false);
    expect(hasRegularMatchingAccess({ ...member, market: "us" })).toBe(false);
  });
  it("never reactivates closed, test, unpaid or cancelled legacy profiles", () => {
    for (const change of [{ isActive: false }, { isPaid: false }, { isSeed: true }, { subscriptionCancelledAt: 1 }, { questionnaireCompletedAt: null }, { createdAt: 0 }]) {
      expect(hasRegularMatchingAccess({ ...member, ...change })).toBe(false);
    }
  });
  it("retains explicit active service choices on every market", () => {
    expect(hasRegularMatchingAccess({ ...member, market: "us", consentMatchmaking: true, consentDataSharing: true })).toBe(true);
  });
});
