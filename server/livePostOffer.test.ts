import { describe, expect, it } from "vitest";
import { getPlusWednesdayCycleTarget } from "../shared/plusWednesdayOffer";
import {
  appendLivePostPlusOfferMarker,
  evaluateLivePostFirstMatchPolicy,
  getLivePostPlusCycleTarget,
  hasLivePostPlusOfferMarker,
  isLivePostOfferAccountTicket,
  isLivePostOfferPaymentTime,
  isLivePostOfferTicket,
  LIVE_POST_FIRST_MATCH_SLA_MS,
  LIVE_POST_OFFER_END,
  LIVE_POST_OFFER_START,
  qualifiesForLivePostPlusOffer,
  stripLivePostPlusOfferMarker,
} from "../shared/livePostOffer";

const actualTicket = {
  eventSlug: "matching-secrets-2026-10-31",
  email: "Member@Example.com",
  revokedAt: null,
  voucherCode: "HC31-REAL",
  singleId: 42,
};

const completeProfile = {
  paidAt: LIVE_POST_OFFER_START,
  hasProfile: true,
  hasCompleteProfile: true,
  hasPhoto: true,
  questionnaireCompletedAt: LIVE_POST_OFFER_START,
  isPaid: true,
  isActive: true,
  isSeed: false,
  firstProposalDeliveredAt: null,
};

describe("live post-event offer policy", () => {
  it("uses the exact Israel-time inclusive start and exclusive midnight cutoff", () => {
    expect(new Date(LIVE_POST_OFFER_START).toISOString()).toBe("2026-10-31T19:20:29.000Z");
    expect(new Date(LIVE_POST_OFFER_END).toISOString()).toBe("2026-11-01T22:00:00.000Z");
    expect(isLivePostOfferPaymentTime(LIVE_POST_OFFER_START - 1)).toBe(false);
    expect(isLivePostOfferPaymentTime(LIVE_POST_OFFER_START)).toBe(true);
    expect(isLivePostOfferPaymentTime(LIVE_POST_OFFER_END - 1)).toBe(true);
    expect(isLivePostOfferPaymentTime(LIVE_POST_OFFER_END)).toBe(false);
  });

  it("requires a normalized-email, actual, non-test, non-revoked event ticket", () => {
    expect(isLivePostOfferTicket(actualTicket, " member@example.com ")).toBe(true);
    expect(isLivePostOfferTicket({ ...actualTicket, revokedAt: LIVE_POST_OFFER_START }, "member@example.com")).toBe(false);
    expect(isLivePostOfferTicket({ ...actualTicket, voucherCode: "TEST-ONLY" }, "member@example.com")).toBe(false);
    expect(isLivePostOfferTicket({ ...actualTicket, email: "other@example.com" }, "member@example.com")).toBe(false);
  });

  it("requires a verified account and rejects a ticket linked to another account", () => {
    expect(isLivePostOfferAccountTicket(actualTicket, "member@example.com", 42)).toBe(true);
    expect(isLivePostOfferAccountTicket(actualTicket, "member@example.com", 7)).toBe(false);
    expect(isLivePostOfferAccountTicket({ ...actualTicket, singleId: null }, "member@example.com", 42)).toBe(true);
    expect(isLivePostOfferAccountTicket({ ...actualTicket, singleId: null }, "member@example.com", null)).toBe(false);
  });

  it("preserves a private Plus proof marker without replacing attribution", () => {
    const marked = appendLivePostPlusOfferMarker("newsletter_term");
    expect(marked).toContain("newsletter_term");
    expect(hasLivePostPlusOfferMarker(marked)).toBe(true);
    expect(stripLivePostPlusOfferMarker(marked)).toBe("newsletter_term");
  });

  it("rechecks persisted Plus proof, exact normal price, event ticket, time, and first-Plus policy", () => {
    const proof = appendLivePostPlusOfferMarker("campaign-term");
    expect(qualifiesForLivePostPlusOffer({
      utmTerm: proof,
      paidAt: LIVE_POST_OFFER_START,
      amountAgorot: 9900,
      existingMember: null,
      verifiedTicket: true,
    })).toBe(true);
    expect(qualifiesForLivePostPlusOffer({
      utmTerm: proof,
      paidAt: LIVE_POST_OFFER_END,
      amountAgorot: 9900,
      existingMember: null,
      verifiedTicket: true,
    })).toBe(false);
    expect(qualifiesForLivePostPlusOffer({
      utmTerm: proof,
      paidAt: LIVE_POST_OFFER_START,
      amountAgorot: 9800,
      existingMember: null,
      verifiedTicket: true,
    })).toBe(false);
    expect(qualifiesForLivePostPlusOffer({
      utmTerm: proof,
      paidAt: LIVE_POST_OFFER_START,
      amountAgorot: 9900,
      existingMember: { activatedAt: 1 },
      verifiedTicket: true,
    })).toBe(false);
  });

  it("keeps the 48-hour due time tied to verified payment and never counts an unsent proposal as fulfilled", () => {
    const dueAt = LIVE_POST_OFFER_START + LIVE_POST_FIRST_MATCH_SLA_MS;
    expect(evaluateLivePostFirstMatchPolicy(completeProfile, LIVE_POST_OFFER_START).state).toBe("ready");
    expect(evaluateLivePostFirstMatchPolicy(completeProfile, dueAt - 1).dueAt).toBe(dueAt);
    expect(evaluateLivePostFirstMatchPolicy(completeProfile, dueAt).state).toBe("overdue");
    expect(evaluateLivePostFirstMatchPolicy({ ...completeProfile, hasPhoto: false }, dueAt + 1).state).toBe("awaiting_profile");
    expect(evaluateLivePostFirstMatchPolicy({ ...completeProfile, hasActiveMatchHold: true }, dueAt - 1).state).toBe("needs_review");
    expect(evaluateLivePostFirstMatchPolicy({ ...completeProfile, firstProposalDeliveredAt: dueAt - 1 }, dueAt + 1).state).toBe("fulfilled");
  });

  it("gives the new cohort three only in cycle zero and does not alter historical Wednesday targeting", () => {
    expect(getLivePostPlusCycleTarget("live_post_2026_10_31", 0, 2)).toBe(3);
    expect(getLivePostPlusCycleTarget("live_post_2026_10_31", 1, 3)).toBe(2);
    expect(getPlusWednesdayCycleTarget("plus_wednesday_2026", 0, 2)).toBe(3);
    expect(getPlusWednesdayCycleTarget("plus_wednesday_2026", 1, 3)).toBe(2);
    expect(getPlusWednesdayCycleTarget("other", 0, 3)).toBe(3);
  });
});
