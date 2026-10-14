import { describe, expect, it } from "vitest";
import {
  appendPlusWednesdayOfferMarker,
  canApplyPlusWednesdayOfferCoupon,
  getPlusWednesdayCycleTarget,
  hasPreviouslyActivatedPlus,
  isPlusWednesdayOfferPaymentTime,
  qualifiesForPlusWednesdayOffer,
  stripPlusWednesdayOfferMarker,
} from "../shared/plusWednesdayOffer";

const qualifyingWednesday = Date.parse("2026-10-14T18:00:00+03:00");

describe("Plus Wednesday offer policy", () => {
  it("uses the verified Israel-local payment instant, with a strict launch cutoff and no Thursday grace period", () => {
    expect(isPlusWednesdayOfferPaymentTime(Date.parse("2026-10-14T17:48:00+03:00"))).toBe(false);
    expect(isPlusWednesdayOfferPaymentTime(qualifyingWednesday)).toBe(true);
    expect(isPlusWednesdayOfferPaymentTime(Date.parse("2026-10-14T23:59:59+03:00"))).toBe(true);
    expect(isPlusWednesdayOfferPaymentTime(Date.parse("2026-10-15T00:00:00+03:00"))).toBe(false);
  });

  it("requires PLUS3 and excludes any previously activated, churned, or billed Plus member", () => {
    expect(canApplyPlusWednesdayOfferCoupon({ couponCode: "PLUS3", paidAt: qualifyingWednesday })).toBe(true);
    expect(canApplyPlusWednesdayOfferCoupon({ couponCode: "PLUS3", paidAt: qualifyingWednesday, existingMember: { status: "churned" } })).toBe(false);
    expect(canApplyPlusWednesdayOfferCoupon({ couponCode: "PLUS3", paidAt: qualifyingWednesday, existingMember: { activatedAt: 1 } })).toBe(false);
    expect(canApplyPlusWednesdayOfferCoupon({ couponCode: "OTHER", paidAt: qualifyingWednesday })).toBe(false);
    expect(hasPreviouslyActivatedPlus({ status: "waitlist", billingStatus: "not_configured" })).toBe(false);
  });

  it("persists a server-only marker without losing attribution and rechecks it against verified payment evidence", () => {
    const savedTerm = appendPlusWednesdayOfferMarker("keyword|facebook_feed");
    expect(savedTerm).toBe("keyword|facebook_feed|BONUS:PLUS3");
    expect(stripPlusWednesdayOfferMarker(savedTerm)).toBe("keyword|facebook_feed");
    expect(qualifiesForPlusWednesdayOffer({ utmTerm: savedTerm, paidAt: qualifyingWednesday, amountAgorot: 9900 })).toBe(true);
    expect(qualifiesForPlusWednesdayOffer({ utmTerm: "BONUS:PLUS3", paidAt: qualifyingWednesday, amountAgorot: 100 })).toBe(false);
    expect(qualifiesForPlusWednesdayOffer({ utmTerm: savedTerm, paidAt: Date.parse("2026-10-15T00:00:00+03:00"), amountAgorot: 9900 })).toBe(false);
  });

  it("keeps three manual proposals only in the Wednesday cohort's first service cycle and preserves the legacy first-cycle bonus", () => {
    expect(getPlusWednesdayCycleTarget("plus_wednesday_2026", 0, 3)).toBe(3);
    expect(getPlusWednesdayCycleTarget("plus_wednesday_2026", 1, 3)).toBe(2);
    expect(getPlusWednesdayCycleTarget("plus_launch_sep26", 0, 3)).toBe(3);
    expect(getPlusWednesdayCycleTarget("plus_launch_sep26", 1, 3)).toBe(2);
    expect(getPlusWednesdayCycleTarget("plus_launch_sep26", 0, 2)).toBe(3);
    expect(getPlusWednesdayCycleTarget("plus_wednesday_2026", 0, 2)).toBe(3);
    expect(getPlusWednesdayCycleTarget("other", 0, 3)).toBe(3);
  });
});
