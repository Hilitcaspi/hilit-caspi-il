import { describe, expect, it } from "vitest";
import { chooseAcquisition, chooseClosing, findConservativeDuplicateReviewIds, sanitizeSalesLabel, type EmailTouch, type PaymentRow } from "./salesIntelligence";

const hour = 60 * 60 * 1000;
const base = Date.parse("2026-10-10T08:00:00.000Z");

function payment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 1,
    transactionId: "123456",
    email: "person@example.test",
    product: "database",
    couponCode: null,
    amountAgorot: 29_900,
    amountSource: "grow",
    paidAt: base,
    ...overrides,
  };
}

describe("sales intelligence safety rules", () => {
  it("marks only the later mixed-format non-Boost ledger row for review", () => {
    const ids = findConservativeDuplicateReviewIds([
      payment({ id: 1, transactionId: "100001", paidAt: base }),
      payment({ id: 2, transactionId: "encoded-provider-reference", paidAt: base + 20 * 60 * 1000 }),
    ]);
    expect(ids).toEqual(new Set([2]));
  });

  it("finds the pair when the selected date begins on the later row", () => {
    const lookbackAndSelectedRows = [
      payment({ id: 10, transactionId: "200002", paidAt: base - 10 * 60 * 1000 }),
      payment({ id: 11, transactionId: "encoded-provider-reference", paidAt: base + 10 * 60 * 1000 }),
    ];
    expect(findConservativeDuplicateReviewIds(lookbackAndSelectedRows)).toEqual(new Set([11]));
  });

  it("never flags two numeric charges, genuine repeat Boost charges, tests, or tiny payments", () => {
    expect(findConservativeDuplicateReviewIds([
      payment({ id: 1, transactionId: "300001", paidAt: base }),
      payment({ id: 2, transactionId: "300002", paidAt: base + 5 * 60 * 1000 }),
      payment({ id: 3, product: "match_boost", transactionId: "400001", paidAt: base }),
      payment({ id: 4, product: "match_boost", transactionId: "encoded-boost", paidAt: base + 5 * 60 * 1000 }),
      payment({ id: 5, couponCode: "TeSt-sale", transactionId: "500001", paidAt: base }),
      payment({ id: 6, couponCode: "TeSt-sale", transactionId: "encoded-test", paidAt: base + 5 * 60 * 1000 }),
      payment({ id: 7, amountAgorot: 150, transactionId: "600001", paidAt: base }),
      payment({ id: 8, amountAgorot: 150, transactionId: "encoded-tiny", paidAt: base + 5 * 60 * 1000 }),
    ])).toEqual(new Set());
  });

  it("does not emit email addresses, URLs, long identifiers, or tokens in display labels", () => {
    const output = sanitizeSalesLabel("Sale person@example.test https://example.test/?token=secret 123456789");
    expect(output).not.toContain("person@example.test");
    expect(output).not.toContain("https://");
    expect(output).not.toContain("123456789");
    expect(output.toLowerCase()).not.toContain("secret");
  });

  it("keeps a future email click out of closing evidence inputs", () => {
    const touch: EmailTouch = {
      email: "person@example.test",
      journeyKey: "women_first_step",
      sentAt: base - hour,
      clickedAt: base + hour,
      paymentAttemptProduct: null,
    };
    expect(chooseClosing(payment(), [], [touch], [], []).channelSource).toBe("");
  });

  it("keeps original Meta acquisition separate from a later same-day email close", () => {
    const paid = payment();
    const history = [{ email: paid.email, sourceKind: "legacy" as const, createdAt: base - 4 * hour, utmSource: "meta", utmMedium: "paid", utmCampaign: "original-paid-campaign" }];
    const click = { email: paid.email, journeyKey: "women_first_step_v2", sentAt: base - hour, clickedAt: base - 10 * 60 * 1000, paymentAttemptProduct: "database" };
    expect(chooseAcquisition(paid, history).campaignRaw).toBe("original-paid-campaign");
    const closing = chooseClosing(paid, history, [click], [], []);
    expect(closing.channelSource).toBe("email");
    expect(closing.campaignRaw).toBe("women_first_step_v2");
  });

  it("does not consider a sent-only email or an unrelated product click proof of closing", () => {
    expect(chooseClosing(payment(), [], [{email: payment().email, journeyKey: "women_first_step_v2", sentAt: base - hour, clickedAt: null, paymentAttemptProduct: null}], [], []).channelSource).toBe("");
    expect(chooseClosing(payment(), [], [{email: payment().email, journeyKey: "boost_opportunity", sentAt: base - hour, clickedAt: base - 60000, paymentAttemptProduct: "match_boost"}], [], []).channelSource).toBe("");
  });
});
